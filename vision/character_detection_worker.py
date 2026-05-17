from copy import deepcopy
import os
import cv2
import time
import multiprocessing
import numpy as np
from collections import deque, Counter
from typing import Dict, List, Any
import traceback

from dotenv import load_dotenv
from vision.utils import log
from vision.models.character.character_detection import CharacterDetector
import queue

load_dotenv()


class CharacterDetectionWorker(multiprocessing.Process):
    def __init__(self, stop_event, input_queue, output_queue, save_queue, worker_id=0):
        super().__init__(name=f"Character Detection Worker-{worker_id}", daemon=False)
        self.stop_event = stop_event
        self.input_queue = input_queue
        self.output_queue = output_queue
        self.save_queue = save_queue
        self.worker_id = worker_id

        # Per‑gate caches – all use deque with maxlen for automatic eviction
        self.track_id_cache: Dict[str, deque] = {}        # gate -> deque of track_ids (maxlen=100)
        self.plate_number_cache: Dict[str, deque] = {}    # gate -> deque of plate strings (maxlen=100)

        # Quality threshold
        self.min_width = int(os.getenv("MIN_WIDTH", 100))

    def run(self) -> None:
        log(self.name, f"Starting Character detector on {os.getenv('DEVICE', 'cpu')} ")
        log(self.name, f"Starting with min width {int(os.getenv('MIN_WIDTH', 100))} ")

        detector = CharacterDetector(
            model_path=os.getenv("CHARACTER_DETECTION_MODEL_PATH"),
            confidence_threshold=float(os.getenv("CHARACTER_DETECTION_THRESHOLD", 0.6)),
            device=os.getenv("DEVICE", "cpu")
        )

        while True:
            try:
                if self.stop_event.is_set():
                    # drain remaining items before exit
                    try:
                        while True:
                            track_data = self.input_queue.get_nowait()
                            self._process_track(detector, track_data)
                    except queue.Empty:
                        pass
                    break

                try:
                    track_data = self.input_queue.get(timeout=0.5)
                except queue.Empty:
                    continue

                self._process_track(detector, track_data)

            except Exception as e:
                log(self.name, f"Unexpected error: {e} \n {traceback.format_exc()}")

            time.sleep(0.02)
            
        cv2.destroyAllWindows()

    def _process_track(self, detector: CharacterDetector, track_data: dict) -> None:
        gate = track_data["gate"]
        track_id = track_data["track_id"]
        jpeg_frames = track_data["frames"]      # Full frame JPEGs (already validated by plate worker)
        bboxes = track_data["bboxes"]
        
        log(self.name, f"Received track {track_id} with {len(jpeg_frames)} frames")

        # ensure caches exist
        if gate not in self.track_id_cache:
            self.track_id_cache[gate] = deque(maxlen=100)
        if gate not in self.plate_number_cache:
            self.plate_number_cache[gate] = deque(maxlen=100)

        track_cache = self.track_id_cache[gate]
        plate_cache = self.plate_number_cache[gate]

        if track_id in track_cache:
            log(self.name, f"Track {track_id} already processed for gate {gate}")
            return

        # ---- collect valid crops WITH their full frame and bbox ----
        valid_plates = []      # list of padded crops ready for detection
        valid_full_jpegs = []  # corresponding full frame JPEG (bytes)
        valid_bboxes = []      # corresponding bbox for that frame

        for idx, (jpg_buf, bbox) in enumerate(zip(jpeg_frames, bboxes)):
            # Decode JPEG to numpy array
            np_arr = np.frombuffer(jpg_buf, dtype=np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                log(self.name, f"Failed to decode frame {idx} for track {track_id}")
                continue

            # Crop plate from full frame
            x1, y1, x2, y2 = map(int, bbox)
            h_frame, w_frame = frame.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w_frame, x2), min(h_frame, y2)
            
            if x2 <= x1 or y2 <= y1:
                continue
                
            crop = frame[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            # Crop and pad to 640×480
            plate = self._crop_with_padding(crop)
            if plate is not None:
                valid_plates.append(plate)
                valid_full_jpegs.append(jpg_buf)   # store the original full frame JPEG
                valid_bboxes.append(bbox)

        if not valid_plates:
            log(self.name, f"No valid plates for track {track_id} (from {len(jpeg_frames)} frames)")
            return

        # ---- character detection ----
        try:
            raw_results = detector.detect_batch(valid_plates)
        except Exception as e:
            log(self.name, f"Character detection batch error: {e}")
            return

        # Pair each non-None result with its original index
        plate_candidates = []   # list of (plate_string, index)
        for idx, result in enumerate(raw_results):
            if result is not None:
                plate_candidates.append((result["plate"], idx))

        if not plate_candidates:
            return

        # ---- majority vote + find winning index (ONE pass) ----
        final_plate, confidence, winning_idx = self._majority_vote_with_index(plate_candidates)

        # ---- save character data if valid ----
        if final_plate is not None and confidence >= 0.6 and winning_idx is not None:
            # Get the winning frame
            if winning_idx < len(valid_plates):
                winning_plate_crop = valid_plates[winning_idx]
                winning_result = raw_results[winning_idx]
                
                if winning_result is not None:
                    char_bboxes = winning_result["bboxes"]
                    char_class_ids = winning_result["class_ids"]
                    
                    if char_bboxes and char_class_ids:
                        # Encode the padded plate crop to JPEG bytes
                        _, img_buf = cv2.imencode('.jpg', winning_plate_crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
                        img_bytes = img_buf.tobytes()
                        
                        # Send to character saver
                        self._add_character_save_task(
                            image=img_bytes,
                            gate_id=gate,
                            bboxes=char_bboxes,
                            class_ids=char_class_ids
                        )
                        
                        log(self.name, f"Saved {len(char_bboxes)} characters from plate: {final_plate}")

        # ---- show the results ----
        if winning_idx is not None and winning_idx < len(valid_plates):
            display_plate = valid_plates[winning_idx]
        else:
            display_plate = valid_plates[0] if valid_plates else None

        if display_plate is not None:
            if final_plate is None:
                cv2.putText(display_plate, "Plate: None", (15, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            else:
                cv2.putText(display_plate, f"Plate: {final_plate}", (15, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.imshow('Crop Frame', display_plate)
            cv2.waitKey(1)
            
            
        # ---- validate result ----
        if final_plate is None:
            log(self.name, f"Low confidence (or tie) for track {track_id}, discarding")
            return

        # ---- per‑gate plate number cache ----
        if final_plate in plate_cache:
            log(self.name, f"Plate {final_plate} already in cache for gate {gate}, skipping send")
            return
        
        # ---- build payload using the winning frame and bbox ----
        winning_jpeg = valid_full_jpegs[winning_idx]
        winning_bbox = valid_bboxes[winning_idx]

        # decode to full frame (for drawing bounding box later)
        np_arr = np.frombuffer(winning_jpeg, dtype=np.uint8)
        full_frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        result_payload = {
            "gate": gate,
            "track_id": track_id,
            "plate_number": final_plate,
            "confidence": confidence,
            "frame": full_frame,
            "bbox": winning_bbox
        }

        try:
            self.output_queue.put(result_payload, timeout=0.2)
            track_cache.append(track_id)
            plate_cache.append(final_plate)
        except queue.Full:
            log(self.name, "Output queue full, dropping result")

    def _crop_with_padding(self, crop: np.ndarray, target_w: int = 640, target_h: int = 480) -> np.ndarray | None:
        h, w = crop.shape[:2]
        if w == 0 or h == 0:
            return None
        
        scale = min(target_w / w, target_h / h)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(crop, (new_w, new_h))
        
        pad_x1 = (target_w - new_w) // 2
        pad_y1 = (target_h - new_h) // 2
        
        padded = cv2.copyMakeBorder(resized, pad_y1, target_h - new_h - pad_y1, 
                                    pad_x1, target_w - new_w - pad_x1,
                                    cv2.BORDER_CONSTANT, value=(0, 0, 0))
        return padded
    
    @staticmethod
    def _majority_vote_with_index(plate_candidates: List[tuple]) -> tuple:
        """
        Args:
            plate_candidates: list of (plate_string, original_index)
        Returns:
            (winning_plate, confidence, winning_index) or (None, 0.0, None)
        """
        if not plate_candidates:
            return None, 0.0, None
        
        counts = Counter()
        first_idx = {}
        
        for plate_str, idx in plate_candidates:
            counts[plate_str] += 1
            if plate_str not in first_idx:
                first_idx[plate_str] = idx
        
        total = len(plate_candidates)
        most_common = counts.most_common(2)
        
        if len(most_common) == 1:
            # Only one unique plate string
            winner, vote_count = most_common[0]
            confidence = vote_count / total
            
            # Must have at least 2 votes (not a single detection)
            if vote_count >= 2:
                return winner, confidence, first_idx[winner]
            return None, 0.0, None
        
        if most_common[0][1] > most_common[1][1]:
            winner = most_common[0][0]
            return winner, most_common[0][1] / total, first_idx[winner]
        
        return None, 0.0, None
    
    # -----------------------------------------------------------------
    # put task for character save (multiple bboxes)
    # -----------------------------------------------------------------
    def _add_character_save_task(self, image, gate_id, bboxes, class_ids):
        """
        Queue character detection data for saving.
        
        Args:
            image: JPEG bytes of the padded plate crop
            gate_id: Gate identifier
            bboxes: List of character bounding boxes [x1, y1, x2, y2]
            class_ids: List of character class IDs
        """
        payload = {
            "image": image,
            "gate_id": gate_id,
            "bboxes": bboxes,
            "class_ids": class_ids,
            "image_shape": (480, 640),
        }
        
        try:
            self.save_queue.put(payload, timeout=0.5)
        except queue.Full:
            log(self.name, "Character save queue full, dropping sample")