// src/components/Report/FilterModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useActiveUser } from "@/src/contexts/active_user_context";

interface FilterModalProps {
    filters: {
        areaName: string;
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
                                    <label className="form-label" htmlFor="modal_areaName">نام</label>
                                    <input
                                        className={`form-control ${localFilters.areaName ? "bg-light-success" : ""}`}
                                        id="modal_areaName"
                                        name="areaName"
                                        type="text"
                                        placeholder="نام محوطه مورد نظر را وارد کنید..."
                                        value={localFilters.areaName}
                                        autoComplete="off"
                                        onChange={(e) => handleFilterChange('areaName', e.target.value)}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label" htmlFor="modal_status">وضعیت</label>
                                    <select
                                        className={`form-select rtl-select ${localFilters.isActive !== null ? "bg-light-success" : ""}`}
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