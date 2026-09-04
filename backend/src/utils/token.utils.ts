import crypto from "crypto";
import jwt from "jsonwebtoken";

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateAccessToken = (payload: { userId: string; role: string }): string => {
  const secret = process.env.JWT_ACCESS_SECRET || "default-access-secret-min-32-chars";
  return jwt.sign(payload, secret, { expiresIn: "15m" });
};

export const generateRefreshToken = (payload: { userId: string; familyId: string }): string => {
  const secret = process.env.JWT_REFRESH_SECRET || "default-refresh-secret-min-32-chars";
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(), // Ensures global uniqueness when issuing refresh tokens in the same second
    },
    secret,
    { expiresIn: "7d" }
  );
};

export const verifyAccessToken = (token: string): { userId: string; role: string } => {
  const secret = process.env.JWT_ACCESS_SECRET || "default-access-secret-min-32-chars";
  return jwt.verify(token, secret) as { userId: string; role: string };
};

export const verifyRefreshToken = (token: string): { userId: string; familyId: string; jti?: string } => {
  const secret = process.env.JWT_REFRESH_SECRET || "default-refresh-secret-min-32-chars";
  return jwt.verify(token, secret) as { userId: string; familyId: string; jti?: string };
};
