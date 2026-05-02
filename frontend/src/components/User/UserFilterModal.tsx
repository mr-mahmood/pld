// src/components/Report/FilterModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useActiveUser } from "@/src/contexts/active_user_context";

interface FilterModalProps {
    filters: {
        userName: string;
        employeNumber: string;
        nationaId: string;
        phoneNumber: string;
        role: string;
        isActive: boolean | null;
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

    const handleFilterChange = (key: string, value: string | boolean | null) => {
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
                                        value={localFilters.employeNumber}
                                        autoComplete="off"
                                        onChange={(e) => handleFilterChange('employeNumber', e.target.value)}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_nationaId">کد ملی</label>
                                    <input
                                        className="form-control"
                                        id="modal_nationaId"
                                        type="number"
                                        placeholder="کد ملی فرد مورد نظر را وارد کنید...."
                                        value={localFilters.nationaId}
                                        autoComplete="off"
                                        onChange={(e) => handleFilterChange('nationaId', e.target.value)}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_phoneNumber">شماره تلفن</label>
                                    <input
                                        className="form-control"
                                        id="modal_phoneNumber"
                                        type="number"
                                        placeholder="شماره تلفن همراه فرد مورد نظر را وارد کنید...."
                                        value={localFilters.phoneNumber}
                                        autoComplete="off"
                                        onChange={(e) => handleFilterChange('phoneNumber', e.target.value)}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_userRole">سِمت</label>
                                    <select
                                        className="form-select rtl-select"
                                        value={localFilters.role}
                                        onChange={(e) => handleFilterChange('role', e.target.value)}
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
                                    <label className="form-label" htmlFor="modal_status">وضعیت</label>
                                    <select
                                        className="form-select rtl-select"
                                        value={localFilters.isActive === true ? "true" : localFilters.isActive === false ? "false" : ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            let newValue: boolean | null = null;
                                            if (value === "true") newValue = true;
                                            else if (value === "false") newValue = false;
                                            else newValue = null;
                                            handleFilterChange('isActive', newValue);
                                        }}
                                    >
                                        <option value="">انتخاب کنید</option>
                                        <option value="true">فعال</option>
                                        <option value="false">غیر فعال</option>
                                    </select>
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