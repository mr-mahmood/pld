import cv2
import torch
from ultralytics import YOLO

model = YOLO('./vision/models/plate/plate.pt')
cap = cv2.VideoCapture('http://localhost:8080/video')

if not cap.isOpened():
    print("Error: Could not open webcam")
    exit()

ret, test_frame = cap.read()
frame_height, frame_width = 1080, 1920

cv2.namedWindow("stream", cv2.WINDOW_NORMAL)
cv2.resizeWindow("stream", 960, 540)
            
# CONFIGURABLE MARGINS (adjust these values)
MARGIN_PERCENT = 0.07  # 7% margin from all edges

LEFT_MARGIN = int(frame_width * MARGIN_PERCENT)
RIGHT_MARGIN = int(frame_width * (1 - MARGIN_PERCENT))
TOP_MARGIN = int(frame_height * MARGIN_PERCENT)
BOTTOM_MARGIN = int(frame_height * (1 - MARGIN_PERCENT))

MIN_PLATE_WIDTH = 120
USE_CENTER_CHECK = False  # True = check plate center, False = check entire plate

print(f"ROI Box: {LEFT_MARGIN},{TOP_MARGIN} to {RIGHT_MARGIN},{BOTTOM_MARGIN}")
print(f"Margin: {MARGIN_PERCENT*100}% from each edge")

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame = cv2.resize(frame, (1920, 1080))

    results = model(frame)
    
    # Draw ROI box
    cv2.rectangle(frame, (LEFT_MARGIN, TOP_MARGIN), (RIGHT_MARGIN, BOTTOM_MARGIN), 
                  (0, 255, 0), 2)
    
    boxes = results[0].boxes
    output_frame = frame.copy()
    
    if boxes is not None and len(boxes) > 0:
        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            confidence = box.conf[0].item()
            box_width = x2 - x1
            
            # Check if plate is in ROI
            if USE_CENTER_CHECK:
                # Check if center of plate is in ROI
                center_x = (x1 + x2) // 2
                center_y = (y1 + y2) // 2
                in_roi = (LEFT_MARGIN <= center_x <= RIGHT_MARGIN and 
                         TOP_MARGIN <= center_y <= BOTTOM_MARGIN)
            else:
                # Check if entire plate is in ROI
                in_roi = (x1 >= LEFT_MARGIN and x2 <= RIGHT_MARGIN and 
                         y1 >= TOP_MARGIN and y2 <= BOTTOM_MARGIN)
            
            if in_roi and box_width >= MIN_PLATE_WIDTH:
                cv2.rectangle(output_frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                cv2.putText(output_frame, f"VALID: {confidence:.2f}", 
                           (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            else:
                cv2.rectangle(output_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                reason = "Outside ROI" if not in_roi else f"Too small ({box_width}<{MIN_PLATE_WIDTH})"
                cv2.putText(output_frame, reason, (x1, y1 - 10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
    
    cv2.imshow('stream', output_frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()