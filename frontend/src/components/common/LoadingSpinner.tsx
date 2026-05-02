"use client";
import { useEffect, useState, useRef } from "react";

interface LoadingSpinnerProps {
    isLoading: boolean;
}

export function LoadingSpinner({ isLoading }: LoadingSpinnerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const minShowTime = 300; // minimum ms to show spinner

    const shownAt = useRef<number | null>(null);

    useEffect(() => {
        if (isLoading) {
            // Show spinner and mark the start time
            setIsVisible(true);
            setIsFading(false);
            shownAt.current = Date.now();
        } else {
            if (shownAt.current === null) {
                setIsVisible(false);
                return;
            }

            const timeVisible = Date.now() - shownAt.current;
            const remaining = Math.max(minShowTime - timeVisible, 0);

            const timer = setTimeout(() => {
                setIsFading(true);
                setTimeout(() => {
                    setIsVisible(false);
                    shownAt.current = null;
                }, 300); // fade-out duration
            }, remaining);

            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    if (!isVisible) return null;

    return (
        <div
            className={`col-12 d-flex justify-content-center align-items-center ${isFading ? "fade-out" : "fade-in"}`}
            style={{ height: "50vh", transition: "opacity 0.3s ease-out" }}
        >
            <div className="spinner-border text-primary" role="status" />
        </div>
    );
}


export function LoadingSpinnerFullPage({ isLoading }: LoadingSpinnerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const minShowTime = 300; // ms
    const shownAt = useRef<number | null>(null);
    useEffect(() => {
        if (isLoading) {
            setIsVisible(true);
            setIsFading(false);
            shownAt.current = Date.now();
        } else {
            if (shownAt.current === null) {
                setIsVisible(false);
                return;
            }
            const timeVisible = Date.now() - shownAt.current;
            const remaining = Math.max(minShowTime - timeVisible, 0);
            const timer = setTimeout(() => {
                setIsFading(true);
                setTimeout(() => {
                    setIsFading(true);
                    setIsVisible(false);
                    shownAt.current = null;
                }, 300);
            }, remaining);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);
    if (!isVisible) return null;
    return (
        <div
            className={`full-page-spinner ${isFading ? "fade-out" : "fade-in"}`}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: 'var(--bs-card-bg)',
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                transition: "opacity 0.3s ease-out",
            }}
        >
            <div className="spinner-border text-primary" role="status" />
        </div>
    );
}