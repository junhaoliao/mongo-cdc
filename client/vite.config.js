import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";


// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        proxy: {
            "/socket.io/": {
                target: "http://localhost:5000/socket.io/",
                changeOrigin: true,
            },
        },
    },
});
