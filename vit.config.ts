import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If deploying to GitHub Pages under e.g. /repo-name/, set base to "/repo-name/"
// Otherwise, leave it as "/" or set to "./" if needed for relative paths.
export default defineConfig({
  plugins: [react()],
  base: "./"
});