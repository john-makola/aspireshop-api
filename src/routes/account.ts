import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { formatPrice } from "../lib/utils";

const router = Router();

// All account routes require authentication
router.use(requireAuth);

// GET /api/account/dashboard
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;

    const [user, orders, notifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        include: { addresses: true, savedDesigns: true },
      }),
      prisma.order.findMany({
        where: { userId: session.userId },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.notification.findMany({
        where: { userId: session.userId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ success: true, user, orders, notifications });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/account/orders
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;

    const orders = await prisma.order.findMany({
      where: { userId: session.userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Orders error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
