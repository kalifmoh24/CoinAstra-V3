import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";
import { signToken } from "../config/jwt.js";
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateLastLogin,
  updateUserProfile,
} from "../models/user.js";
import { createError } from "../middleware/errorHandler.js";
import type { AuthRequest } from "../middleware/auth.js";

const SALT_ROUNDS = 12;

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and dashes").optional(),
  displayName: z.string().min(1).max(64).optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  avatarUrl: z.url().optional(),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = createError("Validation failed", 400, "VALIDATION_ERROR");
      (err as any).details = parsed.error.issues;
      return next(err);
    }

    const { email, password, username, displayName } = parsed.data;

    const existing = await findUserByEmail(email);
    if (existing) {
      return next(createError("An account with this email already exists", 409, "EMAIL_TAKEN"));
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({ email, passwordHash, username, displayName });

    const token = signToken({ sub: user.id, email: user.email, role: user.role as "user" | "admin" });

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = createError("Validation failed", 400, "VALIDATION_ERROR");
      (err as any).details = parsed.error.issues;
      return next(err);
    }

    const { email, password } = parsed.data;

    const user = await findUserByEmail(email);
    if (!user) {
      return next(createError("Invalid email or password", 401, "INVALID_CREDENTIALS"));
    }

    if (!user.isActive) {
      return next(createError("Account is disabled", 403, "ACCOUNT_DISABLED"));
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return next(createError("Invalid email or password", 401, "INVALID_CREDENTIALS"));
    }

    await updateLastLogin(user.id);

    const token = signToken({ sub: user.id, email: user.email, role: user.role as "user" | "admin" });
    const { passwordHash: _, ...publicUser } = user;

    res.json({ user: publicUser, token });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(createError("Unauthorized", 401));
    }

    const user = await findUserById(req.user.sub);
    if (!user) {
      return next(createError("User not found", 404, "USER_NOT_FOUND"));
    }

    const { passwordHash: _, ...publicUser } = user;
    res.json({ user: publicUser });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(createError("Unauthorized", 401));
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = createError("Validation failed", 400, "VALIDATION_ERROR");
      (err as any).details = parsed.error.issues;
      return next(err);
    }

    const updated = await updateUserProfile(req.user.sub, parsed.data);
    if (!updated) {
      return next(createError("User not found", 404, "USER_NOT_FOUND"));
    }

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}
