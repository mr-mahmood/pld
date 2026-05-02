"use client";

import { UserRole } from "@/src/types/role";
import { useActiveUser } from "@/src/contexts/active_user_context";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import { canAccess } from "@/src/utils/role";

interface ProtectedRouteProps {
    permission?: string;
    children: ReactNode;
}

export default function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
    const { activeUser, isLoadingActiveUser } = useActiveUser();
    const router = useRouter();
    const [shouldRender, setShouldRender] = useState(false);

    // --- Effect for authentication and authorization checks ---
    useEffect(() => {
        // If still loading user data, do nothing yet. Wait for context to provide activeUser.
        if (isLoadingActiveUser) {
            setShouldRender(false); // Ensure children are not rendered while loading
            return;
        }

        // --- Authentication Check ---
        if (!activeUser) {
            // No user is logged in, redirect to login.
            // Use replace to avoid leaving a history entry for the protected page.
            router.prefetch('/login');
            router.replace("/login");
            setShouldRender(false); // Ensure children are not rendered
            return;
        }
        
        if (activeUser.must_change_password) {
            router.prefetch('/change-password');
            router.replace("/change-password");
            setShouldRender(false); // Ensure children are not rendered
            return;
        }
        
        // --- Authorization Check (if permission is provided) ---
        if (permission) {
            const role = activeUser?.role as UserRole | undefined;
            if (!canAccess(role, permission)) {
                // User is logged in, but doesn't have permission. Redirect to unauthorized.
                router.prefetch('/404');
                router.push("/404");
                setShouldRender(false); // Ensure children are not rendered
                return ;
            }
            // If user is logged in AND has permission, then they should render.
            setShouldRender(true);
        } else {
            // No specific permission required, and user is logged in. Allow rendering.
            setShouldRender(true);
        }

    }, [activeUser, isLoadingActiveUser, permission, router]); // Dependencies: Re-run when auth state changes

    // Render children ONLY if we've determined it's safe to render.
    // If shouldRender is false, it means either:
    // 1. We are still loading.
    // 2. The user is not logged in (and redirect is happening).
    // 3. The user is logged in but lacks permission (and redirect is happening).
    // In all these cases, we don't render children.
    if (!shouldRender) {
        // You can optionally render a global loading spinner here if needed
        // return <GlobalSpinner />;
        return null;
    }

    // If shouldRender is true, it means:
    // - isLoadingActiveUser is false
    // - activeUser is NOT null
    // - (If permission was provided) canAccess returned true
    // So, it's safe to render the children.
    return children;
}
