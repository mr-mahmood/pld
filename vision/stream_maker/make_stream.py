from flask import Flask, Response
from flask_cors import CORS
import cv2
import threading
import time

app = Flask(__name__)
CORS(app)  # allow cross-origin requests

# ----------------------------
# Shared frame buffer
# ----------------------------
latest_frame = None
frame_lock = threading.Lock()

# Capture thread settings
CAMERA_SOURCE = 0           # Change to your camera index or URL
TARGET_FPS = 30             # Limit capture rate
FRAME_INTERVAL = 1 / TARGET_FPS

# ----------------------------
# Capture thread
# ----------------------------
def capture_frames():
    global latest_frame
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    if not cap.isOpened():
        print("[Camera] ERROR: Cannot open camera")
        return

    print(f"[Camera] Capture thread start.")
    last_time = time.time()
    while True:
        now = time.time()
        if now - last_time < FRAME_INTERVAL:
            time.sleep(FRAME_INTERVAL - (now - last_time))
        last_time = time.time()

        ret, frame = cap.read()
        if not ret:
            continue

        # Resize if needed
        frame_resized = cv2.resize(frame, (640, 480))

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
        <title>Live Webcam Stream</title>
    </head>
    <body>
        <h1>Live Webcam Stream</h1>
        <img src="/video" crossorigin="anonymous" width="640" height="480">
    </body>
    </html>
    """

# ----------------------------
# Start capture thread and Flask
# ----------------------------
if __name__ == "__main__":
    # Start single camera capture thread
    capture_thread = threading.Thread(target=capture_frames, daemon=True)
    capture_thread.start()

    try:
        app.run(host="localhost", port=8080, threaded=True)
    finally:
        print("Main] Flask stop")