"use client";

import AccessHistoryList from '@/src/components/Report/AccessHistoryList';
import AccessInfoModal from '@/src/components/Report/AccessInfoModal';
import { AccessHistory } from '@/src/types/accessHistory';
import { useState } from 'react';

export default function AccessHistoryListPage() {

    const [singleAccess, setSingleAccess] = useState<AccessHistory | null>(null);
    const handleModalOpenClick = (access: AccessHistory) => {
        if (!access) return;
        setSingleAccess(access);

    };

    return (
        <>
            <AccessHistoryList
                onModalOpen={handleModalOpenClick}
            />

            <AccessInfoModal 
                accessInfo={singleAccess}
            />
        </>
    );
}
