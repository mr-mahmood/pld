import { UserRole } from "@/src/types/role";

const rules: { [key in UserRole]: string[] } = {
    super: [
        "profile",
        "report",
        "users",
        "areas",
        "gates",
    ],
    manager: [
        "profile",
        "report",
        "users",
    ],
    admin: [
        "profile",
        "report",
    ],
    employe: [
        "profile",
    ]
};


export const canAccess = (role: UserRole | undefined, permission: string): boolean => {
    if (role === undefined) {
        return false;
    }
    return rules[role?.toLowerCase()]?.includes(permission) ?? false;
};
