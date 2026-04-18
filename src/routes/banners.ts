import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /api/banners — active popup banners (public)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true, displayType: "popup" },
      orderBy: { sortOrder: "asc" },
    });
    res.json(banners);
  } catch {
    res.json([]);
  }
});

export default router;
