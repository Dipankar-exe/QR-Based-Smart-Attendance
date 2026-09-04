import crypto from "crypto";
import { SessionStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_64_REGEX = /^[0-9a-f]{64}$/i;

export const getRotationSeconds = (): number => {
  const sec = parseInt(process.env.QR_ROTATION_SECONDS || "15", 10);
  return isNaN(sec) || sec <= 0 ? 15 : sec;
};

export const calculateWindowId = (serverTimeMs: number = Date.now()): number => {
  const rotationMs = getRotationSeconds() * 1000;
  return Math.floor(serverTimeMs / rotationMs);
};

export const calculateWindowEnd = (windowId: number): Date => {
  const rotationMs = getRotationSeconds() * 1000;
  return new Date((windowId + 1) * rotationMs);
};

export const buildQrPayload = (sessionId: string, windowId: number): string => {
  const secret = process.env.QR_SECRET_KEY || "default-qr-secret-key-min-32-chars";
  const canonicalMsg = `QR_ATTENDANCE_V1|${sessionId}|${windowId}`;
  const signature = crypto.createHmac("sha256", secret).update(canonicalMsg).digest("hex");
  return `v1.${sessionId}.${windowId}.${signature}`;
};

export const hashQrPayload = (payload: string): string => {
  return crypto.createHash("sha256").update(payload).digest("hex");
};

export interface QrValidationResult {
  isValid: boolean;
  reason?: "MALFORMED_PAYLOAD" | "UNSUPPORTED_VERSION" | "INVALID_SIGNATURE" | "EXPIRED_QR" | "INACTIVE_SESSION" | "TOKEN_NOT_FOUND" | "TOKEN_REVOKED";
  sessionId?: string;
  classId?: string;
  subjectId?: string;
}

export const validateQrTokenPayload = async (rawPayload: string): Promise<QrValidationResult> => {
  if (!rawPayload || typeof rawPayload !== "string") {
    return { isValid: false, reason: "MALFORMED_PAYLOAD" };
  }

  const parts = rawPayload.split(".");
  if (parts.length !== 4) {
    return { isValid: false, reason: "MALFORMED_PAYLOAD" };
  }

  const [version, sessionId, windowIdStr, signature] = parts;

  if (version !== "v1") {
    return { isValid: false, reason: "UNSUPPORTED_VERSION" };
  }

  if (!UUID_REGEX.test(sessionId) || !HEX_64_REGEX.test(signature)) {
    return { isValid: false, reason: "MALFORMED_PAYLOAD" };
  }

  const windowId = parseInt(windowIdStr, 10);
  if (isNaN(windowId) || windowId < 0) {
    return { isValid: false, reason: "MALFORMED_PAYLOAD" };
  }

  // HMAC Signature Verification (Constant-Time)
  const secret = process.env.QR_SECRET_KEY || "default-qr-secret-key-min-32-chars";
  const canonicalMsg = `QR_ATTENDANCE_V1|${sessionId}|${windowId}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(canonicalMsg).digest("hex");

  const sigBuffer = Buffer.from(signature.toLowerCase(), "utf-8");
  const expectedBuffer = Buffer.from(expectedSignature.toLowerCase(), "utf-8");

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { isValid: false, reason: "INVALID_SIGNATURE" };
  }

  // Server-Derived Window Expiration Check
  const rotationMs = getRotationSeconds() * 1000;
  const windowEndMs = (windowId + 1) * rotationMs;
  if (Date.now() >= windowEndMs) {
    return { isValid: false, reason: "EXPIRED_QR" };
  }

  // Database Session Status Check
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, classId: true, subjectId: true },
  });

  if (!session || session.status !== SessionStatus.ACTIVE) {
    return { isValid: false, reason: "INACTIVE_SESSION" };
  }

  // Database QrToken Metadata Check
  const payloadHash = hashQrPayload(rawPayload);
  const qrToken = await prisma.qrToken.findUnique({
    where: { sessionId_windowId: { sessionId, windowId } },
  });

  if (!qrToken || qrToken.tokenHash !== payloadHash) {
    return { isValid: false, reason: "TOKEN_NOT_FOUND" };
  }

  if (qrToken.isRevoked) {
    return { isValid: false, reason: "TOKEN_REVOKED" };
  }

  return {
    isValid: true,
    sessionId: session.id,
    classId: session.classId,
    subjectId: session.subjectId,
  };
};
