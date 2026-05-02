"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { API_BASE_URL } from "@/config/index";
import { robustFetch } from "@/src/utils/apiFetch";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useActiveUser } from "@/src/contexts/active_user_context";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
const PASSWORD_ERROR_MESSAGE = "رمز عبور باید حداقل ۸ کاراکتر، شامل حروف بزرگ و کوچک و عدد باشد";


export default function PasswordChangeForm() {
    const router = useRouter();
    const { activeUser, setActiveUser } = useActiveUser();
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [passwordMatchError, setPasswordMatchError] = useState<string | null>(null);
    const [passwordPatternError, setPasswordPatternError] = useState<string | null>(null);
    const [isPasswordValid, setIsPasswordValid] = useState<boolean>(false);
    const [isConfirmPasswordValid, setIsConfirmPasswordValid] = useState<boolean>(false);
    const [isFormValid, setIsFormValid] = useState<boolean>(false);

    useEffect(() => {
        setIsFormValid(isPasswordValid === true && isConfirmPasswordValid === true);
    }, [confirmPassword, newPassword, isPasswordValid, isConfirmPasswordValid]);

    // Handler for new password input changes
    const handleNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewPassword(value);

        // Clear match error when user types in new password
        if (newPassword === '' || confirmPassword === '') {
            setIsPasswordValid(false);
            setPasswordMatchError("رمز عبور جدید نمیتواند خالی باشد");
        }

        if (confirmPassword && value !== confirmPassword) {
            setIsPasswordValid(false);
            setPasswordMatchError("رمز عبور جدید و تکرار آن مطابقت ندارند");
        } else {
            setIsPasswordValid(true);
            setPasswordMatchError(null);
        }

        // Validate pattern as user types
        if (value && !PASSWORD_PATTERN.test(value)) {
            setIsPasswordValid(false);
            setPasswordPatternError(PASSWORD_ERROR_MESSAGE);
        } else {
            setIsPasswordValid(true);
            setPasswordPatternError(null);
        }
    };

    // Handler for confirm password input changes
    const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setConfirmPassword(value);

        // Check if it matches the new password
        if (newPassword && value !== newPassword) {
            setIsConfirmPasswordValid(false);
            setPasswordMatchError("رمز عبور جدید و تکرار آن مطابقت ندارند.");
        } else {
            setIsConfirmPasswordValid(true);
            setPasswordMatchError(null);
        }
    };

    // Handler for form submission
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setIsSubmitting(true);

        const payload = {
            new_password: newPassword,
            new_password2: confirmPassword,
        };
    
        try {
            const response = await robustFetch({
                url: `api/auth/password/change/`,
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router
            });

            if (response.success !== true) {
                console.error(`Password change failed: ${response.message}`);
                const error_code = response.code;
            } else {
                const user = response.data.user
                setActiveUser(user);
                router.prefetch('/')
                router.push('/')
            }

        } catch (err) {
            console.error("Password change failed:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <html lang="fa" dir="rtl">
            <head>
                <title>Login</title>
                <link rel="dns-prefetch" href="https://fonts.googleapis.com/"></link>
                <link rel="dns-prefetch" href="https://fonts.gstatic.com/"></link>

                <meta content="text/html; charset=UTF-8" httpEquiv="Content-Type"></meta>
                <meta content="IE=edge" httpEquiv="X-UA-Compatible"></meta>
                <meta content="width=device-width, initial-scale=1.0" name="viewport"></meta>

                <link href="/vendor/bootstrap/bootstrap.min.css" rel="stylesheet" />
                <link href="/vendor/fontawesome/css/all.css" rel="stylesheet" />
                <link href="/vendor/tabler-icons/tabler-icons.css" rel="stylesheet" />
                <link href="/css/style.css" rel="stylesheet" />
                <link href="/css/responsive.css" rel="stylesheet" />
                <link href="/css/rtl.css" rel="stylesheet" />
                <link href="/fonts/vazir/Farsi-Digits/Vazirmatn-FD-font-face.css" rel="stylesheet" />

            </head>
            <body className="rtl">
                <div className="app-wrapper d-block">
                    <div className="">
                        <main className="w-100 p-0">
                            <div className="container-fluid">
                                <div className="row">
                                    <div className="col-12 p-0">
                                        <div className="login-form-container">
                                            <div className="form_container">
                                                <form className="app-form rounded-control row g-3 needs-validation was-validated" onSubmit={handleSubmit} noValidate>
                                                    <div className="mb-3 text-center">
                                                        <h3>تغییر رمز عبور</h3>
                                                        <p className="f-s-12 text-secondary">
                                                            شما برای اولین بار وارد سیستم شده اید. لطفا رمز عبور خود را تغییر دهید
                                                        </p>
                                                    </div>

                                                    <div className="col-md-12">
                                                        <label className="form-label" htmlFor="validationCustom01">رمز عبور جدید</label>
                                                        <div className="icon-form">
                                                            <i className="ti ti-lock"></i>
                                                            <input
                                                                className={`form-control ${passwordPatternError ? 'is-invalid' : ''}`}
                                                                id="validationCustom01"
                                                                placeholder="**********"
                                                                required
                                                                type="password"
                                                                autoComplete="off"
                                                                value={newPassword}
                                                                onChange={handleNewPasswordChange}
                                                            />
                                                            {passwordPatternError && (
                                                                <div className="invalid-feedback f-s-15">{passwordPatternError}</div>
                                                            )}
                                                            {!passwordPatternError && (
                                                                <div className="invalid-feedback f-s-15">
                                                                    {PASSWORD_ERROR_MESSAGE}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="col-md-12">
                                                        <label className="form-label" htmlFor="validationCustom02">تکرار رمز عبور جدید</label>
                                                        <div className="icon-form">
                                                            <i className="ti ti-lock"></i>
                                                            <input
                                                                className={`form-control ${passwordMatchError ? 'is-invalid' : ''}`}
                                                                id="validationCustom02"
                                                                placeholder="**********"
                                                                required
                                                                type="password"
                                                                autoComplete="off"
                                                                value={confirmPassword}
                                                                onChange={handleConfirmPasswordChange}
                                                            />
                                                            {passwordMatchError && (
                                                                <div className="invalid-feedback f-s-15">{passwordMatchError}</div>
                                                            )}
                                                            {!passwordMatchError && (
                                                                <div className="invalid-feedback f-s-15">
                                                                    لطفا تکرار پسورد جدید را وارد کنید
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isFormValid ? (
                                                        isSubmitting ? (
                                                            <div className="col-md-12">
                                                                <div className="text-end">
                                                                    <button className="btn btn-primary w-100 b-r-25" type="button">
                                                                        تغییر رمز ... <span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="col-md-12">
                                                                <div className="text-end">
                                                                    <button
                                                                        className="btn btn-primary w-100 b-r-25"
                                                                        type="submit"
                                                                    >تغییر رمز</button>
                                                                </div>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="col-md-12">
                                                            <div className="text-end">
                                                                <button
                                                                    className="btn btn-primary w-100 b-r-25 disabled"
                                                                    type="button"
                                                                >تغییر رمز</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
                <Script src="/vendor/bootstrap/bootstrap.bundle.min.js" />
            </body>
        </html>
    );
}
