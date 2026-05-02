from flask import Flask, Response
from flask_cors import CORS
import cv2
import threading
import time
import os

app = Flask(__name__)
CORS(app)  # allow cross-origin requests

# ----------------------------
# Shared frame buffer
# ----------------------------
latest_frame = None
frame_lock = threading.Lock()

# Video settings
VIDEO_PATH = "./vision/stream_maker/1.mp4"  # Change this to your video file path
TARGET_FPS = 30             # Limit capture rate
FRAME_INTERVAL = 1 / TARGET_FPS
LOOP_VIDEO = True           # Set to False to stop when video ends

# ----------------------------
# Video playback thread
# ----------------------------
def play_video():
    global latest_frame
    cap = cv2.VideoCapture(VIDEO_PATH)
    
    if not cap.isOpened():
        print(f"[Video] ERROR: Cannot open video file: {VIDEO_PATH}")
        return

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"[Video] Playing: {VIDEO_PATH}")
    print(f"[Video] Original FPS: {fps}, Total frames: {total_frames}")
    print(f"[Video] Loop mode: {'ON' if LOOP_VIDEO else 'OFF'}")

    last_time = time.time()
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        
        # If video ends and looping is enabled, restart
        if not ret:
            if LOOP_VIDEO:
                print(f"[Video] Restarting video (played {frame_count} frames)")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_count = 0
                continue
            else:
                print(f"[Video] Video ended (played {frame_count} frames)")
                # Option 1: Stop thread
                break
                # Option 2: Keep showing last frame (comment break and uncomment below)
                # time.sleep(0.1)
                # continue
        
        # Control playback speed
        now = time.time()
        elapsed = now - last_time
        if elapsed < FRAME_INTERVAL:
            time.sleep(FRAME_INTERVAL - elapsed)
        last_time = time.time()
        
        frame_count += 1

        # Resize if needed
        frame_resized = cv2.resize(frame, (1920, 1080))


        # Encode to JPEG
        ret, buffer = cv2.imencode(".jpg", frame_resized)
        if not ret:
            continue

        with frame_lock:
            latest_frame = buffer.tobytes()

# ----------------------------
# MJPEG generator
# ----------------------------
def generate_frames():
    while True:
        with frame_lock:
            if latest_frame is None:
                # If no frame yet, send a placeholder
                time.sleep(0.1)
                continue
            frame_bytes = latest_frame
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(FRAME_INTERVAL)  # Optional: control client FPS

# ----------------------------
# Flask routes
# ----------------------------
@app.route("/video")
def video_feed():
    return Response(generate_frames(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/")
def index():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Video Stream Player</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                background-color: #f0f0f0;
                margin: 20px;
            }
            img {
                border: 2px solid #333;
                border-radius: 5px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .info {
                margin-top: 10px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <h1>Video Stream Player</h1>
        <img src="/video" crossorigin="anonymous" width="640" height="480">
        <div class="info">
            <p>Streaming: """ + VIDEO_PATH + """</p>
            <p>Loop mode: """ + ('ON' if LOOP_VIDEO else 'OFF') + """</p>
        </div>
    </body>
    </html>
    """

# ----------------------------
# Utility route to get video info
# ----------------------------
@app.route("/info")
def video_info():
    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        return {"error": "Cannot open video file"}
    
    info = {
        "path": VIDEO_PATH,
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        "duration_seconds": cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS) if cap.get(cv2.CAP_PROP_FPS) > 0 else 0,
        "loop": LOOP_VIDEO
    }
    cap.release()
    return info

# ----------------------------
# Start playback thread and Flask
# ----------------------------
if __name__ == "__main__":
    # Check if video file exists
    if not os.path.exists(VIDEO_PATH):
        print(f"[Error] Video file not found: {VIDEO_PATH}")
        print("[Error] Please update VIDEO_PATH variable with a valid video file path")
    
    # Start video playback thread
    video_thread = threading.Thread(target=play_video, daemon=True)
    video_thread.start()

    print(f"\n[Server] Starting Flask server...")
    print(f"[Server] Open http://localhost:8080 in your browser")
    print(f"[Server] Video info at http://localhost:8080/info")
    
    try:
        app.run(host="localhost", port=8080, threaded=True)
    finally:
        print("[Server] Flask stopped")