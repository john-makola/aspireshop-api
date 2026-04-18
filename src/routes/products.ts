import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /api/products
router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, q, tag, sort, minPrice, maxPrice } = req.query;

    const where: any = { isActive: true };

    if (category) where.category = { slug: category };
    if (q) {
      const searchTerm = (q as string).trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: searchTerm } },
            { description: { contains: searchTerm } },
            { shortDescription: { contains: searchTerm } },
            { sku: { contains: searchTerm } },
            { tags: { some: { tag: { contains: searchTerm } } } },
          ],
        },
      ];
    }
    if (tag) where.tags = { some: { tag } };

    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = parseFloat(minPrice as string);
      if (maxPrice) where.basePrice.lte = parseFloat(maxPrice as string);
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "price-asc") orderBy = { basePrice: "asc" };
    if (sort === "price-desc") orderBy = { basePrice: "desc" };
    if (sort === "name") orderBy = { name: "asc" };

    const products = await prisma.product.findMany({
      where,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        tags: true,
        category: true,
      },
      orderBy,
    });

    res.json({ success: true, products });
  } catch (error) {
    console.error("Products API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/products/:slug
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        tags: true,
        category: true,
        pricingTiers: { orderBy: { minQty: "asc" } },
        customizationOptions: true,
      },
    });

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Fetch related products (same category) and more products (other categories)
    const [relatedProducts, moreProducts] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          categoryId: product.categoryId,
          id: { not: product.id },
        },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          tags: true,
          category: true,
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
          categoryId: { not: product.categoryId },
        },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          tags: true,
          category: true,
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({ success: true, product, relatedProducts, moreProducts });
  } catch (error) {
    console.error("Product detail error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
