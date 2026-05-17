import os
import queue
import time
import multiprocessing
from vision.utils import log 
from dotenv import load_dotenv

load_dotenv()

class SavingProcess(multiprocessing.Process):
    """Dedicated process for saving training data in YOLO format."""
    
    def __init__(self, save_queue, stop_event):
        super().__init__(name="Plate_DataSaver", daemon=True)

        self.path = os.getenv('PLATE_DATASET', './dataset/plate/')        
        os.makedirs(self.path, exist_ok=True)
        os.makedirs(os.path.join(self.path, 'images'), exist_ok=True)
        os.makedirs(os.path.join(self.path, 'labels'), exist_ok=True)
        
        self.save_queue = save_queue
        self.stop_event = stop_event
        
        # Get starting index (continue from existing files)
        existing_images = len(os.listdir(os.path.join(self.path, 'images')))
        self.idx = existing_images + 1
        
        log(self.name, f"Started. Starting index: {self.idx}")
        
    def run(self):        
        while not self.stop_event.is_set():
            try:
                task = self.save_queue.get(timeout=0.1)
                
                # Extract data from task
                image = task.get("image", None)  # JPEG bytes
                gate_id = task.get("gate_id", None)
                bboxes = task.get("bboxes", [])  # List of bounding boxes [[x1,y1,x2,y2], ...]
                image_shape = task.get("image_shape", None)  # (height, width)
                
                if image is not None and bboxes and len(bboxes) > 0 and gate_id is not None:
                    try:
                        self._save_yolo_format(image, gate_id, bboxes, image_shape)
                        self.idx += 1
                        
                        if self.idx % 100 == 0:
                            log(self.name, f"Saved {self.idx} samples")
                    except Exception as e:
                        log(self.name, f"Error saving: {e}")
                
            except queue.Empty:
                continue
            except Exception as e:
                log(self.name, f"Error saving: {e}")
                continue
            
            time.sleep(0.1)
    
    def _save_yolo_format(self, image, gate_id, bboxes, image_shape=None, class_id=0):
        """
        Save image and labels in YOLO format.
        
        YOLO label format:
        class_id center_x center_y width height
        All values normalized to [0, 1]
        
        Args:
            image: JPEG bytes
            gate_id: Gate identifier
            bboxes: List of bounding boxes [[x1,y1,x2,y2], ...] (1 or more)
            image_shape: Tuple of (height, width)
            class_id: Class ID for license plate (default 0)
        """
        try:
            h, w = image_shape if image_shape else (1080, 1920)
            
            # Save image
            image_path = os.path.join(self.path, 'images', f'{self.idx}_{gate_id}.jpg')
            with open(image_path, 'wb') as f:
                f.write(image)
            
            # Save label file with all annotations
            label_path = os.path.join(self.path, 'labels', f'{self.idx}_{gate_id}.txt')
            with open(label_path, 'w', encoding='utf-8') as f:
                for bbox in bboxes:
                    x1, y1, x2, y2 = map(int, bbox)
                    
                    # Convert to YOLO format (normalized)
                    center_x = ((x1 + x2) / 2) / w
                    center_y = ((y1 + y2) / 2) / h
                    width = (x2 - x1) / w
                    height = (y2 - y1) / h
                    
                    # Clamp values to [0, 1]
                    center_x = max(0, min(1, center_x))
                    center_y = max(0, min(1, center_y))
                    width = max(0, min(1, width))
                    height = max(0, min(1, height))
                    
                    # Write one line per plate
                    f.write(f"{class_id} {center_x:.6f} {center_y:.6f} {width:.6f} {height:.6f}\n")
            
        except Exception as e:
            log(self.name, f"Error in _save_yolo_format: {e}")
            raise