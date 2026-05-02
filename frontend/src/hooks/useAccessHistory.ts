// src/hooks/useAccessHistory.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { robustFetch } from '@/src/utils/apiFetch';
import { AccessHistory, PaginationInfo } from '@/src/types/accessHistory';

interface Filters {
    userName: string;
    userEmployeNumber: string;
    userRole: string;
    areaName: string;
    gateName: string;
    gateRole: string;
    status: string;
    start_time: string;
    end_time: string;
}

interface SortConfig {
    key: 'id' | 'userName' | 'userEmployeNumber' | 'userRole' | 'areaName' | 'gateName' | 'gateRole' | 'status';
    direction: 'asc' | 'desc';
}

export function useAccessHistory() {
    const router = useRouter();
    const [accessHistory, setAccessHistory] = useState<AccessHistory[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorPageCode, setErrorPageCode] = useState<number | undefined>(undefined);
    
    const [filters, setFilters] = useState<Filters>({
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
    
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: 'timestamp' as any,
        direction: 'desc',
    });
    
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    
    // Debounced filters
    const [debouncedFilters, setDebouncedFilters] = useState(filters);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilters(filters);
            setCurrentPage(1); // Reset to first page when filters change
        }, 500);
        return () => clearTimeout(timer);
    }, [filters]);
    
    const fetchAccessHistory = useCallback(async () => {
        setLoading(true);
        try {
            // Build query parameters
            const params = new URLSearchParams();
            params.append('page', currentPage.toString());
            params.append('page_size', pageSize.toString());
            
            const sortField = sortConfig.key || '-timestamp';
            const ordering = sortConfig.direction === 'desc' ? `-${sortField}` : sortField;
            params.append('ordering', ordering);
            
            // Add filters
            if (debouncedFilters.userName) params.append('user_name', debouncedFilters.userName);
            if (debouncedFilters.userEmployeNumber) params.append('employe_number', debouncedFilters.userEmployeNumber);
            if (debouncedFilters.userRole) params.append('user_role', debouncedFilters.userRole);
            if (debouncedFilters.areaName) params.append('area_name', debouncedFilters.areaName);
            if (debouncedFilters.gateName) params.append('gate_name', debouncedFilters.gateName);
            if (debouncedFilters.gateRole) params.append('gate_role', debouncedFilters.gateRole);
            if (debouncedFilters.status) params.append('status', debouncedFilters.status);
            if (debouncedFilters.start_time) params.append('start_time', debouncedFilters.start_time);
            if (debouncedFilters.end_time) params.append('end_time', debouncedFilters.end_time);
            
            const response = await robustFetch({
                url: `api/access/history/?${params.toString()}`,
                method: "GET",
                headers: { "Content-Type": "application/json" },
                body: null,
                router: router,
            });
            
            if (response.success !== true) {
                setErrorPageCode(response.code);
                setHasError(true);
            } else {
                setAccessHistory(response.data.access_history);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            setHasError(true);
            console.error("Error fetching access history:", err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, debouncedFilters, sortConfig, router]);
    
    useEffect(() => {
        fetchAccessHistory();
    }, [fetchAccessHistory]);
    
    return {
        accessHistory,
        pagination,
        loading,
        hasError,
        errorPageCode,
        filters,
        setFilters,
        sortConfig,
        setSortConfig,
        currentPage,
        setCurrentPage,
        refetch: fetchAccessHistory,
    };
}