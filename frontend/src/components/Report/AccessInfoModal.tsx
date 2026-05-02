import React, { useState, useEffect } from 'react';
import { AccessHistory } from '@/src/types/accessHistory';
import { useActiveUser } from '@/src/contexts/active_user_context';
import { colors } from '@mui/material';

interface AccessInfoProps {
    accessInfo: AccessHistory | null;
}

const AccessInfoModal: React.FC<AccessInfoProps> = ({ accessInfo }) => {
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // Reset active image index when modal opens with new data
    useEffect(() => {
        if (accessInfo) {
            setActiveImageIndex(0);
        }
    }, [accessInfo]);

    const { getRoleInFarsi } = useActiveUser();

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case "مدیر ارشد":
                return "text-light-cyan";
            case "مدیر":
                return "text-light-see-blue";
            case "ادمین":
                return "text-light-info";
            case "کارمند":
                return "text-light-purple";
            case "ناشناس":
                return "text-light-orange";
            default:
                return "text-light-primary";
        }
    };

    // Helper function to get user role (handles null)
    const getUserRole = (user: any) => {
        if (!user) return "ناشناس";
        return getRoleInFarsi(user.role);
    };

    // Helper function to format Persian date
    const formatPersianDate = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('fa-IR') + ' ' + date.toLocaleDateString('fa-IR');
        } catch {
            return 'تاریخ نامعتبر';
        }
    };

    return (
        <>
            <div aria-hidden="true" className="modal fade" id="infoModal" tabIndex={-1}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className='modal-header'>
                            <h5 className="modal-title" >جزئیات گزارش</h5>
                            <h5>
                                <button className="btn btn-light-danger b-r-25 f-s-17" data-bs-dismiss="modal" type="button">انصراف</button>
                            </h5>
                        </div>
                        <div className='modal-body'>
                            <div className="row ">
                                <div className="col-sm-12 ">
                                    {accessInfo && (
                                        <>
                                            {/* Original Image */}
                                            {accessInfo.original_image && (
                                                <div className="mb-1" style={{}}>
                                                    <img
                                                        alt="تصویر اصلی"
                                                        className="w-100 d-block b-r-25"
                                                        src={accessInfo.original_image}
                                                        style={{ border: '2px solid #ddd' }}
                                                        loading="lazy"
                                                    />
                                                    <div className="text-center mt-1" >
                                                        <small className="text-muted">تصویر اصلی</small>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Generated Image */}
                                            {accessInfo.generated_image && (
                                                <div className="mb-1" >
                                                    <img
                                                        alt="پلاک تشخیص داده شده"
                                                        className="w-100 d-block"
                                                        src={accessInfo.generated_image}
                                                        loading="lazy"
                                                    />
                                                    <div className="text-center mt-1" >
                                                        <small className="text-muted">پلاک تشخیص داده شده</small>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="card-body">
                                                <div className="about-list">
                                                    {/* Single row item */}
                                                    <div className="row" style={{ width: '100% ' }}>
                                                        {accessInfo.status === 'ALLOWED' ? (
                                                            <span className="badge float-end text-light-success b-r-25 f-w-500 f-s-16 mt-0">دسترسی مجاز</span>
                                                        ) : (
                                                            <span className="badge float-end text-light-danger b-r-25 f-w-500 f-s-16 mt-0">دسترسی غیر مجاز</span>
                                                        )}
                                                    </div>

                                                    {/* Row 1: car model and color */}
                                                    <div className="about-list-row" style={{ borderTop: '1px solid #dee2e6', paddingTop: '0.5rem' }}>
                                                        <span className="label-col">ماشین:</span>
                                                        <span className="value-col">
                                                            {accessInfo.car?.model || '---'}
                                                        </span>
                                                        <span className="separator-col">|</span>
                                                        <span className="label-col">رنگ:</span>
                                                        <span className="value-col">
                                                            {accessInfo.car?.color || '---'}
                                                        </span>
                                                    </div>

                                                    {/* Row 2: Name and Employee Code */}
                                                    <div className="about-list-row">
                                                        <span className="label-col">مالک:</span>
                                                        <span className="value-col">
                                                            {accessInfo.user?.first_name || accessInfo.user?.last_name ?
                                                                `${accessInfo.user?.first_name || ''} ${accessInfo.user?.last_name || ''} (${getUserRole(accessInfo.user)})`.trim()
                                                                :
                                                                '---'
                                                            }
                                                        </span>
                                                        <span className="separator-col">|</span>
                                                        <span className="label-col" >کد پرسنلی:</span>
                                                        <span className="value-col">
                                                            {accessInfo.user?.employe_number || '---'}
                                                        </span>
                                                    </div>

                                                    {/* Row 3: Area and Gate */}
                                                    <div className="about-list-row">
                                                        <span className="label-col">محوطه:</span>
                                                        <span className="value-col">
                                                            {accessInfo.area?.name || '---'}
                                                        </span>
                                                        <span className="separator-col">|</span>
                                                        <span className="label-col">گیت:</span>
                                                        <span className="value-col">
                                                            {accessInfo.gate?.name || '---'}
                                                        </span>
                                                    </div>

                                                    {/* Row 4: Date and Confidence */}
                                                    <div className="about-list-row">
                                                        <span className="label-col">تاریخ:</span>
                                                        <span className="value-col">
                                                            {formatPersianDate(accessInfo.timestamp)}
                                                        </span>
                                                        <span className="separator-col">|</span>
                                                        <span className="label-col">اطمینان:</span>
                                                        <span className="value-col">
                                                            {accessInfo.confidence != null ? `% ${Math.round(accessInfo.confidence * 100)}` : '---'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AccessInfoModal;