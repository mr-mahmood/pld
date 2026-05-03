
import React from 'react';
import { Area } from "@/src/types/area";

interface AreaProps {
    area: Area | null;
    height: string
}

const AreaInfoCard: React.FC<AreaProps> = ({ area, height }) => {

    return (
        <div className="card hover-effect b-r-25">
            <div className="card-header">
                <h5>دسترسی سریع به اطلاعات محوطه</h5>
            </div>
            <div className="card-body" style={{ height: height }}>
                <div className="cards-scrollable">
                    <div className="about-list">
                        <div className="about-list-item pb-2 border-bottom">
                            <span className="about-list-label">
                                <i className="ti ti-user"></i> نام:
                            </span>
                            <span className="about-list-value">
                                {area?.name}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AreaInfoCard;