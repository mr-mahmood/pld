'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useActiveUser } from "@/src/contexts/active_user_context";
import { canAccess } from "@/src/utils/role";
import { robustFetch } from '@/src/utils/apiFetch';
import { useEffect, useState } from 'react';

function NavBar() {
    const pathname = usePathname();
    const isChildActive = (path: string) => pathname === path;
    const shouldExpandParent = (basePath: string) => pathname.startsWith(basePath);
    const { setActiveUser, activeUser, getRoleInFarsi } = useActiveUser();
    const router = useRouter();

    const [isSemiNav, setIsSemiNav] = useState(false);

    // Update the useEffect in NavBar
    useEffect(() => {
        const savedState = localStorage.getItem('semi-nav-state');
        if (savedState === 'true') {
            setIsSemiNav(true);
            document.querySelector('.vertical-sidebar')?.classList.add('semi-nav');
        }
    }, []);


    const profile_image_url = activeUser?.profile_image;
    const first_name = activeUser?.first_name;
    const last_name = activeUser?.last_name;
    const role = activeUser?.role;
    const role_name = getRoleInFarsi(role);

    const handleLogoutClick = async () => {
        const response = await robustFetch({
            url: `api/auth/logout/`,
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
            router: router,
        });
        setActiveUser(null);
        router.prefetch('/login');
        router.replace('/login');
    };

    // Update toggleSemiNav function
    const toggleSemiNav = () => {
        const nav = document.querySelector('.vertical-sidebar');
        if (nav) {
            nav.classList.toggle('semi-nav');
            const newState = nav.classList.contains('semi-nav');
            setIsSemiNav(newState);
            localStorage.setItem('semi-nav-state', String(newState));
        }
    };

    return (
        <nav className='vertical-sidebar'>
            <div className="app-logo">
                <div className="d-flex align-items-center nav-profile p-3">
                    <span className="h-45 w-45 d-flex-center b-r-25 position-relative bg-primary m-auto">
                        <img alt="avatar" className="navbar-profile-image b-r-25" src={profile_image_url}></img>
                    </span>

                    <div className="flex-grow-1 ps-2">
                        <h6 className="text-primary mb-0">{first_name} {last_name}</h6>
                        <p className="text-muted f-s-15 mb-0">{role_name}</p>
                    </div>

                    <div className="row" style={{ columnGap: '20px' }}>
                        <div className="col-md-9 dropdown profile-menu-dropdown">
                            <a aria-expanded="false" data-bs-auto-close="true" data-bs-placement="top"
                                data-bs-toggle="dropdown" role="button">
                                <i className="ti ti-settings fs-5"></i>
                            </a>
                            <ul className="dropdown-menu">
                                <li className="dropdown-item">
                                    <Link className="f-w-500" href="/profile">
                                        <i className="ph-duotone  ph-user-circle ps-1 f-s-20"></i> جزئیات پروفایل
                                    </Link>
                                </li>
                                <li className="app-divider-v dotted py-1"></li>
                                <li className="dropdown-item">
                                    <a className="mb-0 text-danger" onClick={handleLogoutClick}>خروج از حساب</a>
                                </li>
                            </ul>
                        </div>
                        <div className='col-md-3'>
                            <span
                                className="bg-light-primary toggle-semi-nav d-flex-center"
                                onClick={toggleSemiNav}
                                style={{ cursor: 'pointer' }}
                            >
                                <i className="ti ti-chevron-left"></i>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="app-nav simplebar-scrollable-y" id="app-simple-bar">
                <ul className="main-nav p-0 mt-2">
                    {canAccess(role, "report") && (
                        <li>
                            <Link
                                className={shouldExpandParent('/report') ? "show" : "collapsed"}
                                aria-expanded={shouldExpandParent('/report') ? "true" : "false"}
                                data-bs-toggle="collapse"
                                href="#reports">
                                <svg stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19.5 14.25V11.625C19.5 9.76104 17.989 8.25 16.125 8.25H14.625C14.0037 8.25 13.5 7.74632 13.5 7.125V5.625C13.5 3.76104 11.989 2.25 10.125 2.25H8.25M8.25 15H15.75M8.25 18H12M10.5 2.25H5.625C5.00368 2.25 4.5 2.75368 4.5 3.375V20.625C4.5 21.2463 5.00368 21.75 5.625 21.75H18.375C18.9963 21.75 19.5 21.2463 19.5 20.625V11.25C19.5 6.27944 15.4706 2.25 10.5 2.25Z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round" />
                                    <defs>
                                        <clipPath id="clip0_109_34">
                                            <rect width="24" height="24" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>گزارشات
                            </Link>
                            <ul className={`collapse ${shouldExpandParent('/report') ? "show" : ""}`} id="reports">
                                <li className={isChildActive('/report/all') ? 'active' : ''}><Link href="/report/all" prefetch={true}>گزارشات کلی برخط</Link></li>
                                <li className={isChildActive('/report/gate') ? 'active' : ''}><Link href="/report/gate" prefetch={true}>گزارش گیت برخط</Link></li>
                                <li className={isChildActive('/report/history') ? 'active' : ''}><Link href="/report/history" prefetch={true}>گزارشات گذشته</Link></li>
                            </ul>
                        </li>
                    )}
                    {canAccess(role, "users") && (
                        <li>
                            <Link
                                className={shouldExpandParent('/users') ? "show" : "collapsed"}
                                aria-expanded={shouldExpandParent('/users') ? "true" : "false"}
                                data-bs-toggle="collapse"
                                href="#users">
                                <svg stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20.25 14.1499V18.4C20.25 19.4944 19.4631 20.4359 18.3782 20.58C16.2915 20.857 14.1624 21 12 21C9.83757 21 7.70854 20.857 5.62185 20.58C4.5369 20.4359 3.75 19.4944 3.75 18.4V14.1499M20.25 14.1499C20.7219 13.7476 21 13.1389 21 12.4889V8.70569C21 7.62475 20.2321 6.69082 19.1631 6.53086C18.0377 6.36247 16.8995 6.23315 15.75 6.14432M20.25 14.1499C20.0564 14.315 19.8302 14.4453 19.5771 14.5294C17.1953 15.3212 14.6477 17.5 12 17.5C9.35227 17.5 6.80469 15.3212 4.42289 14.5294C4.16984 14.4452 3.94361 14.3149 3.75 14.1499M3.75 14.1499C3.27808 13.7476 3 13.1389 3 12.4889V8.70569C3 7.62475 3.7679 6.69082 4.83694 6.53086C5.96233 6.36247 7.10049 6.23315 8.25 6.14432M15.75 6.14432V5.25C15.75 4.00736 14.7426 3 13.5 3H10.5C9.25736 3 8.25 4.00736 8.25 5.25V6.14432M15.75 6.14432C14.5126 6.0487 13.262 6 12 6C10.738 6 9.48744 6.0487 8.25 6.14432"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round" />
                                    <defs>
                                        <clipPath id="clip0_109_27">
                                            <rect width="24" height="24" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>کارمندان
                            </Link>
                            <ul className={`collapse ${shouldExpandParent('/users') ? "show" : ""}`} id="users">
                                <li className={isChildActive('/users') ? 'active' : ''}><Link href="/users">لیست کارمندان</Link></li>
                            </ul>
                        </li>
                    )}

                    {canAccess(role, "areas") && (
                        <li>
                            <Link
                                className={shouldExpandParent('/areas') ? "show" : "collapsed"}
                                aria-expanded={shouldExpandParent('/areas') ? "true" : "false"}
                                data-bs-toggle="collapse"
                                href="#areas">
                                <svg stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_109_27)">
                                        <path
                                            d="M15 10.5C15 12.1569 13.6569 13.5 12 13.5C10.3431 13.5 9 12.1569 9 10.5C9 8.84315 10.3431 7.5 12 7.5C13.6569 7.5 15 8.84315 15 10.5Z"
                                            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                            strokeLinejoin="round" />
                                        <path
                                            d="M19.5 10.5C19.5 17.6421 12 21.75 12 21.75C12 21.75 4.5 17.6421 4.5 10.5C4.5 6.35786 7.85786 3 12 3C16.1421 3 19.5 6.35786 19.5 10.5Z"
                                            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                            strokeLinejoin="round" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_109_27">
                                            <rect width="24" height="24" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>محوطه</Link>
                            <ul className={`collapse ${shouldExpandParent('/areas') ? "show" : ""}`} id="areas">

                                <li className={isChildActive('/areas') ? 'active' : ''}><Link href="/areas">لیست محوطه ها</Link></li>
                            </ul>
                        </li>
                    )}
                </ul>
            </div>

        </nav>
    );
}

export default NavBar;
