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

  // 2. TCP connection test (IPv4 and IPv6)
  try {
    const parsed = new URL(url);
    const port = parseInt(parsed.port) || 5432;
    for (const family of [4, 6] as const) {
      try {
        const { address } = await dns.promises.lookup(parsed.hostname, { family });
        const host = family === 6 ? `[${address}]` : address;
        const tcpResult = await new Promise<string>((resolve) => {
          const sock = new net.Socket();
          sock.setTimeout(5000);
          sock.connect(port, address, () => {
            resolve("connected");
            sock.destroy();
          });
          sock.on("timeout", () => { resolve("timeout"); sock.destroy(); });
          sock.on("error", (err: Error) => { resolve(`error: ${err.message}`); });
        });
        results[`tcp_v${family}`] = { address: host, result: tcpResult };
      } catch (e: any) {
        results[`tcp_v${family}`] = { error: e.message };
      }
    }
  } catch (e: any) {
    results.tcpError = e.message;
  }

  // 3. Raw pg client test — try plain, SSL, and IPv6
  for (const mode of ["plain", "ssl", "ipv6"] as const) {
    try {
      const { Client } = await import("pg");
      let opts: any;
      if (mode === "ipv6") {
        const { address } = await dns.promises.lookup(new URL(url).hostname, { family: 6 });
        const parsed = new URL(url);
        opts = {
          host: address,
          port: parseInt(parsed.port) || 5432,
          user: parsed.username,
          password: decodeURIComponent(parsed.password),
          database: parsed.pathname.slice(1),
        };
      } else {
        opts = { connectionString: url };
        if (mode === "ssl") opts.ssl = { rejectUnauthorized: false };
      }
      const client = new Client(opts);
      await client.connect();
      const result = await client.query('SELECT count(*) FROM "Product"');
      results[`pg_${mode}`] = { success: true, productCount: result.rows[0].count };
      await client.end();
    } catch (e: any) {
      results[`pg_${mode}`] = { success: false, error: e.message?.substring(0, 300) };
    }
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
