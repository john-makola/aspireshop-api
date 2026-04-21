import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET =
  process.env.JWT_SECRET || "aspireshop-secret-key-change-in-production";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/** Extract session from the `token` cookie or Authorization header */
export function getSession(req: Request): JwtPayload | null {
  const token =
    req.cookies?.token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);
  if (!token) return null;
  return verifyToken(token);
}

/** Middleware: require any authenticated user */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).session = session;
  next();
}

/** Middleware: require admin role */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).session = session;
  next();
}
