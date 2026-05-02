
import React, { useState, useEffect, useRef } from 'react';
import { robustFetch } from "@/src/utils/apiFetch";
import { useRouter } from 'next/navigation';
import { UserData } from "@/src/types/userData";
import { useActiveUser } from "@/src/contexts/active_user_context";
import { Car } from '@/src/types/car';
import ImageWithInputs from '@/src/components/plate/PlateNumberInput';

interface UserCarCreateModalProps {
    userData: UserData | null;
    onUserCarCreate: (a: Car) => void;
}

const UserCarCreateModal: React.FC<UserCarCreateModalProps> = ({ userData, onUserCarCreate }) => {

    const router = useRouter();
    const defaultValues: Omit<Car, 'image'> = {
        id: '',
        plate: '',
        model: '',
        color: '',
        is_active: true,
    };

    const [values, setValues] = useState<Omit<Car, 'image'>>({
        id: '',
        plate: '',
        model: '',
        color: '',
        is_active: true,
    });

    const patterns = {
        persian: /^[\u0600-\u06FF\s]+$/,
    };

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
    }, [userData]);

    // Add state for plate number
    const [plateNumber, setPlateNumber] = useState<string>('');
    // Handle plate change from ImageWithInputs
    const handlePlateChange = (plate: string) => {
        setPlateNumber(plate);
        setValues(prev => ({
            ...prev,
            plate: plate
        }));
        console.log(values);
    };

    const [errors, setErrors] = useState<Partial<Car>>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFormValid, setIsFormValid] = useState<boolean>(false);

    //===== Helper function to validate state ======
    const validateField = (name: keyof Car, value: string) => {
        let error = '';
        switch (name) {
            case 'color':
                if (!patterns.persian.test(value) || values.model.trim() === '')
                    error = 'رنگ ماشین باید فقط حروف فارسی باشد';
                break;
            case 'model':
                if (!patterns.persian.test(value) || values.model.trim() === '')
                    error = 'نام ماشین باید فقط حروف فارسی باشد';
                break;
        }
        setErrors(prev => ({
            ...prev,
            [name]: error || undefined,
        }));
        return !error;
    };

    //==========  validate form section ==========
    useEffect(() => {
        let isValid = true;

        // Check if plate is filled
        if (!plateNumber) {
            isValid = false;
        } else if (plateNumber.length != 16) {
            isValid = false;
        };

        Object.keys(values).forEach((key) => {
            if (key in values) {
                const valid = validateField(key as keyof Car, (values as any)[key]);
                if (!valid) isValid = false;
            }
        });
        setIsFormValid(isValid);
    }, [values]);

    //==========  Error managment section ==========
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setValues(prev => ({
            ...prev,
            [name]: value,
        }));
        validateField(name as keyof Car, value);
    };

    const handleCarCreate = async () => {
        if (!userData) return;
        setIsSubmitting(true);
        try {
            const response = await robustFetch({
                url: `api/cars/new/${userData.id}/`,
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
                router: router
            });

            if (response.success !== true) {
                console.error(`car create error: ${response.message}`);
                const error_code = response.code;
            } else {
                console.log("car created successfully:", response);
                closeBtnRef.current?.click();
                clearInput();
                onUserCarCreate(response.data.car);
            }

        } catch (err) {
            console.error("Failed to create car:", err);
        } finally {
            setIsSubmitting(false);
            setPlateNumber('');
        }
    };

    const clearInput = () => {
        setValues(defaultValues);
    }

    return (
        <>
            <div aria-hidden="true" className="modal fade" id="userCarCreate" tabIndex={-1} ref={modalRef}>
                <div className="modal-dialog modal-dialog-centered app_modal_l">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">ساخت ماشین جدید</h5>
                            <h5>
                                <button className="btn btn-light-danger b-r-25 f-s-17" data-bs-dismiss="modal" type="button" ref={closeBtnRef}>انصراف</button>
                                {isFormValid ? (
                                    isSubmitting ? (
                                        <button className="btn btn-light-see-blue b-r-25" type="button"> ساخت ماشین ...<span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span></button>
                                    ) : (
                                        <button className="btn btn-light-see-blue b-r-25" onClick={handleCarCreate} type="submit">ساخت ماشین</button>
                                    )
                                ) : (
                                    <button className="btn btn-light-see-blue b-r-25 disabled" type="button">ساخت ماشین</button>
                                )}
                            </h5>
                        </div>
                        <div className="modal-body">
                            <ImageWithInputs onPlateChange={handlePlateChange} />
                            <br />
                            <br />
                            <form
                                className="app-form rounded-control row g-3 needs-validation was-validated"
                                noValidate>
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label" htmlFor="validationCustom01">نام ماشین</label>
                                            <div className="icon-form">
                                                <i className="ti ti-car"></i>
                                                <input
                                                    className={`form-control ${errors.model ? 'is-invalid' : ''}`}
                                                    placeholder="نام ماشین را وارد کنید"
                                                    name="model"
                                                    id="model"
                                                    type="text"
                                                    value={values.model}
                                                    onChange={handleChange}
                                                    autoComplete="off"
                                                    required
                                                />
                                                {errors.model && (
                                                    <div className="invalid-feedback f-s-15">{errors.model}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label" htmlFor="validationCustom01">رنگ ماشین</label>
                                            <div className="icon-form">
                                                <i className="ti ti-user"></i>
                                                <input
                                                    className={`form-control ${errors.color ? 'is-invalid' : ''}`}
                                                    placeholder="رنگ ماشین را وارد کنید"
                                                    name="color"
                                                    id="color"
                                                    type="text"
                                                    value={values.color}
                                                    onChange={handleChange}
                                                    autoComplete="off"
                                                    required
                                                />
                                                {errors.color && (
                                                    <div className="invalid-feedback f-s-15">{errors.color}</div>
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

export default UserCarCreateModal;
