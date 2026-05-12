import torch
from ultralytics import YOLO

class CharacterDetector:
    def __init__(self, model_path, confidence_threshold=0.4, device="cpu"):
        self.verbose = False
        self.model = YOLO(str(model_path), verbose=self.verbose)
        self.model.to(device)
        self.model.fuse()  # Optimize conv+bn layers for faster inference
        self.device = device
        self.confidence_threshold = confidence_threshold

    def detect_single_image(self, image):
        with torch.no_grad():
            result = self.model(image, conf=self.confidence_threshold, verbose=self.verbose)[0]
        plate_string, bboxes, class_ids = self._process_result(result)
        
        # Return as dict for easier handling
        if plate_string is not None:
            return {
                "plate": plate_string,
                "bboxes": bboxes,
                "class_ids": class_ids
            }
        return None

        # None or
        # {"plate": "4-7-19-6-9-5-3-3", "bboxes": [...], "class_ids": [4,7,19,6,9,5,3,3]}


    def detect_batch(self, images):
        with torch.no_grad():
            results = self.model(images, conf=self.confidence_threshold, verbose=self.verbose)
        processed = []
        for result in results:
            plate_string, bboxes, class_ids = self._process_result(result)
            if plate_string is not None:
                processed.append({
                    "plate": plate_string,
                    "bboxes": bboxes,
                    "class_ids": class_ids
                })
            else:
                processed.append(None)
        return processed

        # [
        #     None,                                                                             # Image 1: no detection
        #     {"plate": "4-7-19-6-9-5-3-3", "bboxes": [...], "class_ids": [4,7,19,6,9,5,3,3]},  # Image 2
        #     None,                                                                             # Image 3: no detection
        #     {"plate": "5-3-18-7-2-4-1-0", "bboxes": [...], "class_ids": [5,3,18,7,2,4,1,0]}   # Image 4
        # ]
    

    def _process_result(self, detection):
        if detection is None or detection.boxes is None:
            return None, None, None
        
        characters_bbox = detection.boxes
        
        # Must detect exactly 8 characters for a complete license plate
        if len(characters_bbox) != 8:
            return None, None, None
        
        # Sort characters from left to right by x-coordinate
        sorted_char_bbox = sorted(characters_bbox, key=lambda box: box.xyxy.cpu().numpy().astype(int)[0][0])
        
        plate_number = [-1, -1, -1, -1, -1, -1, -1, -1]
        char_bboxes = []  
        char_class_ids = [] 
        
        for i in range(0, 8):
            box = sorted_char_bbox[i]
            class_idx = int(box.cls[0])
            
            # Get bounding box coordinates (x1, y1, x2, y2)
            x1, y1, x2, y2 = box.xyxy.cpu().numpy().astype(int)[0]
            
            # Position validation rules for Persian license plates
            if i in [0, 1, 3, 4, 5, 6, 7]:  # Digit positions
                # These positions must be digits (0-9)
                if class_idx >= 10:  # Values >= 10 are letters, not allowed
                    return None, None, None
                # Positions 0, 3, and 6 cannot be zero
                if i == 0 and class_idx == 0:
                    return None, None, None
                if i == 3 and class_idx == 0:
                    return None, None, None
                if i == 6 and class_idx == 0:
                    return None, None, None
                    
            elif i == 2:  # Letter position (position 3 in Persian plates)
                # This position must be a letter (Persian alphabet indices 10-31)
                if class_idx < 10 or class_idx > 30:
                    return None, None, None
            
            # Store everything
            plate_number[i] = class_idx
            char_bboxes.append([x1, y1, x2, y2])  # Append to list
            char_class_ids.append(class_idx)      # Append to list
        
        # Convert to string with hyphens for API/display
        # Example: [4,7,19,6,9,5,3,3] -> "4-7-19-6-9-5-3-3"
        plate_string = "-".join(str(digit) for digit in plate_number)
        
        return plate_string, char_bboxes, char_class_ids