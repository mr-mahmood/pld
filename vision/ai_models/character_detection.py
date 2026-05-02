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
        return self._process_result(result)

        # Example output:
        #     [9, 8, 12, 7, 8, 8, 1, 1]

    def detect_batch(self, images):
        with torch.no_grad():
            results = self.model(images, conf=self.confidence_threshold, verbose=self.verbose)
        return [self._process_result(result) for result in results]

        # Example output:
        # [
        #     # Image 1
        #     None
        # 
        #     # Image 2
        #     [9, 8, 12, 7, 8, 8, 1, 1]
        #  
        # ]
        
    # def _process_result(self, result):
    #     boxes = result.boxes.xyxy.cpu().numpy().astype(int)
    #     confs = result.boxes.conf.cpu().numpy().astype(float)
    #     return [{"confidence": float(conf), "bbox": box.tolist(), "label": box.cls[0]} for box, conf in zip(boxes, confs)]
           
    def _process_result(self, detection):
        plate_number = [-1, -1, -1, -1, -1, -1, -1, -1]
        
        if detection is None or detection.boxes is None:
            return None
        
        characters_bbox = detection.boxes
        
        if len(characters_bbox) != 8:
            return None
        
        # Sort characters from left to right
        sorted_char_bbox = sorted(characters_bbox, key=lambda box: box.xyxy.cpu().numpy().astype(int)[0][0])
        
        for i in range(0, 8):
            class_idx = int(sorted_char_bbox[i].cls[0])
            
            # Position validation rules
            if i in [0, 1, 3, 4, 5, 6, 7]:  # Digit positions
                # Rule: These positions must be digits (0-9)
                if class_idx >= 10:  # Values >= 10 are letters, not allowed
                    return None
                
                # Rule: Positions 0, 3, and 6 cannot be zero
                if i == 0 and class_idx == 0:
                    return None
                if i == 3 and class_idx == 0:
                    return None
                if i == 6 and class_idx == 0:
                    return None
                    
            elif i == 2:  # Letter position (Persian alphabet)
                # Rule: This position must be a letter (10-31) - letters are indices 10-31
                if class_idx < 10 or class_idx > 30:
                    return None
            
            # Store the value if all validations pass
            plate_number[i] = class_idx
        
        # Check if any detection failed
        if -1 in plate_number:
            return None
        
        # Convert to string with hyphens
        return "-".join(str(digit) for digit in plate_number)