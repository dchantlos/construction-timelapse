import { defineConfig } from "vite";

// Production build of the embeddable widget. Outputs a single ES module the
// no-build parent app lazy-loads: construction-timelapse/assistant/site-conditions.js
// (chunks + assets alongside it). The parent references it by the stable entry
// name, so no manifest wiring is needed.
export default defineConfig({
  // Relative base so the bundle's code-split chunks/assets load relative to
  // site-conditions.js itself — works both locally and under /construction-timelapse/.
  base: "./",
  build: {
    outDir: "../assistant",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: "src/embed.ts",
      // Keep the entry's named exports (mountSiteConditions) in the built bundle.
      preserveEntrySignatures: "strict",
      output: {
        entryFileNames: "site-conditions.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        format: "es",
      },
    },
  },
});
