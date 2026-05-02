import React, { ReactNode } from 'react';

interface FilterSidebarProps {
    children: ReactNode;
    title?: string;
    hasActiveFilter?: boolean;
    onClearFilters: () => void;
    clearButtonText?: string;
    height?: string;
    showClearButton?: boolean;
    headerContent?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
    children,
    title = "فیلتر",
    hasActiveFilter = false,
    onClearFilters,
    clearButtonText = "پاک کردن فیلتر های فعال",
    height = "84vh",
    showClearButton = true,
    headerContent,
    className = "",
    style = {}
}) => {
    return (
        <div className={`${className}`} style={style}>
            <div className="card hover-effect b-r-25 cards-scrollable" style={{ height }}>
                <div className="card-header" style={{
                    position: 'sticky',
                    paddingTop: '5px',
                    paddingBottom: '15px',
                    borderBottom: '1px solid var(--bs-border-color)',
                    top: 0,
                    borderRadius: '25px 25px 0 0',
                    backgroundColor: 'var(--bs-card-bg)',
                    zIndex: 10
                }}>
                    {headerContent ? (
                        headerContent
                    ) : (
                        <div className="about-list">
                            <div className="about-list-item">
                                <span className="about-list-label f-s-25">
                                    {title}
                                </span>
                                <span className="about-list-value">
                                    {hasActiveFilter && showClearButton && (
                                        <button
                                            className="btn btn-light-see-blue b-r-25 f-w-500"
                                            type="button"
                                            onClick={onClearFilters}
                                        >
                                            {clearButtonText}
                                        </button>
                                    )}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="card-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default FilterSidebar;