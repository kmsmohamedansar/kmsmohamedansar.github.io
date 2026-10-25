import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BB-8 stays a self-contained preview entry until it is ready to join the
// portfolio. This build never writes into the homepage's dist directory.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist-bb8",
    emptyOutDir: true,
    rollupOptions: {
      input: "bb8.html",
    },
  },
});
