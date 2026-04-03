import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Import handlers
import productsHandler from "./api/products";
import categoriesHandler from "./api/categories";
import ordersHandler from "./api/orders";
import authHandler from "./api/auth";
import adminHandler from "./api/admin";
import uploadHandler from "./api/upload";
import promotionsHandler from "./api/promotions";
import pixelsHandler from "./api/pixels";
import healthHandler from "./api/health";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// API Routes mapping
app.use("/api/products", (req, res) => productsHandler(req as any, res as any));
app.use("/api/categories", (req, res) => categoriesHandler(req as any, res as any));
app.use("/api/orders", (req, res) => ordersHandler(req as any, res as any));
app.use("/api/auth", (req, res) => authHandler(req as any, res as any));
app.use("/api/admin", (req, res) => adminHandler(req as any, res as any));
app.use("/api/promotions", (req, res) => promotionsHandler(req as any, res as any));
app.use("/api/pixels", (req, res) => pixelsHandler(req as any, res as any));
app.use("/api/health", (req, res) => healthHandler(req as any, res as any));
app.use("/api/upload", (req, res) => uploadHandler(req as any, res as any));

// API 404 handler to prevent falling through to Vite for non-existent API routes
app.use("/api", (req, res) => {
  console.warn(`API: 404 Not Found - ${req.method} ${req.url}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port 3000 for AI Studio preview. 
  // We use a condition to avoid listen() when imported as a serverless function in Vercel.
  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
