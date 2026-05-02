
// User type
interface AccessHistoryUser {
    id: number;
    first_name: string;
    last_name: string;
    employe_number: string;
    role: string;
}

// Gate type
interface AccessHistoryGate {
    id: number;
    name: string;
    role: string;
}

// Area type
interface AccessHistoryArea {
    id: number;
    name: string;
}

// Car type
interface AccessHistoryCar {
    id: number;
    model: string;
    color: string;
}

// Main Access History type
export interface AccessHistory {
    id: number;
    user: AccessHistoryUser;
    gate: AccessHistoryGate;
    area: AccessHistoryArea;
    car: AccessHistoryCar;
    status: string;
    original_image: string;
    generated_image: string;
    confidence: number;
    timestamp: string;
}

export interface PaginationInfo {
    current_page: number;
    total_pages: number;
    total_count: number;
    page_size: number;
    next: string | null;
    previous: string | null;
}

// API Response wrapper
export interface SingleAccessHistoryResponse {
    success: boolean;
    message: string;
    data: {
        access_history: AccessHistory;
    };
}

export interface AccessHistoryResponse {
    success: boolean;
    message: string;
    data: {
        access_history: AccessHistory[];
        pagination: PaginationInfo;
    };
}