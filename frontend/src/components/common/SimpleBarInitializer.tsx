// components/SimpleBarInitializer.tsx
'use client';

import { useEffect } from 'react';

export default function SimpleBarInitializer() {
    useEffect(() => {
        // Ensure this runs only on client-side after DOM is ready
        if (typeof window !== 'undefined' && document.readyState === 'complete') {
            initializeSimpleBar();
        } else {
            window.addEventListener('load', initializeSimpleBar);
            return () => window.removeEventListener('load', initializeSimpleBar);
        }
    }, []);

    const initializeSimpleBar = () => {
        // Wait for jQuery and SimpleBar to be available
        const checkDependencies = setInterval(() => {
            if (typeof (window as any).SimpleBar !== 'undefined' && typeof (window as any).$ !== 'undefined') {
                clearInterval(checkDependencies);

                // Initialize SimpleBar on all elements with data-simplebar attribute
                document.querySelectorAll('[data-simplebar]').forEach((element) => {
                    try {
                        if (element && !element.classList.contains('simplebar-destroyed')) {
                            new (window as any).SimpleBar(element);
                        }
                    } catch (error) {
                        console.error('SimpleBar initialization error:', error);
                    }
                });
            }
        }, 50);
    };

    return null;
}