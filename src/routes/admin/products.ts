import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth";
import { slugify } from "../../lib/utils";

const router = Router();
router.use(requireAdmin);

// GET /api/admin/products
router.get("/", async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    include: { category: true, images: true, tags: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(products);
});

// POST /api/admin/products
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      shortDescription,
      basePrice,
      compareAtPrice,
      sku,
      stock,
      categoryId,
      isActive,
      isFeatured,
      isCustomizable,
      minOrderQty,
      imageUrl,
      tags,
    } = req.body;

    if (!name || !description || !basePrice || !sku || !categoryId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const slug = slugify(name);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        shortDescription,
        basePrice,
        compareAtPrice,
        sku,
        stock: stock || 0,
        categoryId,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        isCustomizable: isCustomizable ?? false,
        minOrderQty: minOrderQty || 1,
      },
    });

    if (imageUrl) {
      await prisma.productImage.create({
        data: { productId: product.id, url: imageUrl, isPrimary: true },
      });
    }

    if (tags?.length) {
      for (const tag of tags) {
        await prisma.productTag.create({
          data: { productId: product.id, tag },
        });
      }
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/products
router.patch("/", async (req: Request, res: Response) => {
  try {
    const {
      id,
      name,
      description,
      shortDescription,
      basePrice,
      compareAtPrice,
      sku,
      stock,
      categoryId,
      isActive,
      isFeatured,
      isCustomizable,
      minOrderQty,
      availability,
      discountType,
      discountValue,
      promotionLabel,
      images,
      tags,
    } = req.body;

    if (!id) {
      res.status(400).json({ error: "Product ID required" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = slugify(name);
    }
    if (description !== undefined) updateData.description = description;
    if (shortDescription !== undefined)
      updateData.shortDescription = shortDescription;
    if (basePrice !== undefined) updateData.basePrice = basePrice;
    if (compareAtPrice !== undefined)
      updateData.compareAtPrice = compareAtPrice;
    if (sku !== undefined) updateData.sku = sku;
    if (stock !== undefined) updateData.stock = stock;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (isCustomizable !== undefined)
      updateData.isCustomizable = isCustomizable;
    if (minOrderQty !== undefined) updateData.minOrderQty = minOrderQty;
    if (availability !== undefined) updateData.availability = availability;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = discountValue;
    if (promotionLabel !== undefined)
      updateData.promotionLabel = promotionLabel;

    await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Sync images if provided
    if (images !== undefined && Array.isArray(images)) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        await prisma.productImage.create({
          data: {
            productId: id,
            url: img.url,
            isPrimary: img.isPrimary ?? i === 0,
            sortOrder: i,
            alt: img.alt || null,
          },
        });
      }
    }

    // Sync tags if provided
    if (tags !== undefined && Array.isArray(tags)) {
      await prisma.productTag.deleteMany({ where: { productId: id } });
      for (const tag of tags) {
        await prisma.productTag.create({
          data: { productId: id, tag },
        });
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: { category: true, images: true, tags: true },
    });

    res.json(updated);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/products
router.delete("/", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "Product IDs required" });
      return;
    }

    await prisma.productTag.deleteMany({ where: { productId: { in: ids } } });
    await prisma.pricingTier.deleteMany({ where: { productId: { in: ids } } });
    await prisma.customizationOption.deleteMany({
      where: { productId: { in: ids } },
    });
    await prisma.productImage.deleteMany({
      where: { productId: { in: ids } },
    });
    await prisma.cartItem.deleteMany({ where: { productId: { in: ids } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });

    res.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/products/images — browse server-side category images
router.get("/images", async (_req: Request, res: Response) => {
  const categoriesDir = require("path").join(
    process.cwd(),
    "public",
    "categories"
  );
  const imageExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
  ]);
  const result: { folder: string; images: string[] }[] = [];

  try {
    const fs = require("fs");
    const entries = fs.readdirSync(categoriesDir, { withFileTypes: true });

    const topImages = entries
      .filter(
        (e: any) =>
          e.isFile() &&
          imageExtensions.has(
            require("path").extname(e.name).toLowerCase()
          )
      )
      .map((e: any) => `/categories/${e.name}`);

    if (topImages.length > 0) {
      result.push({ folder: "categories", images: topImages });
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const subDir = require("path").join(categoriesDir, entry.name);
      const subFiles = fs.readdirSync(subDir, { withFileTypes: true });
      const images = subFiles
        .filter(
          (f: any) =>
            f.isFile() &&
            imageExtensions.has(
              require("path").extname(f.name).toLowerCase()
            )
        )
        .map((f: any) => `/categories/${entry.name}/${f.name}`);
      result.push({ folder: entry.name, images });
    }
  } catch {
    // Directory might not exist
  }

  res.json(result);
});

export default router;
