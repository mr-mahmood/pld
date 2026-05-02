import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { robustFetch } from "@/src/utils/apiFetch";
import { Area } from '@/src/types/area';

const NAME_LOCATION_PATTERN = /^[\u0600-\u06ff\s]+$/;

interface AreaEditProps {
    areaData: Area | null; // The area object to edit
    onAreaUpdated: (a: Area) => void; //update the table values after request
}

const AreaEditModal: React.FC<AreaEditProps> = ({ areaData, onAreaUpdated }) => {
    // State for the form inputs within the modal
    const router = useRouter();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFormValid, setIsFormValid] = useState<boolean>(false);
    const [isNameValid, setIsNameValid] = useState<boolean>(false);
    const [nameErrorMessage, setNameErrorMessage] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Effect to update form fields when areaData prop changes
    useEffect(() => {
        if (areaData) {
            setName(areaData.name);
            validateName(areaData.name);

            const modalElement = modalRef.current;

            const handleHidden = () => {
                // Modal is now hidden
                if (areaData) {
                    setName(areaData.name);
                    validateName(areaData.name);
                }
            };

            // const handleShown = () => {
            //     console.log("Modal is now visible (shown.bs.modal event).");
            // };

            if (modalElement) {
                // modalElement.addEventListener('shown.bs.modal', handleShown);
                modalElement.addEventListener('hidden.bs.modal', handleHidden);
            }
        }
    }, [areaData]); // Re-run this effect when areaData changes

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

    const handleUpdateArea = async (updatedArea: Area) => {
        setIsSubmitting(true);
        try {
            const response = await robustFetch({
                url: `api/areas/${updatedArea.id}/`,
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: updatedArea.name
                }),
                router: router
            });

            if (response.success !== true) {
                console.error(`Area info update error: ${response.message}`);
                const error_code = response.code;
                if (error_code === 401) {
                    console.error("Error while updating area: ", response.message);
                    setNameErrorMessage('اسم محوطه در سیستم وجود دارد، اسم محوطه باید یکتا باشد');
                    setIsNameValid(false);
                }
            } else {
                // Update your local list
                closeBtnRef.current?.click();
                console.log("Area updated successfully:", response);
                onAreaUpdated(response.data.area);
            }

        } catch (err) {
            console.error("Failed to update area:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateClick = () => {
        if (!areaData) return; // Should not happen if used correctly

        const updatedArea: Area = {
            ...areaData, // Keep the original ID and any other unchanged properties
            name: name,
        };
        handleUpdateArea(updatedArea);
    };

    return (
        <>
            <div aria-hidden="true" className="modal fade" id="areaEdit" tabIndex={-1} ref={modalRef}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">آپدیت محوطه</h5>
                            <h5>
                                <button className="btn btn-light-danger b-r-25 f-s-17" data-bs-dismiss="modal" type="button" ref={closeBtnRef}>انصراف</button>
                                {isFormValid ? (
                                    isSubmitting ? (
                                        <button className="btn btn-light-see-blue b-r-25 f-s-17" type="button"> آپدیت اطلاعات ...<span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span></button>
                                    ) : (
                                        <button className="btn btn-light-see-blue b-r-25 f-s-17" onClick={handleUpdateClick} type="submit">آپدیت اطلاعات</button>
                                    )
                                ) : (
                                    <button className="btn btn-light-see-blue b-r-25 disabled f-s-17" type="button">آپدیت اطلاعات</button>
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
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
export default AreaEditModal;