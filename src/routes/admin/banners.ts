import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth";

const router = Router();
router.use(requireAdmin);

// GET /api/admin/banners
router.get("/", async (_req: Request, res: Response) => {
  const banners = await prisma.banner.findMany({
    orderBy: { sortOrder: "asc" },
  });
  res.json(banners);
});

// POST /api/admin/banners
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      title,
      subtitle,
      imageUrl,
      linkUrl,
      buttonText,
      isActive,
      sortOrder,
      displayType,
      bgColor,
      textColor,
    } = req.body;

    if (!title?.trim() || !imageUrl?.trim()) {
      res.status(400).json({ error: "Title and image are required" });
      return;
    }

    const banner = await prisma.banner.create({
      data: {
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl?.trim() || null,
        buttonText: buttonText?.trim() || "Shop Now",
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
        displayType: displayType || "popup",
        bgColor: bgColor || "#059669",
        textColor: textColor || "#ffffff",
      },
    });

    res.json({ success: true, banner });
  } catch (error) {
    console.error("Create banner error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/banners
router.patch("/", async (req: Request, res: Response) => {
  try {
    const {
      id,
      title,
      subtitle,
      imageUrl,
      linkUrl,
      buttonText,
      isActive,
      sortOrder,
      displayType,
      bgColor,
      textColor,
    } = req.body;

    if (!id) {
      res.status(400).json({ error: "Banner ID required" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (subtitle !== undefined) updateData.subtitle = subtitle?.trim() || null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl.trim();
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl?.trim() || null;
    if (buttonText !== undefined)
      updateData.buttonText = buttonText?.trim() || "Shop Now";
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (displayType !== undefined) updateData.displayType = displayType;
    if (bgColor !== undefined) updateData.bgColor = bgColor;
    if (textColor !== undefined) updateData.textColor = textColor;

    const banner = await prisma.banner.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, banner });
  } catch (error) {
    console.error("Update banner error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/banners
router.delete("/", async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: "Banner ID required" });
      return;
    }

    await prisma.banner.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete banner error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
