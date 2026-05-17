import os
import cv2
import time
from pathlib import Path

DATASET_PATH = "./dataset/character/"

images_path = Path(DATASET_PATH) / 'images'
labels_path = Path(DATASET_PATH) / 'labels'

# Get all jpg files
image_files = sorted(list(images_path.glob('*.jpg')))

print(f"Found {len(image_files)} images")

for i, image_path in enumerate(image_files):
    print(f"[{i+1}/{len(image_files)}] {image_path.name}")
    
    # Load image
    image = cv2.imread(str(image_path))
    if image is None:
        continue
    
    # Load labels
    label_path = labels_path / f"{image_path.stem}.txt"
    if label_path.exists():
        with open(label_path, 'r') as f:
            h, w = image.shape[:2]
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5:
                    class_id = int(parts[0])
                    cx = float(parts[1]) * w
                    cy = float(parts[2]) * h
                    bw = float(parts[3]) * w
                    bh = float(parts[4]) * h
                    
                    x1 = int(cx - bw/2)
                    y1 = int(cy - bh/2)
                    x2 = int(cx + bw/2)
                    y2 = int(cy + bh/2)
                    
                    cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(image, str(class_id), (x1, y1-5), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    
    # Show image (wait 1 second between images)
    cv2.imshow('Dataset Viewer', image)
    if cv2.waitKey(1000) == 27:  # 1000ms = 1 second, ESC to exit
        break

cv2.destroyAllWindows()