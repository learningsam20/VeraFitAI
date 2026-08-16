import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Repo root holds the shared .env (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_DEFAULT_*).
// Frontend/.env.local is a symlink to ../.env, but pointing envDir at the root
// makes the load explicit for both dev and build.
const ROOT_DIR = path.resolve(__dirname, "..");

export default defineConfig({
  plugins: [react()],
  envDir: ROOT_DIR,
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5193,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname), ROOT_DIR],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
