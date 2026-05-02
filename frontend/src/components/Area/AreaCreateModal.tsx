
import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { robustFetch } from "@/src/utils/apiFetch";
import { Area } from '@/src/types/area';

const NAME_LOCATION_PATTERN = /^[\u0600-\u06ff\s]+$/;

interface AreaEditProps {
    onAreaCreate: (a: Area, b: boolean) => void;
}

const AreaCreateModal: React.FC<AreaEditProps> = ({ onAreaCreate }) => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFormValid, setIsFormValid] = useState<boolean>(false);
    const [isNameValid, setIsNameValid] = useState<boolean>(false);
    const [nameErrorMessage, setNameErrorMessage] = useState<string | null>(null);
    const [redirectToNewArea, setRedirectToNewArea] = useState(false);

    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);


    useEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;
        const handleHidden = () => {
            clearInput();
        };
        modal.addEventListener('hidden.bs.modal', handleHidden);
        // تمیز کردن listener هنگام تخریب کامپوننت
        return () => {
            modal.removeEventListener('hidden.bs.modal', handleHidden);
        };
    }, []); // وابستگی خالی — فقط یک بار اجرا شود

    const clearInput = () => {
        setName('');
        validateName('');
        setRedirectToNewArea(false);
    }

    // --- Helper function to validate name and set state ---
    const validateName = (currentName: string) => {
        if (currentName.trim() === '' || !NAME_LOCATION_PATTERN.test(currentName)) {
            setIsNameValid(false);
            setNameErrorMessage("نام محوطه باید فقط حروف فارسی باشد");
            return false; // Indicate invalid
        } else {
            setIsNameValid(true);
            setNameErrorMessage(null);
            return true; // Indicate valid
        }
    };

    //==========  Error managment section ==========
    useEffect(() => {
        setIsFormValid(isNameValid === true);
    }, [isNameValid]);

    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value);
        validateName(value);
    };

    //==============================================

    const handleAreaCreate = async () => {
        if (name === '') return;
        setIsSubmitting(true);
        try {
            const response = await robustFetch({
                url: `api/areas/`,
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name,
                }),
                router: router
            });

            if (response.success !== true) {
                console.error(`Area create error: ${response.message}`);
                const error_code = response.code;
                if (error_code === 401) {
                    setNameErrorMessage('اسم محوطه در سیستم وجود دارد، اسم محوطه باید یکتا باشد');
                    setIsNameValid(false);
                }
            } else {
                console.log("Area created successfully:", response);
                closeBtnRef.current?.click();
                clearInput();
                onAreaCreate(response.data.area, redirectToNewArea);
            }

        } catch (err) {
            console.error("Failed to create area:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div aria-hidden="true" className="modal fade" id="areaCreate" tabIndex={-1} ref={modalRef}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">ساخت محوطه</h5>
                            <h5>
                                <button className="btn btn-light-danger b-r-25 f-s-17" data-bs-dismiss="modal" type="button" ref={closeBtnRef}>انصراف</button>
                                {isFormValid ? (
                                    isSubmitting ? (
                                        <button className="btn btn-light-see-blue b-r-25 f-s-17" type="button"> ساخت محوطه ...<span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span></button>
                                    ) : (
                                        <button className="btn btn-light-see-blue b-r-25 f-s-17" onClick={handleAreaCreate} type="submit">ساخت محوطه</button>
                                    )
                                ) : (
                                    <button className="btn btn-light-see-blue b-r-25 disabled f-s-17" type="button">ساخت محوطه</button>
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
                                            <label className="form-label f-s-17" htmlFor="editName">نام محوطه</label>
                                            <div className="icon-form">
                                                <i className="ti ti-article"></i>
                                                <input
                                                    className={`form-control ${nameErrorMessage ? 'is-invalid' : ''}`}
                                                    placeholder="نام محوطه را وارد کنید"
                                                    name="areaName"
                                                    id="editAreaName"
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
                                        <input
                                            type="checkbox"
                                            className="form-check-input mg-2"
                                            id="redirect_after_create"
                                            checked={redirectToNewArea}
                                            onChange={(e) => setRedirectToNewArea(e.target.checked)}
                                        />
                                        <label className="form-check-label mg-t-3 mg-e-5 f-s-16" htmlFor="redirect_after_create">
                                            پس از ایجاد محوطه، به صفحه محوطه جدید برو
                                        </label>
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
export default AreaCreateModal;