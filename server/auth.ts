import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const SESSION_COOKIE = "ds_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export async function createSession(res: Response, userId: number, meta?: { userAgent?: string; ipAddress?: string }): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await storage.createSession(userId, token, expiresAt, meta);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS,
    path: "/",
  });
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    await storage.deleteSession(token);
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const session = await storage.getSessionByToken(token);
  if (!session || session.expiresAt < new Date()) {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.status(401).json({ message: "Session expired" });
    return;
  }

  const user = await storage.getUserById(session.userId);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export async function seedRootUser(): Promise<void> {
  const email = process.env.ROOT_EMAIL || "startupalchemist@consultant.com";
  const password = process.env.ROOT_PASSWORD;
  if (!password) {
    console.warn("ROOT_PASSWORD not set — skipping root user seed");
    return;
  }
  const existing = await storage.getUserByEmail(email);
  if (!existing) {
    const passwordHash = await hashPassword(password);
    await storage.createUser({
      name: "Webmaster",
      email,
      role: "root",
      passwordHash,
    });
    console.log("Root user seeded");
  }
}
