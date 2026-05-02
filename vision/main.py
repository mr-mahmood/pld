import os
import time
import multiprocessing
from dotenv import load_dotenv
import cv2, queue
import requests
from vision.utils import fetch_gates_from_backend, split_gates, log
from vision.share_memory import SharedFrameStore
from vision.camera_worker import gateGroupProcess
from vision.plate_detection_worker import PlateDetectionWorker
from vision.character_detection_worker import CharacterDetectionWorker
from copy import deepcopy

load_dotenv()


def send_to_api(item):
    """
    Send full frame with plate detection to API (without saving to disk)
    """
    API_URL =  "http://localhost:8000/api/access/check/"
    HEADERS = {"Authorization": "Bearer sUpErsecreTcvtoken123@#fg5"}
    
    plate_number = item["plate_number"]
    gate_id = item["gate"]
    frame = item["frame"]
    confidence = item["confidence"]

    log("API Sender", f"Sending plate: {plate_number} for gate {gate_id}")
    
    # Draw bounding box on the frame for visualization
    bbox = item["bbox"]
    x1, y1, x2, y2 = map(int, bbox)
    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
    
    # Encode image to PNG format in memory
    success, encoded_image = cv2.imencode('.png', frame)
    if not success:
        print(f"❌ Failed to encode image for {plate_number}")
        return None
    
    # Prepare the multipart form data with in-memory image
    files = {
        'image': (f"plate_{plate_number}_gate_{gate_id}.png", encoded_image.tobytes(), 'image/png')
    }
    
    data = {
        'plate': plate_number,
        'gate': gate_id,
        'confidence': confidence,
    }
    
    try:
        response = requests.post(
            API_URL,
            files=files,
            data=data,
            headers=HEADERS,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
        else:
            log("API Sender", f"❌ Request failed for {plate_number}")
        
        return response
        
    except requests.exceptions.RequestException as e:
        log("API Sender", f"❌ Request failed for {plate_number}: {e}")
        return None
    

def main():
    log("Main", "start")
    # -----------------------------------------------
    # Configuration
    # -----------------------------------------------
    WIDTH = int(os.getenv("WIDTH", 1920))
    HEIGHT = int(os.getenv("HEIGHT", 1080))
    CHANNELS = int(os.getenv("CHANNELS", 3))
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 10))
    FPS = int(os.getenv("FPS", 10))
    
    # -----------------------------------------------
    # Fetch gates / cameras and create chunks
    # -----------------------------------------------
    gates = fetch_gates_from_backend()

    num_cameras = len(gates)
    camera_chunks = split_gates(gates, chunk_size=CHUNK_SIZE)

    # -----------------------------------------------
    # Create shared memory store
    # -----------------------------------------------
    shared_memory = SharedFrameStore(
        num_cameras=num_cameras,
        width=WIDTH,
        height=HEIGHT,
        channels=CHANNELS
    )

    # Multiprocessing stop event
    stop_event = multiprocessing.Event()

    # -----------------------------------------------
    # Create Queues
    # -----------------------------------------------
    plate_queue = multiprocessing.Queue(maxsize=500)
    character_queue = multiprocessing.Queue(maxsize=500)

    # -----------------------------------------------
    # Start Camera + plate Detection
    # -----------------------------------------------
    camera_processes = []
    plate_detection_workers = []

    for chunk_id, chunk in enumerate(camera_chunks):

        camera_proc = gateGroupProcess(
            gates_list=chunk,
            share_memory=shared_memory,
            width=WIDTH,
            height=HEIGHT,
            processor_id=chunk_id,
            fps=FPS,
            stop_event=stop_event
        )
        camera_proc.start()
        camera_processes.append(camera_proc)

        time.sleep(1)

        plate_worker = PlateDetectionWorker(
            gates_list=chunk,
            share_memory=shared_memory,
            stop_event=stop_event,
            queue=plate_queue,
            worker_id=chunk_id,
            width=WIDTH,
            height=HEIGHT,
            fps=FPS
        )
        plate_worker.start()
        plate_detection_workers.append(plate_worker)

    # -----------------------------------------------
    # Start character Detection Workers
    # -----------------------------------------------
    character_processing_workers = []
    time.sleep(2)
    for i in range(len(camera_chunks)//2 + 1):
        worker = CharacterDetectionWorker(
            stop_event=stop_event,
            input_queue=plate_queue,
            output_queue=character_queue,
            worker_id=i
        )
        worker.start()
        character_processing_workers.append(worker)

    log("Main", "System start")
    log("Main", "Quit the System with CONTROL-C")

    # -----------------------------------------------
    # Main loop → API sender
    # -----------------------------------------------
    try:
        while True:
            try:
                item = character_queue.get_nowait()
                send_to_api(item)
            except queue.Empty:
                time.sleep(1)
                continue

    except KeyboardInterrupt:
        log("Main", "Shutdown initiated")
        stop_event.set()

    # -----------------------------------------------
    # Shutdown sequence (reverse order)
    # -----------------------------------------------

    # 1️⃣ Stop cameras (producers of frames)
    for p in camera_processes:
        p.join(timeout=3)
        if p.is_alive():
            p.terminate()

    # 2️⃣ Stop plate detection (producers of ROIs)
    for p in plate_detection_workers:
        p.join(timeout=3)
        if p.is_alive():
            p.terminate()

    # 3️⃣ Stop character workers (producers of embeddings)
    for p in character_processing_workers:
        p.join()

    # At this point:
    # NO process can push to character_embedder_queue anymore.

    # -----------------------------------------------
    # Drain remaining embeddings
    # -----------------------------------------------
    log("Main", "Draining remaining API payloads")

    while True:
        try:
            item = character_queue.get_nowait()
            send_to_api(item)
        except queue.Empty:
            break

    log("Main", "API queue fully drained")
    shared_memory.close()
    log("Main", "All processes stopped")



if __name__ == "__main__":
    multiprocessing.freeze_support()  # safe on Windows
    main()
    
    # python -m vision.main