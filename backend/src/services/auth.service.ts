import bcrypt from "bcrypt";
import crypto from "crypto";
import { Response } from "express";
import prisma from "../lib/prisma.js";
import {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.utils.js";
import { LoginInput } from "../validators/auth.validator.js";

const getCookieOptions = (maxAgeMs: number, path: string = "/") => {
  const isCrossSite = process.env.CROSS_SITE_COOKIES === "true";
  const isHttps = process.env.LOCAL_HTTPS === "true" || process.env.NODE_ENV === "production" || isCrossSite;

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isCrossSite ? "none" : "lax") as "none" | "lax",
    partitioned: isCrossSite ? true : undefined,
    path,
    maxAge: maxAgeMs,
  };
};

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  res.cookie(
    "accessToken",
    accessToken,
    getCookieOptions(15 * 60 * 1000)
  );

  res.cookie(
    "refreshToken",
    refreshToken,
    getCookieOptions(7 * 24 * 60 * 60 * 1000, "/api/auth")
  );
};

export const clearAuthCookies = (res: Response) => {
  const isCrossSite = process.env.CROSS_SITE_COOKIES === "true";
  const isHttps = process.env.LOCAL_HTTPS === "true" || process.env.NODE_ENV === "production" || isCrossSite;

  const commonOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isCrossSite ? "none" : "lax") as "none" | "lax",
    partitioned: isCrossSite ? true : undefined,
  };

  res.clearCookie("accessToken", {
    ...commonOptions,
    path: "/",
  });

  res.clearCookie("refreshToken", {
    ...commonOptions,
    path: "/api/auth",
  });
};

export const loginUser = async (input: LoginInput, res: Response) => {
  let user: any = null;

  if (input.registrationNumber) {
    const regNo = input.registrationNumber.trim();
    user = await prisma.user.findFirst({
      where: {
        studentProfile: {
          registrationNumber: regNo,
        },
      },
    });

    if (!user || user.role !== "STUDENT") {
      throw { statusCode: 401, message: "Invalid registration number or password" };
    }
  } else if (input.email) {
    const emailLower = input.email.trim().toLowerCase();
    user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      throw { statusCode: 401, message: "Invalid email or password" };
    }

    if (user.role === "STUDENT") {
      throw { statusCode: 400, message: "Student accounts must log in using Registration Number and Password" };
    }
  } else {
    throw { statusCode: 400, message: "Email or Registration Number is required" };
  }

  if (!user.isActive) {
    throw { statusCode: 403, message: "Account is deactivated. Please contact administrator." };
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    const errMsg = input.registrationNumber ? "Invalid registration number or password" : "Invalid email or password";
    throw { statusCode: 401, message: errMsg };
  }

  const familyId = crypto.randomUUID();
  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id, familyId });
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
    },
  });

  setAuthCookies(res, accessToken, refreshToken);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
};

export const refreshUserTokens = async (rawRefreshToken: string, res: Response) => {
  let payload: { userId: string; familyId: string };
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch (error) {
    clearAuthCookies(res);
    throw { statusCode: 401, message: "Invalid or expired refresh token" };
  }

  const tokenHash = hashToken(rawRefreshToken);
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  // REUSE DETECTION / THEFT PROTECTION
  if (tokenRecord && tokenRecord.revokedAt !== null) {
    // Revoke all active tokens in this family
    await prisma.refreshToken.updateMany({
      where: { familyId: tokenRecord.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    clearAuthCookies(res);
    throw { statusCode: 401, message: "Invalid refresh token. Session terminated for security." };
  }

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    clearAuthCookies(res);
    throw { statusCode: 401, message: "Invalid or expired refresh token" };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || !user.isActive) {
    clearAuthCookies(res);
    throw { statusCode: 401, message: "User account inactive or not found" };
  }

  // Generate new token pair
  const newAccessToken = generateAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = generateRefreshToken({ userId: user.id, familyId: payload.familyId });
  const newTokenHash = hashToken(newRefreshToken);

  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  // Rotate in DB
  const successor = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newTokenHash,
      familyId: payload.familyId,
      expiresAt: newExpiresAt,
    },
  });

  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: {
      revokedAt: new Date(),
      replacedByTokenId: successor.id,
    },
  });

  setAuthCookies(res, newAccessToken, newRefreshToken);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
};

export const logoutUser = async (rawRefreshToken: string | undefined, res: Response) => {
  if (rawRefreshToken) {
    try {
      const tokenHash = hashToken(rawRefreshToken);
      const tokenRecord = await prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (tokenRecord && tokenRecord.revokedAt === null) {
        await prisma.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() },
        });
      }
    } catch (err) {
      // Ignore errors on logout for idempotency
    }
  }

  clearAuthCookies(res);
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      studentProfile: {
        select: {
          id: true,
          registrationNumber: true,
          department: { select: { id: true, name: true, code: true } },
          academicClass: { select: { id: true, name: true, semester: true, section: true } },
        },
      },
      teacherProfile: {
        select: {
          id: true,
          employeeId: true,
          department: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });

  if (!user) {
    throw { statusCode: 404, message: "User profile not found" };
  }

  return user;
};
