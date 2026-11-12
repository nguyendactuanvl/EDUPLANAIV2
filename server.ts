import "dotenv/config";
import path from "path";
import fs from "fs";
import express from "express";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const indexPath = path.resolve(process.cwd(), "index.html");

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Lazy-load API routes from ./api/index.ts
  let apiAppInstance: any = null;
  const getApiApp = async () => {
    if (!apiAppInstance) {
      const mod = await import("./api/index.ts");
      apiAppInstance = mod.default;
    }
    return apiAppInstance;
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

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: "spa",
    });

    // Mount Vite dev middleware
    app.use(vite.middlewares);

    // Serve HTML for SPA routes
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
