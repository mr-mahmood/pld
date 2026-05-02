"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { robustFetch } from '@/src/utils/apiFetch';
import GateList from '@/src/components/Gate/GateList';
import GateEditModal from '@/src/components/Gate/GateEditModal';
import GateCreateModal from '@/src/components/Gate/GateCreateModal';
import { Gate } from '@/src/types/gate';
import { LoadingSpinnerFullPage } from '@/src/components/common/LoadingSpinner';
import { Area } from '@/src/types/area';
import ErrorCard from "@/src/components/common/ErrorConnectToBackend";

export default function EditGateePage() {
    const router = useRouter();
    const [area, setArea] = useState<Area>();
    const [gates, setGates] = useState<Gate[]>([]);
    const [selectedGateToEdit, setSelectedGateToEdit] = useState<Gate | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorPageCode, setErrorPageCode] = useState<number | undefined>(undefined);

    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 1];
        const fetchGate = async () => {
            try {
                const response = await robustFetch({
                    url: `api/areas/${id}`,
                    method: 'GET',
                    headers: { "Content-Type": "application/json" },
                    body: null,
                    router: router
                });
                if (response.success !== true) {
                    setErrorPageCode(response.code);
                    setHasError(true);
                    throw new Error(`error while fetch area data${response.message}`);
                } else {
                    setArea(response.data.area);
                    setGates(response.data.area.gates);
                }
            } catch (err) {
                setHasError(true);
                console.error('error fetching area data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchGate();
    }, []);

    const handleGateUpdated = (updatedGate: Gate) => {
        setGates(
            prev => prev.map(a => a.id === updatedGate.id ? updatedGate : a)
        );
        setSelectedGateToEdit(null);
    };

    const handleGateCreat = (createdGate: Gate) => {
        setGates(prev => [...prev, createdGate]);
    };

    return (
        <>
            <title>gate Info</title>
            {loading ? (
                <LoadingSpinnerFullPage isLoading={loading} />
            ) : !hasError && area ? (
                <>
                    <title>Gate list</title>

                    <GateList
                        area={area}
                        gates={gates}
                        setGates={setGates}
                        onEdit={setSelectedGateToEdit}
                    />

                    <GateEditModal
                        gateData={selectedGateToEdit}
                        onGateUpdated={handleGateUpdated}
                    />

                    <GateCreateModal
                        area={area}
                        onGateCreate={handleGateCreat}
                    />
                </>
            ) : (
                <ErrorCard
                    code={errorPageCode}
                />
            )}
        </>
    );


}
