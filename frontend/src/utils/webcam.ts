import { useRef, useEffect, useState } from "react";

interface WebcamUtils {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    startStream: () => Promise<boolean>;
    captureFrame: () => string | undefined;
    stopStream: () => void;
}

const useWebcamUtils = (): WebcamUtils => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);

    const startStream = async (): Promise<boolean> => {
        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 },
                },
                audio: false,
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => console.warn("Auto-play blocked", e));
                };
            }
            setIsStreamActive(true);
            return true;
        } catch (err) {
            console.error("Failed to start webcam:", err);
            return false;
        }
    };

    const captureFrame = () => {
        if (!videoRef.current || !videoRef.current.srcObject) {
            console.error("No active stream");
            return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL("image/jpeg", 1);
        return imageDataUrl;
    };
    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = '';
            videoRef.current.pause();
        }
        setIsStreamActive(false);
    };
    useEffect(() => {
        return () => stopStream();
    }, []);
    return {
        videoRef,
        canvasRef,
        startStream,
        captureFrame,
        stopStream,
    };
};
export default useWebcamUtils;
