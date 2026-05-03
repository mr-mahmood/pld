

import { useEffect, useRef, useState } from "react";
import { robustFetch } from "@/src/utils/apiFetch";
import { useRouter } from "next/navigation";
import { useActiveUser } from "@/src/contexts/active_user_context";
import { Area } from "@/src/types/area";
import { UserData } from "@/src/types/userData";
import { LoadingSpinnerFullPage } from '@/src/components/common/LoadingSpinner';
import ErrorCard from "@/src/components/common/ErrorConnectToBackend";
import UserInfoCard from "@/src/components/User/UserInfoCard";
import NoDataError from "../common/NoDataError";

interface UserAreaProps {
    UserData: UserData | null;
}

const UserAreasList: React.FC<UserAreaProps> = ({ UserData }) => {

    const router = useRouter();
    const hasFetched = useRef(false);
    const { getRoleInFarsi } = useActiveUser();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasChange, setHasChange] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorPageCode, setErrorPageCode] = useState<number | undefined>(undefined);
    const [areas, setAreas] = useState<Area[]>([]);
    const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
    const [initliaSelectedAreaIds, setInitliaSelectedAreaIds] = useState<number[]>([]);
    const [formError, setFormError] = useState<string | null>(null);


    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        const fetchAreas = async () => {
            try {
                const response = await robustFetch({
                    url: `api/areas/`,
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    body: null,
                    router: router,
                });
                if (response.success !== true) {
                    const error_code = response.code;
                    setErrorPageCode(error_code);
                    setHasError(true);
                    throw new Error(`error while fetch all areas data: ${response.message}`);
                }
                const allAreas = response.data.areas as Area[];
                setAreas(allAreas);

                const userAreaIds = UserData?.areas?.map(area => area.id) || [];
                setSelectedAreaIds(userAreaIds);
                setInitliaSelectedAreaIds(userAreaIds);

            } catch (err) {
                console.error("Error fetching areas:", err);
                setHasError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchAreas();
    }, [UserData]);

    useEffect(() => {
        if (UserData) {
            const userAreaIds = UserData.areas?.map(area => area.id) || [];
            setSelectedAreaIds(userAreaIds);
        }
    }, [UserData]);

    const handleCheckboxChange = (id: number) => {
        setSelectedAreaIds(prev => {
            const newIds = prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id];
            const hasChanged = JSON.stringify(newIds.sort()) !== JSON.stringify(initliaSelectedAreaIds.sort());
            setHasChange(hasChanged);
            return newIds;
        });
    };

    const handlSubmitClick = async () => {
        if (!UserData || !hasChange) return;

        // === Other validation: at least one area selected ===
        if (selectedAreaIds.length === 0) {
            setFormError("حداقل یک محوطه باید انتخاب شود.");
            return;
        }

        // === Clear previous errors and proceed ===
        setFormError(null);
        setIsSubmitting(true);

        try {
            const payload = {
                'areas': selectedAreaIds,
            };
            const method_type = initliaSelectedAreaIds.length === 0 ? "POST" : "PUT";
            const response = await robustFetch({
                url: `api/users/areas/${UserData.id}/`,
                method: method_type,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router
            });

            if (response.success !== true) {
                const error_code = response.code;
                setErrorPageCode(error_code);
                setHasError(true);
                console.error(`User Access Areas edit error: ${response.message}`);
            } else {
                console.log("User Access Areas updated successfully:", response);
                setInitliaSelectedAreaIds(selectedAreaIds);
                setHasChange(false);
            }
        } catch (err) {
            console.error("Failed to edit User Access Areas:", err);
            setHasError(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const [sortConfig, setSortConfig] = useState<{
        key: keyof Area | null;
        direction: 'asc' | 'desc';
    }>({
        key: 'is_active', // ستون پیش‌فرض
        direction: 'desc',
    });

    const handleSort = (key: keyof Area) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <>
            {loading ? (
                <>
                    <LoadingSpinnerFullPage isLoading={loading} />
                </>
            ) : (
                <>
                    {!hasError && areas.length !== 0 ? (
                        <div className="row">
                            <div className="col-lg-3">
                                <UserInfoCard
                                    height="62vh"
                                    userData={UserData}
                                />
                            </div>
                            <div className="col-lg-9">
                                <div className="card hover-effect b-r-25">
                                    <div className="card-header">
                                        <div className="about-list">
                                            <div className="about-list-item">
                                                <span className="about-list-label f-s-25">
                                                    لیست محوطه های فعال
                                                </span>
                                                <span className="about-list-value">
                                                    {hasChange && selectedAreaIds.length !== 0 ? (
                                                        isSubmitting ? (
                                                            <button className="btn btn-light-see-blue b-r-25" type="button">آپدیت ...<span aria-hidden="true" className="spinner-border spinner-border-sm me-2" role="status"></span></button>
                                                        ) : (
                                                            <button className="btn btn-light-see-blue b-r-25" onClick={handlSubmitClick} type="submit">آپدیت</button>
                                                        )
                                                    ) : (
                                                        <button className="btn btn-light-see-blue b-r-25 disabled" type="button">آپدیت</button>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-xl-12">
                                        {formError && (
                                            <div className="text-center f-s-22 text-danger">
                                                <i className="ti ti-alert-circle me-2"></i> {formError}
                                            </div>
                                        )}
                                        <div className="card-body" style={{ height: '60vh' }}>
                                            <div className="scrollable-table-container" id="tableContainer" style={{ height: '100%', overflow: 'auto' }}>
                                                <table className="table table-bordered table-striped align-middle mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th className="sort f-s-17" data-sort="task" scope="col">
                                                                شناسه
                                                            </th>
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
                                                            <th className="sort f-s-17" data-sort="id" scope="col">
                                                                لیست دسترسی
                                                            </th>
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

                                                            const sortedUsers = [...areas].sort((a, b) => {
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
                                                            return sortedUsers.map((area, index) => (
                                                                <tr key={area.id}>
                                                                    <td className="f-w-500 f-s-17">{index + 1}</td>
                                                                    <td className="f-w-500 f-s-17">{area.name}</td>
                                                                    <td className="f-w-500 f-s-17">
                                                                        {area.is_active ? (
                                                                            <span className="badge text-light-success b-r-25 f-s-17">
                                                                                <i className="ti ti-user-check"></i> فعال
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge text-light-danger b-r-25 f-s-17">
                                                                                <i className="ti ti-user-off"></i> غیر فعال
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            className="form-check-input checkmark outline-primary"
                                                                            name="item"
                                                                            type="checkbox"
                                                                            value={area.id}
                                                                            checked={selectedAreaIds.includes(area.id)}
                                                                            onChange={() => handleCheckboxChange(area.id)}
                                                                        />
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
                        </div>
                    ) : (
                        <ErrorCard
                            code={errorPageCode}
                        />
                    )}
                </>
            )}
        </>
    );
}

export default UserAreasList;