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
    const customersWithSpend = customers.map((c) => ({
      ...c,
      totalSpent: c.orders.reduce((sum, o) => sum + o.total, 0),
    }));
    res.json({ success: true, customers: customersWithSpend });
  } catch (error) {
    console.error("Admin customers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** Normalize Coupon model fields to frontend naming convention */
function normalizeCoupon(c: any) {
  return {
    ...c,
    discountType: c.type,
    discountValue: c.value,
    minOrderAmount: c.minOrderValue,
  };
}

// GET /api/admin/coupons
router.get("/coupons", async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, coupons: coupons.map(normalizeCoupon) });
  } catch (error) {
    console.error("Admin coupons error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/coupons
router.post("/coupons", async (req: Request, res: Response) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxUses, isActive, expiresAt } = req.body;
    if (!code || !discountType || discountValue === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type: discountType,
        value: Number(discountValue),
        minOrderValue: minOrderAmount ? Number(minOrderAmount) : null,
        maxUses: maxUses ? Number(maxUses) : null,
        isActive: isActive ?? true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    // Return with aliased fields so frontend stays consistent
    res.json({ success: true, coupon: normalizeCoupon(coupon) });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({ error: "Coupon code already exists" });
      return;
    }
    console.error("Create coupon error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/coupons
router.patch("/coupons", async (req: Request, res: Response) => {
  try {
    const { id, code, discountType, discountValue, minOrderAmount, maxUses, isActive, expiresAt } = req.body;
    if (!id) {
      res.status(400).json({ error: "Coupon ID required" });
      return;
    }
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(discountType !== undefined && { type: discountType }),
        ...(discountValue !== undefined && { value: Number(discountValue) }),
        minOrderValue: minOrderAmount !== undefined ? (minOrderAmount ? Number(minOrderAmount) : null) : undefined,
        maxUses: maxUses !== undefined ? (maxUses ? Number(maxUses) : null) : undefined,
        ...(isActive !== undefined && { isActive }),
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
      },
    });
    res.json({ success: true, coupon: normalizeCoupon(coupon) });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({ error: "Coupon code already exists" });
      return;
    }
    console.error("Update coupon error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/coupons
router.delete("/coupons", async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: "Coupon ID required" });
      return;
    }
    await prisma.coupon.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete coupon error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
