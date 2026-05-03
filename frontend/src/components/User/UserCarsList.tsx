

import { useEffect, useRef, useState } from "react";
import { robustFetch } from "@/src/utils/apiFetch";
import { useRouter } from "next/navigation";
import { useActiveUser } from "@/src/contexts/active_user_context";
import { Car } from "@/src/types/car";
import { UserData } from "@/src/types/userData";
import { LoadingSpinnerFullPage } from '@/src/components/common/LoadingSpinner';
import ErrorCard from "@/src/components/common/ErrorConnectToBackend";
import UserInfoCard from "@/src/components/User/UserInfoCard";
import NoDataError from "../common/NoDataError";

interface UserCarsProps {
    UserData: UserData | null;
    onEdit: (car: Car | null) => void;
}

const UserCarsList: React.FC<UserCarsProps> = ({ UserData, onEdit }) => {

    const router = useRouter();
    const { getRoleInFarsi } = useActiveUser();
    const [hasError, setHasError] = useState(false);
    const [errorPageCode, setErrorPageCode] = useState<number | undefined>(undefined);
    const [cars, setCars] = useState<Car[]>([]);

    useEffect(() => {
        if (!UserData) return
        setCars(UserData.cars);
    }, [UserData]);


    const handleDeleteCar = async (car: Car) => {
        if (!car) return;
        try {
            const response = await robustFetch({
                url: `api/cars/${car.id}/`,
                method: 'DELETE',
                headers: { "Content-Type": "application/json" },
                body: null,
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("car deleted successfully:", response);
                setCars(prevCars =>
                    prevCars.map(u =>
                        u.id === car.id ? { ...u, is_active: false } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to delete car:", err);
        }
    };

    const handleActivateCar = async (car: Car) => {
        if (!car) return;
        try {
            const payload = {
                'is_active': true,
            }
            const response = await robustFetch({
                url: `api/cars/${car.id}/`,
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                router: router,
            });

            if (response.success !== true) {
                throw new Error(`API error: ${response.message}`);
            } else {
                console.log("car activated successfully:", response);
                setCars(prevCars =>
                    prevCars.map(u =>
                        u.id === car.id ? { ...u, is_active: true } : u
                    )
                );
            }
        } catch (err) {
            console.error("Failed to activate car:", err);
        }
    };

    const [sortConfig, setSortConfig] = useState<{
        key: keyof Car | null;
        direction: 'asc' | 'desc';
    }>({
        key: 'id', // ستون پیش‌فرض
        direction: 'desc',
    });

    const handleSort = (key: keyof Car) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <>
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
                                        لیست ماشین ها
                                    </span>
                                    <span className="about-list-value">
                                        <button
                                            className="btn btn-light-see-blue b-r-25 f-s-17"
                                            data-bs-target="#userCarCreate"
                                            data-bs-toggle="modal"
                                            type="button"
                                        >
                                            ساخت ماشین
                                        </button>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-12">
                            <div className="card-body" style={{ height: '78vh' }}>
                                <div className="scrollable-table-container" id="tableContainer" style={{ height: '100%', overflow: 'auto' }}>
                                    <table className="table table-bordered table-striped align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th scope="col">
                                                    <button
                                                        className="btn btn-link p-0 text-decoration-none f-s-20"
                                                        onClick={() => handleSort('id')}
                                                    >
                                                        شناسه {sortConfig.key === 'id' && (
                                                            <span className="ms-1">
                                                                {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending-numbers" /> : <i className="ti ti-sort-descending-numbers" />}
                                                            </span>
                                                        )}
                                                    </button>
                                                </th>
                                                <th scope="col">
                                                    پلاک
                                                </th>
                                                <th scope="col">
                                                    <button
                                                        className="btn btn-link p-0 text-decoration-none f-s-20"
                                                        onClick={() => handleSort('model')}
                                                    >
                                                        مدل {sortConfig.key === 'model' && (
                                                            <span className="ms-1">
                                                                {sortConfig.direction === 'asc' ? <i className="ti ti-sort-ascending-letters" /> : <i className="ti ti-sort-descending-letters" />}
                                                            </span>
                                                        )}
                                                    </button>
                                                </th>
                                                <th scope="col">
                                                    <button
                                                        className="btn btn-link p-0 text-decoration-none f-s-20"
                                                        onClick={() => handleSort('color')}
                                                    >
                                                        رنگ {sortConfig.key === 'color' && (
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
                                                <th scope="col"><div className="f-s-20">عملیات</div></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                if (cars.length === 0) {
                                                    return (
                                                        <NoDataError
                                                            message="هیچ ماشینی برای این کاربر موجود نیست"
                                                        />
                                                    );
                                                }

                                                const sortedCars = [...cars].sort((a, b) => {
                                                    const { key, direction } = sortConfig;
                                                    if (!key) return 0;
                                                    let aValue = a[key];
                                                    let bValue = b[key];
                                                    const isString = (val: any): val is string => typeof val === 'string';
                                                    switch (key) {
                                                        case 'model':
                                                        case 'color':
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
                                                        case 'id':
                                                            return direction === 'asc'
                                                                ? Number(aValue) - Number(bValue)
                                                                : Number(bValue) - Number(aValue);
                                                        case 'is_active':
                                                            return direction === 'asc'
                                                                ? Number(aValue) - Number(bValue)
                                                                : Number(bValue) - Number(aValue);
                                                        default:
                                                            return 0;
                                                    }
                                                });
                                                return sortedCars.map((car, index) => (
                                                    <tr key={car.id}>
                                                        <td className="f-w-500 f-s-17" style={{ width: '120px' }}>{index + 1}</td>
                                                        <td className="f-w-500 f-s-17 pa-t-12 pa-b-12" style={{ width: '370px' }}>
                                                            {car.image ? (
                                                                <img
                                                                    src={car.image}
                                                                    alt={`Car plate: ${car.plate}`}
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
                                                        <td className="f-w-500 f-s-17" >{car.model}</td>
                                                        <td className="f-w-500 f-s-17" >{car.color}</td>
                                                        <td className="f-w-500 f-s-17 p-0">
                                                            {car.is_active ? (
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
                                                            {car.is_active ? (
                                                                <>
                                                                    <button
                                                                        className="btn btn-light-danger icon-btn b-r-10 delete-btn f-s-25"
                                                                        type="button"
                                                                        onClick={() => handleDeleteCar(car)}
                                                                    >
                                                                        <i className="ti ti-user-off"></i>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    className="btn btn-light-success icon-btn b-r-10 f-s-25"
                                                                    type="button"
                                                                    onClick={() => handleActivateCar(car)}
                                                                >
                                                                    <i className="ti ti-user-check"></i>
                                                                </button>
                                                            )}
                                                            <button
                                                                className="btn btn-light-cyan icon-btn b-r-10 f-s-25"
                                                                data-bs-target="#userCarEdit"
                                                                data-bs-toggle="modal"
                                                                type="button"
                                                                onClick={() => onEdit(car)}
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
            </div>
        </>
    )
}

export default UserCarsList;