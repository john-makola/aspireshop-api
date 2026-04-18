import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { getSession, hashPassword } from "../lib/auth";
import { generateOrderNumber, getDeliveryFee } from "../lib/utils";

const router = Router();

// POST /api/orders
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      items,
      deliveryMethod,
      name,
      email,
      phone,
      street,
      city,
      state,
      zipCode,
      couponCode,
      paymentMethod,
      notes,
    } = req.body;

    if (!items?.length || !name || !email) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const totalPrice = item.unitPrice * item.quantity;
      subtotal += totalPrice;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
        customizations: item.customizations
          ? JSON.stringify(item.customizations)
          : null,
      };
    });

    const deliveryFee =
      subtotal >= 10000 ? 0 : getDeliveryFee(deliveryMethod || "standard");
    let discount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });
      if (
        coupon &&
        coupon.isActive &&
        (!coupon.expiresAt || coupon.expiresAt > new Date())
      ) {
        if (!coupon.minOrderValue || subtotal >= coupon.minOrderValue) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            discount =
              coupon.type === "percentage"
                ? subtotal * (coupon.value / 100)
                : coupon.value;
            await prisma.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }
        }
      }
    }

    const total = subtotal - discount + deliveryFee;

    // Find or create user
    const session = getSession(req);
    let userId = session?.userId;

    if (!userId) {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const passwordHash = await hashPassword(
          Math.random().toString(36).slice(2)
        );
        user = await prisma.user.create({
          data: { name, email, passwordHash, phone },
        });
      }
      userId = user.id;
    }

    // Create address
    let addressId: string | undefined;
    if (street && city) {
      const address = await prisma.address.create({
        data: {
          userId,
          street,
          city,
          state: state || "",
          zipCode: zipCode || "",
          country: "Kenya",
        },
      });
      addressId = address.id;
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        addressId,
        status: "pending",
        deliveryMethod: deliveryMethod || "standard",
        deliveryFee,
        subtotal,
        discount,
        total,
        couponCode,
        paymentMethod: paymentMethod || "mpesa",
        paymentStatus: "unpaid",
        notes,
        items: { create: orderItems },
      },
    });

    res.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/orders/track?orderNumber=...
router.get("/track", async (req: Request, res: Response) => {
  try {
    const orderNumber = req.query.orderNumber as string;

    if (!orderNumber) {
      res.status(400).json({ error: "Order number is required" });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: true } },
        address: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
