import React from 'react';

interface NoDataProps {
    title?: string;
    message?: string;
    icon?: string;
    showClearFiltersButton?: boolean;
    onClearFilters?: () => void;
    hasActiveFilters?: boolean;
}

const NoDataError: React.FC<NoDataProps> = ({
    title = "هیچ داده‌ای یافت نشد",
    message = "هیچ داده‌ای با فیلترهای اعمال شده مطابقت ندارد",
    icon = "ti ti-database-off",
    showClearFiltersButton = false,
    onClearFilters,
    hasActiveFilters = false,
}) => {
    return (
        <tr>
            <td colSpan={10} className="text-center p-5">
                <div className="py-5">
                    <i className={`${icon} f-s-60 text-muted`}></i>
                    <h4 className="mt-3 text-muted">{title}</h4>
                    <p className="text-muted mb-0">{message}</p>
                    {showClearFiltersButton && hasActiveFilters && onClearFilters && (
                        <button
                            className="btn btn-light-primary mt-3 b-r-25"
                            onClick={onClearFilters}
                        >
                            <i className="ti ti-filter-off me-1"></i>
                            پاک کردن فیلترها
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

export default NoDataError;