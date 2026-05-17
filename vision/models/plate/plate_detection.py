import torch
from ultralytics import YOLO


class PlateDetector:
    def __init__(self, model_path, confidence_threshold = 0.4, device= "cpu",):
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
        # {
        #     "confidence": 0.94,
        #     "bbox": [112, 76, 238, 210],
        # }

    def detect_batch(self, images):
        with torch.no_grad():
            results = self.model(images, conf=self.confidence_threshold, verbose=self.verbose)
        return [self._process_result(result) for result in results]

        # Example output:
        # [
        #     {
        #         "confidence": 0.94,
        #         "bbox": [112, 76, 238, 210],
        #     },
        #     {
        #         "confidence": 0.91,
        #         "bbox": [98, 65, 220, 198],
        #     }
        # ]
        
        
    def _process_result(self, result):
        try:
            # Check for boxes
            if result.boxes is None or result.boxes.xyxy is None:
                return None

            # Bounding box and confidence
            boxes = result.boxes.xyxy.cpu().numpy().astype(int)
            confs = result.boxes.conf.cpu().numpy()
            return [{"confidence": float(conf), "bbox": box.tolist()} for box, conf in zip(boxes, confs)]

        except Exception as e:
            print(f'plate detection error: {e}')
            return None