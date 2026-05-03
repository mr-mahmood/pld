import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { robustFetch } from '@/src/utils/apiFetch';
import { AccessHistory } from '@/src/types/accessHistory';
import { useActiveUser } from "@/src/contexts/active_user_context";
import { LoadingSpinnerFullPage } from '@/src/components/common/LoadingSpinner';
import ErrorCard from "@/src/components/common/ErrorConnectToBackend";
import FilterModal from '@/src/components/Report/AccessHistoryFilterModal';
import NoDataError from '@/src/components/common/NoDataError';

interface AccessHistoryListProps {
    onModalOpen: (access: AccessHistory) => void;
}

export default function AccessHistoryList({ onModalOpen }: AccessHistoryListProps) {

    const router = useRouter();
    const hasFetched = useRef(false);
    const [allAccess, setAllAccess] = useState<AccessHistory[]>([]);
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
                    url: `api/access/history/`,
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    body: null,
                    router: router,
                });
                if (response.success !== true) {
                    setErrorPageCode(response.code);
                    setHasError(true);
                    throw new Error(`error while fetch all old access data${response.message}`);
                } else {
                    setAllAccess(response.data.access_history);
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

    const [sortConfig, setSortConfig] = useState<{
        key: 'id' | 'carModel' | 'userName' | 'userEmployeNumber' | 'userRole' | 'areaName' | 'gateName' | 'time' | 'status';
        direction: 'asc' | 'desc';
    }>({
        key: 'id',
        direction: 'desc',
    });

    const handleSort = (key: 'id' | 'carModel' | 'userName' | 'userEmployeNumber' | 'userRole' | 'areaName' | 'gateName' | 'time' | 'status') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const [filters, setFilters] = useState({
        userName: '',
        userEmployeNumber: '',
        userRole: '',
        areaName: '',
        gateName: '',
        gateRole: '',
        status: '',
        start_time: '',
        end_time: '',
    });

    // Remove localFilters state - we'll let the modal handle its own state
    const hasActiveFilter = useMemo(() => {
        return !!(filters.userName ||
            filters.userEmployeNumber ||
            filters.userRole ||
            filters.areaName ||
            filters.gateName ||
            filters.gateRole ||
            filters.status ||
            filters.start_time ||
            filters.end_time
        );
    }, [filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.userName) count++;
        if (filters.userEmployeNumber) count++;
        if (filters.userRole) count++;
        if (filters.areaName) count++;
        if (filters.gateName) count++;
        if (filters.gateRole) count++;
        if (filters.status) count++;
        if (filters.start_time) count++;
        if (filters.end_time) count++;
        return count;
    }, [filters]);

    // Handle applying filters from modal
    const handleApplyFilters = useCallback((newFilters: any) => {
        setFilters(newFilters);
    }, [setFilters]);

    const handleClearFilters = useCallback(() => {
        const emptyFilters = {
            userName: '',
            userEmployeNumber: '',
            userRole: '',
            areaName: '',
            gateName: '',
            gateRole: '',
            status: '',
            start_time: '',
            end_time: '',
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
                return "text-light-info";
            case "کارمند":
                return "text-light-purple";
            case "ناشناس":
                return "text-light-orange";
            default:
                return "text-light-primary";
        }
    };

    // Helper function to get user display name (handles null)
    const getUserDisplayName = (user: any) => {
        if (!user) return "ناشناس";
        return `${user.first_name} ${user.last_name}`;
    };

    // Helper function to get user role (handles null)
    const getUserRole = (user: any) => {
        if (!user) return "ناشناس";
        return getRoleInFarsi(user.role);
    };

    // Helper function to get user role for badge class (handles null)
    const getUserRoleForBadge = (user: any) => {
        if (!user) return "ناشناس";
        return getUserRole(user);
    };

    // Helper function to get employee number (handles null)
    const getEmployeeNumber = (user: any) => {
        if (!user) return "---";
        return user.employe_number;
    };

    // Helper function to format Persian date
    const formatPersianDate = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR');
        } catch {
            return '---';
        }
    };

    return (
        <>
            {loading ? (
                <LoadingSpinnerFullPage isLoading={loading} />
            ) : !hasError ? (
                <>
                    <title>Access History</title>
                    <link href="/vendor/datepikar/flatpickr.min.css" rel="stylesheet" type="text/css"></link>
                    <link href="/vendor/MD.BootstrapPersianDateTimePicker-master-bs5/mds.bs.datetimepicker.style.css" rel="stylesheet"></link>
                    <link href="/vendor/JalaliDatePicker/jalalidatepicker.min.css" rel="stylesheet"></link>

                    <div className="row">
                        <div className="col-lg-12">
                            <div className="card hover-effect b-r-25">
                                <div className="card-header">
                                    <div className="about-list">
                                        <div className="about-list-item">
                                            <span className="about-list-label f-s-25">
                                                گزارشات
                                            </span>
                                            <span className="about-list-value f-s-25">
                                                <button
                                                    className="btn btn-light-see-blue b-r-25"
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
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body" style={{ height: '75vh' }}>
                                    <div className="scrollable-table-container" style={{ height: '100%', overflow: 'auto' }}>
                                        <table className="table table-bordered table-striped align-middle mb-0">
                                            <thead>
                                                <tr>
                                                    <th className="f-s-17" scope="col">ردیف</th>
                                                    <th scope="col">
                                                        پلاک
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('carModel')}
                                                        >
                                                            ماشین
                                                            {sortConfig.key === 'carModel' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ?
                                                                        <i className="ti ti-sort-ascending-letters" /> :
                                                                        <i className="ti ti-sort-descending-letters" />
                                                                    }
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('userName')}
                                                        >
                                                            مالک
                                                            {sortConfig.key === 'userName' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ?
                                                                        <i className="ti ti-sort-ascending-letters" /> :
                                                                        <i className="ti ti-sort-descending-letters" />
                                                                    }
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('userEmployeNumber')}
                                                        >
                                                            کد پرسنلی
                                                            {sortConfig.key === 'userEmployeNumber' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ?
                                                                        <i className="ti ti-sort-ascending-numbers" /> :
                                                                        <i className="ti ti-sort-descending-numbers" />
                                                                    }
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('userRole')}
                                                        >
                                                            سمت
                                                            {sortConfig.key === 'userRole' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ?
                                                                        <i className="ti ti-sort-ascending" /> :
                                                                        <i className="ti ti-sort-descending" />
                                                                    }
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('areaName')}
                                                        >
                                                            محوطه (گیت)
                                                            {sortConfig.key === 'areaName' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ?
                                                                        <i className="ti ti-sort-ascending-letters" /> :
                                                                        <i className="ti ti-sort-descending-letters" />
                                                                    }
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('time')}
                                                        >
                                                            تاریخ ثبت
                                                            {sortConfig.key === 'time' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ?
                                                                        <i className="ti ti-sort-ascending" /> :
                                                                        <i className="ti ti-sort-descending" />
                                                                    }
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th scope="col">
                                                        <button
                                                            className="btn btn-link p-0 text-decoration-none f-s-20"
                                                            onClick={() => handleSort('status')}
                                                        >
                                                            وضعیت
                                                            {sortConfig.key === 'status' && (
                                                                <span className="ms-1">
                                                                    {sortConfig.direction === 'asc' ?
                                                                        <i className="ti ti-sort-ascending" /> :
                                                                        <i className="ti ti-sort-descending" />
                                                                    }
                                                                </span>
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th className="f-s-17" scope="col">جزئیات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    if (allAccess.length === 0) {
                                                        return (
                                                            <NoDataError
                                                                message="هیچ گزارشی موجود نیست"
                                                            />
                                                        );
                                                    }
                                                    
                                                    const filteredAllAccess = allAccess.filter(access => {
                                                        // Handle unknown user in filters
                                                        const matchesUserName = !filters.userName ||
                                                            (access.user ?
                                                                `${access.user.first_name} ${access.user.last_name}`.toLowerCase().includes(filters.userName.toLowerCase()) :
                                                                "ناشناس".includes(filters.userName.toLowerCase()));

                                                        const matchesUserEmployeNumber = !filters.userEmployeNumber ||
                                                            (access.user ?
                                                                access.user.employe_number.toString().includes(filters.userEmployeNumber) :
                                                                filters.userEmployeNumber === "---");

                                                        const matchesUserRole = !filters.userRole ||
                                                            (access.user ?
                                                                access.user.role === filters.userRole :
                                                                filters.userRole === "UNKNOWN");

                                                        const matchesAreaName = !filters.areaName ||
                                                            (access.area?.name || "").toString().includes(filters.areaName);

                                                        const matchesGateName = !filters.gateName ||
                                                            (access.gate?.name || "").toString().includes(filters.gateName);

                                                        const matchesGateRole = !filters.gateRole ||
                                                            (access.gate?.role || "") === filters.gateRole;

                                                        const matchesStatus = !filters.status || access.status === filters.status;

                                                        return matchesUserName && matchesUserEmployeNumber && matchesUserRole &&
                                                            matchesAreaName && matchesGateName && matchesGateRole && matchesStatus;
                                                    });

                                                    const sortedAccess = [...filteredAllAccess].sort((a, b) => {
                                                        const { key, direction } = sortConfig;
                                                        if (!key) return 0;

                                                        let aValue, bValue;

                                                        // Handle nested properties with null checks
                                                        switch (key) {
                                                            case 'carModel':
                                                                aValue = a.user ? a.car.model : "نامشخص";
                                                                bValue = b.user ? b.car.model : "نامشخص";
                                                                break;
                                                            case 'userName':
                                                                aValue = a.user ? `${a.user.first_name} ${a.user.last_name}` : "ناشناس";
                                                                bValue = b.user ? `${b.user.first_name} ${b.user.last_name}` : "ناشناس";
                                                                break;
                                                            case 'userEmployeNumber':
                                                                aValue = a.user ? a.user.employe_number.toString() : "---";
                                                                bValue = b.user ? b.user.employe_number.toString() : "---";
                                                                break;
                                                            case 'userRole':
                                                                aValue = a.user ? getUserRole(a.user) : "ناشناس";
                                                                bValue = b.user ? getUserRole(b.user) : "ناشناس";
                                                                break;
                                                            case 'areaName':
                                                                aValue = a.area?.name || "---";
                                                                bValue = b.area?.name || "---";
                                                                break;
                                                            case 'gateName':
                                                                aValue = a.gate?.name || "---";
                                                                bValue = b.gate?.name || "---";
                                                                break;
                                                            case 'time':
                                                                aValue = a.timestamp || "---";
                                                                bValue = b.timestamp || "---";
                                                                break;
                                                            case 'status':
                                                                aValue = a.status || "";
                                                                bValue = b.status || "";
                                                                break;
                                                            default:
                                                                return 0;
                                                        }

                                                        const isString = (val: any): val is string => typeof val === 'string';

                                                        if (isString(aValue) && isString(bValue)) {
                                                            const comparison = aValue.localeCompare(bValue, 'fa', { sensitivity: 'base' });
                                                            return direction === 'asc' ? comparison : -comparison;
                                                        }

                                                        return 0;
                                                    });

                                                    if (sortedAccess.length === 0) {
                                                        return (
                                                            <NoDataError />
                                                        );
                                                    }

                                                    return sortedAccess.map((access, index) => (
                                                        <tr key={access.id} onClick={() => onModalOpen(access)}>
                                                            <td className="f-w-500 f-s-17">{index + 1}</td>
                                                            <td className="f-w-500 f-s-17 pa-t-12 pa-b-12" style={{ width: '370px' }}>
                                                                {access.generated_image ? (
                                                                    <img
                                                                        src={access.generated_image}
                                                                        alt={`Car plate`}
                                                                        loading="lazy"
                                                                        style={{
                                                                            width: '350px',
                                                                            objectFit: 'cover',
                                                                            borderRadius: '0px',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span className="p-3 d-block">عکس وجود ندارد</span>
                                                                )}
                                                            </td>

                                                            {/* car Column */}
                                                            <td className="f-w-500 f-s-17">
                                                                {`${access.car?.model || 'نامشخص'}${access.car?.color ? ` (${access.car.color})` : ''}`}
                                                            </td>

                                                            {/* User Name Column */}
                                                            <td className="f-w-500 f-s-17">
                                                                {getUserDisplayName(access.user)}
                                                            </td>

                                                            {/* Employee Number Column */}
                                                            <td className="f-w-500 f-s-17">
                                                                {getEmployeeNumber(access.user)}
                                                            </td>

                                                            {/* User Role Column */}
                                                            <td className="f-w-500">
                                                                <h5>
                                                                    <span
                                                                        className={`badge ${getRoleBadgeClass(getUserRoleForBadge(access.user))} b-r-25 f-s-17`}
                                                                    >
                                                                        {getUserRole(access.user)}
                                                                    </span>
                                                                </h5>
                                                            </td>

                                                            {/* Area Name Column */}
                                                            <td className="f-w-500 f-s-17">
                                                                {access.area?.name || "---"} {' '}
                                                                ({access.gate?.name || "---"})
                                                            </td>

                                                            {/* Time Column */}
                                                            <td className="f-w-500 f-s-17">
                                                                {formatPersianDate(access.timestamp)}
                                                            </td>

                                                            {/* Status Column */}
                                                            <td className="f-w-500 f-s-17">
                                                                {access.status === "ALLOWED" ? (
                                                                    <span className="badge bg-light-success b-r-25 f-s-19">
                                                                        <i className="ti ti-user-check"></i> مجاز
                                                                    </span>
                                                                ) : (
                                                                    <span className="badge bg-light-danger b-r-25 f-s-19">
                                                                        <i className="ti ti-user-off"></i> غیر مجاز
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Action Column */}
                                                            <td>
                                                                <button
                                                                    className="btn btn-light-cyan icon-btn b-r-10 f-s-25"
                                                                    data-bs-target="#infoModal"
                                                                    data-bs-toggle="modal"
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onModalOpen(access);
                                                                    }}
                                                                >
                                                                    <i className="ti ti-eye"></i>
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
            <Script src="/vendor/bootstrap/bootstrap.bundle.min.js"></Script>
            <Script src="/vendor/datepikar/flatpickr.js"></Script>
            <Script src="/vendor/JalaliDatePicker/jalalidatepicker.min.js"></Script>
            <Script src="/vendor/MD.BootstrapPersianDateTimePicker-master-bs5/mds.bs.datetimepicker.js" defer></Script>
            <Script src="/js/date_picker.js" defer></Script>
            <Script id="jalaliDatepicker" src="/js/persian-datepicker-init.js" defer></Script>
        </>
    );
}