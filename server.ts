import "dotenv/config";
import path from "path";
import fs from "fs";
import express from "express";

function resolvePort(): number {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--port" && process.argv[i + 1]) {
      const parsed = Number(process.argv[i + 1]);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    } else if (arg.startsWith("--port=")) {
      const parsed = Number(arg.slice("--port=".length));
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
  }
  if (process.env.PORT) {
    const envPort = Number(process.env.PORT);
    if (Number.isInteger(envPort) && envPort > 0) return envPort;
  }
  return 3000;
}

const PORT = resolvePort();

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const indexPath = path.resolve(process.cwd(), "index.html");

  // Health check endpoint (responds immediately in < 5ms)
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Lazy-load API routes from ./api/index.ts with shared promise cache
  let apiAppPromise: Promise<any> | null = null;
  const getApiApp = () => {
    if (!apiAppPromise) {
      apiAppPromise = import("./api/index.ts")
        .then((mod) => mod.default)
        .catch((err) => {
          apiAppPromise = null;
          throw err;
        });
    }
    return apiAppPromise;
  };

  app.use(async (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path === "/api") {
      try {
        const apiApp = await getApiApp();
        return apiApp(req, res, next);
      } catch (err) {
        return next(err);
      }
    }
    return next();
  });

  // Fast readiness probes that never block on Vite cold initialization
  app.head("/", (_req, res) => {
    res.status(200).end();
  });

  let activeVite: any = null;

  if (!isProduction) {
    // Initialize Vite middleware lazily on the first frontend request so port 3000
    // binds immediately with minimal RAM/CPU and never stalls readiness checks.
    let vitePromise: Promise<any> | null = null;
    const getVite = () => {
      if (!vitePromise) {
        vitePromise = (async () => {
          const { createServer: createViteServer } = await import("vite");
          const vite = await createViteServer({
            server: {
              middlewareMode: true,
              hmr: false,
              ws: false,
              watch: null,
            },
            appType: "spa",
          });
          activeVite = vite;
          return vite;
        })().catch((err) => {
          console.error("Failed to initialize Vite dev server:", err);
          vitePromise = null;
          throw err;
        });
      }
      return vitePromise;
    };

    // Mount Vite dev middleware wrapper
    app.use(async (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path === "/api") {
        return next();
      }
      try {
        const vite = await getVite();
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });

    // Serve HTML for SPA routes
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const vite = await getVite();
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        try {
          const vite = await getVite();
          vite.ssrFixStacktrace(e as Error);
        } catch {
          // ignore if vite itself failed to initialize
        }
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || "Internal server error" });
    }
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    console.error("Server listen error:", err);
    process.exit(1);
  });

  const shutdown = () => {
    const closeVite = activeVite ? activeVite.close().catch(() => {}) : Promise.resolve();
    Promise.resolve(closeVite).finally(() => {
      server.close(() => {
        process.exit(0);
      });
    });
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
