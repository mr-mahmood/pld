// src/components/Report/FilterModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useActiveUser } from "@/src/contexts/active_user_context";

interface FilterModalProps {
    filters: {
        userName: string;
        userEmployeNumber: string;
        userRole: string;
        areaName: string;
        gateName: string;
        gateRole: string;
        status: string;
        start_time: string;
        end_time: string;
    };
    onApplyFilters: (filters: any) => void;  // Changed from onFilterChange
    onClearFilters: () => void;
    hasActiveFilter: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
    filters,
    onApplyFilters,
    onClearFilters,
    hasActiveFilter
}) => {
    const { activeUser } = useActiveUser();
    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Local state for form values (separate from applied filters)
    const [localFilters, setLocalFilters] = useState(filters);

    // Reset local filters when modal opens or when filters prop changes
    useEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;

        const handleShow = () => {
            // Reset local filters to current applied filters when modal opens
            // setLocalFilters(filters);
        };

        const handleHidden = () => {
            setLocalFilters(filters);
        };

        modal.addEventListener('shown.bs.modal', handleShow);
        modal.addEventListener('hidden.bs.modal', handleHidden);

        return () => {
            modal.removeEventListener('hidden.bs.modal', handleHidden);
            modal.removeEventListener('shown.bs.modal', handleShow);
        };
    }, [filters]);

    const handleFilterChange = (key: string, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        onApplyFilters(localFilters);
        closeBtnRef.current?.click();
    };

    const handleClearAndClose = () => {
        onClearFilters();
        closeBtnRef.current?.click();
    };

    return (
        <>
            {/* Modal */}
            <div
                aria-hidden="true"
                className="modal fade"
                id="filterModal"
                tabIndex={-1}
                ref={modalRef}
            >
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                <i className="ti ti-filter"></i>
                                فیلترها
                            </h5>
                            <div>
                                <button
                                    className="btn btn-light-secondary b-r-25"
                                    data-bs-dismiss="modal"
                                    type="button"
                                    ref={closeBtnRef}
                                >
                                    بستن
                                </button>
                                {hasActiveFilter && (
                                    <button
                                        className="btn btn-light-danger b-r-25"
                                        onClick={handleClearAndClose}
                                        type="button"
                                    >
                                        <i className="ti ti-trash me-1"></i> {' '}
                                        پاک کردن همه فیلترها
                                    </button>
                                )}
                                <button
                                    className="btn btn-light-see-blue b-r-25"
                                    onClick={handleApply}
                                    type="button"
                                >
                                    اعمال فیلترها
                                </button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <form className="row g-3 rounded-control app-form">
                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_userName">نام</label>
                                    <input
                                        className="form-control"
                                        id="modal_userName"
                                        name="userName"
                                        type="text"
                                        placeholder="نام فرد مورد نظر را وارد کنید..."
                                        value={localFilters.userName}
                                        autoComplete="off"
                                        onChange={(e) => handleFilterChange('userName', e.target.value)}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_employeNumber">کد پرسنلی</label>
                                    <input
                                        className="form-control"
                                        id="modal_employeNumber"
                                        type="text"
                                        placeholder="کد پرسنلی دقیق ترین حالت سرچ است"
                                        value={localFilters.userEmployeNumber}
                                        autoComplete="off"
                                        onChange={(e) => handleFilterChange('userEmployeNumber', e.target.value)}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_userRole">سِمت</label>
                                    <select
                                        className="form-select rtl-select"
                                        value={localFilters.userRole}
                                        onChange={(e) => handleFilterChange('userRole', e.target.value)}
                                    >
                                        {activeUser?.role === "SUPER" && (
                                            <>
                                                <option value="">انتخاب کنید</option>
                                                <option value="SUPER">مدیر ارشد</option>
                                                <option value="MANAGER">مدیر</option>
                                                <option value="ADMIN">ادمین</option>
                                                <option value="EMPLOYE">کارمند</option>
                                                <option value="UNKNOWN">ناشناس</option>
                                            </>
                                        )}
                                        {activeUser?.role === "MANAGER" && (
                                            <>
                                                <option value="">انتخاب کنید</option>
                                                <option value="MANAGER">مدیر</option>
                                                <option value="ADMIN">ادمین</option>
                                                <option value="EMPLOYE">کارمند</option>
                                                <option value="UNKNOWN">ناشناس</option>
                                            </>
                                        )}
                                        {activeUser?.role === "ADMIN" && (
                                            <>
                                                <option value="">انتخاب کنید</option>
                                                <option value="ADMIN">ادمین</option>
                                                <option value="EMPLOYE">کارمند</option>
                                                <option value="UNKNOWN">ناشناس</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_areaName">نام محوطه</label>
                                    <input
                                        className="form-control"
                                        id="modal_areaName"
                                        type="text"
                                        placeholder="نام محوطه را وارد کنید"
                                        value={localFilters.areaName}
                                        autoComplete="off"
                                        onChange={(e) => handleFilterChange('areaName', e.target.value)}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_gateName">نام گیت</label>
                                    <input
                                        className="form-control"
                                        id="modal_gateName"
                                        type="text"
                                        placeholder="نام گیت را وارد کنید"
                                        value={localFilters.gateName}
                                        autoComplete="off"
                                        onChange={(e) => handleFilterChange('gateName', e.target.value)}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_gateRole">نوع گیت</label>
                                    <select
                                        className="form-select rtl-select"
                                        value={localFilters.gateRole}
                                        onChange={(e) => handleFilterChange('gateRole', e.target.value)}
                                    >
                                        <option value="">انتخاب کنید</option>
                                        <option value="ENTERY">ورودی</option>
                                        <option value="EXIT">خروجی</option>
                                        <option value="SURVEILLANCE">نظارت</option>
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_status">وضعیت دسترسی</label>
                                    <select
                                        className="form-select rtl-select"
                                        value={localFilters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                    >
                                        <option value="">انتخاب کنید</option>
                                        <option value="ALLOWED">مجاز</option>
                                        <option value="DENIED">غیرمجاز</option>
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_startDate">تاریخ شروع</label>
                                    <input
                                        className="form-control"
                                        id="modal_startDate"
                                        placeholder="YYYY/MM/DD HH:MM:SS"
                                        data-jdp=""
                                        type="text"
                                        value={localFilters.start_time}
                                        onChange={(e) => handleFilterChange('start_time', e.target.value)}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_endDate">تاریخ پایان</label>
                                    <input
                                        className="form-control"
                                        id="modal_endDate"
                                        placeholder="YYYY/MM/DD HH:MM:SS"
                                        data-jdp=""
                                        type="text"
                                        value={localFilters.end_time}
                                        onChange={(e) => handleFilterChange('end_time', e.target.value)}
                                    />
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FilterModal;