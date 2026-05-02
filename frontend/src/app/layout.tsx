

import { ActiveUserProvider } from "@/src/contexts/active_user_context";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>
        <ActiveUserProvider >
            {children}
        </ActiveUserProvider>
    </>;
}
