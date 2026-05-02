import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import numpy as np
from vision.tracker.nets.nn import BYTETracker


class ByteTrackWrapper:
    def __init__(self, frame_rate=10, low=0.5, high=0.8):
        self.tracker = BYTETracker(frame_rate=frame_rate, low=low, high=high)

    def update(self, detections: list):
        """
        Update tracker with new detections.

        detections: list of dicts with keys 'bbox' and 'confidence'

        Returns:
            outputs: np.array of tracked boxes [x1, y1, x2, y2, track_id, score, class, idx]
            removed_tracks: list of track_ids removed this frame
        """
        boxes = [det['bbox'] for det in detections]
        confidences = [det['confidence'] for det in detections]
        classes = [0 for _ in detections]

        boxes_np = np.array(boxes) if boxes else np.empty((0, 4))
        confidences_np = np.array(confidences) if confidences else np.array([])
        classes_np = np.array(classes) if classes else np.array([])

        return self.tracker.update(boxes_np, confidences_np, classes_np)
