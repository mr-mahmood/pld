import cv2
import numpy as np
import time
from datetime import datetime

class MotionDetectorMOG2:
    def __init__(self, history=500, varThreshold=16, detectShadows=True, min_area=500):
        """
        Using MOG2 Background Subtractor (much better than frame differencing)
        
        history: number of frames to build background (500 = ~20 seconds at 25fps)
        varThreshold: sensitivity (lower = more sensitive, typical: 16-100)
        detectShadows: detects shadows as gray (can be ignored)
        min_area: minimum contour area to consider as motion
        """
        self.min_area = min_area
        self.backSub = cv2.createBackgroundSubtractorMOG2(
            history=history, 
            varThreshold=varThreshold, 
            detectShadows=detectShadows
        )
        self.total_pixels = None
        
    def detect(self, frame):
        # Apply background subtraction
        fgmask = self.backSub.apply(frame)
        
        # Remove shadows if needed (shadows appear as gray values 1-254)
        # Keep only pure foreground (255)
        _, fgmask = cv2.threshold(fgmask, 250, 255, cv2.THRESH_BINARY)
        
        # Initialize total pixels count
        if self.total_pixels is None:
            self.total_pixels = fgmask.shape[0] * fgmask.shape[1]
        
        # Apply morphological operations to remove noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_OPEN, kernel, iterations=2)
        fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_CLOSE, kernel, iterations=2)
        
        # Dilate to fill gaps
        fgmask = cv2.dilate(fgmask, None, iterations=2)
        
        # Calculate motion percentage
        motion_pixels = np.count_nonzero(fgmask)
        motion_percent = (motion_pixels / self.total_pixels) * 100
        
        # Find contours
        contours, _ = cv2.findContours(fgmask.copy(), cv2.RETR_EXTERNAL, 
                                       cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter by area and draw bounding boxes
        motion_detected = False
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < self.min_area:
                continue
            motion_detected = True
            # Draw bounding box on original frame
            (x, y, w, h) = cv2.boundingRect(contour)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            # Optional: add area text
            cv2.putText(frame, f"{int(area)}px", (x, y-5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
        
        return fgmask, motion_percent, motion_detected


class MotionDetectorMOG2Advanced:
    """Advanced version with ROI selection and sensitivity presets"""
    
    def __init__(self, sensitivity='medium', min_area=500, roi=None):
        """
        sensitivity: 'low' (less sensitive), 'medium', 'high' (more sensitive)
        roi: region of interest as (x, y, width, height) or None for full frame
        """
        self.min_area = min_area
        self.roi = roi
        
        # Set threshold based on sensitivity
        thresholds = {
            'low': 100,
            'medium': 50,
            'high': 25,
            'very_high': 16
        }
        varThreshold = thresholds.get(sensitivity, 50)
        
        self.backSub = cv2.createBackgroundSubtractorMOG2(
            history=500,
            varThreshold=varThreshold,
            detectShadows=False  # Disable shadows for cleaner mask
        )
        self.total_pixels = None
        
    def apply_roi(self, frame, mask):
        """Apply region of interest to reduce processing area"""
        if self.roi is not None:
            x, y, w, h = self.roi
            # Draw ROI rectangle on frame
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
            # Create ROI mask
            roi_mask = np.zeros(mask.shape, dtype=np.uint8)
            roi_mask[y:y+h, x:x+w] = 1
            mask = mask * roi_mask
        return mask
    
    def detect(self, frame):
        # Apply background subtraction
        fgmask = self.backSub.apply(frame)
        
        # Threshold to binary (remove shadows if detectShadows=True)
        _, fgmask = cv2.threshold(fgmask, 250, 255, cv2.THRESH_BINARY)
        
        # Apply ROI if specified
        fgmask = self.apply_roi(frame, fgmask)
        
        # Initialize total pixels
        if self.total_pixels is None:
            if self.roi is not None:
                x, y, w, h = self.roi
                self.total_pixels = w * h
            else:
                self.total_pixels = fgmask.shape[0] * fgmask.shape[1]
        
        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_OPEN, kernel)
        fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_CLOSE, kernel)
        
        # Calculate motion percentage
        motion_pixels = np.count_nonzero(fgmask)
        motion_percent = (motion_pixels / self.total_pixels) * 100
        
        # Find and filter contours
        contours, _ = cv2.findContours(fgmask.copy(), cv2.RETR_EXTERNAL,
                                       cv2.CHAIN_APPROX_SIMPLE)
        
        motion_detected = False
        for contour in contours:
            if cv2.contourArea(contour) < self.min_area:
                continue
            motion_detected = True
            (x, y, w, h) = cv2.boundingRect(contour)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        
        return fgmask, motion_percent, motion_detected


def main():
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open camera")
        return
    
    # Set resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    # Choose detector type:
    # Option 1: Standard MOG2
    detector = MotionDetectorMOG2(
        history=500,      # Frames to build background
        varThreshold=50,  # Sensitivity (16-100, lower = more sensitive)
        detectShadows=False,  # Set to True to detect shadows (slower)
        min_area=500      # Minimum motion area to detect
    )
    
    # Option 2: Advanced with ROI (uncomment to use)
    # Define ROI: x, y, width, height (e.g., ignore top/bottom)
    # roi = (100, 50, 440, 380)  # (x, y, w, h)
    # detector = MotionDetectorMOG2Advanced(
    #     sensitivity='medium',  # 'low', 'medium', 'high', 'very_high'
    #     min_area=500,
    #     roi=roi
    # )
    
    # For FPS calculation
    fps_start_time = time.time()
    fps_counter = 0
    fps = 0
    
    print("=" * 50)
    print("MOTION DETECTION WITH MOG2 BACKGROUND SUBTRACTOR")
    print("=" * 50)
    print("Press 'q' to quit")
    print("Press 's' to save current frame")
    print("Press 'r' to reset background model")
    print("Press '1' - Low sensitivity")
    print("Press '2' - Medium sensitivity")
    print("Press '3' - High sensitivity")
    print("Press 'd' - Toggle shadow detection")
    print("-" * 50)
    
    shadow_detection = False
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break
        
        display_frame = frame.copy()
        
        # Detect motion
        motion_mask, motion_percent, motion_detected = detector.detect(frame)
        
        # Calculate FPS
        fps_counter += 1
        if time.time() - fps_start_time >= 1.0:
            fps = fps_counter
            fps_counter = 0
            fps_start_time = time.time()
        
        # Create colored motion visualization (optional)
        if motion_mask is not None:
            # Black & white version
            motion_display_bw = motion_mask
            
            # Colored version (heat map style)
            motion_display_color = cv2.applyColorMap(motion_mask, cv2.COLORMAP_JET)
        else:
            motion_display_bw = np.zeros((480, 640), dtype=np.uint8)
            motion_display_color = np.zeros_like(display_frame)
        
        # Add motion percentage text
        if motion_percent > 5.0:
            color = (0, 0, 255)  # Red for high motion
            status_color = (0, 0, 255)
        elif motion_percent > 1.0:
            color = (0, 255, 255)  # Yellow for medium motion
            status_color = (0, 255, 255)
        else:
            color = (0, 255, 0)  # Green for low/no motion
            status_color = (0, 255, 0)
        
        # Draw motion percentage bar
        bar_width = int((motion_percent / 100) * 200)
        cv2.rectangle(display_frame, (10, 130), (210, 145), (50, 50, 50), -1)
        cv2.rectangle(display_frame, (10, 130), (10 + bar_width, 145), color, -1)
        
        cv2.putText(display_frame, f"Motion: {motion_percent:.2f}%", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        # Add status
        if motion_detected:
            status = "MOTION DETECTED!"
            # Flash effect for motion
            if int(time.time() * 2) % 2:
                cv2.rectangle(display_frame, (0, 0), display_frame.shape[1::-1], 
                            (0, 0, 255), 3)
        else:
            status = "STABLE"
        
        cv2.putText(display_frame, status, 
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)
        
        # Add FPS and timestamp
        cv2.putText(display_frame, f"FPS: {fps}", 
                   (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(display_frame, timestamp, 
                   (display_frame.shape[1] - 200, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Add sensitivity info
        if hasattr(detector, 'backSub'):
            thresh = detector.backSub.getVarThreshold()
            cv2.putText(display_frame, f"Sensitivity: {thresh}", 
                       (10, 115), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        # Add instructions
        cv2.putText(display_frame, "Q:Quit | S:Save | R:Reset | 1-3:Sens | D:Shadows", 
                   (10, display_frame.shape[0] - 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
        
        # Show displays
        cv2.imshow('Motion Detection - Live View', display_frame)
        cv2.imshow('Motion Mask (Black & White)', motion_display_bw)
        cv2.imshow('Motion Mask (Heat Map)', motion_display_color)
        
        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            print("\nExiting...")
            break
        
        elif key == ord('s'):
            filename = f"motion_capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            cv2.imwrite(filename, display_frame)
            cv2.imwrite(f"mask_{filename}", motion_display_bw)
            print(f"Saved: {filename} and mask_{filename}")
        
        elif key == ord('r'):
            # Reset background model
            if hasattr(detector, 'backSub'):
                detector.backSub = cv2.createBackgroundSubtractorMOG2()
            print("Background model reset")
        
        elif key == ord('1'):
            if hasattr(detector, 'backSub'):
                detector.backSub.setVarThreshold(100)
                print("Sensitivity: LOW (threshold=100)")
        
        elif key == ord('2'):
            if hasattr(detector, 'backSub'):
                detector.backSub.setVarThreshold(50)
                print("Sensitivity: MEDIUM (threshold=50)")
        
        elif key == ord('3'):
            if hasattr(detector, 'backSub'):
                detector.backSub.setVarThreshold(25)
                print("Sensitivity: HIGH (threshold=25)")
        
        elif key == ord('d'):
            shadow_detection = not shadow_detection
            if hasattr(detector, 'backSub'):
                detector.backSub.setDetectShadows(shadow_detection)
                print(f"Shadow detection: {'ON' if shadow_detection else 'OFF'}")
        
        # Print motion to console if detected
        if motion_detected and motion_percent > 1.0:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Motion: {motion_percent:.2f}%")
    
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()


def test_performance():
    """Test and compare different motion detection methods"""
    cap = cv2.VideoCapture(0)
    
    print("\nPerformance Test - Press any key to switch modes")
    print("Mode 1: Frame Differencing")
    print("Mode 2: MOG2 (Standard)")
    print("Mode 3: MOG2 with Morphology")
    
    mode = 1
    frame_count = 0
    fps_start = time.time()
    
    # Create detectors
    mog2 = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=16)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        start_time = time.time()
        
        if mode == 1:
            # Simple frame diff (not implemented here)
            result = np.zeros_like(frame)
            method_name = "Frame Diff"
        elif mode == 2:
            fgmask = mog2.apply(frame)
            _, result = cv2.threshold(fgmask, 250, 255, cv2.THRESH_BINARY)
            method_name = "MOG2"
        else:
            fgmask = mog2.apply(frame)
            _, result = cv2.threshold(fgmask, 250, 255, cv2.THRESH_BINARY)
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            result = cv2.morphologyEx(result, cv2.MORPH_OPEN, kernel)
            result = cv2.morphologyEx(result, cv2.MORPH_CLOSE, kernel)
            method_name = "MOG2+ Morph"
        
        process_time = (time.time() - start_time) * 1000  # ms
        
        # Display
        cv2.putText(frame, f"{method_name} - {process_time:.1f}ms", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.imshow('Performance Test', frame)
        cv2.imshow('Mask', result)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key != 255:
            mode = (mode % 3) + 1
            print(f"Switched to mode {mode}")
    
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    # Run main motion detection
    main()
    
    # Uncomment to run performance test
    # test_performance()