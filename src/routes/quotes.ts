import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { getSession, hashPassword } from "../lib/auth";

const router = Router();

// POST /api/quotes
router.post("/", async (req: Request, res: Response) => {
  try {
    const { items, name, email, phone, company, message } = req.body;

    if (!items?.length || !name || !email) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

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

    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        userId,
        message: `${company ? `Company: ${company}\n` : ""}${message || ""}`,
        status: "pending",
      },
    });

    for (const item of items) {
      if (item.productId) {
        await prisma.quoteItem.create({
          data: {
            quoteRequestId: quoteRequest.id,
            productId: item.productId,
            quantity: item.quantity || 1,
            customizations: item.details
              ? JSON.stringify({ details: item.details })
              : null,
          },
        });
      }
    }

    res.json({ success: true, quoteId: quoteRequest.id });
  } catch (error) {
    console.error("Quote creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
