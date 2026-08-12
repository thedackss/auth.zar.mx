import "./main.scss";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/context/auth";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultViewTransition: true,
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
    <StrictMode>
        <AuthProvider>
            <RouterProvider router={router} />
        </AuthProvider>
    </StrictMode>,
);
