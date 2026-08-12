import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/context/auth";

// Admin-only view guard: the API already 403s non-admins; this keeps them
// from landing on a shell full of failed requests.
export function AdminOnly({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    if (user?.role !== "ADMIN") {
        return <Navigate to="/dashboard/account" replace />;
    }

    return children;
}
