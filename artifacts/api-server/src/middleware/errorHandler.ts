import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function createError(message: string, statusCode: number, code?: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} does not exist`,
  });
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Treat CoinGecko rate-limit as 429, not 500
  const isCgRateLimit = err.message?.includes("CoinGecko 429") || err.message?.includes("429:");
  const statusCode = isCgRateLimit ? 429 : (err.statusCode ?? 500);
  const isDev = process.env["NODE_ENV"] !== "production";

  if (statusCode >= 500) {
    logger.error({ err, req: { method: req.method, url: req.url } }, "Unhandled server error");
  }

  res.status(statusCode).json({
    error: isCgRateLimit
      ? "Rate Limited"
      : (err.code ?? (statusCode >= 500 ? "Internal Server Error" : "Request Error")),
    message: isCgRateLimit
      ? "CoinGecko API rate limit reached. Data will retry automatically — live on coinastra.io."
      : (err.message ?? "An unexpected error occurred"),
    ...(isDev && statusCode >= 500 && !isCgRateLimit ? { stack: err.stack } : {}),
    ...(err.details ? { details: err.details } : {}),
  });
}
