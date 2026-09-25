import { defineConfig } from "vite";

// Self-contained Vite app for the Site Conditions AI assistant. It is intentionally
// separate from the parent no-build app: the ArcGIS AI components (beta) and their
// custom-agent utilities require a bundler. Once verified, its built output can be
// embedded into the main progress.html page.
export default defineConfig({
  server: {
    open: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
    target: "es2022",
  },
});
