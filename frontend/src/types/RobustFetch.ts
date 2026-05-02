
export interface RobustFetchOptions {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE"
    headers?: Record<string, string>;
    body?: any;
    maxRetries?: number;
    router?: any;
}

export interface ApiResponse<T = any> {
    success: boolean;
    code?: number;
    message?: string;
    data?: T; 
}