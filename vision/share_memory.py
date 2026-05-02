import numpy as np
import multiprocessing as mp
from multiprocessing.shared_memory import SharedMemory
from vision.utils import log

class SharedFrameStore:
    def __init__(self, num_cameras, width, height, channels):
        self.num_cameras = num_cameras
        self.width = width
        self.height = height
        self.channels = channels
        self.frame_shape = (height, width, channels)
        self.frame_size = np.prod(self.frame_shape) * np.dtype(np.uint8).itemsize
        self.total_size = int(self.frame_size) * int(self.num_cameras)

        # Per-camera locks to prevent cross-camera contention
        self.locks = [mp.Lock() for _ in range(num_cameras)]

        # Shared memory block to store all frames
        self.frames_shm = SharedMemory(create=True, size=self.total_size)

        # frame_status: 0 = empty, 1 = ready & unread, 2 = read (waiting for next write)
        self.frame_status = mp.Array('i', [0] * num_cameras)
        
        log(f"Shared Memory", "start")

    def write_frame(self, camera_idx, frame):
        camera_idx = int(camera_idx)
        if frame.shape != self.frame_shape:
            raise ValueError(f"Invalid frame shape {frame.shape}, expected {self.frame_shape}")

        offset = camera_idx * self.frame_size
        with self.locks[camera_idx]:
            # Mark frame as not ready during write
            self.frame_status[camera_idx] = 0

            if self.frames_shm.buf is None:
                log(f"Shared Memory", "Shared memory buffer is None")
            else:
                np_frame = np.ndarray(
                    self.frame_shape,
                    dtype=np.uint8,
                    buffer=self.frames_shm.buf[offset:offset + self.frame_size]
                )
                np.copyto(np_frame, frame)

                # Mark frame as ready after write
                self.frame_status[camera_idx] = 1

    def read_frame(self, camera_idx):
        camera_idx = int(camera_idx)
        offset = camera_idx * self.frame_size

        with self.locks[camera_idx]:
            if self.frame_status[camera_idx] != 1:
                # log('\n already reead this frame')
                # Frame either not ready or already read
                return None

            if self.frames_shm.buf is None:
                log(f"Shared Memory", "Shared memory buffer is None")
                return None

            np_frame = np.ndarray(
                self.frame_shape,
                dtype=np.uint8,
                buffer=self.frames_shm.buf[offset:offset + self.frame_size]
            )
            frame_copy = np_frame.copy()

            # Mark frame as read
            self.frame_status[camera_idx] = 2

        return frame_copy

    def close(self):
        self.frames_shm.close()
        self.frames_shm.unlink()
        log(f"Shared Memory", "close")
