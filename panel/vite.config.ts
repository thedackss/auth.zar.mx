import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served at auth.zar.mx/panel/ behind the reverse proxy.
// In dev, API calls are proxied to the local zar-auth server so the
// browser sees a single origin and session cookies work unchanged.
export default defineConfig({
    base: "/panel/",
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        proxy: {
            "/auth": "http://localhost:3000",
            "/users": "http://localhost:3000",
            "/settings": "http://localhost:3000",
            "/audit": "http://localhost:3000",
        },
    },
});
