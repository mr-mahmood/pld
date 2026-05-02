"use client";


import { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { robustFetch } from "@/src/utils/apiFetch";
import { useActiveUser } from "@/src/contexts/active_user_context";
import { UserData } from "@/src/types/userData";

interface ProfileImageUploaderProps {
    UserData: UserData | null;
}

export default function ProfileImageUploader({ UserData }: ProfileImageUploaderProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { activeUser, setActiveUser, getRoleInFarsi } = useActiveUser();

    const [preview, setPreview] = useState<string | null>(UserData?.profile_image || null);

    useEffect(() => {
        const imageUrl = UserData?.profile_image || '';
        setPreview(imageUrl);
    }, [UserData]);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    useEffect(() => {
        const imageUrl = UserData?.profile_image || '';
        setPreview(imageUrl);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [UserData?.profile_image]);

    const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            setPreview(UserData?.profile_image || null);
            setSelectedFile(null);
            return;
        }
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            setPreview(UserData?.profile_image || null);
            setSelectedFile(null);
            return;
        }
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
                setPreview(event.target.result);
            }
        };
        reader.onerror = () => {
            setPreview(UserData?.profile_image || null);
            setSelectedFile(null);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadClick = async () => {
        if (!selectedFile || !UserData?.id) return;
        setIsUploading(true);

        const formData = new FormData();
        formData.append('profile_image', selectedFile);
        try {
            const response = await robustFetch({
                url: `api/users/${UserData.id}/`,
                method: 'PUT',
                headers: {},
                body: formData,
                router,
            });
            if (!response.success) {
                throw new Error(response.message || "Upload failed");
            }
            const updateUser = response.data?.user;
            if (!updateUser) {
                throw new Error("API did not return a valid user object.");
            }
            if (UserData?.id === activeUser?.id) {
                setActiveUser(updateUser);
            }
        } catch (error) {
            console.error("Error uploading profile image:", error);
            throw error;
        } finally {
            setSelectedFile(null);
            setIsUploading(false);
        }
    };

    const role = UserData?.role;
    const role_name = getRoleInFarsi(role);

    return (
        <>
            <div className="app-divider-v primary justify-content-center">
                <span className="badge text-bg-primary f-s-16">عکس پروفایل</span>
            </div>
            <div className="profile-tab profile-container">
                <div className="profile-pic avatar-preview" style={{ cursor: 'pointer' }} />
                <div className="image-details">
                    <div className="profile-pic">
                        <div className="avatar-upload">
                            <div className="avatar-edit">
                                <input
                                    ref={fileInputRef}
                                    accept="image/png, image/jpeg, image/jpg"
                                    id="imageUpload"
                                    type="file"
                                    onChange={handleImageSelection}
                                    style={{ display: 'none' }}
                                    disabled={isUploading}
                                />
                                <label htmlFor="imageUpload">
                                    <i className="ti ti-pencil"></i>
                                </label>
                            </div>
                            <div className="avatar-preview">
                                <img
                                    key={preview || 'default'}
                                    src={preview || ''}
                                    alt="Profile Picture Preview"
                                    className="rounded-circle"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="person-details">
                    <h5 className="f-w-600">
                        {UserData?.first_name} {UserData?.last_name}
                    </h5>
                    <p className="text-muted f-s-25 mb-0">{role_name}</p>
                </div>
                <div className="row">
                    <div className="col-md-12">
                        <div className="text-end">
                            <br />
                            <button
                                className="btn btn-light-see-blue b-r-25"
                                data-bs-target="#webCam"
                                data-bs-toggle="modal"
                                type="button"
                            >
                                عکس گرفتن
                            </button>
                            {selectedFile ? (
                                isUploading ? (
                                    <button className="btn btn-light-see-blue b-r-25" type="button">
                                        آپدیت... <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-light-see-blue b-r-25"
                                        onClick={handleUploadClick}
                                        type="submit"
                                    >
                                        آپدیت
                                    </button>
                                )
                            ) : (
                                <button
                                    className="btn btn-light-see-blue b-r-25 disabled"
                                    type="button"
                                    disabled
                                >
                                    آپدیت
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
