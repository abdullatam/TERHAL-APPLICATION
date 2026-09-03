import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // so a phone on the same wifi can open the demo
    proxy: {
      // 127.0.0.1, not localhost: localhost can resolve to ::1 first, and
      // anything else already bound to IPv6 :8000 (Docker, commonly) will
      // silently answer instead of the API.
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      // Self-hosted landmark photos. data/landmark_images.csv stores these as
      // bare /images/... paths, and the backend mounts data/images there — so
      // without this the dev server answers with the SPA's index.html and
      // every self-hosted photo silently renders as a broken image.
      "/images": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
