"use client";

import { useState, ChangeEvent, FormEvent, useEffect, useRef } from "react";
import { useActiveUser } from "@/src/contexts/active_user_context";
import { robustFetch } from "@/src/utils/apiFetch";
import Script from "next/script";
import { useRouter } from 'next/navigation';
import { UserData } from "@/src/types/userData";

export default function UserLoginForm() {
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [password, setPassword] = useState('');

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFormValid, setIsFormValid] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("لطفا کد پرسنلی را وارد کنید");
    const [passwordErrorMessage, setPasswordErrorMessage] = useState<string>("لطفا رمز عبور را وارد کنید");
    const { setActiveUser } = useActiveUser();
    const router = useRouter();


    // Effect to check form validity after state updates
    useEffect(() => {
        queueMicrotask(() => {
            const form = document.querySelector("form") as HTMLFormElement | null;
            if (!form) {
                setIsFormValid(false);
                return;
            }
            const isValid = form.checkValidity();
            setIsFormValid(isValid);
        });
    }, [employeeNumber, password]);

    const handleEmployeeNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmployeeNumber(value);
        if (value.trim() === '') {
            if (errorMessage) {
                setErrorMessage(errorMessage);
            } else {
                setErrorMessage("لطفا کد پرسنلی را وارد کنید");
            }
        } else {
            setErrorMessage('');
        }
    };

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPassword(value);
        if (value.trim() === '') {
            if (passwordErrorMessage) {
                setPasswordErrorMessage(passwordErrorMessage);
            } else {
                setPasswordErrorMessage("لطفا رمز عبور را وارد کنید");
            }
        } else {
            setPasswordErrorMessage('');
        }
    };


    // Handle form submission
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validate form manually if needed (though browser validation should handle it)
        const form = e.currentTarget;
        if (!form.checkValidity()) {
            e.stopPropagation();
            return;
        }
        setIsSubmitting(true);
        const payload = {
            employe_number: employeeNumber,
            password: password,
        };
        try {
            const response = await robustFetch({
                url: `api/auth/login/`,
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router,
            });
            if (response.success) {
                const newUser: UserData = response.data.user;
                setActiveUser(newUser);
                if (newUser.must_change_password) {
                    router.prefetch('change-password/')
                    router.push('change-password/')
                } else {
                    router.prefetch('/')
                    router.push('/')
                }
            } else {
                if (response.code === 20) {
                    setPassword('');
                    setEmployeeNumber('');
                    console.error("Error while loging in", response.message);
                    setErrorMessage("کد پرسنلی یا رمز عبور اشتباه است");
                } else if (response.code === 100) {
                    setPassword('');
                    setEmployeeNumber('');
                    console.error("Error while loging in", response.message);
                    setErrorMessage("عدم وجود کاربر یا غیرفعال بودن کاربر");
                } else {
                    setPassword('');
                    setEmployeeNumber('');
                    console.error("Error while loging in", response.message);
                    setErrorMessage("خطایی در ارتباط با سرور رخ داد. لطفاً دوباره تلاش کنید");
                }
            }
        } catch (error) {
            setPassword('');
            setEmployeeNumber('');
            console.error("Error while fetching:", error);
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
                                                        <h3>ورود به حساب کاربری</h3>
                                                        <p className="f-s-12 text-secondary">برای ورود به حساب کاربری خود مشخصات را وارد
                                                            کنید</p>
                                                    </div>

                                                    <div className="col-md-12">
                                                        <label className="form-label" htmlFor="validationCustom01">کد پرسنلی</label>
                                                        <div className="icon-form">
                                                            <i className="ti ti-user"></i>
                                                            <input
                                                                className={`form-control ${errorMessage ? 'is-invalid' : ''}`}
                                                                placeholder="کد پرسنلی خود را وارد کنید"
                                                                name="employe_number"
                                                                id="validationCustom01"
                                                                type="text"
                                                                value={employeeNumber}
                                                                onChange={handleEmployeeNumberChange}
                                                                autoComplete="off"
                                                                required
                                                            />
                                                            {errorMessage && (
                                                                <div className="invalid-feedback f-s-15">{errorMessage}</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="col-md-12 mb-3">
                                                        <label className="form-label" htmlFor="validationCustom02">رمز ورود</label>
                                                        <div className="icon-form">
                                                            <i className="ti ti-lock"></i>
                                                            <input
                                                                className={`form-control ${passwordErrorMessage ? 'is-invalid' : ''}`}
                                                                placeholder="**********"
                                                                name="password"
                                                                id="validationCustom02"
                                                                type="password"
                                                                value={password}
                                                                onChange={handlePasswordChange}
                                                                autoComplete="off"
                                                                required
                                                            />
                                                            {passwordErrorMessage && (
                                                                <div className="invalid-feedback f-s-15">{passwordErrorMessage}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="col-12 mt-0">
                                                        <p>
                                                            <a className="link-primary text-decoration-underline" href="/login/otp">
                                                                ورود با رمز یکبار مصرف
                                                            </a>
                                                        </p>
                                                    </div>
                                                    {isFormValid ? (
                                                        isSubmitting ? (
                                                            <div className="col-md-12">
                                                                <div className="text-end">
                                                                    <button className="btn btn-primary w-100 b-r-25" type="button">
                                                                        ورود ... <span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="col-md-12">
                                                                <div className="text-end">
                                                                    <button
                                                                        className="btn btn-primary w-100 b-r-25"
                                                                        type="submit"
                                                                    >ورود</button>
                                                                </div>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="col-md-12">
                                                            <div className="text-end">
                                                                <button
                                                                    className="btn btn-primary w-100 b-r-25 disabled"
                                                                    type="button"
                                                                >ورود</button>
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
