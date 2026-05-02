'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { UserData } from "@/src/types/userData";
import { UserRole } from '@/src/types/role';


export const roleToFarsi: Record<UserRole, string> = {
    super: 'مدیر ارشد',
    manager: 'مدیر',
    admin: 'ادمین',
    employe: 'کارمند',
};

interface ActiveUserContextType {
    activeUser: UserData | null;
    setActiveUser: (userData: UserData | null) => void;
    isLoadingActiveUser: boolean;
    getRoleInFarsi: (role: string | undefined) => string;
}

const ActiveUserContext = createContext<ActiveUserContextType | undefined>(undefined);

// Define a key for localStorage specific to the active user's data
const ACTIVE_USER_DATA_KEY = 'activeUserData';

export const ActiveUserProvider = ({ children }: { children: ReactNode }) => {
    // State for the currently logged-in active user
    const [activeUser, setActiveUserState] = useState<UserData | null>(null);
    // State to track if the active user data is being loaded
    const [isLoadingActiveUser, setIsLoadingActiveUser] = useState(true);

    // Helper function to get Farsi role name, handling undefined or unknown roles
    const getRoleInFarsi = (role: string | undefined): string => {
        if (!role) return 'ناشناس';
        const lowerCaseRole = role.toLowerCase();
        return roleToFarsi[lowerCaseRole] || 'ناشناس';
    };

    // Custom setter to also save to localStorage
    const setActiveUser = (userData: UserData | null) => {
        setActiveUserState(userData);
        if (userData) {
            try {
                setIsLoadingActiveUser(true);

                // Save the active user's data to localStorage
                localStorage.setItem(ACTIVE_USER_DATA_KEY, JSON.stringify(userData));
                setIsLoadingActiveUser(false);
            } catch (error) {
                console.error("Failed to save active user data to localStorage:", error);
                setIsLoadingActiveUser(false);
            }
        } else {
            // If userData is null, it signifies logout; remove from localStorage
            localStorage.removeItem(ACTIVE_USER_DATA_KEY);
            setActiveUserState(null); // Ensure state is also cleared
            setIsLoadingActiveUser(false); // Loading finished
        }
    };

    useEffect(() => {
        // Attempt to load active user data from localStorage on initial mount
        setIsLoadingActiveUser(true);
        try {
            const storedUserData = localStorage.getItem(ACTIVE_USER_DATA_KEY);
            if (storedUserData) {
                const parsedUserData: UserData = JSON.parse(storedUserData);
                // Directly set the state with parsed data
                setActiveUserState(parsedUserData);
            } else {
                setActiveUserState(null); // Explicitly set to null if nothing is found
            }
        } catch (error) {
            console.error("Failed to load active user data from localStorage:", error);
            // Clear potentially corrupted data if loading fails
            localStorage.removeItem(ACTIVE_USER_DATA_KEY);
            setActiveUserState(null);
        } finally {
            // Stop the loading indicator after attempting to load
            setIsLoadingActiveUser(false);
        }
    }, []);

    return (
        <ActiveUserContext.Provider value={{ activeUser, setActiveUser, isLoadingActiveUser, getRoleInFarsi }}>
            {children}
        </ActiveUserContext.Provider>
    );
};

// Custom hook to consume the ActiveUser context
export const useActiveUser = () => {
    const context = useContext(ActiveUserContext);
    if (context === undefined) {
        // Throw an error if the hook is used outside of its provider
        throw new Error('useActiveUser must be used within an ActiveUserProvider');
    }
    return context;
};
