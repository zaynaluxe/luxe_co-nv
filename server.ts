import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Import handlers
import categoriesHandler from "./api/categories.js";
import productsHandler from "./api/products.js";
import pixelsHandler from "./api/pixels.js";
import authLoginHandler from "./api/auth/login.js";
import authRegisterHandler from "./api/auth/register.js";
import authMeHandler from "./api/auth/me.js";
import ordersHandler from "./api/orders.js";
import ordersQuickHandler from "./api/orders/quick.js";
import ordersMyOrdersHandler from "./api/orders/my-orders.js";
import promotionsHandler from "./api/promotions.js";
import uploadHandler from "./api/upload.js";
import productDetailHandler from "./api/products/[id].js";
import promotionDetailHandler from "./api/promotions/[id].js";
import pixelDetailHandler from "./api/pixels/[id].js";
import adminClientsHandler from "./api/admin/clients.js";
import adminOrdersHandler from "./api/admin/orders.js";
import adminProductsHandler from "./api/admin/products.js";
import adminStatsHandler from "./api/admin/stats.js";
import adminOrderDetailHandler from "./api/admin/orders/[id].js";
import adminSetupHandler from "./api/admin/setup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
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
    return ordersHandler(req as any, res as any);
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

startServer();
