import { createRootRoute, Outlet } from "@tanstack/react-router";
import Glow from "@/components/glow";

export const Route = createRootRoute({
    component: RootComponent,
});

function RootComponent() {
    return (
        <>
            <Outlet />
            <Glow />
        </>
    );
}
