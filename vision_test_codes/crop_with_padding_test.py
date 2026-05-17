import cv2
import torch
import numpy as np
from ultralytics import YOLO
from dataclasses import dataclass
from typing import Optional, List, Tuple
import time
from collections import deque

# ============================================
# CONFIGURATION - CHANGE THESE VALUES
# ============================================

# Choose your frame size (width, height)
FRAME_SIZE = (1920, 1080)  # Options: (640,480), (1280,720), (1920,1080)

# Detection thresholds
PLATE_CONFIDENCE_THRESHOLD = 0.5
CHAR_CONFIDENCE_THRESHOLD = 0.5

# Model paths
PLATE_MODEL_PATH = "./vision/models/plate/plate.pt"
CHAR_MODEL_PATH = "./vision/models/character/character.pt"

# Camera settings
CAMERA_INDEX = 0

# Display settings
MAIN_WINDOW_SCALE = 0.7  # Scale main window (0.5 = half size)
SHOW_PADDED_PLATE = True  # Show padded plate window
SHOW_CROPPED_PLATE = False  # Show raw cropped plate window
STABLE_FRAMES = 1  # Number of consecutive detections needed for stable result

# ============================================
# CODE
# ============================================

@dataclass
class DetectionResult:
    plate_detected: bool
    plate_confidence: float
    plate_bbox: Optional[List[int]]
    plate_number: Optional[str]
    detection_time_ms: float

class PlateDetector:
    def __init__(self, model_path: str, confidence_threshold: float = 0.5, device: str = "cpu"):
        self.verbose = False
        self.model = YOLO(str(model_path), verbose=self.verbose)
        self.model.to(device)
        self.model.fuse()
        self.device = device
        self.confidence_threshold = confidence_threshold

    def detect_single_image(self, image: np.ndarray) -> Optional[List[dict]]:
        with torch.no_grad():
            result = self.model(image, conf=self.confidence_threshold, verbose=self.verbose)[0]
        
        if result.boxes is None or result.boxes.xyxy is None:
            return None
        
        boxes = result.boxes.xyxy.cpu().numpy().astype(int)
        confs = result.boxes.conf.cpu().numpy()
        return [{"confidence": float(conf), "bbox": box.tolist()} for box, conf in zip(boxes, confs)]

class CharacterDetector:
    def __init__(self, model_path: str, confidence_threshold: float = 0.4, device: str = "cpu"):
        self.verbose = False
        self.model = YOLO(str(model_path), verbose=self.verbose)
        self.model.to(device)
        self.model.fuse()
        self.device = device
        self.confidence_threshold = confidence_threshold

    def detect_single_image(self, image: np.ndarray) -> Optional[str]:
        with torch.no_grad():
            result = self.model(image, conf=self.confidence_threshold, verbose=self.verbose)[0]
        
        if result.boxes is None or len(result.boxes) != 8:
            return None
        
        characters_bbox = result.boxes
        sorted_char_bbox = sorted(characters_bbox, key=lambda box: box.xyxy[0][0])
        
        plate_number = [-1, -1, -1, -1, -1, -1, -1, -1]
        
        for i in range(8):
            class_idx = int(sorted_char_bbox[i].cls[0])
            
            if i in [0, 1, 3, 4, 5, 6, 7]:  # Digits positions
                if class_idx >= 10:
                    return None
                plate_number[i] = class_idx
            elif i == 2:  # Letter position
                if class_idx < 10:
                    return None
                plate_number[i] = class_idx
        
        return "-".join(str(x) for x in plate_number)

def resize_with_padding(image: np.ndarray, target_w: int = 640, target_h: int = 480) -> Optional[np.ndarray]:
    h, w = image.shape[:2]
    if w == 0 or h == 0:
        return None
    
    scale = min(target_w / w, target_h / h)
    new_w, new_h = int(w * scale), int(h * scale)

    # Use INTER_CUBIC for upscaling (sharper), INTER_AREA for downscaling
    if scale > 1.0:
        # Upscaling — use bicubic
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    else:
        # Downscaling — use area-based for anti-aliasing
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    pad_x1 = (target_w - new_w) // 2
    pad_y1 = (target_h - new_h) // 2
    
    padded = cv2.copyMakeBorder(resized, pad_y1, target_h - new_h - pad_y1,
                                pad_x1, target_w - new_w - pad_x1,
                                cv2.BORDER_CONSTANT, value=(0, 0, 0))
    
    # Apply subtle sharpening
    sharpen_kernel = np.array([[0, -0.5, 0],
                               [-0.5, 3, -0.5],
                               [0, -0.5, 0]])
    sharpened = cv2.filter2D(padded, -1, sharpen_kernel)
    
    # Blend with original to avoid over-sharpening
    result = cv2.addWeighted(padded, 0.7, sharpened, 0.3, 0)
    
    return result


class AutomaticProcessor:
    def __init__(self,
                 plate_model_path: str,
                 char_model_path: str,
                 frame_size: Tuple[int, int],
                 plate_conf_threshold: float = 0.5,
                 char_conf_threshold: float = 0.4,
                 camera_index: int = 0):
        
        self.frame_size = frame_size
        self.plate_detector = PlateDetector(plate_model_path, plate_conf_threshold)
        self.char_detector = CharacterDetector(char_model_path, char_conf_threshold)
        self.camera_index = camera_index
        self.last_plate_crop = None
        self.last_resized_crop = None
        self.crop_padded_frame = None
        
        # For stable detection
        self.detection_history = deque(maxlen=STABLE_FRAMES)
        self.stable_plate_number = None
        self.stable_counter = 0
        
        # FPS calculation
        self.fps = 0
        self.frame_count = 0
        self.last_fps_time = time.time()
        
    def process_frame(self, frame: np.ndarray) -> DetectionResult:
        start_time = time.time()
        
        # Resize to target frame size
        frame_resized = cv2.resize(frame, self.frame_size)
        
        # Detect plate
        plate_results = self.plate_detector.detect_single_image(frame_resized)
        
        detection_time = (time.time() - start_time) * 1000
        
        if not plate_results:
            return DetectionResult(
                plate_detected=False,
                plate_confidence=0.0,
                plate_bbox=None,
                plate_number=None,
                detection_time_ms=detection_time
            )
        
        # Get best plate
        best_plate = max(plate_results, key=lambda x: x['confidence'])
        bbox = best_plate['bbox']
        x1, y1, x2, y2 = bbox
        
        # Crop plate
        h_frame, w_frame = frame_resized.shape[:2]
        x1, x2 = max(0, x1), min(w_frame, x2)
        y1, y2 = max(0, y1), min(h_frame, y2)
        
        plate_crop = frame_resized[y1:y2, x1:x2]
        self.last_plate_crop = plate_crop.copy()
        
        if plate_crop.size == 0:
            return DetectionResult(
                plate_detected=False,
                plate_confidence=best_plate['confidence'],
                plate_bbox=bbox,
                plate_number=None,
                detection_time_ms=detection_time
            )
        
        # Resize for character detection
        plate_resized = resize_with_padding(plate_crop, 640, 480)
        self.crop_padded_frame = plate_resized
        self.last_resized_crop = plate_resized
        
        # Detect characters
        plate_number = self.char_detector.detect_single_image(plate_resized)  # type: ignore
        
        return DetectionResult(
            plate_detected=True,
            plate_confidence=best_plate['confidence'],
            plate_bbox=bbox,
            plate_number=plate_number,
            detection_time_ms=detection_time
        )
    
    def get_stable_plate_number(self, current_plate: Optional[str]) -> Optional[str]:
        """Get stable plate number using history"""
        self.detection_history.append(current_plate)
        
        # Count occurrences
        if current_plate is not None:
            count = list(self.detection_history).count(current_plate)
            if count >= STABLE_FRAMES:
                return current_plate
        
        return None
    
    def draw_info_overlay(self, frame: np.ndarray, result: DetectionResult, fps: float) -> np.ndarray:
        """Draw information overlay on frame"""
        overlay = frame.copy()
        
        # Semi-transparent background for text
        cv2.rectangle(overlay, (0, 0), (400, 150), (0, 0, 0), -1)
        frame = cv2.addWeighted(overlay, 0.3, frame, 0.7, 0)
        
        # Draw info
        y_pos = 30
        cv2.putText(frame, f"FPS: {fps:.1f}", (10, y_pos), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        y_pos += 25
        cv2.putText(frame, f"Frame Size: {self.frame_size[0]}x{self.frame_size[1]}", (10, y_pos), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        if result.plate_detected:
            y_pos += 25
            cv2.putText(frame, f"Plate Confidence: {result.plate_confidence:.3f}", (10, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)
            
            if result.plate_number:
                y_pos += 25
                cv2.putText(frame, f"Plate Number: {result.plate_number}", (10, y_pos), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            elif result.plate_detected:
                y_pos += 25
                cv2.putText(frame, f"Characters: Invalid (need 8 digits)", (10, y_pos), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 1)
        else:
            y_pos += 25
            cv2.putText(frame, "No Plate Detected", (10, y_pos), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 1)
        
        y_pos += 25
        cv2.putText(frame, f"Detection Time: {result.detection_time_ms:.1f}ms", (10, y_pos), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        return frame
    
    def run_automatic(self):
        """Run automatic continuous detection"""
        cap = cv2.VideoCapture(self.camera_index)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.frame_size[0])
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.frame_size[1])
        
        if not cap.isOpened():
            print("Cannot open camera")
            return
        
        # Create windows
        main_window = "License Plate Detection"
        padded_window = "Padded Plate (640x480)"
        
        cv2.namedWindow(main_window, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(main_window, (960, 540))
        cv2.namedWindow(padded_window, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(padded_window, (640, 480))
        
        if SHOW_CROPPED_PLATE:
            cv2.namedWindow("Cropped Plate", cv2.WINDOW_NORMAL)
        
        print("\n" + "="*60)
        print("AUTOMATIC LICENSE PLATE DETECTION")
        print("="*60)
        print(f"Frame Size: {self.frame_size[0]}x{self.frame_size[1]}")
        print(f"Plate Confidence: {self.plate_detector.confidence_threshold}")
        print(f"Character Confidence: {self.char_detector.confidence_threshold}")
        print(f"Stable Frames Required: {STABLE_FRAMES}")
        print("\nWindows:")
        print(f"  - {main_window}: Main camera feed with detection overlay")
        print(f"  - {padded_window}: Padded plate crop (640x480)")
        if SHOW_CROPPED_PLATE:
            print("  - Cropped Plate: Raw cropped plate")
        print("\nPress 'Q' or ESC to quit")
        print("="*60)
        
        last_result = DetectionResult(False, 0.0, None, None, 0.0)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame")
                break
            
            # Process frame
            result = self.process_frame(frame)
            
            # Update FPS
            self.frame_count += 1
            if time.time() - self.last_fps_time >= 1.0:
                self.fps = self.frame_count
                self.frame_count = 0
                self.last_fps_time = time.time()
            
            # Draw on frame
            display_frame = cv2.resize(frame, 
                                       (int(self.frame_size[0] * MAIN_WINDOW_SCALE),
                                        int(self.frame_size[1] * MAIN_WINDOW_SCALE)))
            
            # Draw bounding box if plate detected
            if result.plate_detected and result.plate_bbox:
                x1, y1, x2, y2 = result.plate_bbox
                # Scale bbox for display
                scale = MAIN_WINDOW_SCALE
                x1_disp, x2_disp = int(x1 * scale), int(x2 * scale)
                y1_disp, y2_disp = int(y1 * scale), int(y2 * scale)
                
                # Color based on validity
                color = (0, 255, 0) if result.plate_number else (0, 255, 255)
                thickness = 3 if result.plate_number else 2
                
                cv2.rectangle(display_frame, (x1_disp, y1_disp), (x2_disp, y2_disp), color, thickness)
                
                if result.plate_number:
                    cv2.putText(display_frame, result.plate_number, (x1_disp, y1_disp-10),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            
            # Draw info overlay
            display_frame = self.draw_info_overlay(display_frame, result, self.fps)
            
            # Show main window
            cv2.imshow(main_window, display_frame)
            
            # Show padded plate window
            if SHOW_PADDED_PLATE and self.last_resized_crop is not None:
                # Add status text to padded plate
                padded_display = self.last_resized_crop.copy()
                status_color = (0, 255, 0) if result.plate_number else (0, 255, 255)
                status_text = result.plate_number if result.plate_number else "Processing..."
                cv2.putText(padded_display, status_text, (10, 30),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
                cv2.imshow(padded_window, padded_display)
            
            # Show cropped plate window
            if SHOW_CROPPED_PLATE and self.last_plate_crop is not None:
                cv2.imshow("Cropped Plate", self.last_plate_crop)
            
            # Update last result
            last_result = result
            
            # Check for quit (using both 'q' and ESC)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                break
        
        cap.release()
        cv2.destroyAllWindows()

def main():
    processor = AutomaticProcessor(
        plate_model_path=PLATE_MODEL_PATH,
        char_model_path=CHAR_MODEL_PATH,
        frame_size=FRAME_SIZE,
        plate_conf_threshold=PLATE_CONFIDENCE_THRESHOLD,
        char_conf_threshold=CHAR_CONFIDENCE_THRESHOLD,
        camera_index=CAMERA_INDEX  # type: ignore
    )
    
    processor.run_automatic()

if __name__ == "__main__":
    main()