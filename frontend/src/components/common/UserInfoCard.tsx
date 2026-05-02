
import React from 'react';
import { useActiveUser } from "@/src/contexts/active_user_context";
import { UserData } from "@/src/types/userData";

interface UserProps {
    userData: UserData | null;
    height: string
}

const UserInfoCard: React.FC<UserProps> = ({ userData, height }) => {
    const { getRoleInFarsi } = useActiveUser();


    return (
        <div className="card hover-effect b-r-25">
            <div className="card-header">
                <h5>دسترسی سریع به اطلاعات کاربر</h5>
            </div>
            <div className="card-body" style={{ height: height }}>
                <div className="cards-scrollable">
                    <div className="about-list">
                        <div className="about-list-item pb-2 border-bottom">
                            <span className="about-list-label">
                                <i className="ti ti-user"></i> نام:
                            </span>
                            <span className="about-list-value">
                                {userData?.first_name} {userData?.last_name}
                            </span>
                        </div>
                        <div className="about-list-item pb-2 border-bottom">
                            <span className="about-list-label">
                                <i className="ti ti-certificate"></i> سِمت:
                            </span>
                            <span className="about-list-value">
                                {getRoleInFarsi(userData?.role)}
                            </span>
                        </div>
                        <div className="about-list-item pb-2 border-bottom">
                            <span className="about-list-label">
                                <i className="ti ti-123"></i> کد پرسنلی:
                            </span>
                            <span className="about-list-value">
                                {userData?.employe_number}
                            </span>
                        </div>
                        <div className="about-list-item pb-2 border-bottom">
                            <span className="about-list-label">
                                <i className="ti ti-id-badge"></i> کد ملی:
                            </span>
                            <span className="about-list-value">
                                {userData?.national_id}
                            </span>
                        </div>
                        <div className="about-list-item">
                            <span className="about-list-label">
                                <i className="ti ti-phone"></i> شماره تلفن:
                            </span>
                            <span className="about-list-value">
                                {userData?.phone_number}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserInfoCard;