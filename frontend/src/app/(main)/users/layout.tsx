import ProtectedRoute from "@/src/utils/ProtectedRoute"

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>
        <ProtectedRoute permission="users" >
            {children}
        </ProtectedRoute>
    </>;
}
