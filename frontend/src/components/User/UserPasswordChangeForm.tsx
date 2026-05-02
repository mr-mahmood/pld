"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { API_BASE_URL } from "@/config/index"; // Assuming your API base URL is configured

// Define a basic password strength pattern. You can customize this!
// Example: At least 8 characters, one uppercase, one lowercase, one number, one special character.
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
const PASSWORD_PATTERN_STRING = PASSWORD_PATTERN.source; // .source gets the string part of the regex


const PASSWORD_ERROR_MESSAGE = "رمز عبور باید حداقل ۸ کاراکتر، شامل حروف بزرگ و کوچک و عدد باشد";
// "Password must be at least 8 characters, include uppercase and lowercase letters, a number, and a special character."


export default function PasswordChangeForm() {
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

        console.log(payload);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/password/change/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',

                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Password change failed: ${response.status} - ${errorText}`);
            }

            setNewPassword("");
            setIsPasswordValid(false);
            setConfirmPassword("");
            setIsConfirmPasswordValid(false);
            setPasswordMatchError(null);
            setPasswordPatternError(null);

        } catch (error) {
            console.error("Error changing password:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="app-form rounded-control row g-3 needs-validation was-validated" onSubmit={handleSubmit}>
            <div className="app-divider-v primary justify-content-center">
                <span className="badge text-bg-primary">بازنشانی رمز عبور</span>
            </div>

            {/* New Password Field */}
            <div className="col-md-6">
                <label className="form-label" htmlFor="validationCustom01">رمز عبور جدید</label>
                <div className="icon-form">
                    <i className="ti ti-lock"></i>
                    <input
                        className={`form-control ${passwordPatternError ? 'is-invalid' : ''}`}
                        id="validationCustom01"
                        placeholder="**********"
                        pattern={PASSWORD_PATTERN_STRING}
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

            {/* Confirm New Password Field */}
            <div className="col-md-6">
                <label className="form-label" htmlFor="validationCustom02">تکرار رمز عبور جدید</label>
                <div className="icon-form">
                    <i className="ti ti-lock"></i>
                    <input
                        className={`form-control ${passwordMatchError ? 'is-invalid' : ''}`}
                        id="validationCustom02"
                        placeholder="**********"
                        pattern={PASSWORD_PATTERN_STRING}
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
                            <button className="btn btn-light-see-blue b-r-25" type="button">
                                 آپدیت... <span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="col-md-12">
                        <div className="text-end">
                            <button
                                className="btn btn-light-see-blue b-r-25"
                                type="submit"
                            >آپدیت</button>
                        </div>
                    </div>
                )
            ) : (
                <div className="col-md-12">
                    <div className="text-end">
                        <button
                            className="btn btn-light-see-blue b-r-25 disabled"
                            type="button"
                        >آپدیت</button>
                    </div>
                </div>
            )}

        </form>
    );
}