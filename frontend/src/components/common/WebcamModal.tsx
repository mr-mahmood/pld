
import { useRef, useEffect, useState } from "react";
import useWebcamUtils from "@/src/utils/webcam";
import { UserData } from "@/src/types/userData";
import { base64ToFormData } from "../../utils/base64ToFormData";
import { robustFetch } from "@/src/utils/apiFetch";
import { useRouter } from "next/navigation";
import { useActiveUser } from "@/src/contexts/active_user_context";

interface userDataImageProfileProps {
    userData: UserData | null;
    onUserUpdated: (a: UserData) => void; //update the table values after request
}

const WebcamModal: React.FC<userDataImageProfileProps> = ({ userData, onUserUpdated }) => {
    const router = useRouter();
    const { activeUser, setActiveUser } = useActiveUser();
    const { videoRef, startStream, captureFrame, stopStream } = useWebcamUtils();
    const [isStart, setIsStart] = useState<boolean>(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isSubmiting, setIsSubmiting] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (userData) {
            const modalElement = modalRef.current;

            const handleShow = () => {
                startStream().catch(err => console.error("Failed to start stream:", err));
            };
            const handleHide = () => {
                setCapturedImage(null);
                setUploadError(null);
                stopStream();
            };
            modalElement?.addEventListener("show.bs.modal", handleShow);
            modalElement?.addEventListener("hide.bs.modal", handleHide);
            return () => {
                modalElement?.removeEventListener("show.bs.modal", handleShow);
                modalElement?.removeEventListener("hide.bs.modal", handleHide);
            };
        }
    }, [ userData ]);

    useEffect(() => {
        if (!capturedImage && isStart) {
            startStream().catch(err => console.error("Failed to start stream:", err));
            setIsStart(false);
        }
    }, [capturedImage]);

    const handleCapture = () => {
        const imageDataUrl = captureFrame();
        if (imageDataUrl) {
            stopStream();
            setCapturedImage(imageDataUrl);
        } else {
            console.warn("Failed to capture frame: no active stream or video element");
        }
    };

    const handleUpload = async () => {
        if (!capturedImage || !userData) return;
        setIsSubmiting(true);

        const imageFromData = base64ToFormData(capturedImage, 'profile_image');
        try {
            const response = await robustFetch({
                url: `api/users/${userData.id}/`,
                method: 'PUT',
                headers: {},
                body: imageFromData,
                router,
            });
            if (!response.success) {
                throw new Error(response.message || "Upload failed");
            }
            const updateUser = response.data?.user;
            if (userData?.id === activeUser?.id) {
                setActiveUser(updateUser);
            }
            onUserUpdated(updateUser);
            closeBtnRef.current?.click();
        } catch (error) {
            console.error("Error uploading profile image:", error);
            throw error;
        } finally {
            setUploadError(null);
            setIsSubmiting(false)
        }
    };

    const handleRetake = () => {
        setIsStart(true);
        setCapturedImage(null);
        setUploadError(null);
    };

    return (
        <div className="modal fade" id="webCam" tabIndex={-1} aria-labelledby="webCamLabel" aria-hidden="true" ref={modalRef}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="webCamLabel">آپدیت عکس پروفایل</h5>
                        <button className="btn btn-light-danger b-r-25 f-s-17" data-bs-dismiss="modal" type="button" ref={closeBtnRef}>انصراف</button>
                    </div>
                    <div className="modal-body">
                        <div className="image-preview-container">
                            {capturedImage ? (
                                <img
                                    key="captured-image"
                                    src={capturedImage}
                                    alt="Captured Preview"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <video
                                    key="webcam-video"
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            )}
                        </div>
                        <div className="mt-3 text-left">
                            {capturedImage ? (
                                <>
                                    <button className="btn btn-light-danger b-r-25 f-s-17" onClick={handleRetake} disabled={isSubmiting}>
                                        دوباره گرفتن
                                    </button>
                                    <button
                                        className="btn btn-light-see-blue b-r-25 f-s-17 ms-2"
                                        onClick={handleUpload}
                                    >
                                        {isSubmiting ? (
                                            <>
                                                آپلود عکس ...
                                                <span className="spinner-border spinner-border-sm ms-2" role="status"></span>
                                            </>
                                        ) : 'آپلود عکس'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="btn btn-light-see-blue b-r-25 f-s-17"
                                    onClick={handleCapture}
                                    disabled={isSubmiting}
                                >
                                    گرفتن عکس
                                </button>
                            )}
                            <div className="text-center">
                                {uploadError && <p className="mt-2 mb-0 text-danger f-s-20">{uploadError}</p>}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
export default WebcamModal;
