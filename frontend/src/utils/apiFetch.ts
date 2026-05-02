import { API_BASE_URL } from "@/config/index";
import { RobustFetchOptions, ApiResponse } from "@/src/types/RobustFetch";
import { Co2Sharp } from "@mui/icons-material";


// --- Refresh Token Function ---
const refreshToken = async (): Promise<boolean> => {
    console.log("Attempting to refresh token...");
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });

        const data: ApiResponse = await response.json();

        if (response.ok && data.success) {
            console.log("Token refreshed successfully.");
            // TODO: Save new tokens (e.g., in localStorage, context, cookies)
            return true;
        } else {
            console.error("Token refresh failed. Response:", data, "Status:", response.status);
            return false;
        }
    } catch (error) {
        console.error("Error during token refresh:", error instanceof Error ? error.message : String(error));
        return false; // Ensure false is returned on any caught error
    }
};

// --- Robust Fetch Function ---
export async function robustFetch({
    url,
    method = "GET",
    headers = {},
    body,
    maxRetries = 5,
    router,
}: RobustFetchOptions): Promise<ApiResponse> {
    let attempt = 0;
    let response: Response | undefined = undefined;

    const handleLogout = async () => {
        router.prefetch('/login');
        console.log("Logging out and redirecting...");
        try {
            await fetch(`${API_BASE_URL}/api/auth/logout/`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
            });
        } catch (error) {
            console.error("Error during logout fetch:", error instanceof Error ? error.message : String(error));
        }
        router.replace('/login');
    };

    while (attempt <= maxRetries) {
        let shouldLogout = false;
        let shouldRetryOriginalRequest = false;
        let isAuthError = false;

        try {
            const fetchOptions: RequestInit = {
                method,
                headers: headers,
                credentials: "include",
                body: body,
            };

            // Remove body for GET/HEAD requests if it was accidentally included
            if (method === "GET") {
                delete fetchOptions.body;
            }

            response = await fetch(`${API_BASE_URL}/${url}`, fetchOptions);
            const data: ApiResponse = await response.json();
            console.log(`Original Responce: ${JSON.stringify(data, null, 2)}`);

            const isSuccess = data.success === true;
            const isAuthApiError = data?.code && [1, 2, 3, 4, 5].includes(data.code);

            if (isSuccess || !isAuthApiError) {
                // Success or a non-auth API error that we don't need to retry. Return the data.
                // If data is null but response.ok, return a default success object or handle as needed.
                return data;
            }

            // --- AUTHENTICATION ERROR HANDLING ---
            if (data.success === false) {
                const currentCode = data?.code;

                if (currentCode === 3) {
                    console.log("Detected access token expiry (code 3). Attempting to refresh...");
                    isAuthError = true;
                    const refreshSuccess = await refreshToken();
                    if (refreshSuccess) {
                        shouldRetryOriginalRequest = true;
                    } else {
                        shouldLogout = true;
                    }
                } else if (currentCode !== undefined  && [1, 2, 3, 4, 5].includes(currentCode)) {
                    console.error(`Detected auth issue (code ${currentCode}). Logging out.`);
                    isAuthError = true;
                    shouldLogout = true;
                }
            }

        } catch (error) {
            console.error(`Network/Fetch Error for ${url} (Attempt ${attempt + 1}/${maxRetries + 1}):`, error instanceof Error ? error.message : String(error));
            shouldRetryOriginalRequest = true; // Assume network errors are retryable
            response = undefined; // Ensure response is undefined if fetch completely failed
        }

        // --- DECIDE NEXT STEP ---

        if (shouldLogout) {
            await handleLogout();
            // Throwing an error here ensures the function doesn't continue and fulfills its Promise contract
            throw new Error("Authentication session expired. Please log in again.");
        }

        if (shouldRetryOriginalRequest && attempt < maxRetries) {
            attempt++;
            console.log(`Retrying request for ${url}. Attempt ${attempt}/${maxRetries}...`);
            // Optional: Add a delay before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
        } else if (shouldRetryOriginalRequest && attempt >= maxRetries) {
            // Max retries reached for a retryable error (network or refresh failure)
            console.error(`Max retries reached for ${url}. Request failed.`);
            if (isAuthError && !await refreshToken()) { // Final check if auth failed hard
                await handleLogout();
                throw new Error("Authentication session expired after multiple retries. Please log in again.");
            }
            // For other retryable errors after max retries
            throw new Error(`Request to ${url} failed after ${maxRetries + 1} attempts.`);
        }

        throw new Error(`API Error with not a clear cuase`);
    }

    // This line should theoretically be unreachable if the loop logic is sound.
    // It's a safeguard for the TS compiler to ensure a return/throw always happens.
    throw new Error(`RobustFetch reached an unexpected end state for ${url}.`);
}
