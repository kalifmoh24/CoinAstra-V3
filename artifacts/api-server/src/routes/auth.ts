import { Router } from "express";
import { register, login, getProfile, updateProfile } from "../controllers/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.get("/auth/profile", requireAuth, getProfile);
router.patch("/auth/profile", requireAuth, updateProfile);

export default router;
