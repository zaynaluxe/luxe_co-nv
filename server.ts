import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Import handlers
import productsHandler from "./api/products.ts";
import categoriesHandler from "./api/categories.ts";
import ordersHandler from "./api/orders.ts";
import authHandler from "./api/auth.ts";
import adminHandler from "./api/admin.ts";
import uploadHandler from "./api/upload.ts";
import promotionsHandler from "./api/promotions.ts";
import pixelsHandler from "./api/pixels.ts";
import healthHandler from "./api/health.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// API Routes mapping
app.use("/api/products", (req, res) => {
  const id = req.path.split('/').filter(Boolean)[0];
  if (id) req.query.id = id;
  return productsHandler(req as any, res as any);
});
app.use("/api/categories", (req, res) => {
  const id = req.path.split('/').filter(Boolean)[0];
  if (id) req.query.id = id;
  return categoriesHandler(req as any, res as any);
});
app.all("/api/orders/quick", (req, res) => {
  req.query.quick = "true";
  return ordersHandler(req as any, res as any);
});
app.use("/api/orders", (req, res) => {
  const parts = req.path.split('/').filter(Boolean);
  if (parts[0] && parts[0] === 'my-orders') {
    // This is /api/orders/my-orders
  } else if (parts[0]) {
    req.query.id = parts[0];
  }
  return ordersHandler(req as any, res as any);
});
app.all("/api/auth/login", (req, res) => {
  req.query.login = "true";
  return authHandler(req as any, res as any);
});
app.all("/api/auth/register", (req, res) => {
  req.query.register = "true";
  return authHandler(req as any, res as any);
});
app.use("/api/auth", (req, res) => {
  const id = req.path.split('/').filter(Boolean)[0];
  if (id && id !== 'login' && id !== 'register') req.query.id = id;
  return authHandler(req as any, res as any);
});
app.all("/api/admin/setup", (req, res) => {
  req.query.resource = "setup";
  return adminHandler(req as any, res as any);
});
app.use("/api/admin", (req, res) => {
  const parts = req.path.split('/').filter(Boolean);
  if (parts[0] && parts[0] !== 'setup') req.query.resource = parts[0];
  if (parts[1]) req.query.id = parts[1];
  return adminHandler(req as any, res as any);
});
app.use("/api/promotions", (req, res) => {
  const id = req.path.split('/').filter(Boolean)[0];
  if (id) req.query.id = id;
  return promotionsHandler(req as any, res as any);
});
app.use("/api/pixels", (req, res) => {
  const id = req.path.split('/').filter(Boolean)[0];
  if (id) req.query.id = id;
  return pixelsHandler(req as any, res as any);
});
app.all("/api/health", (req, res) => healthHandler(req as any, res as any));
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
    app.get('*all', (req, res) => {
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
