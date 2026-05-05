    import { defineConfig } from "vite";
    import react from "@vitejs/plugin-react";
    import path from "path";
    import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

    // Import PostCSS plugins directly
    import tailwindcss from 'tailwindcss';
    import autoprefixer from 'autoprefixer';

    // Helper for project root
    const projectRoot = import.meta.dirname;

    export default defineConfig({
      // Keep root setting as it works for resolving index.html etc.
      root: path.resolve(projectRoot, "client"),

      plugins: [
        react(),
        runtimeErrorOverlay(),
      ],

      // Explicitly configure PostCSS within Vite
     

      resolve: {
        alias: {
          "@": path.resolve(projectRoot, "client", "src"),
          "@shared": path.resolve(projectRoot, "shared"),
          "@assets": path.resolve(projectRoot, "attached_assets"),
        },
      },
      build: {
        outDir: path.resolve(projectRoot, "dist/public"),
        emptyOutDir: true,
      },
      server: {
        fs: {
          strict: true,
          deny: ["**/.*"],
        }
      }
    });
    

