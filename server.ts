import "dotenv/config";
import path from "path";
import fs from "fs";
import express from "express";
import app from "./api/index.ts";

const PORT = 3000;

async function startServer() {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    if (!isProduction) {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      });
      app.use(vite.middlewares);

      app.get("*", async (req, res, next) => {
        if (req.path.startsWith("/api/")) {
          return next();
        }
        try {
          const indexPath = path.resolve(process.cwd(), "index.html");
          let template = fs.readFileSync(indexPath, "utf-8");
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          next(e);
        }
      });
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(
        express.static(distPath, {
          setHeaders: (res, filePath) => {
            if (filePath.endsWith("index.html")) {
              res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
              res.setHeader("Pragma", "no-cache");
              res.setHeader("Expires", "0");
            }
          },
        })
      );
      app.get("*", (req, res) => {
        if (
          req.path.match(
            /\.(js|mjs|cjs|ts|tsx|css|json|wasm|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i
          )
        ) {
          return res.status(404).type("text/plain").send("File not found");
        }
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Local: http://localhost:${PORT}`);
    });

    server.on("error", (err: any) => {
      console.error("Server error:", err);
      process.exit(1);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

