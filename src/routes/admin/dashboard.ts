import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth";

const router = Router();
router.use(requireAdmin);

// GET /api/admin/dashboard
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [productCount, orderCount, userCount, quoteCount, recentOrders, revenue] =
      await Promise.all([
        prisma.product.count(),
        prisma.order.count(),
        prisma.user.count({ where: { role: "customer" } }),
        prisma.quoteRequest.count(),
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { user: true },
        }),
        prisma.order.aggregate({
          _sum: { total: true },
          where: { paymentStatus: "paid" },
        }),
      ]);

    res.json({
      success: true,
      productCount,
      orderCount,
      userCount,
      quoteCount,
      recentOrders,
      revenue: revenue._sum.total || 0,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/quotes
router.get("/quotes", async (_req: Request, res: Response) => {
  try {
    const quotes = await prisma.quoteRequest.findMany({
      include: {
        user: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, quotes });
  } catch (error) {
    console.error("Admin quotes error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/customers
router.get("/customers", async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: "customer" },
      include: {
        _count: { select: { orders: true, quoteRequests: true } },
        orders: { select: { total: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, customers });
  } catch (error) {
    console.error("Admin customers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/coupons
router.get("/coupons", async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, coupons });
  } catch (error) {
    console.error("Admin coupons error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
