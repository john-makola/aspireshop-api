import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth";

const router = Router();
router.use(requireAdmin);

// GET /api/admin/orders
router.get("/", async (_req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    include: {
      user: true,
      items: { include: { product: { include: { images: true } } } },
      address: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

// PATCH /api/admin/orders
router.patch("/", async (req: Request, res: Response) => {
  const { orderId, status, paymentStatus, notes } = req.body;

  if (!orderId) {
    res.status(400).json({ error: "Order ID is required" });
    return;
  }

  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const validPaymentStatuses = ["unpaid", "paid", "refunded"];

  const updateData: Record<string, string> = {};

  if (status) {
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    updateData.status = status;
  }

  if (paymentStatus) {
    if (!validPaymentStatuses.includes(paymentStatus)) {
      res.status(400).json({ error: "Invalid payment status" });
      return;
    }
    updateData.paymentStatus = paymentStatus;
  }

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      user: true,
      items: { include: { product: { include: { images: true } } } },
      address: true,
    },
  });

  res.json(order);
});

export default router;
