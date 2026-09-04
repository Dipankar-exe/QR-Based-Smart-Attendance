import { SessionStatus, AttendanceStatus, SecurityLogReason, Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { validateQrTokenPayload, getRotationSeconds, hashQrPayload } from "../utils/qr.utils.js";
import { verifyProximity, getProximityConfig, GeolocationData } from "../utils/proximity.utils.js";

// Helper to get authenticated StudentProfile
export const getStudentProfileByUserId = async (userId: string) => {
  const student = await prisma.user.findFirst({
    where: { id: userId, role: "STUDENT" },
    select: {
      id: true,
      isActive: true,
      studentProfile: {
        select: { id: true, registrationNumber: true, departmentId: true, classId: true },
      },
    },
  });

  if (!student || !student.studentProfile) {
    throw { statusCode: 403, message: "Access denied. Student profile not found." };
  }

  if (!student.isActive) {
    throw { statusCode: 403, message: "Student account is inactive." };
  }

  return student.studentProfile;
};

// Safe Security Audit Logger (never throws or leaks secrets)
export const logSecurityEvent = async (data: {
  studentId?: string;
  sessionId?: string;
  reason: SecurityLogReason;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}) => {
  try {
    await prisma.attendanceSecurityLog.create({
      data: {
        studentId: data.studentId || null,
        sessionId: data.sessionId || null,
        reason: data.reason,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        verificationMethod: "DYNAMIC_QR_GEOFENCE",
        details: data.details || null,
      },
    });
  } catch (err) {
    console.error("[security-log] Failed to record security log:", err);
  }
};

const roundPercent = (num: number): number => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

// ==========================================
// 1. PROCESS STUDENT QR SCAN + PROXIMITY
// ==========================================

export const processStudentQrScan = async (
  userId: string,
  rawPayload: string,
  location: GeolocationData | null | undefined,
  meta: { ipAddress?: string; userAgent?: string }
) => {
  const profile = await getStudentProfileByUserId(userId);

  // Initial QR Cryptographic Validation
  const validation = await validateQrTokenPayload(rawPayload);

  if (!validation.isValid) {
    let logReason: SecurityLogReason = SecurityLogReason.INVALID_QR;
    let statusCode = 400;
    let userMsg = "Invalid QR code payload.";

    if (validation.reason === "EXPIRED_QR") {
      logReason = SecurityLogReason.EXPIRED_QR;
      userMsg = "Attendance QR code has expired. Please scan the current active QR code.";
    } else if (validation.reason === "TOKEN_REVOKED") {
      logReason = SecurityLogReason.TOKEN_REVOKED;
      statusCode = 409;
      userMsg = "This attendance session QR token has been revoked.";
    } else if (validation.reason === "INACTIVE_SESSION") {
      logReason = SecurityLogReason.SESSION_CLOSED;
      statusCode = 409;
      userMsg = "This attendance session is closed or inactive.";
    }

    await logSecurityEvent({
      studentId: profile.id,
      sessionId: validation.sessionId,
      reason: logReason,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      details: `Validation failed with reason: ${validation.reason}`,
    });

    throw { statusCode, message: userMsg };
  }

  const sessionId = validation.sessionId!;
  const sessionClassId = validation.classId!;

  // Student Class Membership Check
  if (profile.classId !== sessionClassId) {
    await logSecurityEvent({
      studentId: profile.id,
      sessionId,
      reason: SecurityLogReason.WRONG_CLASS,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      details: `Student classId (${profile.classId}) does not match session classId (${sessionClassId})`,
    });

    throw {
      statusCode: 400,
      message: "You are not enrolled in the academic class for this attendance session.",
    };
  }

  // Proximity / Physical-Presence Verification
  const proximityConfig = getProximityConfig();
  const proximityResult = verifyProximity(location, proximityConfig);

  if (!proximityResult.isValid) {
    let statusCode = 400;
    let userMsg = "Proximity verification failed.";

    if (proximityResult.reason === "UNCONFIGURED_LOCATION") {
      statusCode = 500;
      userMsg = "College geographic location is not configured on the server.";
    } else if (proximityResult.reason === "MISSING_LOCATION") {
      userMsg = "Location data is required for physical-presence verification.";
    } else if (proximityResult.reason === "INVALID_LOCATION") {
      userMsg = "Malformed location coordinates submitted.";
    } else if (proximityResult.reason === "STALE_LOCATION") {
      userMsg = "Stale location data. Ensure your device clock is synchronized and retry.";
    } else if (proximityResult.reason === "LOW_ACCURACY") {
      userMsg = "Location accuracy is too low. Move closer to a window or outdoors and retry.";
    } else if (proximityResult.reason === "OUTSIDE_GEOFENCE") {
      userMsg = "You are outside the designated college classroom proximity area.";
    }

    await logSecurityEvent({
      studentId: profile.id,
      sessionId,
      reason: SecurityLogReason.PROXIMITY_FAILED,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      details: `Proximity failed: ${proximityResult.reason}`,
    });

    throw { statusCode, message: userMsg };
  }

  const payloadParts = rawPayload.split(".");
  const windowId = parseInt(payloadParts[2], 10);
  const rotationMs = getRotationSeconds() * 1000;
  const windowEndMs = (windowId + 1) * rotationMs;

  try {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.findUnique({
        where: { id: sessionId },
        select: { id: true, status: true, academicClass: { select: { name: true, section: true } }, subject: { select: { name: true, code: true } } },
      });

      if (!session || session.status !== SessionStatus.ACTIVE) {
        throw { statusCode: 409, message: "Attendance session is no longer active." };
      }

      if (Date.now() >= windowEndMs) {
        throw { statusCode: 400, message: "QR token expired right before processing. Scan updated QR code." };
      }

      const tokenRecord = await tx.qrToken.findUnique({
        where: { sessionId_windowId: { sessionId, windowId } },
      });

      if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.tokenHash !== hashQrPayload(rawPayload)) {
        throw { statusCode: 409, message: "QR token is invalid or has been revoked." };
      }

      const existingRecord = await tx.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId, studentId: profile.id } },
      });

      if (existingRecord) {
        throw { statusCode: 409, message: "Attendance already recorded for this session." };
      }

      return await tx.attendanceRecord.create({
        data: {
          sessionId,
          studentId: profile.id,
          status: AttendanceStatus.PRESENT,
          markedAt: new Date(),
          verificationMethod: "DYNAMIC_QR_GEOFENCE",
        },
        select: {
          id: true,
          status: true,
          markedAt: true,
          verificationMethod: true,
          session: {
            select: {
              id: true,
              subject: { select: { name: true, code: true } },
              academicClass: { select: { name: true, section: true } },
            },
          },
        },
      });
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      await logSecurityEvent({
        studentId: profile.id,
        sessionId,
        reason: SecurityLogReason.DUPLICATE_ATTENDANCE,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        details: "Concurrent duplicate attendance submission caught by database unique constraint",
      });

      throw { statusCode: 409, message: "Attendance already recorded for this session." };
    }

    if (err.statusCode && err.message) {
      if (err.statusCode === 409 && err.message.includes("already recorded")) {
        await logSecurityEvent({
          studentId: profile.id,
          sessionId,
          reason: SecurityLogReason.DUPLICATE_ATTENDANCE,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
      }
      throw err;
    }

    throw { statusCode: 500, message: "Failed to record attendance due to an internal server error." };
  }
};

// ==========================================
// 2. STUDENT ATTENDANCE HISTORY
// ==========================================

export const getStudentAttendanceHistory = async (
  userId: string,
  filters: { status?: AttendanceStatus; subjectId?: string }
) => {
  const profile = await getStudentProfileByUserId(userId);

  const where: any = { studentId: profile.id };
  if (filters.status) where.status = filters.status;
  if (filters.subjectId) {
    where.session = { subjectId: filters.subjectId };
  }

  return await prisma.attendanceRecord.findMany({
    where,
    orderBy: { markedAt: "desc" },
    select: {
      id: true,
      status: true,
      markedAt: true,
      verificationMethod: true,
      session: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          subject: { select: { id: true, name: true, code: true } },
          academicClass: { select: { id: true, name: true, section: true } },
        },
      },
    },
  });
};

// ==========================================
// 3. STEP 15: STUDENT ATTENDANCE SUMMARY
// ==========================================

export const getStudentAttendanceSummary = async (userId: string) => {
  const profile = await getStudentProfileByUserId(userId);

  // Fetch all CLOSED sessions for student's class (ACTIVE and CANCELLED excluded)
  const closedSessions = await prisma.attendanceSession.findMany({
    where: { classId: profile.classId, status: SessionStatus.CLOSED },
    select: {
      id: true,
      subjectId: true,
      subject: { select: { id: true, name: true, code: true } },
    },
  });

  const closedSessionIds = closedSessions.map((s) => s.id);

  // Fetch student's attendance records for CLOSED sessions only
  const attendedRecords = await prisma.attendanceRecord.findMany({
    where: { studentId: profile.id, sessionId: { in: closedSessionIds } },
    select: { sessionId: true },
  });

  const attendedSessionIdSet = new Set(attendedRecords.map((r) => r.sessionId));

  // Subject-wise Grouping
  const subjectMap = new Map<string, {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    totalClosedSessions: number;
    attendedClosedSessions: number;
    absentClosedSessions: number;
  }>();

  for (const s of closedSessions) {
    if (!subjectMap.has(s.subjectId)) {
      subjectMap.set(s.subjectId, {
        subjectId: s.subject.id,
        subjectName: s.subject.name,
        subjectCode: s.subject.code,
        totalClosedSessions: 0,
        attendedClosedSessions: 0,
        absentClosedSessions: 0,
      });
    }

    const item = subjectMap.get(s.subjectId)!;
    item.totalClosedSessions += 1;
    if (attendedSessionIdSet.has(s.id)) {
      item.attendedClosedSessions += 1;
    } else {
      item.absentClosedSessions += 1;
    }
  }

  const subjectWise = Array.from(subjectMap.values()).map((s) => ({
    ...s,
    attendancePercentage: s.totalClosedSessions > 0
      ? roundPercent((s.attendedClosedSessions / s.totalClosedSessions) * 100)
      : 0,
  }));

  // Overall Totals
  const totalCompletedSessions = closedSessions.length;
  const totalAttended = attendedRecords.length;
  const totalAbsent = Math.max(0, totalCompletedSessions - totalAttended);
  const overallAttendancePercentage = totalCompletedSessions > 0
    ? roundPercent((totalAttended / totalCompletedSessions) * 100)
    : 0;

  return {
    overall: {
      totalCompletedSessions,
      totalAttended,
      totalAbsent,
      overallAttendancePercentage,
    },
    subjectWise,
  };
};
