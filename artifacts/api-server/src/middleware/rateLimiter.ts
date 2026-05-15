import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too Many Requests", message: "Rate limit exceeded. Please try again later." },
  skip: () => process.env["NODE_ENV"] === "test",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too Many Requests", message: "Too many auth attempts. Please wait before trying again." },
  skip: () => process.env["NODE_ENV"] === "test",
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too Many Requests", message: "API rate limit exceeded. Please slow down your requests." },
  skip: () => process.env["NODE_ENV"] === "test",
});
