"use client";

import { useState, useEffect, act } from "react";
import { useRouter } from 'next/navigation';
import { robustFetch } from "@/src/utils/apiFetch";
import { UserData } from "@/src/types/userData";
import { useActiveUser } from "@/src/contexts/active_user_context";

interface UserInformationProps {
    UserData: UserData | null;
    setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
    mode: "create" | "edit" | "profile";
}

const UserInformationForm: React.FC<UserInformationProps> = ({ UserData, setUserData, mode }) => {
    const router = useRouter();
    const { activeUser, setActiveUser } = useActiveUser();

    const [initialValues, setInitialValues] = useState<Omit<UserData, 'profile_image' | 'areas' | 'cars' | 'must_change_password'>>({
        id: '',
        first_name: '',
        last_name: '',
        employe_number: '',
        national_id: '',
        phone_number: '',
        role: '',
        is_active: true,
    });

    const [values, setValues] = useState<Omit<UserData, 'profile_image' | 'areas' | 'cars' | 'must_change_password'>>({
        id: '',
        first_name: '',
        last_name: '',
        employe_number: '',
        national_id: '',
        phone_number: '',
        role: '',
        is_active: true,
    });

    const [isDirty, setIsDirty] = useState<boolean>(false);
    useEffect(() => {
        if (UserData) {
            const initial = {
                id: UserData.id || '',
                first_name: UserData.first_name || '',
                last_name: UserData.last_name || '',
                employe_number: UserData.employe_number || '',
                national_id: UserData.national_id || '',
                phone_number: UserData.phone_number || '',
                role: UserData.role || '',
                is_active: UserData.is_active || false,
            };
            setInitialValues(initial);
            setValues(initial);
            setIsDirty(false);
        }
    }, [UserData]);

    const patterns = {
        persian: /^[\u0600-\u06FF\s]+$/,
        nationalId: /^\d{10}$/,
        phone: /^09\d{9}$/,
    };

    const [errors, setErrors] = useState<Partial<UserData>>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFormValid, setIsFormValid] = useState<boolean>(false);

    //===== Helper function to validate state ======
    const validateField = (name: keyof UserData, value: string) => {
        let error = '';
        switch (name) {
            case 'first_name':
                if (!patterns.persian.test(value))
                    error = 'نام باید فقط حروف فارسی باشد';
                break;
            case 'last_name':
                if (!patterns.persian.test(value))
                    error = 'نام خانوادگی باید فقط حروف فارسی باشد';
                break;
            case 'employe_number':
                if (!value.trim())
                    error = 'کد پرسنلی باید مقدار داشته باشد';
                break;
            case 'national_id':
                if (!patterns.nationalId.test(value))
                    error = 'کد ملی باید 10 رقمی باشد';
                break;
            case 'phone_number':
                if (!patterns.phone.test(value))
                    error = 'شماره تلفن باید 11 رقمی باشد و با 09 شروع شود';
                break;
            case 'role':
                if (!value)
                    error = 'سمت را انتخاب کنید';
                break;
        }
        setErrors(prev => ({
            ...prev,
            [name]: error || undefined,
        }));
        return !error;
    };

    //==========  check values change ==========
    useEffect(() => {
        const isChanged = Object.keys(initialValues).some(key => {
            const k = key as keyof Omit<UserData, 'profile_image' | 'areas' | 'cars' | 'must_change_password'>;
            return initialValues[k] !== values[k];
        });
        setIsDirty(isChanged);
    }, [values, initialValues]);

    //==========  validate form section ==========
    useEffect(() => {
        let isValid = true;
        Object.keys(values).forEach((key) => {
            if (key in values) {
                const valid = validateField(key as keyof UserData, (values as any)[key]);
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
        validateField(name as keyof UserData, value);
    };

    const handlUserEdit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (mode === 'profile') {
            values.role = initialValues.role;
        }
        if (values.role === 'SUPER' && values.id !== activeUser?.id && Number(activeUser?.national_id) !== 4610900009) {
            return
        };

        setIsSubmitting(true);
        try {
            const response = await robustFetch({
                url: `api/users/${values.id}/`,
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
                router: router
            });

            if (response.success !== true) {
                console.error(`User edit error: ${response.message}`);
                const error_code = response.code;
            } else {
                console.log("User editd successfully:", response);
                const user = response.data.user
                if (user.id === activeUser?.id) {
                    setActiveUser(user);
                    setValues(user);
                    setInitialValues(user);
                } else {
                    setValues(user);
                    setInitialValues(user);
                    setUserData(user);
                }
            }

        } catch (err) {
            console.error("Failed to edit User:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="app-form rounded-control row g-3 needs-validation was-validated" onSubmit={handlUserEdit} noValidate>
            <div className="app-divider-v primary justify-content-center">
                <span className="badge text-bg-primary f-s-16">اطلاعات فردی</span>
            </div>
            <div className="row">
                <div className="col-md-6">
                    <div className="mb-3">
                        <label className="form-label" htmlFor="validationCustom01">نام</label>
                        <div className="icon-form">
                            <i className="ti ti-user"></i>
                            <input
                                className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                                placeholder="نام را وارد کنید"
                                name="first_name"
                                id="edit_first_name"
                                type="text"
                                value={values.first_name}
                                onChange={handleChange}
                                autoComplete="off"
                                required
                            />
                            {errors.first_name && (
                                <div className="invalid-feedback f-s-15">{errors.first_name}</div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="mb-3">
                        <label className="form-label" htmlFor="validationCustom02">نام خانوادگی</label>
                        <div className="icon-form">
                            <i className="ti ti-user"></i>
                            <input
                                className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                                placeholder="نام خانوادگی را وارد کنید"
                                name="last_name"
                                id="edit_last_name"
                                type="text"
                                value={values.last_name}
                                onChange={handleChange}
                                autoComplete="off"
                                required
                            />
                            {errors.last_name && (
                                <div className="invalid-feedback f-s-15">{errors.last_name}</div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="mb-3">
                        <label className="form-label" htmlFor="validationCustom03">کد ملی</label>
                        <div className="icon-form">
                            <i className="ti ti-briefcase"></i>
                            <input
                                className={`form-control ${errors.national_id ? 'is-invalid' : ''}`}
                                placeholder="کد ملی را وارد کنید"
                                name="national_id"
                                id="edit_national_id"
                                type="number"
                                value={values.national_id}
                                onChange={handleChange}
                                autoComplete="off"
                                required
                            />
                            {errors.national_id && (
                                <div className="invalid-feedback f-s-15">{errors.national_id}</div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="mb-3">
                        <label className="form-label" htmlFor="validationCustom04">کد پرسنلی</label>
                        <div className="icon-form">
                            <i className="ti ti-article"></i>
                            <input
                                className={`form-control ${errors.employe_number ? 'is-invalid' : ''}`}
                                placeholder="کد پرسنلی را وارد کنید"
                                name="employe_number"
                                id="edit_employe_number"
                                type="text"
                                value={values.employe_number}
                                onChange={handleChange}
                                autoComplete="off"
                                required
                            />
                            {errors.employe_number && (
                                <div className="invalid-feedback f-s-15">{errors.employe_number}</div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="mb-3">
                        <label className="form-label" htmlFor="validationCustom05">شماره تلفن همراه</label>
                        <div className="icon-form">
                            <i className="ti ti-phone-call"></i>
                            <input
                                className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                                placeholder="شماره تلفن را وارد کنید"
                                name="phone_number"
                                id="edit_phone_number"
                                type="number"
                                value={values.phone_number}
                                onChange={handleChange}
                                autoComplete="off"
                                required
                            />
                            {errors.phone_number && (
                                <div className="invalid-feedback f-s-15">{errors.phone_number}</div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <label className="form-label" htmlFor="role">سِمت</label>
                    <select
                        className="form-select rtl-select"
                        name="role"
                        value={values.role}
                        onChange={handleChange}
                        required
                        disabled={mode === 'profile' || activeUser?.id === UserData?.id}
                    >
                        {activeUser?.role === "SUPER" ? (
                            activeUser?.id === UserData?.id ? (
                                <>
                                    <option value="">انتخاب کنید</option>
                                    <option value="SUPER">مدیر ارشد</option>
                                </>
                            ) : (
                                Number(activeUser?.national_id) === 4610900009 ? (
                                    <>
                                        <option value="">انتخاب کنید</option>
                                        <option value="SUPER">مدیر ارشد</option>
                                        <option value="MANAGER">مدیر</option>
                                        <option value="ADMIN">ادمین</option>
                                        <option value="EMPLOYE">کارمند</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="">انتخاب کنید</option>
                                        <option value="MANAGER">مدیر</option>
                                        <option value="ADMIN">ادمین</option>
                                        <option value="EMPLOYE">کارمند</option>
                                    </>
                                )
                            )
                        ) : (
                            activeUser?.id === UserData?.id ? (
                                <>
                                    <option value="">انتخاب کنید</option>
                                    <option value="MANAGER">مدیر</option>
                                    <option value="ADMIN">ادمین</option>
                                    <option value="EMPLOYE">کارمند</option>
                                </>
                            ) : (
                                <>
                                    <option value="">انتخاب کنید</option>
                                    <option value="ADMIN">ادمین</option>
                                    <option value="EMPLOYE">کارمند</option>
                                </>
                            )
                        )}
                    </select>
                    {errors.role && (
                        <div className="invalid-feedback f-s-15">{errors.role}</div>
                    )}
                </div>

            </div>
            <div className="mt-3 text-end">
                {isFormValid && isDirty ? (
                    isSubmitting ? (
                        <button className="btn btn-light-see-blue b-r-25" type="button"> آپدیت اطلاعات ...<span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span></button>
                    ) : (
                        <button className="btn btn-light-see-blue b-r-25" type="submit">آپدیت اطلاعات</button>
                    )
                ) : (
                    <button className="btn btn-light-see-blue b-r-25 disabled" type="button">آپدیت اطلاعات</button>
                )}
            </div>
        </form>
    );
}

export default UserInformationForm;