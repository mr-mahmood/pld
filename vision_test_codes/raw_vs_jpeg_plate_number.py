import cv2
import torch
import numpy as np
from ultralytics import YOLO

# -------------------------------
# Re-use your detectors (same as in your main project)
# -------------------------------
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
            sorted_char_bbox = sorted(characters_bbox, key=lambda box: box.xyxy[0][0])
            plate_number = [-1] * 8
            for i in range(8):
                class_idx = int(sorted_char_bbox[i].cls[0])
                if i in [0, 1, 3, 4, 5, 6, 7]:  # digits
                    if class_idx >= 10:
                        return None
                elif i == 2:  # letter
                    if class_idx < 10:
                        return None
                plate_number[i] = class_idx
            return "-".join(str(x) for x in plate_number)
        except Exception as e:
            print(f'character detection error: {e}')
            return None


def resize_with_padding(image, target_w=640, target_h=480):
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


# -------------------------------
# Main comparison loop
# -------------------------------
def main():
    print("Initializing models...")
    plate_detector = PlateDetector("./vision/models/plate/plate.pt", confidence_threshold=0.5)
    char_detector = CharacterDetector("./vision/models/character/character.pt", confidence_threshold=0.4)

    print("Opening webcam at 1920x1080...")
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

    if not cap.isOpened():
        print("Cannot open camera")
        return

    print("\nControls:")
    print("  SPACE - Capture and compare raw vs JPEG")
    print("  ESC   - Quit")

    cv2.namedWindow("Live Feed", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Live Feed", 960, 540)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Show live feed
        display_frame = cv2.resize(frame, (960, 540))
        cv2.imshow("Live Feed", display_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break
        elif key == 32:  # SPACE
            # Ensure frame is 1920x1080 (if camera doesn't support it, resize)
            if frame.shape[1] != 1920 or frame.shape[0] != 1080:
                frame = cv2.resize(frame, (1920, 1080))

            print("\n" + "=" * 70)
            print("Testing RAW vs JPEG (quality=90) pipeline")

            # Detect plates on RAW frame
            plate_results = plate_detector.detect_single_image(frame)
            if not plate_results:
                print("✗ No plate detected on RAW frame")
                continue

            best = max(plate_results, key=lambda x: x['confidence'])
            x1, y1, x2, y2 = map(int, best['bbox'])
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)

            # --- RAW crop and padded version ---
            raw_crop = frame[y1:y2, x1:x2].copy()
            raw_padded = resize_with_padding(raw_crop, 640, 480)
            raw_plate = char_detector.detect_single_image(raw_padded)

            # --- JPEG full-frame compression (simulates storage) ---
            jpeg_quality = 85
            _, jpeg_buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
            jpeg_size = len(jpeg_buf)
            # Decode back to numpy
            frame_jpeg = cv2.imdecode(np.frombuffer(jpeg_buf, dtype=np.uint8), cv2.IMREAD_COLOR)
            jpeg_crop = frame_jpeg[y1:y2, x1:x2].copy()  # type: ignore
            jpeg_padded = resize_with_padding(jpeg_crop, 640, 480)
            jpeg_plate = char_detector.detect_single_image(jpeg_padded)

            # --- Display results ---
            print(f"Plate bbox: ({x1},{y1}) -> ({x2},{y2})")
            print(f"RAW crop size: {raw_crop.shape[1]}x{raw_crop.shape[0]}")
            print(f"JPEG crop size: {jpeg_crop.shape[1]}x{jpeg_crop.shape[0]}")
            print(f"Full frame JPEG size: {jpeg_size:,} bytes ({jpeg_size/1024:.1f} KB)")
            print(f"Compression ratio: {frame.nbytes / jpeg_size:.1f}x")
            print("-" * 40)
            print(f"RAW plate number:    {raw_plate}")
            print(f"JPEG plate number:   {jpeg_plate}")
            if raw_plate == jpeg_plate:
                print(" ✓ Results MATCH")
            else:
                print(" ✗ Results DIFFER – JPEG compression changed the reading!")

            # --- Side-by-side visual comparison ---
            # 1) Crops (original vs JPEG)
            crop_compare = np.hstack((raw_crop, jpeg_crop))
            cv2.putText(crop_compare, "RAW crop", (10, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(crop_compare, "JPEG crop", (raw_crop.shape[1] + 10, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

            # 2) Padded (640x480) versions
            padded_compare = np.hstack((raw_padded, jpeg_padded)) # type: ignore
            cv2.putText(padded_compare, "RAW padded", (10, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(padded_compare, "JPEG padded", (640 + 10, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

            cv2.imshow("Crop Comparison (RAW vs JPEG)", crop_compare)
            cv2.imshow("Padded Comparison (640x480)", padded_compare)

            # Annotate live frame with both results
            annotated = frame.copy()
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            y_text = y1 - 10 if y1 > 30 else y2 + 30
            cv2.putText(annotated, f"RAW: {raw_plate}  JPEG: {jpeg_plate}",
                        (x1, y_text), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.imshow("Live Feed", cv2.resize(annotated, (960, 540)))

            print("=" * 70)
            cv2.waitKey(0)  # wait for key press to continue

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()