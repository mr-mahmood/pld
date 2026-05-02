import { useCallback, useMemo, useState } from 'react';
import { robustFetch } from "@/src/utils/apiFetch";
import { useRouter } from 'next/navigation';
import { Gate } from '@/src/types/gate';
import { useActiveUser } from "@/src/contexts/active_user_context";
import { Area } from '@/src/types/area';
import FilterSidebar from "@/src/components/common/FilterSidebar";
import FilterModal from './GateFilterModal';
import NoDataError from '../common/NoDataError';

interface GateListProps {
    area: Area;
    gates: Gate[];
    setGates: React.Dispatch<React.SetStateAction<Gate[]>>;
    onEdit: (gate: Gate) => void;
}

export default function GateList({ area, gates, setGates, onEdit }: GateListProps) {
    const router = useRouter();
    const { activeUser } = useActiveUser();

    const handleDeleteGate = async (gate: Gate) => {
        if (!gate) return;
        try {
            const response = await robustFetch({
                url: `api/gates/${gate.id}/`,
                method: 'DELETE',
                headers: { "Content-Type": "application/json" },
                body: null,
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("gate deleted successfully:", response);
                setGates(prevUsers =>
                    prevUsers.map(u =>
                        u.id === gate.id ? { ...u, is_active: false } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to delete gate:", err);
        }
    };

    const handleActivateGate = async (gate: Gate) => {
        if (!gate) return;
        try {
            const payload = {
                'is_active': true,
            }
            const response = await robustFetch({
                url: `api/gates/${gate.id}/`,
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("gate activated successfully:", response);
                setGates(prevUsers =>
                    prevUsers.map(u =>
                        u.id === gate.id ? { ...u, is_active: true } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to activate gate:", err);
        }
    };

    const handleCheckAccessActive = async (gate: Gate) => {
        if (!gate) return;
        try {
            const payload = {
                'check_access': true,
            }
            const response = await robustFetch({
                url: `api/gates/${gate.id}/`,
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("gate check access activated successfully:", response);
                setGates(prevUsers =>
                    prevUsers.map(u =>
                        u.id === gate.id ? { ...u, access_check: true } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to activate gate:", err);
        }
    };

    const handleCheckAccessDeActive = async (gate: Gate) => {
        if (!gate) return;
        try {
            const payload = {
                'check_access': false,
            }
            const response = await robustFetch({
                url: `api/gates/${gate.id}/`,
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("gate check access deactivated successfully:", response);
                setGates(prevUsers =>
                    prevUsers.map(u =>
                        u.id === gate.id ? { ...u, access_check: false } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to activate gate:", err);
        }
    };

    const [sortConfig, setSortConfig] = useState<{
        key: keyof Gate | null;
        direction: 'asc' | 'desc';
    }>({
        key: 'name',
        direction: 'asc',
    });

    const handleSort = (key: keyof Gate) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const [filters, setFilters] = useState({
        gateName: '',
        gateIpCamera: '',
        role: '',
        accessCheck: null as boolean | null,
        isActive: null as boolean | null,
    });

    const hasActiveFilter = useMemo(() => {
        return !!(filters.gateName ||
            filters.gateIpCamera ||
            filters.role ||
            filters.accessCheck !== null ||
            filters.isActive !== null);
    }, [filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.gateName) count++;
        if (filters.gateIpCamera) count++;
        if (filters.role) count++;
        if (filters.accessCheck !== null) count++;
        if (filters.isActive !== null) count++;
        return count;
    }, [filters]);

    // Handle applying filters from modal
    const handleApplyFilters = useCallback((newFilters: any) => {
        setFilters(newFilters);
    }, [setFilters]);

    const handleClearFilters = useCallback(() => {
        const emptyFilters = {
            gateName: '',
            gateIpCamera: '',
            role: '',
            accessCheck: null,
            isActive: null,
        };
        setFilters(emptyFilters);
    }, [setFilters]);

    return (
        <>
            <div className="row">
                <div className="col-lg-12">
                    <div className="card hover-effect b-r-25">
                        <div className="card-header">
                            <div className="about-list">
                                <div className="about-list-item">
                                    <span className="about-list-label f-s-25">
                                        لیست گیت ها
                                    </span>
                                    <span className="about-list-value">
                                        <button
                                            className="btn btn-light-see-blue f-s-17 b-r-25"
                                            data-bs-toggle="modal"
                                            data-bs-target="#filterModal"
                                            type="button"
                                        >
                                            <i className="ti ti-filter"></i>
                                            فیلترها {' '}
                                            {activeFilterCount > 0 && (
                                                <span className="badge bg-danger b-r-25" style={{ fontSize: '12px' }}>
                                                    {activeFilterCount}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            className="btn btn-light-see-blue b-r-25 f-s-17 f-w-500"
                                            data-bs-target="#gateCreate"
                                            data-bs-toggle="modal"
                                        >
                                            ساخت گیت جدید
                                        </button>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="card-body" style={{ height: '75vh' }}>
                            <div className="scrollable-table-container" id="tableContainer" style={{ height: '100%', overflow: 'auto' }}>
                                <table className="table table-bordered table-striped align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th className="f-s-17" scope="col">شناسه</th>
                                            <th scope="col">
                                                <button
                                                    className="btn btn-link p-0 text-decoration-none f-s-20"
                                                    onClick={() => handleSort('name')}
                                                >
                                                    نام {sortConfig.key === 'name' && (
                                                        <span className="ms-1">
                                                            {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending-letters" /> : <i className="ti ti-sort-descending-letters" />}
                                                        </span>
                                                    )}
                                                </button>
                                            </th>
                                            <th scope="col">
                                                <button
                                                    className="btn btn-link p-0 text-decoration-none f-s-20"
                                                    onClick={() => handleSort('camera')}
                                                >
                                                    آدرس دوربین{sortConfig.key === 'camera' && (
                                                        <span className="ms-1">
                                                            {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending-letters" /> : <i className="ti ti-sort-descending-letters" />}
                                                        </span>
                                                    )}
                                                </button>
                                            </th>
                                            <th scope="col">
                                                <button
                                                    className="btn btn-link p-0 text-decoration-none f-s-20"
                                                    onClick={() => handleSort('role')}
                                                >
                                                    نوع گیت {sortConfig.key === 'role' && (
                                                        <span className="ms-1">
                                                            {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending" /> : <i className="ti ti-sort-descending" />}
                                                        </span>
                                                    )}
                                                </button>
                                            </th>
                                            <th scope="col">
                                                <button
                                                    className="btn btn-link p-0 text-decoration-none f-s-20"
                                                    onClick={() => handleSort('is_active')}
                                                >
                                                    وضعیت {sortConfig.key === 'is_active' && (
                                                        <span className="ms-1">
                                                            {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending" /> : <i className="ti ti-sort-descending" />}
                                                        </span>
                                                    )}
                                                </button>
                                            </th>
                                            <th className="f-s-17" scope="col">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            if (gates.length === 0) {
                                                return (
                                                    <NoDataError 
                                                    message="هیچ گیتی برای این محوطه ساخته نشده است"
                                                    />
                                                );
                                            }

                                            const filteredGates = gates.filter(gate => {
                                                const matchesName = !filters.gateName ||
                                                    gate.name.toLowerCase().includes(filters.gateName.toLowerCase());
                                                const matchesLocations = !filters.gateIpCamera ||
                                                    gate.camera.toLowerCase().includes(filters.gateIpCamera.toLowerCase());
                                                const matchesRole = !filters.role ||
                                                    gate.role.toLowerCase().includes(filters.role.toLowerCase());
                                                const matchesActive = filters.isActive === null || gate.is_active === filters.isActive;

                                                return matchesName && matchesLocations && matchesActive && matchesRole;
                                            });
                                            const sortedGates = [...filteredGates].sort((a, b) => {
                                                const { key, direction } = sortConfig;
                                                if (!key) return 0;
                                                let aValue = a[key];
                                                let bValue = b[key];
                                                const isString = (val: any): val is string => typeof val === 'string';
                                                switch (key) {
                                                    case 'name':
                                                        return direction === 'asc'
                                                            ? (isString(aValue) ? aValue.toLowerCase() : String(aValue))
                                                                .localeCompare(
                                                                    isString(bValue) ? bValue.toLowerCase() : String(bValue),
                                                                    'fa',
                                                                    { sensitivity: 'base' }
                                                                )
                                                            : (isString(bValue) ? bValue.toLowerCase() : String(bValue))
                                                                .localeCompare(
                                                                    isString(aValue) ? aValue.toLowerCase() : String(aValue),
                                                                    'fa',
                                                                    { sensitivity: 'base' }
                                                                );
                                                    case 'camera':
                                                        const CameraCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
                                                        const aValueStr = String(aValue);
                                                        const bValueStr = String(bValue);
                                                        return direction === 'asc'
                                                            ? CameraCollator.compare(aValueStr, bValueStr)
                                                            : CameraCollator.compare(bValueStr, aValueStr);
                                                    case 'is_active':
                                                        return direction === 'asc'
                                                            ? Number(aValue) - Number(bValue)
                                                            : Number(bValue) - Number(aValue);
                                                    default:
                                                        return 0;
                                                }
                                            });

                                            if (sortedGates.length === 0) {
                                                return (
                                                    <NoDataError />
                                                );
                                            }

                                            return sortedGates.map((gate, index) => (
                                                <tr key={gate.id}>
                                                    <td className="f-w-500 f-s-17">{index + 1}</td>
                                                    <td className="f-w-500 f-s-17">{gate.name}</td>
                                                    <td className="f-w-500 f-s-17">{gate.camera}</td>
                                                    <td className="f-w-500">
                                                        {(() => {
                                                            if (gate.role === "ENTERY") {
                                                                return (
                                                                    <span className="badge text-light-cyan b-r-25 f-s-17">
                                                                        <i className="ti ti-door-enter"></i> ورودی
                                                                    </span>
                                                                );
                                                            } else if (gate.role === "EXIT") {
                                                                return (
                                                                    <span className="badge text-light-dark-orange b-r-25 f-s-17">
                                                                        <i className="ti ti-door-exit"></i> خروجی
                                                                    </span>
                                                                );
                                                            } else if (gate.role === "SURVEILLANCE") {
                                                                return (
                                                                    <span className="badge text-light-see-blue b-r-25 f-s-17">
                                                                        <i className="ti ti-device-computer-camera"></i> نظارت
                                                                    </span>
                                                                );
                                                            }
                                                        })()}
                                                    </td>
                                                    <td className="f-w-500">
                                                        {gate.is_active ? (
                                                            <span className="badge text-light-success b-r-25 f-s-17">
                                                                <i className="ti ti-camera"></i> فعال
                                                            </span>
                                                        ) : (
                                                            <span className="badge text-light-danger b-r-25 f-s-17">
                                                                <i className="ti ti-camera-off"></i> غیر فعال
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {activeUser ? (
                                                            <>
                                                                {gate.is_active ? (
                                                                    <>
                                                                        <button
                                                                            className="btn btn-light-danger icon-btn b-r-10 delete-btn f-s-25"
                                                                            type="button"
                                                                            onClick={() => handleDeleteGate(gate)}
                                                                        >
                                                                            <i className="ti ti-camera-off"></i>
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        className="btn btn-light-success icon-btn b-r-10 f-s-25"
                                                                        type="button"
                                                                        onClick={() => handleActivateGate(gate)}
                                                                    >
                                                                        <i className="ti ti-camera"></i>
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <></>
                                                        )}
                                                        <button
                                                            className="btn btn-light-cyan icon-btn b-r-10 f-s-25"
                                                            data-bs-target="#gateEdit"
                                                            data-bs-toggle="modal"
                                                            type="button"
                                                            onClick={() => onEdit(gate)}
                                                        >
                                                            <i className="ti ti-edit"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <FilterModal
                filters={filters}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                hasActiveFilter={hasActiveFilter}
            />
        </>
    );
}