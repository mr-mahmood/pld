"use client";

import { useActiveUser } from "@/src/contexts/active_user_context";
import ProfileImageUploader from "@/src/components/User/UserProfileImage";
import UserInformationForm from '@/src/components/User/UserInformationForm';
import PasswordChangeForm from '@/src/components/User/UserPasswordChangeForm';
import WebcamModal from "@/src/components/common/WebcamModal";

export default function Profile() {
    const { activeUser, setActiveUser } = useActiveUser();

    return (
        <>
            <title>Profile</title>
            <div className="col-12">
                <div className="card hover-effect b-r-25">
                    <div className="card-body">
                        <div className="profile-image-tab profile-container">
                            <ProfileImageUploader
                                UserData={activeUser}
                            />
                            <UserInformationForm
                                UserData={activeUser}
                                setUserData={() => {}}
                                mode='profile'
                            />
                            <PasswordChangeForm />
                        </div>
                    </div>
                </div>
            </div>
            <WebcamModal
                userData={activeUser}
                onUserUpdated={() => { }}
            />
        </>
    );
}
