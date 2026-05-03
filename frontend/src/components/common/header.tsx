'use client';

import { useEffect, useState } from 'react';

function Header() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [isSemiNav, setIsSemiNav] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme-mode') as 'light' | 'dark' | null;
        if (savedTheme === 'dark') {
            setTheme('dark');
            document.body.classList.add('dark');
            document.body.classList.remove('light');
        } else {
            setTheme('light');
            document.body.classList.add('light');
            document.body.classList.remove('dark');
        }

        const savedNavState = localStorage.getItem('semi-nav-state');
        if (savedNavState === 'true') {
            setIsSemiNav(true);
            document.querySelector('.vertical-sidebar')?.classList.add('semi-nav');
        }
    }, []);

    const toggleDarkMode = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);

        if (newTheme === 'dark') {
            document.body.classList.add('dark');
            document.body.classList.remove('light');
        } else {
            document.body.classList.add('light');
            document.body.classList.remove('dark');
        }

        localStorage.setItem('theme-mode', newTheme);

        // Toggle icon classes
        const sunLogo = document.querySelector('.sun-logo');
        const moonLogo = document.querySelector('.moon-logo');
        if (sunLogo) sunLogo.classList.toggle('sun');
        if (moonLogo) moonLogo.classList.toggle('moon');
    };

    const toggleNavbar = () => {
        const nav = document.querySelector('.vertical-sidebar');
        if (!nav) return;

        // Determine current state from the DOM
        const currentlySemi = nav.classList.contains('semi-nav');
        // Toggle
        nav.classList.toggle('semi-nav');
        const newState = nav.classList.contains('semi-nav');

        // Update local state + localStorage
        setIsSemiNav(newState);
        localStorage.setItem('semi-nav-state', String(newState));
    };

    return (
        <header className="header-main">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-8 col-sm-6 d-flex align-items-center header-left p-0">
                        <span
                            className="header-toggle"
                            onClick={toggleNavbar}
                            style={{ cursor: 'pointer' }}
                        >
                            <i className="ph ph-squares-four"></i>
                        </span>
                    </div>
                    <div className="col-4 col-sm-6 d-flex align-items-center justify-content-end header-right p-0">
                        <ul className="d-flex align-items-center">
                            <li
                                className="header-dark"
                                onClick={toggleDarkMode}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="sun-logo head-icon bg-light-dark rounded-circle f-s-22 p-2">
                                    <i className="ph ph-moon-stars"></i>
                                </div>
                                <div className="moon-logo head-icon bg-light-dark rounded-circle f-s-22 p-2">
                                    <i className="ph ph-sun"></i>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;