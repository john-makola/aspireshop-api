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
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Serve uploaded files and static assets
app.use(
  "/uploads",
  express.static(process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads"))
);
app.use("/categories", express.static(path.join(process.cwd(), "public", "categories")));
app.use("/sliders", express.static(path.join(process.cwd(), "public", "sliders")));
app.use("/features", express.static(path.join(process.cwd(), "public", "features")));
app.use("/banners", express.static(path.join(process.cwd(), "public", "banners")));

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

// Debug endpoint — diagnose DB connectivity from inside the container
app.get("/api/debug-db", async (_req, res) => {
  const dns = await import("dns");
  const net = await import("net");
  const url = process.env.DATABASE_URL || "NOT SET";
  const results: Record<string, unknown> = {
    DATABASE_URL: url.replace(/\/\/.*@/, "//***@"),
  };

  // 1. DNS resolution
  try {
    const host = new URL(url).hostname;
    results.host = host;
    const addresses4 = await dns.promises.resolve4(host).catch(() => []);
    const addresses6 = await dns.promises.resolve6(host).catch(() => []);
    const lookup = await dns.promises.lookup(host, { all: true }).catch((e: Error) => e.message);
    results.dns = { ipv4: addresses4, ipv6: addresses6, lookup };
  } catch (e: any) {
    results.dnsError = e.message;
  }

  // 2. TCP connection test
  try {
    const parsed = new URL(url);
    const port = parseInt(parsed.port) || 5432;
    const tcpResult = await new Promise<string>((resolve) => {
      const sock = new net.Socket();
      sock.setTimeout(5000);
      sock.connect(port, parsed.hostname, () => {
        resolve("connected");
        sock.destroy();
      });
      sock.on("timeout", () => { resolve("timeout"); sock.destroy(); });
      sock.on("error", (err: Error) => { resolve(`error: ${err.message}`); });
    });
    results.tcp = tcpResult;
  } catch (e: any) {
    results.tcpError = e.message;
  }

  // 3. Raw pg client test (bypasses Prisma engine)
  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: url });
    await client.connect();
    const result = await client.query('SELECT count(*) FROM "Product"');
    results.pgDirect = { success: true, productCount: result.rows[0].count };
    await client.end();
  } catch (e: any) {
    results.pgDirect = { success: false, error: e.message?.substring(0, 300) };
  }

  // 4. Prisma connection test
  try {
    const prisma = (await import("./lib/prisma")).default;
    const count = await prisma.product.count();
    results.prisma = { success: true, productCount: count };
  } catch (e: any) {
    results.prisma = { success: false, error: e.message?.substring(0, 300) };
  }

  res.json(results);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend API server running on port ${PORT}`);
  console.log(`CORS origins: ${allowedOrigins.join(", ")}`);
  const dbUrl = process.env.DATABASE_URL || "NOT SET";
  console.log(`DATABASE_URL host: ${dbUrl.replace(/\/\/.*@/, "//***@")}`);
});

export default app;
