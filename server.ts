import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Import handlers
import categoriesHandler from "./api/_handlers/categories";
import productsHandler from "./api/_handlers/products";
import pixelsHandler from "./api/_handlers/pixels";
import authLoginHandler from "./api/_handlers/auth/login";
import authRegisterHandler from "./api/_handlers/auth/register";
import authMeHandler from "./api/_handlers/auth/me";
import ordersHandler from "./api/_handlers/orders";
import ordersQuickHandler from "./api/_handlers/orders/quick";
import ordersMyOrdersHandler from "./api/_handlers/orders/my-orders";
import promotionsHandler from "./api/_handlers/promotions";
import uploadHandler from "./api/_handlers/upload";
import productDetailHandler from "./api/_handlers/products/[id]";
import promotionDetailHandler from "./api/_handlers/promotions/[id]";
import pixelDetailHandler from "./api/_handlers/pixels/[id]";
import adminClientsHandler from "./api/_handlers/admin/clients";
import adminOrdersHandler from "./api/_handlers/admin/orders";
import adminProductsHandler from "./api/_handlers/admin/products";
import adminStatsHandler from "./api/_handlers/admin/stats";
import adminOrderDetailHandler from "./api/_handlers/admin/orders/[id]";
import adminSetupHandler from "./api/_handlers/admin/setup";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// API Routes mapping
app.get("/api/categories", (req, res) => {
  console.log('API: GET /api/categories');
  return categoriesHandler(req as any, res as any);
});

app.get("/api/products", (req, res) => {
  console.log('API: GET /api/products');
  return productsHandler(req as any, res as any);
});

app.post("/api/products", (req, res) => {
  console.log('API: POST /api/products');
  return productsHandler(req as any, res as any);
});

app.get("/api/pixels", (req, res) => {
  console.log('API: GET /api/pixels');
  return pixelsHandler(req as any, res as any);
});

app.post("/api/pixels", (req, res) => {
  console.log('API: POST /api/pixels');
  return pixelsHandler(req as any, res as any);
});

app.post("/api/auth/login", (req, res) => {
  console.log('API: POST /api/auth/login');
  return authLoginHandler(req as any, res as any);
});

app.post("/api/auth/register", (req, res) => {
  console.log('API: POST /api/auth/register');
  return authRegisterHandler(req as any, res as any);
});

app.get("/api/auth/me", (req, res) => {
  console.log('API: GET /api/auth/me');
  return authMeHandler(req as any, res as any);
});

app.get("/api/orders", (req, res) => {
  console.log('API: GET /api/orders');
  return adminOrdersHandler(req as any, res as any); // Fixed: Use adminOrdersHandler for GET /api/orders if it's for admin
});

app.post("/api/orders", (req, res) => {
  console.log('API: POST /api/orders');
  return ordersHandler(req as any, res as any);
});

app.post("/api/orders/quick", (req, res) => {
  console.log('API: POST /api/orders/quick');
  return ordersQuickHandler(req as any, res as any);
});

app.get("/api/orders/my-orders", (req, res) => {
  console.log('API: GET /api/orders/my-orders');
  return ordersMyOrdersHandler(req as any, res as any);
});

app.get("/api/promotions", (req, res) => {
  console.log('API: GET /api/promotions');
  return promotionsHandler(req as any, res as any);
});

app.post("/api/promotions", (req, res) => {
  console.log('API: POST /api/promotions');
  return promotionsHandler(req as any, res as any);
});

app.post("/api/upload", (req, res) => {
  console.log('API: POST /api/upload');
  return uploadHandler(req as any, res as any);
});

// Admin routes
app.get("/api/admin/clients", (req, res) => {
  console.log('API: GET /api/admin/clients');
  return adminClientsHandler(req as any, res as any);
});

app.get("/api/admin/orders", (req, res) => {
  console.log('API: GET /api/admin/orders');
  return adminOrdersHandler(req as any, res as any);
});

app.get("/api/admin/orders/:id", (req, res) => {
  console.log(`API: GET /api/admin/orders/${req.params.id}`);
  req.query.id = req.params.id;
  return adminOrderDetailHandler(req as any, res as any);
});

app.patch("/api/admin/orders/:id", (req, res) => {
  console.log(`API: PATCH /api/admin/orders/${req.params.id}`);
  req.query.id = req.params.id;
  return adminOrderDetailHandler(req as any, res as any);
});

app.get("/api/admin/products", (req, res) => {
  console.log('API: GET /api/admin/products');
  return adminProductsHandler(req as any, res as any);
});

app.get("/api/admin/stats", (req, res) => {
  console.log('API: GET /api/admin/stats');
  return adminStatsHandler(req as any, res as any);
});

app.post("/api/admin/setup", (req, res) => {
  console.log('API: POST /api/admin/setup');
  return adminSetupHandler(req as any, res as any);
});

// Dynamic routes
app.all("/api/products/:id", (req, res) => {
  console.log(`API: ${req.method} /api/products/${req.params.id}`);
  req.query.id = req.params.id;
  return productDetailHandler(req as any, res as any);
});

app.put("/api/promotions/:id", (req, res) => {
  console.log(`API: PUT /api/promotions/${req.params.id}`);
  req.query.id = req.params.id;
  return promotionDetailHandler(req as any, res as any);
});

app.patch("/api/promotions/:id", (req, res) => {
  console.log(`API: PATCH /api/promotions/${req.params.id}`);
  req.query.id = req.params.id;
  return promotionDetailHandler(req as any, res as any);
});

app.delete("/api/promotions/:id", (req, res) => {
  console.log(`API: DELETE /api/promotions/${req.params.id}`);
  req.query.id = req.params.id;
  return promotionDetailHandler(req as any, res as any);
});

app.delete("/api/pixels/:id", (req, res) => {
  console.log(`API: DELETE /api/pixels/${req.params.id}`);
  req.query.id = req.params.id;
  return pixelDetailHandler(req as any, res as any);
});

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production") {
  startServer();
}

export default app;
