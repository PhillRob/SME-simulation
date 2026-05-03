import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// Relative base works for GitHub Pages project sites (e.g. /repo-name/) without hardcoding the repo slug.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
