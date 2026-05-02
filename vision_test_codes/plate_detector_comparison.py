import cv2
import torch
import numpy as np
from ultralytics import YOLO
from dataclasses import dataclass
from typing import Optional, List, Tuple, Dict
import time

# ============================================
# CONFIGURATION
# ============================================

@dataclass
class DetectionResult:
    """Store detection results for comparison"""
    frame_size: Tuple[int, int]
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

    def detect_single_image(self, image: np.ndarray) -> Optional[List[Dict]]:
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
                if class_idx >= 10:  # Should be digit (0-9)
                    return None
                plate_number[i] = class_idx
            elif i == 2:  # Letter position
                if class_idx < 10:  # Should be letter (10+)
                    return None
                plate_number[i] = class_idx
        
        plate_string = "-".join(str(x) for x in plate_number)
        return plate_string

def resize_with_padding(image: np.ndarray, target_w: int = 640, target_h: int = 480) -> Optional[np.ndarray]:
    """Resize image with padding to maintain aspect ratio"""
    h, w = image.shape[:2]
    if w == 0 or h == 0:
        return None
    
    scale = min(target_w / w, target_h / h)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = cv2.resize(image, (new_w, new_h))
    
    pad_x1 = (target_w - new_w) // 2
    pad_y1 = (target_h - new_h) // 2
    
    padded = cv2.copyMakeBorder(resized, pad_y1, target_h - new_h - pad_y1,
                                pad_x1, target_w - new_w - pad_x1,
                                cv2.BORDER_CONSTANT, value=(0, 0, 0))
    return padded

class ComparisonProcessor:
    def __init__(self, 
                 plate_model_path: str,
                 char_model_path: str,
                 plate_conf_threshold: float = 0.5,
                 char_conf_threshold: float = 0.4,
                 camera_index: int = 0):
        
        self.plate_detector = PlateDetector(plate_model_path, plate_conf_threshold)
        self.char_detector = CharacterDetector(char_model_path, char_conf_threshold)
        self.camera_index = camera_index
        
    def process_frame_with_size(self, frame: np.ndarray, frame_size: Tuple[int, int]) -> DetectionResult:
        """Process frame with specific size and return result"""
        start_time = time.time()
        
        # Resize frame to target size
        resized_frame = cv2.resize(frame, frame_size)
        
        # Detect plate
        plate_results = self.plate_detector.detect_single_image(resized_frame)
        
        detection_time = (time.time() - start_time) * 1000
        
        if not plate_results:
            return DetectionResult(
                frame_size=frame_size,
                plate_detected=False,
                plate_confidence=0.0,
                plate_bbox=None,
                plate_number=None,
                detection_time_ms=detection_time
            )
        
        # Get best plate detection
        best_plate = max(plate_results, key=lambda x: x['confidence'])
        bbox = best_plate['bbox']
        x1, y1, x2, y2 = bbox
        
        # Crop and process plate
        h_frame, w_frame = resized_frame.shape[:2]
        x1, x2 = max(0, x1), min(w_frame, x2)
        y1, y2 = max(0, y1), min(h_frame, y2)
        
        plate_crop = resized_frame[y1:y2, x1:x2]
        
        if plate_crop.size == 0:
            return DetectionResult(
                frame_size=frame_size,
                plate_detected=False,
                plate_confidence=best_plate['confidence'],
                plate_bbox=bbox,
                plate_number=None,
                detection_time_ms=detection_time
            )
        
        # Resize for character detection (always 640x480 for character model)
        plate_resized = resize_with_padding(plate_crop, 640, 480)
        
        # Detect characters
        plate_number = self.char_detector.detect_single_image(plate_resized) # type: ignore
        
        return DetectionResult(
            frame_size=frame_size,
            plate_detected=True,
            plate_confidence=best_plate['confidence'],
            plate_bbox=bbox,
            plate_number=plate_number,
            detection_time_ms=detection_time
        )
    
    def compare_sizes(self, frame_sizes: List[Tuple[int, int]]):
        """Compare detection across different frame sizes on a single captured frame"""
        # Capture a single frame
        cap = cv2.VideoCapture(self.camera_index)
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            print("Failed to capture frame")
            return None
        
        results = []
        original_frame = frame.copy()
        
        print("\n" + "="*80)
        print("COMPARING DIFFERENT FRAME SIZES")
        print("="*80)
        
        for size in frame_sizes:
            print(f"\n📐 Testing: {size[0]}x{size[1]}")
            result = self.process_frame_with_size(original_frame, size)
            results.append(result)
            
            print(f"   Plate Detected: {'✅' if result.plate_detected else '❌'}")
            if result.plate_detected:
                print(f"   Confidence: {result.plate_confidence:.3f}")
                print(f"   Plate Number: {result.plate_number if result.plate_number else '❌ Invalid'}")
                print(f"   Time: {result.detection_time_ms:.1f}ms")
        
        # Find best result
        print("\n" + "="*80)
        print("BEST RESULT")
        print("="*80)
        
        valid_results = [r for r in results if r.plate_detected and r.plate_number]
        if valid_results:
            best = max(valid_results, key=lambda r: r.plate_confidence)
            print(f"🏆 {best.frame_size[0]}x{best.frame_size[1]}")
            print(f"   Plate Number: {best.plate_number}")
            print(f"   Confidence: {best.plate_confidence:.3f}")
            print(f"   Time: {best.detection_time_ms:.1f}ms")
        else:
            print("❌ No valid plate detected in any frame size")
        
        return results
    
    def run_live_comparison(self):
        """Run live comparison between two frame sizes side by side"""
        # Define sizes to compare
        size1 = (640, 480)
        size2 = (1920, 1080)
        
        cap = cv2.VideoCapture(self.camera_index)
        
        # Set camera to highest resolution for best quality
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
        
        if not cap.isOpened():
            print("Cannot open camera")
            return
        
        print("\n🎥 LIVE COMPARISON MODE")
        print(f"Comparing: {size1[0]}x{size1[1]} vs {size2[0]}x{size2[1]}")
        print("Controls:")
        print("  SPACE - Capture and compare frame")
        print("  ESC   - Quit")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process both sizes on the same frame
            result1 = self.process_frame_with_size(frame, size1)
            result2 = self.process_frame_with_size(frame, size2)
            
            # Create display frames
            display1 = cv2.resize(frame, size1)
            display2 = cv2.resize(frame, size2)
            display2 = cv2.resize(display2, (640, 480))  # Resize for display
            
            # Draw results on frames
            if result1.plate_detected and result1.plate_bbox:
                x1, y1, x2, y2 = result1.plate_bbox
                cv2.rectangle(display1, (x1, y1), (x2, y2), (0, 255, 0), 2)
                if result1.plate_number:
                    cv2.putText(display1, result1.plate_number, (x1, y1-10),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            if result2.plate_detected and result2.plate_bbox:
                # Scale bbox from 1920x1080 to 640x480 for display
                scale_x = 640 / 1920
                scale_y = 480 / 1080
                x1, y1, x2, y2 = result2.plate_bbox
                x1, x2 = int(x1 * scale_x), int(x2 * scale_x)
                y1, y2 = int(y1 * scale_y), int(y2 * scale_y)
                cv2.rectangle(display2, (x1, y1), (x2, y2), (0, 255, 0), 2)
                if result2.plate_number:
                    cv2.putText(display2, result2.plate_number, (x1, y1-10),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Add labels
            cv2.putText(display1, f"{size1[0]}x{size1[1]}", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(display2, f"{size2[0]}x{size2[1]}", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Show side by side
            comparison = np.hstack([display1, display2])
            cv2.imshow("Size Comparison", comparison)
            
            key = cv2.waitKey(1) & 0xFF
            if key == 27:  # ESC
                break
            elif key == 32:  # SPACE
                print("\n" + "="*60)
                print(f"{size1[0]}x{size1[1]}: {result1.plate_number if result1.plate_number else 'None'} (conf: {result1.plate_confidence:.3f})")
                print(f"{size2[0]}x{size2[1]}: {result2.plate_number if result2.plate_number else 'None'} (conf: {result2.plate_confidence:.3f})")
                print("="*60)
        
        cap.release()
        cv2.destroyAllWindows()

def main():
    # Configuration
    PLATE_MODEL_PATH = "./vision/ai_models/plate.pt"
    CHAR_MODEL_PATH = "./vision/ai_models/character.pt"
    
    # Choose mode
    MODE = "live_comparison"  # "single_comparison" or "live_comparison"
    
    processor = ComparisonProcessor(
        plate_model_path=PLATE_MODEL_PATH,
        char_model_path=CHAR_MODEL_PATH,
        plate_conf_threshold=0.5,
        char_conf_threshold=0.4
    )
    
    if MODE == "single_comparison":
        # Test multiple sizes on one captured frame
        frame_sizes = [
            (640, 480),
            (1280, 720),
            (1920, 1080)
        ]
        processor.compare_sizes(frame_sizes)
        
    elif MODE == "live_comparison":
        # Live comparison between two sizes
        processor.run_live_comparison()

if __name__ == "__main__":
    main()