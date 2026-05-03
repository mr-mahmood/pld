"use client";

import { useState, ChangeEvent, FormEvent, useEffect, useRef, RefObject } from "react";
import { robustFetch } from "@/src/utils/apiFetch";
import Script from "next/script";
import { useRouter } from 'next/navigation';
import React from "react";
import { UserData } from "@/src/types/userData";
import CountdownTimer from "@/src/components/common/CountdownTimer";
import { useActiveUser } from "@/src/contexts/active_user_context";

type InputElement = HTMLInputElement | null;

export default function UserLoginForm() {
    const { setActiveUser } = useActiveUser();
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [state, setState] = useState<1 | 2>(1);
    const [isSubmitting1, setIsSubmitting1] = useState<boolean>(false);
    const [isFormValid1, setIsFormValid1] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("لطفا کد پرسنلی را وارد کنید");
    const router = useRouter();

    // Effect to check form validity after state updates
    useEffect(() => {
        queueMicrotask(() => {
            const form = document.querySelector("form") as HTMLFormElement | null;
            if (!form) {
                setIsFormValid1(false);
                return;
            }
            const isValid = form.checkValidity();
            setIsFormValid1(isValid);
        });
    }, [employeeNumber]);

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

    const handleAnchorResetClick: React.MouseEventHandler<HTMLAnchorElement> = async (e) => {
        e.preventDefault();
        if (!employeeNumber.trim()) {
            setState(1);
            return;
        }
        setState(1);
    };

    const handleAnchorClick: React.MouseEventHandler<HTMLAnchorElement> = async (e) => {
        e.preventDefault();
        if (!employeeNumber.trim()) {
            setErrorMessage("لطفا کد پرسنلی را وارد کنید");
            setState(1);
            return;
        }
        setCodes(["", "", "", "", ""]);
        await sendOtpRequest();
    };

    const handleFormSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        sendOtpRequest();
    };

    const sendOtpRequest = async () => {
        if (isSubmitting1) return;
        setIsSubmitting1(true);
        const payload = {
            employe_number: employeeNumber,
        };
        try {
            const response = await robustFetch({
                url: `api/auth/request-otp/`,
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router,
            });
            if (response.success) {
                setState(2);
                setErrorMessage('');
            } else {
                if (response.code === 100) {
                    setErrorMessage("عدم وجود کاربر یا غیرفعال بودن کاربر");
                } else {
                    setErrorMessage("خطایی در ارتباط با سرور رخ داد. لطفاً دوباره تلاش کنید");
                }
            }
        } catch (error) {
            console.error("Error while fetching:", error);
            setErrorMessage("خطایی در ارتباط با سرور رخ داد. لطفاً دوباره دوباره تلاش کنید");
        } finally {
            setIsSubmitting1(false);
        }
    };

    const [codes, setCodes] = useState<string[]>(["", "", "", "", ""]);
    const inputsRef = useRef<(RefObject<HTMLInputElement | null>)[]>([]);
    const [isSubmitting2, setIsSubmitting2] = useState<boolean>(false);
    const [isFormValid2, setIsFormValid2] = useState<boolean>(false);
    const [otpError, setOtpError] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState<number>(120);

    const handleTimeUpdate = (seconds: number) => {
        setTimeLeft(seconds);
    };

    useEffect(() => {
        if (state === 2) {
            const lastIndex = inputsRef.current.length - 1;
            inputsRef.current[lastIndex]?.current?.focus();
        }
    }, [state]);

    useEffect(() => {
        if (isFormValid2 && !isSubmitting2 && codes.every(c => /^\d$/.test(c))) {
            handleSubmitOtpcheck(new Event('submit') as any);
        }
    }, [codes, isFormValid2, isSubmitting2]);

    useEffect(() => {
        setIsFormValid2(codes.every((c) => /^\d$/.test(c)));
    }, [codes]);

    // Initialize the refs array if it's empty
    if (inputsRef.current.length !== 5) {
        inputsRef.current = Array(5)
            .fill(null)
            .map(() => React.createRef<HTMLInputElement>());
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            const newCodes = [...codes];
            if (codes[index] !== '') {
                newCodes[index] = '';
                setCodes(newCodes);
            } else if (index < codes.length - 1) {
                // تمرکز بر خانه بعدی (در این حالت، در ظاهر سمت چپ است ولی در ترتیب معکوس، خانه بعدی است)
                inputsRef.current[index + 1]?.current?.focus();
            }
        }
    };

    const handleChange = (value: string, index: number): void => {
        if (!/^\d?$/.test(value)) return;
        const newCodes = [...codes];
        newCodes[index] = value;
        setCodes(newCodes);
        // تمرکز به سمت چپ
        if (value && index > 0) {
            inputsRef.current[index - 1]?.current?.focus();
        }
    };

    const handleSubmitOtpcheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid2) return;
        setIsSubmitting2(true);
        const finalCode: string = codes.join("").split('').reverse().join('');
        const payload = {
            employe_number: employeeNumber,
            otp: finalCode,
        };
        try {
            const response = await robustFetch({
                url: `api/auth/verify-otp/`,
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router,
            });
            if (response.success) {
                setCodes(["", "", "", "", ""]);
                const newUser: UserData = response.data.user;
                setActiveUser(newUser);
                if (newUser.must_change_password) {
                    router.prefetch('/change-password/');
                    router.push('/change-password/');
                } else {
                    router.prefetch('/');
                    router.push('/');
                }
            } else {
                if (response.code === 60) {
                    setOtpError("مدت اعتبار کد تمام شده است یا کد وجود ندارد");
                    setIsFormValid2(false);
                } else if (response.code === 61) {
                    setOtpError("کد وارد شده اشتباه است");
                    setIsFormValid2(false);
                }
            }
        } catch (error) {
            console.error("Error while fetching:", error);
            setOtpError("خطایی در ارتباط با سرور رخ داد. لطفاً دوباره دوباره تلاش کنید");
        } finally {
            setIsSubmitting2(false);
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
                                                {state === 1 ? (
                                                    <form className="app-form rounded-control row g-3 needs-validation was-validated" onSubmit={handleFormSubmit} noValidate>
                                                        <div className="text-center">
                                                            <h3>ورود به حساب کاربری</h3>
                                                            <p className="f-s-12 text-secondary">برای ورود به حساب کاربری خود مشخصات را وارد
                                                                کنید</p>
                                                        </div>
                                                        <div className="col-md-12 mb-2">
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
                                                        {isFormValid1 ? (
                                                            isSubmitting1 ? (
                                                                <div className="col-md-12">
                                                                    <div className="text-end">
                                                                        <button className="btn btn-primary w-100 b-r-25" type="button">
                                                                            تایید ... <span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="col-md-12">
                                                                    <div className="text-end">
                                                                        <button
                                                                            className="btn btn-primary w-100 b-r-25"
                                                                            type="submit"
                                                                        >تایید</button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className="col-md-12">
                                                                <div className="text-end">
                                                                    <button
                                                                        className="btn btn-primary w-100 b-r-25 disabled"
                                                                        type="button"
                                                                    >تایید</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </form>
                                                ) : (
                                                    <form className="app-form" onSubmit={handleSubmitOtpcheck}>
                                                        <div className="row">
                                                            <div className="col-12">
                                                                <div className="mb-4 text-center">
                                                                    <h2 className="text-primary">ورود به حساب</h2>
                                                                    <p>کد 5 رقمی که برای شما ارسال شده است وارد کنید</p>
                                                                </div>
                                                            </div>
                                                            <div className="col-12">
                                                                <div className="verification-box">
                                                                    {codes.map((code, index) => (
                                                                        <div key={index}>
                                                                            <input
                                                                                className="otp-input form-control h-60 w-60 text-center b-r-15"
                                                                                maxLength={1}
                                                                                type="text"
                                                                                value={code}
                                                                                ref={inputsRef.current[index]}
                                                                                onChange={(e) => handleChange(e.target.value, index)}
                                                                                onKeyDown={(e) => handleKeyDown(e, index)}
                                                                                disabled={timeLeft === 0}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <CountdownTimer
                                                                initialSeconds={timeLeft}
                                                                endTimeText="مدت اعتبار کد یکبار مصرف شما تمام شد"
                                                                onUpdate={handleTimeUpdate}
                                                            />
                                                            <div className="text-center">
                                                                {otpError && <p className="mt-0 mb-1 text-danger f-s-16">{otpError}</p>}
                                                            </div>
                                                            <div className="col-12 mt-2 mb-3">
                                                                <p>
                                                                    کد پرسنلی را اشتباه وارد کرده‌اید؟{" "}
                                                                    <a className="link-primary text-decoration-underline" onClick={handleAnchorResetClick}>
                                                                        تغییر کد پرسنلی
                                                                    </a>
                                                                </p>
                                                                <p>
                                                                    کد را دریافت نکرده‌اید یا اعتبار آن تمام شد؟{" "}
                                                                    <a className="link-primary text-decoration-underline" onClick={handleAnchorClick}>
                                                                        ارسال مجدد!
                                                                    </a>
                                                                </p>
                                                            </div>
                                                            {isFormValid2 ? (
                                                                isSubmitting2 ? (
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
                                                        </div>
                                                    </form>
                                                )}
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
