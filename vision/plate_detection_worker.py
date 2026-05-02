import os
import time
import multiprocessing
import numpy as np
import queue
import cv2
from collections import deque
from typing import Dict, List
from copy import deepcopy
from dotenv import load_dotenv
from vision.utils import log
from vision.ai_models.plate_detection import PlateDetector
from vision.ByteTrack_wrapper import ByteTrackWrapper

load_dotenv()


class PlateTrackBuffer:
    """Holds full frames + bboxes for a single tracked plate."""
    def __init__(self, track_id: int, gate_id: str, max_valid_frames: int = 10, max_lifetime: float = 10.0):
        self.track_id = track_id
        self.gate_id = gate_id
        
        # Only valid frames (full frames that passed quality checks)
        self.valid_full_jpegs: List[bytes] = []   # full frame JPEGs (1920×1080)
        self.valid_bboxes: List[list] = []         # corresponding bboxes
        
        self.first_seen = time.time()
        self.last_seen = self.first_seen
        self.max_lifetime = max_lifetime
        self.max_valid_frames = max_valid_frames
    
    def add_valid_frame(self, full_jpeg: bytes, bbox: list) -> bool:
        """
        Add a validated full frame. Returns True if track is now full.
        """
        if len(self.valid_full_jpegs) >= self.max_valid_frames:
            return True  # already full
        
        self.valid_full_jpegs.append(full_jpeg)
        self.valid_bboxes.append(bbox)
        self.last_seen = time.time()
        
        return self.is_full()
    
    def touch(self):
        """Update last_seen without adding a frame."""
        self.last_seen = time.time()
    
    def is_expired(self) -> bool:
        return (time.time() - self.first_seen) > self.max_lifetime
    
    def is_full(self) -> bool:
        return len(self.valid_full_jpegs) >= self.max_valid_frames
    
    def should_finalize(self) -> bool:
        if self.is_full():
            return True
        if self.is_expired() and len(self.valid_full_jpegs) >= 2:
            return True
        return False
    
    def has_usable_data(self) -> bool:
        return len(self.valid_full_jpegs) >= 2

        
class PlateDetectionWorker(multiprocessing.Process):
    def __init__(self, gates_list, share_memory, stop_event, queue, worker_id, width, height, fps):
        super().__init__(name=f"Plate Detection Worker-{worker_id}", daemon=False)
        self.gates_list = gates_list
        self.share_memory = share_memory
        self.stop_event = stop_event
        self.worker_id = worker_id
        self.output_queue = queue

        # Per‑gate components
        self.gate_trackers: Dict[str, ByteTrackWrapper] = {}
        self.gate_plate_tracks: Dict[str, Dict[int, PlateTrackBuffer]] = {}
        self.gate_finalized_cache: Dict[str, deque] = {}   # deque(maxlen=100) of track_ids

        # Common settings
        fps = fps
        self.max_valid_frames = int(os.getenv("MAX_VALID_FRAMES", 10))
        self.track_max_lifetime = float(os.getenv("TRACK_MAX_LIFETIME", 10))
        low_conf = float(os.getenv("TRACK_LOW_CONF", 0.4))
        high_conf = float(os.getenv("TRACK_HIGH_CONF", 0.7))
        self.track_max_age = float(os.getenv("TRACK_MAX_AGE", 10))  # seconds
        
        # Quality thresholds
        self.min_plate_width = int(os.getenv("MIN_PLATE_WIDTH", 75))
        self.roi_margin = float(os.getenv("ROI_MARGIN", 0.05))

        # Initialise per gate
        for gate in self.gates_list:
            gid = gate['id']
            self.gate_trackers[gid] = ByteTrackWrapper(frame_rate=fps, low=low_conf, high=high_conf)
            self.gate_plate_tracks[gid] = {}
            self.gate_finalized_cache[gid] = deque(maxlen=100)

        # Frame dimensions (shared by all gates)
        self.frame_height, self.frame_width = height, width

    # -----------------------------------------------------------------
    # Quality validation 
    # -----------------------------------------------------------------
    def _validate_plate_bbox(self, bbox: list, frame_shape: tuple) -> bool:
        """Check plate quality based on bbox only (size + ROI)."""
        x1, y1, x2, y2 = map(int, bbox)
        
        # Size check
        w = x2 - x1
        if w < self.min_plate_width:
            return False
        
        # ROI check — all four corners inside central region
        fh, fw = frame_shape[:2]
        margin_x = int(self.roi_margin * fw)
        margin_y = int(self.roi_margin * fh)
        if not (x1 >= margin_x and x2 <= fw - margin_x and
                y1 >= margin_y and y2 <= fh - margin_y):
            return False
        
        return True

    # -----------------------------------------------------------------
    # main loop
    # -----------------------------------------------------------------
    def run(self) -> None:
        log(self.name, f"Model on {os.getenv('DEVICE', 'cpu')}")
        log(self.name, f"Listening to gates: {[g['id'] for g in self.gates_list]}")

        detector = PlateDetector(
            model_path=os.getenv("PLATE_DETECTION_MODEL_PATH"),
            confidence_threshold=float(os.getenv("DETECTION_THRESHOLD", 0.4)),
            device=os.getenv("DEVICE", "cpu")
        )

        # --- Create resizable windows with smaller initial size ---
        win_width, win_height = 640, 480
        for gate in self.gates_list:
            win_name = f'gate_{gate["id"]}'
            cv2.namedWindow(win_name, cv2.WINDOW_NORMAL)
            cv2.resizeWindow(win_name, win_width, win_height)

        while not self.stop_event.is_set():
            batch_frames, batch_gates = [], []
            for gate in self.gates_list:
                frame = self.share_memory.read_frame(gate['gate_idx'])
                if frame is not None and frame.size > 0:
                    batch_frames.append(frame)
                    batch_gates.append(gate)

            if batch_frames:
                try:
                    detections = detector.detect_batch(batch_frames)
                    gate_to_tracks, gate_to_detections = self._process_batch(batch_frames, batch_gates, detections)
                except Exception as e:
                    log(self.name, f"Batch detection error: {e}")
                    continue

                # Display with track IDs
                for frame, gate in zip(batch_frames, batch_gates):
                    gate_id = gate['id']
                    tracked_boxes = gate_to_tracks.get(gate_id, [])
                    original_detections = gate_to_detections.get(gate_id, [])
                    display_frame = frame.copy()
                    
                    # Draw margin lines (ROI boundary) - Simple version
                    fh, fw = frame.shape[:2]
                    margin_x = int(self.roi_margin * fw)
                    margin_y = int(self.roi_margin * fh)
                    
                    # Draw ROI rectangle in yellow
                    cv2.rectangle(display_frame, (margin_x, margin_y), (fw - margin_x, fh - margin_y), (0, 255, 255), 2)
                    
                    # Draw original detection boxes in RED
                    for det in original_detections:
                        x1, y1, x2, y2, score = det
                        cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    
                    # Draw tracked boxes in GREEN with track ID
                    for box in tracked_boxes:
                        x1, y1, x2, y2, tid, score, cls, idx = box
                        x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
                        cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(display_frame, f"ID:{int(tid)}", (x1, y1-5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)
                    
                    cv2.imshow(f'gate_{gate_id}', display_frame)
                    cv2.waitKey(1)

            # Check for expired tracks 
            self._check_expired_tracks()
            
            # purge inactive tracks
            self._cleanup_stale_tracks()
            time.sleep(0.02)
        
        cv2.destroyAllWindows()

    # -----------------------------------------------------------------
    # handle one frame from each gate
    # -----------------------------------------------------------------
    def _process_batch(self, frames: list, gates: list, detections_list: list) -> tuple:
        gate_to_tracks = {}
        gate_to_detections = {}
        
        for frame, gate, detections in zip(frames, gates, detections_list):
            gate_id = gate['id']
            
            # Store original detections
            if detections is not None and len(detections) > 0:
                det_boxes = []
                for det in detections:
                    bbox = det['bbox']
                    det_boxes.append([int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3]), det['confidence']])
                gate_to_detections[gate_id] = det_boxes
            else:
                gate_to_detections[gate_id] = []

            if detections is None or len(detections) == 0:
                gate_to_tracks[gate_id] = []
                # Touch all existing tracks to keep them alive 
                for track in self.gate_plate_tracks[gate_id].values():
                    track.touch()
                continue

            tracker = self.gate_trackers[gate_id]
            plate_tracks = self.gate_plate_tracks[gate_id]
            cache = self.gate_finalized_cache[gate_id]

            tracked_boxes, removed_ids = tracker.update(detections)
            gate_to_tracks[gate_id] = tracked_boxes

            # Compress full frame to JPEG once 
            _, full_jpeg_buf = cv2.imencode('.jpg', frame.copy(), [cv2.IMWRITE_JPEG_QUALITY, 90])
            full_jpeg_bytes = full_jpeg_buf.tobytes()
            
            # Track which tracks got updated this frame 
            updated_tids = set()

            # Process active tracks
            for box in tracked_boxes:
                x1, y1, x2, y2, tid, score, cls, idx = box
                tid = int(tid)
                updated_tids.add(tid)

                # ---- Get original detection bbox using idx ----
                if idx is not None:
                    idx_int = int(idx)
                    if 0 <= idx_int < len(detections):
                        current_bbox = detections[idx_int]['bbox']
                        current_bbox = [int(coord) for coord in current_bbox]
                    else:
                        current_bbox = [int(x1), int(y1), int(x2), int(y2)]
                else:
                    current_bbox = [int(x1), int(y1), int(x2), int(y2)]

                if tid in cache:
                    plate_tracks.pop(tid, None)
                    continue

                # ---- QUALITY VALIDATION  ----
                is_valid = self._validate_plate_bbox(current_bbox, frame.shape)

                if tid not in plate_tracks:
                    plate_tracks[tid] = PlateTrackBuffer(
                        tid, gate_id,
                        max_valid_frames=self.max_valid_frames,
                        max_lifetime=self.track_max_lifetime
                    )

                if is_valid:
                    full = plate_tracks[tid].add_valid_frame(full_jpeg_bytes, current_bbox)
                    if full:
                        self._finalize_and_cleanup(plate_tracks[tid], plate_tracks, cache)
                else:
                    plate_tracks[tid].touch()

            # Touch tracks not updated this frame 
            for tid, track in plate_tracks.items():
                if tid not in updated_tids and tid not in cache:
                    track.touch()

            # Lost tracks
            for rid in removed_ids:
                if rid in plate_tracks:
                    self._finalize_and_cleanup(plate_tracks[rid], plate_tracks, cache)

        return gate_to_tracks, gate_to_detections
    
    # -----------------------------------------------------------------
    # finalize a track: send downstream, add to cache, delete buffer
    # -----------------------------------------------------------------
    def _finalize_and_cleanup(self, track: PlateTrackBuffer, plate_tracks: dict, cache: deque) -> None:
        if track.track_id in cache:
            plate_tracks.pop(track.track_id, None)
            return
        
        # Check if has usable data 
        if not track.has_usable_data():
            plate_tracks.pop(track.track_id, None)
            return

        payload = {
            "gate": track.gate_id,
            "track_id": track.track_id,
            "frames": track.valid_full_jpegs,
            "bboxes": track.valid_bboxes,
            "first_seen": track.first_seen
        }

        try:
            self.output_queue.put(payload, timeout=0.5)
            log(self.name, f"Finalized track {track.track_id} (gate {track.gate_id}) with {len(track.valid_full_jpegs)} valid frames")
            
            cache.append(track.track_id)
            plate_tracks.pop(track.track_id, None)
            
        except queue.Full:
            log(self.name, "Output queue full, dropping track")

    # -----------------------------------------------------------------
    # Check for expired tracks 
    # -----------------------------------------------------------------
    def _check_expired_tracks(self) -> None:
        """Finalize tracks that have exceeded max lifetime."""
        for gate_id, plate_tracks in self.gate_plate_tracks.items():
            cache = self.gate_finalized_cache[gate_id]
            for tid, track in list(plate_tracks.items()):
                if track.is_expired():
                    if track.has_usable_data():
                        self._finalize_and_cleanup(track, plate_tracks, cache)
                    else:
                        del plate_tracks[tid]

    # -----------------------------------------------------------------
    # periodic cleanup of old, inactive tracks
    # -----------------------------------------------------------------
    def _cleanup_stale_tracks(self) -> None:
        now = time.time()
        max_age = self.track_max_age
        for gate_id, plate_tracks in self.gate_plate_tracks.items():
            for tid, track in list(plate_tracks.items()):
                if (now - track.last_seen) > max_age:
                    if track.has_usable_data():
                        self._finalize_and_cleanup(track, plate_tracks, self.gate_finalized_cache[gate_id])
                    else:
                        del plate_tracks[tid]