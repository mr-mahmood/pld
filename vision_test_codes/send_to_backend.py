import cv2
import torch
import requests
import numpy as np
from ultralytics import YOLO
from datetime import datetime

class PlateDetector:
    def __init__(self, model_path, confidence_threshold=0.4, device="cpu"):
        self.verbose = False
        self.model = YOLO(str(model_path), verbose=self.verbose)
        self.model.to(device)
        self.model.fuse()
        self.device = device
        self.confidence_threshold = confidence_threshold

    def detect_single_image(self, image):
        with torch.no_grad():
            result = self.model(image, conf=self.confidence_threshold, verbose=self.verbose)[0]
        return self._process_result(result)
        
    def _process_result(self, result):
        try:
            if result.boxes is None or result.boxes.xyxy is None:
                return None
            
            boxes = result.boxes.xyxy.cpu().numpy().astype(int)
            confs = result.boxes.conf.cpu().numpy()
            return [{"confidence": float(conf), "bbox": box.tolist()} for box, conf in zip(boxes, confs)]
        except Exception as e:
            print(f'plate detection error: {e}')
            return None


class CharacterDetector:
    def __init__(self, model_path, confidence_threshold=0.4, device="cpu"):
        self.verbose = False
        self.model = YOLO(str(model_path), verbose=self.verbose)
        self.model.to(device)
        self.model.fuse()
        self.device = device
        self.confidence_threshold = confidence_threshold

    def detect_single_image(self, image):
        with torch.no_grad():
            result = self.model(image, conf=self.confidence_threshold, verbose=self.verbose)[0]
        return self._process_result(result)
        
    def _process_result(self, detection):
        try:
            if detection.boxes is None or len(detection.boxes) != 8:
                return None
            
            characters_bbox = detection.boxes
            
            # Sort characters by x coordinate (left to right)
            sorted_char_bbox = sorted(characters_bbox, key=lambda box: box.xyxy[0][0])
            
            plate_number = [-1, -1, -1, -1, -1, -1, -1, -1]
            
            for i in range(0, 8):
                if i in [0, 1, 3, 4, 5, 6, 7]:  # Digits positions
                    class_idx = int(sorted_char_bbox[i].cls[0])
                    if class_idx >= 10:  # Should be digit (0-9)
                        return None
                    plate_number[i] = class_idx
                elif i == 2:  # Letter position
                    class_idx = int(sorted_char_bbox[i].cls[0])
                    if class_idx < 10:  # Should be letter (10+)
                        return None
                    plate_number[i] = class_idx
            
            # Convert to string format
            plate_string = "-".join(str(x) for x in plate_number)
            return plate_string
            
        except Exception as e:
            print(f'character detection error: {e}')
            return None


def resize_with_padding(image, target_w=640, target_h=480):
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


def send_to_backend(gate_id, plate_number, image):
    """
    Send plate data to backend as form data
    
    Args:
        gate_id (str): Gate identifier
        plate_number (str): Formatted plate number (e.g., "1-1-15-2-3-6-5-6")
        image (numpy array): The captured image
    """
    # Encode image to JPEG format
    _, img_encoded = cv2.imencode('.jpg', image)
    img_bytes = img_encoded.tobytes()
    
    # Prepare form data
    files = {
        'image': ('plate_image.jpg', img_bytes, 'image/jpeg')
    }
    
    data = {
        'gate': gate_id,
        'plate': plate_number,
    }
    
    try:
        # Send POST request to backend
        # Replace with your actual backend URL
        backend_url = "http://localhost:8000/api/access/check/"
        
        response = requests.post(backend_url, files=files, data=data)
        
        if response.status_code == 200:
            print(f"✓ Successfully sent plate {plate_number} to backend")
            print(response.text)
            return True
        else:
            print(f"✗ Failed to send to backend. Status: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Error sending to backend: {e}")
        return False


def main():
    print("Initializing models...")
    
    # Initialize detectors
    plate_detector = PlateDetector("./vision/models/plate/plate.pt", confidence_threshold=0.5)
    char_detector = CharacterDetector("./vision/models/character/character.pt", confidence_threshold=0.4)
    
    # Gate ID (you can change this or make it configurable)
    GATE_ID = "3"
    
    # Open webcam
    print("Opening webcam...")
    cap = cv2.VideoCapture("http://localhost:8080/video")  # Use 0 for default webcam
    # For IP camera: cap = cv2.VideoCapture("http://localhost:8080/video")
    
    if not cap.isOpened():
        print("Cannot open camera")
        return
    
    print("Press SPACE to capture image and detect plate")
    print("Press ESC to quit")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break
        
        frame = cv2.resize(frame, (1920, 1080))
        # Show live feed
        cv2.imshow("Press SPACE to capture", frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == 27:  # ESC key
            print("Exiting...")
            break
            
        elif key == 32:  # SPACE key
            print("\n" + "="*50)
            print("Capturing image...")
            
            # Step 1: Detect plate
            print("Detecting license plate...")
            plate_results = plate_detector.detect_single_image(frame)
            
            if plate_results and len(plate_results) > 0:
                # Get the highest confidence plate
                best_plate = max(plate_results, key=lambda x: x['confidence'])
                bbox = best_plate['bbox']
                x1, y1, x2, y2 = bbox
                
                print(f"✓ Plate detected with confidence: {best_plate['confidence']:.2f}")
                
                # Crop plate area
                h_frame, w_frame = frame.shape[:2]
                x1 = max(0, x1)
                y1 = max(0, y1)
                x2 = min(w_frame, x2)
                y2 = min(h_frame, y2)
                
                plate_crop = frame[y1:y2, x1:x2]
                
                if plate_crop is not None and plate_crop.size != 0:
                    # Resize with padding for character detection
                    plate_resized = resize_with_padding(plate_crop, 640, 480)
                    
                    # Step 2: Detect characters
                    print("Detecting characters...")
                    plate_number = char_detector.detect_single_image(plate_resized)
                    print(plate_number)
                    
                    if plate_number and plate_number != "-".join(["-1"]*8):
                        print(f"✓ License plate number: {plate_number}")
                        
                        # Step 3: Send to backend
                        print("Sending to backend...")
                        send_to_backend(GATE_ID, plate_number, frame)
                        
                        # Show result on frame
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                        cv2.putText(frame, f"Plate: {plate_number}", (x1, y1-10),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                        cv2.imshow("Press SPACE to capture", frame)
                        cv2.waitKey(1000)  # Show result for 1 second
                    else:
                        print("✗ Failed to detect valid plate number (characters not recognized properly)")
                else:
                    print("✗ Invalid plate crop")
            else:
                print("✗ No license plate detected in image")
            
            print("="*50 + "\n")
    
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()