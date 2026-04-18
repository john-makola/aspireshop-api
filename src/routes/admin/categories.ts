import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth";
import { slugify } from "../../lib/utils";

const router = Router();

// GET /api/admin/categories — public (no auth needed for listing)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: {
          include: { _count: { select: { products: true } } },
          orderBy: { name: "asc" },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, categories });
  } catch (error) {
    console.error("Categories API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/categories
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, image, parentId } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: "Category name is required" });
      return;
    }

    const slug = slugify(name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      res
        .status(409)
        .json({ error: "A category with this name already exists" });
      return;
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        res.status(404).json({ error: "Parent category not found" });
        return;
      }
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        image: image?.trim() || null,
        parentId: parentId || null,
      },
      include: {
        children: true,
        parent: true,
        _count: { select: { products: true } },
      },
    });

    res.json({ success: true, category });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/categories
router.patch("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, name, description, image, parentId } = req.body;

    if (!id) {
      res.status(400).json({ error: "Category ID required" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name = name.trim();
      updateData.slug = slugify(name);
    }
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (image !== undefined) updateData.image = image?.trim() || null;
    if (parentId !== undefined) {
      if (parentId === id) {
        res
          .status(400)
          .json({ error: "A category cannot be its own parent" });
        return;
      }
      updateData.parentId = parentId || null;
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        children: { include: { _count: { select: { products: true } } } },
        parent: true,
        _count: { select: { products: true } },
      },
    });

    res.json({ success: true, category });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/categories
router.delete("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: "Category ID required" });
      return;
    }

    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      res.status(409).json({
        error: `Cannot delete: ${productCount} product${productCount !== 1 ? "s" : ""} are assigned to this category. Reassign them first.`,
      });
      return;
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    if (category.children.length > 0) {
      await prisma.category.updateMany({
        where: { parentId: id },
        data: { parentId: category.parentId },
      });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
