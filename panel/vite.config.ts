import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served at the root of auth.zar.mx; the API lives under /api.
// In dev, /api is proxied to the local zar-auth server so the browser
// sees a single origin and session cookies work unchanged.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        proxy: {
            "/api": "http://localhost:3000",
        },
    },
});
