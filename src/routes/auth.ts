import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import {
  clearAuthCookie,
  createPasswordResetToken,
  getSession,
  hashPassword,
  hashResetToken,
  setAuthCookie,
  signToken,
  verifyPassword,
} from "../lib/auth";

const router = Router();
const PASSWORD_MIN_LENGTH = 6;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function respondWithSession(
  res: Response,
  user: { id: string; name: string; email: string; role: string },
  message?: string,
) {
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  setAuthCookie(res, token);

  res.json({
    success: true,
    message,
    token,
    user: sanitizeUser(user),
  });
}

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(String(req.body.email || ""));
    const password = String(req.body.password || "");

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    respondWithSession(res, user, "Signed in successfully");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(String(req.body.email || ""));
    const password = String(req.body.password || "");
    const phone = String(req.body.phone || "").trim();

    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, phone: phone || null },
    });

    respondWithSession(res, user, "Account created successfully");
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(String(req.body.email || ""));

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.json({
        success: true,
        message: "If an account exists for that email, reset instructions are ready.",
      });
      return;
    }

    const { token, tokenHash, expiresAt } = createPasswordResetToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    res.json({
      success: true,
      message: "Use the reset token below to create a new password.",
      resetToken: token,
      resetExpiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(String(req.body.email || ""));
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");

    if (!email || !token || !password) {
      res.status(400).json({ error: "Email, reset token, and new password are required" });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.passwordResetTokenHash ||
      !user.passwordResetExpiresAt
    ) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    if (hashResetToken(token) !== user.passwordResetTokenHash) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    respondWithSession(res, updatedUser, "Password updated successfully");
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

// GET /api/auth/me  — check current session
router.get("/me", async (req: Request, res: Response) => {
  const session = (req as any).session;
  if (!session) {
    const s = getSession(req);
    if (!s) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: s.userId },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ user });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json({ user });
});

export default router;
