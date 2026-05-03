'use client';

import Script from "next/script";
import NavBar from "@/src/components/common/navbar";
import Header from "@/src/components/common/header";
import ProtectedRoute from "@/src/utils/ProtectedRoute";
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingSpinnerFullPage } from '@/src/components/common/LoadingSpinner';
import SimpleBarInitializer from '@/src/components/common/SimpleBarInitializer';

export default function RootLayout({ children, }: { children: React.ReactNode; }) {

    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            setLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <html lang="fa" dir="rtl">
            <head>
                <link rel="dns-prefetch" href="https://fonts.googleapis.com/" />
                <link rel="dns-prefetch" href="https://fonts.gstatic.com/" />
                <link rel="dns-prefetch" href="https://www.w3.org/" />
                <meta content="text/html; charset=UTF-8" httpEquiv="Content-Type" />
                <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
                <meta content="width=device-width, initial-scale=1.0" name="viewport" />
                <link href="/vendor/fontawesome/css/all.css" rel="stylesheet" />
                <link href="/vendor/phosphor/photoshoper.css" rel="stylesheet" />
                <link href="/vendor/phosphor/phosphor-light.css" rel="stylesheet" />
                <link href="/vendor/phosphor/phosphor-thin.css" rel="stylesheet" />
                <link href="/vendor/phosphor/phosphor-bold.css" rel="stylesheet" />
                <link href="/vendor/phosphor/phosphor-duotone.css" rel="stylesheet" />
                <link href="/vendor/simplebar/simplebar.css" rel="stylesheet" type="text/css" />
                <link href="/vendor/tabler-icons/tabler-icons.css" rel="stylesheet" type="text/css" />
                <link href="/vendor/animation/animate.min.css" rel="stylesheet" />
                <link href="/vendor/bootstrap/bootstrap.min.css" rel="stylesheet" type="text/css" />
                <link rel="stylesheet" href="/fonts/vazir/Farsi-Digits/Vazirmatn-FD-font-face.css" />
                <link href="/css/style.css" rel="stylesheet" type="text/css" />
                <link href="/css/responsive.css" rel="stylesheet" type="text/css" />
                <link rel="stylesheet" href="/css/rtl.css" />

                {/* ✅ Load jQuery FIRST with beforeInteractive */}
                <Script
                    src="/js/jquery-3.6.3.min.js"
                    strategy="beforeInteractive"
                />

                {/* ✅ Load jQuery-dependent scripts AFTER with afterInteractive */}
                <Script
                    src="/vendor/simplebar/simplebar.js"
                    strategy="afterInteractive"
                />
                <Script
                    src="/vendor/phosphor/phosphor.js"
                    strategy="afterInteractive"
                />
                <Script
                    src="/vendor/bootstrap/bootstrap.bundle.min.js"
                    strategy="afterInteractive"
                />
                <Script
                    src="/js/theme.js"
                    strategy="afterInteractive"
                />
                <Script
                    src="/js/Script.js"
                    strategy="afterInteractive"
                />

                <style></style>
            </head>
            <body className="rtl">
                <LoadingSpinnerFullPage isLoading={loading} />
                <ProtectedRoute>
                    <div className="app-wrapper" style={{
                        opacity: !loading ? 1 : 0,
                    }}>
                        <NavBar />
                        <div className="app-content">
                            <div className="">
                                <Header />
                                <main>
                                    <div className="container-fluid ">
                                        {children}
                                    </div>
                                </main>
                                <div className="go-top">
                                    <span className="progress-value">
                                        <i className="ti ti-arrow-up"></i>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </ProtectedRoute>
                <SimpleBarInitializer />
            </body>
        </html>
    );
}