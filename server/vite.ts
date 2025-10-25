import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
// Assuming vite.config.ts is in the project root, one level up from this file
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

// Get the directory name of the current module (works in ESM)
// If using CommonJS, use __dirname instead of import.meta.dirname
const currentDir = path.dirname(new URL(import.meta.url).pathname.substring(1)); // Adjust if running on Windows

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    // allowedHosts: true as const, // Consider if needed for specific proxy/network setups
  };

  const vite = await createViteServer({
    ...viteConfig, // Use imported config from ../vite.config.ts
    // REMOVED: configFile: false, // Allow Vite to find config files if needed (though inline usually takes precedence)
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Avoid exiting on every error during development if possible
        // process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom", // Important for middleware mode
  });

  // Use Vite's middlewares to handle HMR, module requests etc.
  app.use(vite.middlewares);

  // Catch-all middleware: Handles non-API, non-asset requests
  app.use("*", async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;

    // Check if it's an unhandled API request
    if (url.startsWith('/api')) {
      console.warn(`[vite.ts Catch-All] Unhandled API route: ${req.method} ${url}`);
      return res.status(404).json({ message: `API endpoint ${req.method} ${url} not found` });
    }

    // Assume it's a client-side route request
    try {
      // Correct path resolution from server/vite.ts to client/index.html
      const clientTemplatePath = path.resolve(
        currentDir, // Use calculated directory
        "..",      // Go up from 'server' to project root
        "client",
        "index.html",
      );

      // Always read fresh template in dev
      let template = await fs.promises.readFile(clientTemplatePath, "utf-8");

      // Optional cache busting (Vite might handle this well enough via HMR)
      // template = template.replace(
      //   `src="/src/main.tsx"`, // Ensure this matches index.html
      //   `src="/src/main.tsx?v=${nanoid()}"`, // Path relative to Vite root ('client')
      // );

      // CORRECTED: Always transform relative to the root '/'
      const html = await vite.transformIndexHtml('/', template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);

    } catch (e) {
      // Let Vite handle the error stack trace
      vite.ssrFixStacktrace(e as Error);
      next(e); // Pass error to Express error handler
    }
  });
}

// Production static file serving
export function serveStatic(app: Express) {
  // Correct path resolution from server/vite.ts to dist/public
  const distPath = path.resolve(currentDir, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(`Build directory not found: ${distPath}`);
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first (npm run build)`,
    );
  }

  log(`Serving static files from: ${distPath}`);
  // Serve static files from the build output directory
  app.use(express.static(distPath));

  // SPA Fallback: Serve index.html for any request that doesn't match a static file
  app.use("*", (req, res) => {
    // Optional check for API routes even in production
    // if (req.originalUrl.startsWith('/api')) {
    //    return res.status(404).json({ message: 'API endpoint not found' });
    // }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

