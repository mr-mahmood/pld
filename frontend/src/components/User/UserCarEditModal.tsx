import React, { useState, useEffect, useRef } from 'react';
import { robustFetch } from "@/src/utils/apiFetch";
import { useRouter } from 'next/navigation';
import { Car } from '@/src/types/car';
import ImageWithInputs from '@/src/components/plate/PlateNumberInput';
import { UserData } from '@/src/types/userData';

interface UserCarEditModalProps {
    carData: Car | null;
    onCarUpdated: (a: Car | null) => void;
}

const UserCarEditModal: React.FC<UserCarEditModalProps> = ({ carData, onCarUpdated }) => {
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
    
    // State for plate number
    const [plateNumber, setPlateNumber] = useState<string>('');
    const [errors, setErrors] = useState<Partial<Car>>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFormValid, setIsFormValid] = useState<boolean>(false);
    const [key, setKey] = useState<number>(0); // Add key to force re-render

    // Effect to update form fields when carData prop changes
    useEffect(() => {
        if (carData) {
            console.log("Setting up edit modal for car:", carData);
            setValues({
                id: carData.id || '',
                plate: carData.plate || '',
                model: carData.model || '',
                color: carData.color || '',
                is_active: carData.is_active || true,
            });
            setPlateNumber(carData.plate || '');
            setKey(prev => prev + 1); // Force re-render of ImageWithInputs
            
            // Validate initial values
            validateField('model', carData.model || '');
            validateField('color', carData.color || '');
        }
    }, [carData]);

    // Modal event listeners
    useEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;
        
        const handleHidden = () => {
            clearInput();
            onCarUpdated(null);
        };
        
        modal.addEventListener('hidden.bs.modal', handleHidden);
        
        // Handle modal show event to ensure fresh data
        const handleShow = () => {
            if (carData) {
                setValues({
                    id: carData.id || '',
                    plate: carData.plate || '',
                    model: carData.model || '',
                    color: carData.color || '',
                    is_active: carData.is_active || true,
                });
                setPlateNumber(carData.plate || '');
                setKey(prev => prev + 1);
            }
        };
        
        modal.addEventListener('show.bs.modal', handleShow);
        
        return () => {
            modal.removeEventListener('hidden.bs.modal', handleHidden);
            modal.removeEventListener('show.bs.modal', handleShow);
        };
    }, [carData]);

    //===== Helper function to validate state ======
    const validateField = (name: keyof Car, value: string) => {
        let error = '';
        switch (name) {
            case 'color':
                if (value && !patterns.persian.test(value))
                    error = 'رنگ ماشین باید فقط حروف فارسی باشد';
                break;
            case 'model':
                if (value && !patterns.persian.test(value))
                    error = 'نام ماشین باید فقط حروف فارسی باشد';
                break;
        }
        setErrors(prev => ({
            ...prev,
            [name]: error || undefined,
        }));
        return !error;
    };

    //========== Validate form section ==========
    useEffect(() => {
        let isValid = true;

        // Check if plate is filled and has correct format
        if (!plateNumber || plateNumber.length < 15) {
            isValid = false;
        }

        // Check model and color
        if (!values.model || values.model.trim() === '') {
            isValid = false;
        }
        if (!values.color || values.color.trim() === '') {
            isValid = false;
        }

        // Validate model and color patterns
        if (values.model && !patterns.persian.test(values.model)) {
            isValid = false;
        }
        if (values.color && !patterns.persian.test(values.color)) {
            isValid = false;
        }

        setIsFormValid(isValid);
    }, [values, plateNumber]);

    //========== Handle plate change from ImageWithInputs ==========
    const handlePlateChange = (plate: string) => {
        setPlateNumber(plate);
        setValues(prev => ({
            ...prev,
            plate: plate
        }));
        console.log("Plate changed:", plate);
    };

    //========== Handle input changes ==========
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

    //========== Handle car update ==========
    const handleCarUpdate = async () => {
        if (!carData) return;
        
        setIsSubmitting(true);
        try {
            const response = await robustFetch({
                url: `api/cars/${carData.id}/`, // Use carData.id, not userData.id
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plate: plateNumber,
                    model: values.model,
                    color: values.color,
                    is_active: values.is_active,
                }),
                router: router
            });

            if (response.success !== true) {
                console.error(`car update error: ${response.message}`);
                if (response.code === 400) {
                    setErrors(prev => ({
                        ...prev,
                        model: 'اطلاعات وارد شده معتبر نیست'
                    }));
                }
            } else {
                console.log("car updated successfully:", response);
                closeBtnRef.current?.click();
                clearInput();
                onCarUpdated(response.data.car);
            }
        } catch (err) {
            console.error("Failed to update car:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    //========== Clear input fields ==========
    const clearInput = () => {
        setValues({
            id: '',
            plate: '',
            model: '',
            color: '',
            is_active: true,
        });
        setPlateNumber('');
        setErrors({});
    };

    return (
        <>
            <div aria-hidden="true" className="modal fade" id="userCarEdit" tabIndex={-1} ref={modalRef}>
                <div className="modal-dialog modal-dialog-centered app_modal_l">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">ویرایش ماشین</h5>
                            <div>
                                <button 
                                    className="btn btn-light-danger b-r-25 f-s-17" 
                                    data-bs-dismiss="modal" 
                                    type="button" 
                                    ref={closeBtnRef}
                                >
                                    انصراف
                                </button>
                                {isFormValid ? (
                                    isSubmitting ? (
                                        <button className="btn btn-light-see-blue b-r-25" type="button">
                                            ویرایش ماشین ... 
                                            <span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        </button>
                                    ) : (
                                        <button 
                                            className="btn btn-light-see-blue b-r-25" 
                                            onClick={handleCarUpdate} 
                                            type="submit"
                                        >
                                            ویرایش ماشین
                                        </button>
                                    )
                                ) : (
                                    <button className="btn btn-light-see-blue b-r-25 disabled" type="button">
                                        ویرایش ماشین
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="modal-body">
                            <ImageWithInputs 
                                key={key} // Add key to force re-render
                                onPlateChange={handlePlateChange} 
                                initialPlate={plateNumber}
                            />
                            <br />
                            <br />
                            <form
                                className="app-form rounded-control row g-3 needs-validation was-validated"
                                noValidate
                            >
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label" htmlFor="editModel">نام ماشین</label>
                                            <div className="icon-form">
                                                <i className="ti ti-car"></i>
                                                <input
                                                    key={`model-${carData?.id}`} // Add key for model input
                                                    className={`form-control ${errors.model ? 'is-invalid' : ''}`}
                                                    placeholder="نام ماشین را وارد کنید"
                                                    name="model"
                                                    id="editModel"
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
                                            <label className="form-label" htmlFor="editColor">رنگ ماشین</label>
                                            <div className="icon-form">
                                                <i className="ti ti-palette"></i>
                                                <input
                                                    key={`color-${carData?.id}`} // Add key for color input
                                                    className={`form-control ${errors.color ? 'is-invalid' : ''}`}
                                                    placeholder="رنگ ماشین را وارد کنید"
                                                    name="color"
                                                    id="editColor"
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

export default UserCarEditModal;