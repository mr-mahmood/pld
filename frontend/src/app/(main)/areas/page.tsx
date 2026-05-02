"use client";

import Script from "next/script";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AreaList from '@/src/components/Area/AreaList';
import AreaEditModal from '@/src/components/Area/AreaEditModal';
import AreaCreateModal from '@/src/components/Area/AreaCreateModal';
import { Area } from '@/src/types/area';

export default function AreasListPage() {
    const [areas, setAreas] = useState<Area[]>([]);
    const [selectedAreaToEdit, setSelectedAreaToEdit] = useState<Area | null>(null);
    const router = useRouter();

    const handleAreaUpdated = (updatedArea: Area) => {
        setAreas(
            prev => prev.map(a => a.id === updatedArea.id ? updatedArea : a)
        );
        setSelectedAreaToEdit(null);
    };

    const handleAreaCreat = (createdArea: Area, redirect_after_create: boolean) => {
        setAreas(prev => [...prev, createdArea]);
        if (redirect_after_create) {
            router.prefetch(`/areas/${createdArea.id}`);
            router.push(`/areas/${createdArea.id}`);
        }
    };

    return (
        <>
            <title>Area list</title>

            <AreaList
                areas={areas}
                setAreas={setAreas}
                onEdit={setSelectedAreaToEdit}
            />

            <AreaEditModal
                areaData={selectedAreaToEdit}
                onAreaUpdated={handleAreaUpdated}
            />

            <AreaCreateModal
                onAreaCreate={handleAreaCreat}
            />
        </>
    );
}
