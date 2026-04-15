import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET;

function getSecret(): string {
  if (!JWT_SECRET) {
    throw new Error("Please define the JWT_SECRET environment variable");
  }
  return JWT_SECRET;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "client";
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies.get("token")?.value ?? null;
}

export function getUserFromRequest(req: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}
