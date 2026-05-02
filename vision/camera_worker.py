import cv2
import time
import threading
import multiprocessing
from vision.utils import log
from typing import Optional
from dotenv import load_dotenv
load_dotenv()


class gateWorkerThread(threading.Thread):
    def __init__(
        self, stream_url, gate_id, gate_idx, width, height, share_memory, fps, stop_event):
        super().__init__(name=f"Gates Worker-{gate_id}", daemon=False)
        self.stream_url = stream_url
        self.gate_id = gate_id
        self.gate_idx = gate_idx
        self.width = width
        self.height = height
        self.share_memory = share_memory
        self.stop_event = stop_event
        TARGET_FPS = fps
        self.target_interval = 1 / TARGET_FPS

    def run(self):
        cap: Optional[cv2.VideoCapture] = None
        log(f"Gates Worker-{self.gate_id}", "start")
        try:
            cap = cv2.VideoCapture(self.stream_url)
            if not cap.isOpened():
                log(f"Gates Worker-{self.gate_id}", "ERROR: Cannot open stream")
                return

            last_publish = time.monotonic()

            while not self.stop_event.is_set():
                if not cap.grab():
                    continue

                now = time.monotonic()
                if now - last_publish >= self.target_interval:
                    ret, frame = cap.retrieve()
                    if not ret:
                        continue

                    last_publish += self.target_interval
                    
                    # Resize and write frame to shared memory
                    resized = cv2.resize(frame, (self.width, self.height))
                    
                    try:
                        self.share_memory.write_frame(self.gate_idx, resized)
                    except Exception as e:
                        log(f"Gates Worker-{self.gate_id}", f"Error writing to shared memory: {e}")

        except KeyboardInterrupt:
            pass
        except Exception as e:
            log(f"Gates Worker-{self.gate_id}", f"Error: {e}")
        finally:
            if cap:
                cap.release()
            log(f"Gates Worker-{self.gate_id}", "stop")



class gateGroupProcess(multiprocessing.Process):
    def __init__(self, gates_list, share_memory, width, height, processor_id, fps, stop_event=None):
        """
        gate_list: list of tuples -> [(name, url, idx), ...]
        """
        super().__init__(name=f"Gates Worker Manager-{processor_id}", daemon=False)
        self.gates_list = gates_list
        self.share_memory = share_memory
        self.width = width
        self.height = height
        self.fps = fps
        self.stop_event = stop_event
        self.processor_id = processor_id
        self.threads = []

    def run(self):
        # Start gate threads
        for gate in self.gates_list:
            url = gate["camera"]
            id = gate["id"]
            idx = gate["gate_idx"]
            t = gateWorkerThread(
                url,
                id,
                idx,
                self.width,
                self.height,
                self.share_memory,
                self.fps,
                stop_event=self.stop_event
            )
            t.start()
            self.threads.append(t)

        # Wait for all threads to finish
        try:
            for t in self.threads:
                t.join()
        except KeyboardInterrupt:
            pass
        finally:
            log(f"Gates Worker Manager-{self.processor_id}", "stop")