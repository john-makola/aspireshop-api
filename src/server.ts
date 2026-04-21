import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import quoteRoutes from "./routes/quotes";
import bannerRoutes from "./routes/banners";
import uploadRoutes from "./routes/upload";
import homepageRoutes from "./routes/homepage";
import accountRoutes from "./routes/account";

// Admin routes
import adminProductRoutes from "./routes/admin/products";
import adminCategoryRoutes from "./routes/admin/categories";
import adminOrderRoutes from "./routes/admin/orders";
import adminSliderRoutes from "./routes/admin/sliders";
import adminBannerRoutes from "./routes/admin/banners";
import adminDashboardRoutes from "./routes/admin/dashboard";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// CORS — allow the static frontend origin(s)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const allowedOrigins = FRONTEND_URL.split(",").map((o) => o.trim());
console.log("CORS origins:", allowedOrigins.join(", "));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Serve uploaded files and static assets
app.use(
  "/uploads",
  express.static(
    process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads"),
  ),
);
app.use(
  "/categories",
  express.static(path.join(process.cwd(), "public", "categories")),
);
app.use(
  "/sliders",
  express.static(path.join(process.cwd(), "public", "sliders")),
);
app.use(
  "/features",
  express.static(path.join(process.cwd(), "public", "features")),
);
app.use(
  "/banners",
  express.static(path.join(process.cwd(), "public", "banners")),
);

// --- Public Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/categories", homepageRoutes); // reuse /categories endpoint

// --- Authenticated Routes ---
app.use("/api/account", accountRoutes);

// --- Admin Routes ---
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/sliders", adminSliderRoutes);
app.use("/api/admin/banners", adminBannerRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend API server running on port ${PORT}`);
  console.log(`CORS origins: ${allowedOrigins.join(", ")}`);
  const dbUrl = process.env.DATABASE_URL || "NOT SET";
  console.log(`DATABASE_URL host: ${dbUrl.replace(/\/\/.*@/, "//***@")}`);
});

export default app;
