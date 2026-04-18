import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /api/homepage — aggregated data for the homepage
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [featuredProducts, newArrivals, sliders, categories] =
      await Promise.all([
        prisma.product.findMany({
          where: { isFeatured: true, isActive: true },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            tags: true,
            category: true,
          },
          take: 4,
          orderBy: { createdAt: "desc" },
        }),
        prisma.product.findMany({
          where: { isActive: true },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            tags: true,
            category: true,
          },
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        prisma.slider.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        }),
        prisma.category.findMany({
          where: {
            parentId: null,
            slug: { not: "branding" },
          },
          include: {
            _count: { select: { products: true } },
            children: {
              include: { _count: { select: { products: true } } },
            },
          },
          orderBy: { name: "asc" },
        }),
      ]);

    res.json({
      success: true,
      featuredProducts,
      newArrivals,
      sliders,
      categories,
    });
  } catch (error) {
    console.error("Homepage data error:", error);
    res.json({
      success: true,
      featuredProducts: [],
      newArrivals: [],
      sliders: [],
      categories: [],
    });
  }
});

// GET /api/categories — public category list
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { slug: { not: "branding" } },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, categories });
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
