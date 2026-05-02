

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { robustFetch } from "@/src/utils/apiFetch";
import { useRouter } from "next/navigation";
import { useActiveUser } from "@/src/contexts/active_user_context";
import { UserData } from "@/src/types/userData";
import { LoadingSpinnerFullPage } from '@/src/components/common/LoadingSpinner';
import NoDataError from '@/src/components/common/NoDataError';
import ErrorCard from "@/src/components/common/ErrorConnectToBackend";
import FilterModal from "./UserFilterModal";

interface UserListProps {
    users: UserData[];
    setUsers: React.Dispatch<React.SetStateAction<UserData[]>>;
    onUserEdit: (user: UserData) => void,
}

export default function EmployeList({
    users,
    setUsers,
    onUserEdit,
}: UserListProps) {

    const router = useRouter();
    const hasFetched = useRef(false);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorPageCode, setErrorPageCode] = useState<number | undefined>(undefined);
    const { getRoleInFarsi, activeUser } = useActiveUser();

    useEffect(() => {
        setLoading(true);
        if (hasFetched.current) return;
        hasFetched.current = true;
        const fetchUsers = async () => {
            try {
                const response = await robustFetch({
                    url: `api/users/`,
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    body: null,
                    router: router,
                });
                console.log(response);
                if (response.success !== true) {
                    setErrorPageCode(response.code);
                    setHasError(true);
                    throw new Error(`error while fetch all users data${response.message}`);
                } else {
                    setUsers(response.data.users);
                }
            } catch (err) {
                setHasError(true);
                console.error("Error fetching users:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleDeleteUser = async (user: UserData) => {
        if (!user) return;
        try {
            const response = await robustFetch({
                url: `api/users/${user.id}/`,
                method: 'DELETE',
                headers: { "Content-Type": "application/json" },
                body: null,
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("user deleted successfully:", response);
                setUsers(prevUsers =>
                    prevUsers.map(u =>
                        u.id === user.id ? { ...u, is_active: false } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to delete user:", err);
        }
    };

    const handleActivateUser = async (user: UserData) => {
        if (!user) return;
        try {
            const payload = {
                'is_active': true,
            }
            const response = await robustFetch({
                url: `api/users/${user.id}/`,
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("user activated successfully:", response);
                setUsers(prevUsers =>
                    prevUsers.map(u =>
                        u.id === user.id ? { ...u, is_active: true } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to activate user:", err);
        }
    };

    const [sortConfig, setSortConfig] = useState<{
        key: keyof UserData | null;
        direction: 'asc' | 'desc';
    }>({
        key: 'employe_number', // ستون پیش‌فرض
        direction: 'asc',
    });

    const handleSort = (key: keyof UserData) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const [filters, setFilters] = useState({
        userName: '',
        employeNumber: '',
        nationaId: '',
        phoneNumber: '',
        role: '',
        isActive: null as boolean | null,
    });

    const hasActiveFilter = useMemo(() => {
        return !!(filters.userName ||
            filters.employeNumber ||
            filters.nationaId ||
            filters.phoneNumber ||
            filters.role ||
            filters.isActive !== null);
    }, [filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.userName) count++;
        if (filters.employeNumber) count++;
        if (filters.nationaId) count++;
        if (filters.phoneNumber) count++;
        if (filters.role) count++;
        if (filters.isActive !== null) count++;
        return count;
    }, [filters]);

    // Handle applying filters from modal
    const handleApplyFilters = useCallback((newFilters: any) => {
        setFilters(newFilters);
    }, [setFilters]);

    const handleClearFilters = useCallback(() => {
        const emptyFilters = {
            userName: '',
            employeNumber: '',
            nationaId: '',
            phoneNumber: '',
            role: '',
            isActive: null,
        };
        setFilters(emptyFilters);
    }, [setFilters]);

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case "مدیر ارشد":
                return "text-light-cyan";
            case "مدیر":
                return "text-light-see-blue";
            case "ادمین":
                return "text-light-dark-orange";
            case "کارمند":
                return "text-light-purple";
            default:
                return "text-light-primary";
        }
    };

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
                                                لیست کارمندان
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
                                                    data-bs-target="#userCreate"
                                                    data-bs-toggle="modal"
                                                >
                                                    ساخت کارمند
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
                                                    <th scope="col">
                                                        شناسه
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('first_name')}
                                                        >
                                                            نام و نام خانوادگی {sortConfig.key === 'first_name' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending-letters" /> : <i className="ti ti-sort-descending-letters" />}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('employe_number')}
                                                        >
                                                            کد پرسنلی  {sortConfig.key === 'employe_number' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending-numbers" /> : <i className="ti ti-sort-descending-numbers" />}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('national_id')}
                                                        >
                                                            کد ملی {sortConfig.key === 'national_id' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending-numbers" /> : <i className="ti ti-sort-descending-numbers" />}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('phone_number')}
                                                        >
                                                            شماره تلفن {sortConfig.key === 'phone_number' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending-numbers" /> : <i className="ti ti-sort-descending-numbers" />}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('role')}
                                                        >
                                                            سِمت {sortConfig.key === 'role' && (
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
                                                    <th scope="col"><div className="f-s-20">عملیات</div></th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {(() => {
                                                    if (users.length === 0) {
                                                        return (
                                                            <NoDataError
                                                                message="هیچ کاربری تاکنون ساخته نشده است"
                                                            />
                                                        );
                                                    }
                                                    
                                                    const filteredUsers = users.filter(user => {
                                                        const matchesName = !filters.userName ||
                                                            (user.first_name + ' ' + user.last_name).toLowerCase().includes(filters.userName.toLowerCase());
                                                        const matchesEmployeNumber = !filters.employeNumber ||
                                                            user.employe_number.toString().includes(filters.employeNumber);
                                                        const matchesnationaId = !filters.nationaId ||
                                                            user.national_id.toString().includes(filters.nationaId);
                                                        const matchPhoneNumber = !filters.phoneNumber ||
                                                            user.phone_number.toString().includes(filters.phoneNumber);
                                                        const matchesRole = !filters.role || user.role === filters.role;
                                                        const matchesActive = filters.isActive === null || user.is_active === filters.isActive;

                                                        return matchesName && matchesEmployeNumber && matchesnationaId && matchPhoneNumber && matchesRole && matchesActive;
                                                    });
                                                    const sortedUsers = [...filteredUsers].sort((a, b) => {
                                                        const { key, direction } = sortConfig;
                                                        if (!key) return 0;
                                                        let aValue = a[key];
                                                        let bValue = b[key];
                                                        const isString = (val: any): val is string => typeof val === 'string';
                                                        switch (key) {
                                                            case 'employe_number':
                                                            case 'national_id':
                                                            case 'phone_number':
                                                                return direction === 'asc'
                                                                    ? (isString(aValue) ? aValue.toLowerCase() : String(aValue))
                                                                        .localeCompare(
                                                                            isString(bValue) ? bValue.toLowerCase() : String(bValue),
                                                                            'fa',
                                                                            { numeric: true }
                                                                        )
                                                                    : (isString(bValue) ? bValue.toLowerCase() : String(bValue))
                                                                        .localeCompare(
                                                                            isString(aValue) ? aValue.toLowerCase() : String(aValue),
                                                                            'fa',
                                                                            { numeric: true }
                                                                        );
                                                            case 'first_name':
                                                            case 'role':
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

                                                    if (sortedUsers.length === 0) {
                                                        return (
                                                            <NoDataError />
                                                        );
                                                    }

                                                    return sortedUsers.map((user, index) => (
                                                        <tr key={user.id}>
                                                            <td className="f-w-500 f-s-17">{index + 1}</td>
                                                            <td className="f-w-500 f-s-17">
                                                                {user.first_name} {user.last_name}
                                                                {user.id === activeUser?.id && (
                                                                    <span className="text-muted ms-1 small"> (خودم)</span>
                                                                )}
                                                            </td>
                                                            <td className="f-w-500 f-s-17">{user.employe_number}</td>
                                                            <td className="f-w-500 f-s-17">{user.national_id}</td>
                                                            <td className="f-w-500 f-s-17">{user.phone_number}</td>
                                                            <td className="f-w-500">
                                                                <h5>
                                                                    <span
                                                                        className={`badge ${getRoleBadgeClass(getRoleInFarsi(user.role))} b-r-25 f-s-17`}
                                                                    >
                                                                        {getRoleInFarsi(user.role)}
                                                                    </span>
                                                                </h5>
                                                            </td>
                                                            <td className="f-w-500">
                                                                {user.is_active ? (
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
                                                                {user.is_active ? (
                                                                    <>
                                                                        {activeUser && user.id !== activeUser.id ? (
                                                                            <button
                                                                                className="btn btn-light-danger icon-btn b-r-10 delete-btn f-s-25"
                                                                                type="button"
                                                                                onClick={() => handleDeleteUser(user)}
                                                                            >
                                                                                <i className="ti ti-user-off"></i>
                                                                            </button>
                                                                        ) : null}
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        className="btn btn-light-success icon-btn b-r-10 f-s-25"
                                                                        type="button"
                                                                        onClick={() => handleActivateUser(user)}
                                                                    >
                                                                        <i className="ti ti-user-check"></i>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="btn btn-light-cyan icon-btn b-r-10 f-s-25"
                                                                    type="button"
                                                                    onClick={() => onUserEdit(user)}
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