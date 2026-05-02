"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UserList from '@/src/components/User/UserList';
import { UserData } from '@/src/types/userData';
import { useActiveUser } from "@/src/contexts/active_user_context";
import UserCreateModal from '@/src/components/User/UserCreateModal';

export default function UserListPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const { activeUser } = useActiveUser();
    const router = useRouter();

    const handleUserEdit = (user: UserData) => {
        let id = user.id;
        if (!id || isNaN(Number(id))) {
            router.prefetch('/users');
            router.push('/users');
            return;
        } else {
            router.prefetch(`/users/${user.id}`);
            router.push(`/users/${user.id}`);
        }
    };

    const handleUserCreate = (createdUser: UserData, redirect_after_create: boolean) => {
        setUsers(prev => [...prev, createdUser]);
        if (redirect_after_create){
            router.prefetch(`/users/${createdUser.id}`);
            router.push(`/users/${createdUser.id}`);
        }
    };

    return (
        <>
            <title>User list</title>

            <UserList
                users={users}
                setUsers={setUsers}
                onUserEdit={handleUserEdit}
            />

            <UserCreateModal
                onUserCreate={handleUserCreate}
            />
        </>
    );
}
