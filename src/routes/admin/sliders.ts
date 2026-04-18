import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth";
import fs from "fs";
import path from "path";

const router = Router();

// GET /api/admin/sliders — public (homepage needs it)
router.get("/", async (_req: Request, res: Response) => {
  const sliders = await prisma.slider.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json(sliders);
});

// POST /api/admin/sliders
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const {
    title,
    subtitle,
    description,
    imageUrl,
    buttonText,
    buttonLink,
    overlay,
    sortOrder,
  } = req.body;

  if (!title || !imageUrl) {
    res.status(400).json({ error: "Title and image are required" });
    return;
  }

  const slider = await prisma.slider.create({
    data: {
      title,
      subtitle: subtitle || null,
      description: description || null,
      imageUrl,
      buttonText: buttonText || null,
      buttonLink: buttonLink || null,
      overlay: overlay || "dark",
      sortOrder: sortOrder ?? 0,
    },
  });

  res.json(slider);
});

// PATCH /api/admin/sliders
router.patch("/", requireAdmin, async (req: Request, res: Response) => {
  const { id, ...updates } = req.body;
  if (!id) {
    res.status(400).json({ error: "Slider ID required" });
    return;
  }

  const slider = await prisma.slider.update({
    where: { id },
    data: updates,
  });

  res.json(slider);
});

// DELETE /api/admin/sliders
router.delete("/", requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ error: "Slider ID required" });
    return;
  }

  await prisma.slider.delete({ where: { id } });
  res.json({ success: true });
});

// GET /api/admin/sliders/images — list slider image files on disk
router.get("/images", requireAdmin, async (_req: Request, res: Response) => {
  const slidersDir = path.join(process.cwd(), "public", "sliders");

  try {
    if (!fs.existsSync(slidersDir)) {
      res.json([]);
      return;
    }

    const files = fs.readdirSync(slidersDir);
    const images = files
      .filter((f) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
      .map((f) => ({ name: f, url: `/sliders/${f}` }));

    res.json(images);
  } catch {
    res.json([]);
  }
});

export default router;
