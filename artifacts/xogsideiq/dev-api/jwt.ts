import jwt from "jsonwebtoken";

export const JWT_SECRET =
  process.env["JWT_SECRET"] ?? "coinastra-dev-secret-change-in-production";
export const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  sub: number;
  email: string;
  role: "user" | "admin";
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
}
