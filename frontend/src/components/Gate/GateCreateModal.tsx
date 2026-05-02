
import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { robustFetch } from "@/src/utils/apiFetch";
import { Gate } from '@/src/types/gate';
import { Area } from '@/src/types/area';

const NAME_LOCATION_PATTERN = /^[\u0600-\u06ff\s]+$/;
const CAMERA_PATTERN = /^[a-zA-Z0-9:/.@:]+$/;

interface GateCreateProps {
    area: Area;
    onGateCreate: (a: Gate,) => void;
}

const GateCreateModal: React.FC<GateCreateProps> = ({ area, onGateCreate }) => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [camera, setCamera] = useState('');
    const [role, setRole] = useState('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFormValid, setIsFormValid] = useState<boolean>(false);
    const [isNameValid, setIsNameValid] = useState<boolean>(false);
    const [isGateCameraValid, setIsGateCameraValid] = useState<boolean>(false);
    const [nameErrorMessage, setNameErrorMessage] = useState<string | null>("نام گیت باید فقط حروف فارسی باشد");
    const [gateCameraErrorMessage, setgateCameraErrorMessage] = useState<string | null>("آدرس دوربین باید معتبر باشد");

    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);


    useEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;
        const handleHidden = () => {
            clearInput();
        };
        modal.addEventListener('hidden.bs.modal', handleHidden);

        return () => {
            modal.removeEventListener('hidden.bs.modal', handleHidden);
        };
    }, []); 

    const clearInput = () => {
        setName('');
        setCamera('');
        setRole('');
        validateName('');
        validateCamera('');
    }

    // --- Helper function to validate name and set state ---
    const validateName = (currentName: string) => {
        if (currentName.trim() === '' || !NAME_LOCATION_PATTERN.test(currentName)) {
            setIsNameValid(false);
            setNameErrorMessage("نام گیت باید فقط حروف فارسی باشد");
            return false; // Indicate invalid
        } else {
            setIsNameValid(true);
            setNameErrorMessage(null);
            return true; // Indicate valid
        }
    };

    // --- Helper function to validate location and set state ---
    const validateCamera = (currentValue: string) => {
        if (currentValue.trim() === '' || !CAMERA_PATTERN.test(currentValue)) {
            setIsGateCameraValid(false);
            setgateCameraErrorMessage("آدرس دوربین باید معتبر باشد");
            return false; // Indicate invalid
        } else {
            setIsGateCameraValid(true);
            setgateCameraErrorMessage(null);
            return true; // Indicate valid
        }
    };

    //==========  Error managment section ==========
    useEffect(() => {
        setIsFormValid(isNameValid === true && isGateCameraValid === true);
    }, [isNameValid, isGateCameraValid]);

    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value);
        validateName(value);
    };

    const handleCameraChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCamera(value);
        validateCamera(value);
    };
    //==============================================

    const handleGateCreate = async () => {
        if (name === '' || camera === '') return;
        setIsSubmitting(true);
        try {
            const response = await robustFetch({
                url: `api/gates/`,
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name,
                    camera: camera,
                    area: area.id,
                    role: role,
                }),
                router: router
            });

            if (response.success !== true) {
                console.error(`Gate create error: ${response.message}`);
                const error_code = response.code;
                if (error_code === 401) {
                    setNameErrorMessage('اسم گیت در سیستم وجود دارد، اسم گیت باید یکتا باشد');
                    setIsNameValid(false);
                }
            } else {
                console.log("Gate created successfully:", response);
                closeBtnRef.current?.click();
                clearInput();
                onGateCreate(response.data.gate);
            }

        } catch (err) {
            console.error("Failed to create gate:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div aria-hidden="true" className="modal fade" id="gateCreate" tabIndex={-1} ref={modalRef}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">ساخت گیت</h5>
                            <h5>
                                <button className="btn btn-light-danger b-r-25 f-s-17" data-bs-dismiss="modal" type="button" ref={closeBtnRef}>انصراف</button>
                                {isFormValid ? (
                                    isSubmitting ? (
                                        <button className="btn btn-light-see-blue b-r-25 f-s-17" type="button"> ساخت گیت ...<span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span></button>
                                    ) : (
                                        <button className="btn btn-light-see-blue b-r-25 f-s-17" onClick={handleGateCreate} type="submit">ساخت گیت</button>
                                    )
                                ) : (
                                    <button className="btn btn-light-see-blue b-r-25 disabled f-s-17" type="button">ساخت گیت</button>
                                )}
                            </h5>
                        </div>
                        <div className="modal-body">
                            <form
                                className="app-form rounded-control row g-3 needs-validation was-validated" noValidate>
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <br />
                                            <label className="form-label f-s-17" htmlFor="editName">نام گیت</label>
                                            <div className="icon-form">
                                                <i className="ti ti-article"></i>
                                                <input
                                                    className={`form-control ${nameErrorMessage ? 'is-invalid' : ''}`}
                                                    placeholder="نام گیت را وارد کنید"
                                                    name="gateName"
                                                    id="editGateName"
                                                    type="text"
                                                    value={name}
                                                    onChange={handleNameChange}
                                                    autoComplete="off"
                                                    required
                                                />
                                                {nameErrorMessage && (
                                                    <div className="invalid-feedback f-s-15">{nameErrorMessage}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label f-s-17" htmlFor="editCamera">آدرس دوربین</label>
                                            <div className="icon-form">
                                                <i className="ti ti-map-pin"></i>
                                                <input
                                                    className={`form-control ${gateCameraErrorMessage ? 'is-invalid' : ''}`}
                                                    placeholder="آدرس گیت را وارد کنید"
                                                    name="gateCamera"
                                                    id="editGateCamera"
                                                    type="text"
                                                    value={camera}
                                                    onChange={handleCameraChange}
                                                    autoComplete="off"
                                                    required
                                                />
                                                {gateCameraErrorMessage && (
                                                    <div className="invalid-feedback f-s-15">{gateCameraErrorMessage}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <label className="form-label" htmlFor="role">نوع گیت</label>
                                        <select
                                            className="form-select rtl-select"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            required
                                        >
                                            <option value="">انتخاب کنید</option>
                                            <option value="ENTERY">ورودی</option>
                                            <option value="EXIT">خروجی</option>
                                            <option value="SURVEILLANCE">نظارت</option>
                                        </select>
                                        {role === '' && (
                                            <div className="invalid-feedback f-s-15 d-block f-s-15 text-danger">
                                                برای ساخت گیت نیاز به نوع گیت است
                                            </div>
                                        )}
                                        <br />
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
export default GateCreateModal;