import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { robustFetch } from "@/src/utils/apiFetch";
import { useRouter } from 'next/navigation';
import { Area } from '@/src/types/area';
import { useActiveUser } from "@/src/contexts/active_user_context";
import { LoadingSpinnerFullPage } from '@/src/components/common/LoadingSpinner';
import FilterSidebar from "@/src/components/common/FilterSidebar";
import ErrorCard from "@/src/components/common/ErrorConnectToBackend";
import FilterModal from './AreaFilterModal';
import NoDataError from '../common/NoDataError';
interface AreaListProps {
    areas: Area[];
    setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
    onEdit: (area: Area) => void;
}

export default function AreaList({ areas, setAreas, onEdit }: AreaListProps) {
    const router = useRouter();
    const hasFetched = useRef(false);
    const { activeUser } = useActiveUser();
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorPageCode, setErrorPageCode] = useState<number | undefined>(undefined);

    useEffect(() => {
        setLoading(true);
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchAreas = async () => {
            try {
                const response = await robustFetch({
                    url: `api/areas/`,
                    method: 'GET',
                    headers: { "Content-Type": "application/json" },
                    body: null,
                    router: router
                });

                if (response.success !== true) {
                    setErrorPageCode(response.code);
                    setHasError(true);
                    throw new Error(`error while fetch all areas data${response.message}`);
                } else {
                    setAreas(response.data.areas);
                }

            } catch (err) {
                setHasError(true);
                console.error("Error fetching areas:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAreas();
    }, []);

    const handleDeleteArea = async (area: Area) => {
        if (!area) return;
        try {
            const response = await robustFetch({
                url: `api/areas/${area.id}/`,
                method: 'DELETE',
                headers: { "Content-Type": "application/json" },
                body: null,
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("area deleted successfully:", response);
                setAreas(prevUsers =>
                    prevUsers.map(u =>
                        u.id === area.id ? { ...u, is_active: false } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to delete area:", err);
        }
    };

    const handleActivateArea = async (area: Area) => {
        if (!area) return;
        try {
            const payload = {
                'is_active': true,
            }
            const response = await robustFetch({
                url: `api/areas/${area.id}/`,
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("area activated successfully:", response);
                setAreas(prevUsers =>
                    prevUsers.map(u =>
                        u.id === area.id ? { ...u, is_active: true } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to activate area:", err);
        }
    };

    const [sortConfig, setSortConfig] = useState<{
        key: keyof Area | null;
        direction: 'asc' | 'desc';
    }>({
        key: 'name',
        direction: 'asc',
    });

    const handleSort = (key: keyof Area) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const [filters, setFilters] = useState({
        areaName: '',
        isActive: null as boolean | null,
    });

    const hasActiveFilter = useMemo(() => {
        return !!(filters.areaName ||
            filters.isActive !== null);
    }, [filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.areaName) count++;
        if (filters.isActive !== null) count++;
        return count;
    }, [filters]);

    // Handle applying filters from modal
    const handleApplyFilters = useCallback((newFilters: any) => {
        setFilters(newFilters);
    }, [setFilters]);

    const handleClearFilters = useCallback(() => {
        const emptyFilters = {
            areaName: '',
            isActive: null,
        };
        setFilters(emptyFilters);
    }, [setFilters]);

    return (
        <>
            {loading ? (
                <LoadingSpinnerFullPage isLoading={loading} />
            ) : !hasError ? (
                <>
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="card hover-effect b-r-25">
                                <div className="card-header">
                                    <div className="about-list">
                                        <div className="about-list-item">
                                            <span className="about-list-label f-s-25">
                                                لیست محوطه ها
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
                                                    className="btn btn-light-see-blue b-r-25 f-s-17"
                                                    data-bs-target="#areaCreate"
                                                    data-bs-toggle="modal"
                                                >
                                                    ساخت محوطه
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
                                                    if (areas.length === 0) {
                                                        return (
                                                            <NoDataError
                                                                message="هیچ محوطه ای ساخته نشده است"
                                                            />
                                                        );
                                                    }

                                                    const filteredAreas = areas.filter(area => {
                                                        const matchesName = !filters.areaName ||
                                                            area.name.toLowerCase().includes(filters.areaName.toLowerCase());
                                                        const matchesActive = filters.isActive === null || area.is_active === filters.isActive;

                                                        return matchesName && matchesActive;
                                                    });
                                                    const sortedAreas = [...filteredAreas].sort((a, b) => {
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
                                                            case 'is_active':
                                                                return direction === 'asc'
                                                                    ? Number(aValue) - Number(bValue)
                                                                    : Number(bValue) - Number(aValue);
                                                            default:
                                                                return 0;
                                                        }
                                                    });

                                                    if (sortedAreas.length === 0) {
                                                        return (
                                                            <NoDataError />
                                                        );
                                                    }

                                                    return sortedAreas.map((area, index) => (
                                                        <tr key={area.id}>
                                                            <td className="f-w-500 f-s-17">{index + 1}</td>
                                                            <td className="f-w-500 f-s-17">{area.name}</td>
                                                            <td className="f-w-500">
                                                                {area.is_active ? (
                                                                    <span className="badge text-light-success b-r-25 f-s-17">
                                                                        <i className="ti ti-home-check"></i> فعال
                                                                    </span>
                                                                ) : (
                                                                    <span className="badge text-light-danger b-r-25 f-s-17">
                                                                        <i className="ti ti-home-off"></i> غیر فعال
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-light-dark-orange icon-btn b-r-10 f-s-25"
                                                                    type="button"
                                                                    onClick={() => {
                                                                        router.prefetch(`/areas/${area.id}`);
                                                                        router.push(`/areas/${area.id}`);
                                                                    }}
                                                                >
                                                                    <i className="ti ti-door"></i>
                                                                </button>
                                                                {activeUser ? (
                                                                    area.is_active ? (
                                                                        <>
                                                                            <button
                                                                                className="btn btn-light-danger icon-btn b-r-10 delete-btn f-s-25"
                                                                                type="button"
                                                                                onClick={() => handleDeleteArea(area)}
                                                                            >
                                                                                <i className="ti ti-home-off"></i>
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            className="btn btn-light-success icon-btn b-r-10 f-s-25"
                                                                            type="button"
                                                                            onClick={() => handleActivateArea(area)}
                                                                        >
                                                                            <i className="ti ti-home-check"></i>
                                                                        </button>
                                                                    )
                                                                ) : (
                                                                    <></>
                                                                )}
                                                                <button
                                                                    className="btn btn-light-cyan icon-btn b-r-10 f-s-25"
                                                                    data-bs-target="#areaEdit"
                                                                    data-bs-toggle="modal"
                                                                    type="button"
                                                                    onClick={() => onEdit(area)}
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
            ) : (
                <ErrorCard
                    code={errorPageCode}
                />
            )}
        </>
    );
}



