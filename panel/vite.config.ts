import { fileURLToPath } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served at the root of auth.zar.mx; the API lives under /api.
// In dev, /api is proxied to the local zar-auth server so the browser
// sees a single origin and session cookies work unchanged.
export default defineConfig({
    plugins: [
        tanstackRouter({
            target: "react",
            autoCodeSplitting: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        proxy: {
            "/api": "http://localhost:3000",
            // Bull Board (backend-served) so the nav link works in dev too.
            "/bullmq": "http://localhost:3000",
        },
    },
});
