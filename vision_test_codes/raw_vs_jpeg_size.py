import cv2
import numpy as np

def main():
    quality = 90  # adjust this to test different levels

    print("Opening webcam...")
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

    if not cap.isOpened():
        print("Cannot open camera")
        return

    print(f"\nCurrent camera resolution: {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")
    print(f"JPEG quality for test: {quality}")
    print("\nPress SPACE to capture and compare")
    print("Press ESC to quit")

    cv2.namedWindow("Live View", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Live View", 960, 540)

    while True:
        ret, frame = cap.read()
        
        frame = cv2.resize(frame, (1920, 1080))
        if not ret:
            break

        cv2.imshow("Live View", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == 27:  # ESC
            break
        elif key == 32:  # SPACE
            # ---- RAW size ----
            raw_bytes = frame.nbytes  # height * width * channels
            h, w, c = frame.shape
            print(f"\n--- Frame size: {w}x{h}, {c} channels ---")
            print(f"RAW (uncompressed) size: {raw_bytes:,} bytes ({raw_bytes/1024:.1f} KB, {raw_bytes/1024/1024:.2f} MB)")

            # ---- JPEG compression ----
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
            result, jpeg_buffer = cv2.imencode('.jpg', frame, encode_params)
            if not result:
                print("JPEG encoding failed")
                continue

            jpeg_size = len(jpeg_buffer)
            print(f"JPEG (quality={quality}) size: {jpeg_size:,} bytes ({jpeg_size/1024:.1f} KB, {jpeg_size/1024/1024:.2f} MB)")
            print(f"Compression ratio: {raw_bytes / jpeg_size:.1f}x")

            # ---- Decode back to image for visual comparison ----
            jpeg_as_np = np.frombuffer(jpeg_buffer, dtype=np.uint8)
            decoded = cv2.imdecode(jpeg_as_np, cv2.IMREAD_COLOR)

            # Show side-by-side: original left, JPEG right
            comparison = np.hstack((frame, decoded)) # type: ignore
            cv2.putText(comparison, "Original", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(comparison, f"JPEG q={quality}", (w + 20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

            cv2.namedWindow("Comparison: Original vs JPEG", cv2.WINDOW_NORMAL)
            cv2.resizeWindow("Comparison: Original vs JPEG", 1280, 360)
            cv2.imshow("Comparison: Original vs JPEG", comparison)

            print("Visual comparison shown. Press any key to continue.")
            cv2.waitKey(0)
            cv2.destroyWindow("Comparison: Original vs JPEG")

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()