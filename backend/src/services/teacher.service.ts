import { SessionStatus, AttendanceStatus, Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import {
  calculateWindowId,
  calculateWindowEnd,
  buildQrPayload,
  hashQrPayload,
  getRotationSeconds,
} from "../utils/qr.utils.js";

// Helper to get authenticated TeacherProfile
export const getTeacherProfileByUserId = async (userId: string) => {
  const teacher = await prisma.user.findFirst({
    where: { id: userId, role: "TEACHER" },
    select: {
      id: true,
      isActive: true,
      teacherProfile: {
        select: { id: true, employeeId: true, departmentId: true },
      },
    },
  });

  if (!teacher || !teacher.teacherProfile) {
    throw { statusCode: 403, message: "Access denied. Teacher profile not found." };
  }

  if (!teacher.isActive) {
    throw { statusCode: 403, message: "Teacher account is inactive." };
  }

  return teacher.teacherProfile;
};

// Helper to safely round percentages to 2 decimal places
const roundPercent = (num: number): number => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

// ==========================================
// 1. TEACHER ASSIGNMENTS
// ==========================================

export const getTeacherAssignments = async (userId: string) => {
  const profile = await getTeacherProfileByUserId(userId);

  return await prisma.teacherClassSubject.findMany({
    where: { teacherId: profile.id },
    select: {
      id: true,
      createdAt: true,
      subject: {
        select: { id: true, name: true, code: true, semester: true },
      },
      academicClass: {
        select: { id: true, name: true, semester: true, section: true, batchYear: true },
      },
      teacher: {
        select: {
          department: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// ==========================================
// 2. START ATTENDANCE SESSION
// ==========================================

export const startAttendanceSession = async (userId: string, data: { assignmentId: string }) => {
  const profile = await getTeacherProfileByUserId(userId);

  const assignment = await prisma.teacherClassSubject.findFirst({
    where: { id: data.assignmentId, teacherId: profile.id },
    include: {
      academicClass: true,
      subject: true,
    },
  });

  if (!assignment) {
    throw { statusCode: 404, message: "Teaching assignment not found or does not belong to you." };
  }

  // Academic Compatibility Verification
  if (profile.departmentId !== assignment.academicClass.departmentId) {
    throw { statusCode: 400, message: "Teacher department does not match class department." };
  }

  if (assignment.academicClass.departmentId !== assignment.subject.departmentId) {
    throw { statusCode: 400, message: "Class department does not match subject department." };
  }

  if (assignment.academicClass.semester !== assignment.subject.semester) {
    throw { statusCode: 400, message: "Class semester does not match subject semester." };
  }

  // Defensive Conflict Check & Creation inside Transaction
  return await prisma.$transaction(async (tx) => {
    const activeTeacherSession = await tx.attendanceSession.findFirst({
      where: { teacherId: profile.id, status: SessionStatus.ACTIVE },
    });

    if (activeTeacherSession) {
      throw {
        statusCode: 409,
        message: "You already have an active attendance session running. Close or cancel it before starting a new one.",
      };
    }

    const activeClassSession = await tx.attendanceSession.findFirst({
      where: { classId: assignment.classId, status: SessionStatus.ACTIVE },
    });

    if (activeClassSession) {
      throw {
        statusCode: 409,
        message: "This academic class already has an active attendance session running.",
      };
    }

    return await tx.attendanceSession.create({
      data: {
        teacherId: profile.id,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        startTime: new Date(),
        endTime: null,
        status: SessionStatus.ACTIVE,
      },
      include: {
        academicClass: { select: { id: true, name: true, semester: true, section: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });
  });
};

// ==========================================
// 3. GENERATE TEACHER DYNAMIC QR PAYLOAD
// ==========================================

export const generateTeacherQrPayload = async (userId: string, sessionId: string) => {
  const profile = await getTeacherProfileByUserId(userId);

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, teacherId: profile.id },
  });

  if (!session) {
    throw { statusCode: 404, message: "Attendance session not found or access denied." };
  }

  if (session.status !== SessionStatus.ACTIVE) {
    throw {
      statusCode: 409,
      message: `Cannot generate QR for session with status '${session.status}'. Only ACTIVE sessions support QR rotation.`,
    };
  }

  const windowId = calculateWindowId();
  const expiresAt = calculateWindowEnd(windowId);
  const payload = buildQrPayload(sessionId, windowId);
  const tokenHash = hashQrPayload(payload);

  await prisma.qrToken.upsert({
    where: { sessionId_windowId: { sessionId, windowId } },
    update: {},
    create: {
      sessionId,
      windowId,
      tokenHash,
      expiresAt,
      isRevoked: false,
    },
  });

  return {
    payload,
    expiresAt: expiresAt.toISOString(),
    rotationSeconds: getRotationSeconds(),
  };
};

// ==========================================
// 4. LIST TEACHER SESSIONS (Extended with Pagination & Stats)
// ==========================================

export const getTeacherSessions = async (
  userId: string,
  filters: {
    page?: number;
    limit?: number;
    status?: SessionStatus;
    classId?: string;
    subjectId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  const profile = await getTeacherProfileByUserId(userId);

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 10));
  const skip = (page - 1) * limit;

  const where: any = { teacherId: profile.id };
  if (filters.status) where.status = filters.status;
  if (filters.classId) where.classId = filters.classId;
  if (filters.subjectId) where.subjectId = filters.subjectId;

  if (filters.dateFrom || filters.dateTo) {
    where.startTime = {};
    if (filters.dateFrom) where.startTime.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.startTime.lte = new Date(filters.dateTo);
  }

  // Batched Query (Sessions + Total Count)
  const [sessions, total] = await Promise.all([
    prisma.attendanceSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        academicClass: {
          select: {
            id: true,
            name: true,
            semester: true,
            section: true,
            _count: { select: { students: true } },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { attendanceRecords: true, qrTokens: true } },
      },
    }),
    prisma.attendanceSession.count({ where }),
  ]);

  const mappedSessions = sessions.map((s) => {
    const totalStudents = s.academicClass._count.students;
    const presentCount = s._count.attendanceRecords;
    let attendancePercentage = 0;

    if (s.status === SessionStatus.CLOSED) {
      attendancePercentage = totalStudents > 0 ? roundPercent((presentCount / totalStudents) * 100) : 0;
    } else if (s.status === SessionStatus.ACTIVE) {
      attendancePercentage = totalStudents > 0 ? roundPercent((presentCount / totalStudents) * 100) : 0;
    }

    return {
      id: s.id,
      status: s.status,
      startTime: s.startTime,
      endTime: s.endTime,
      createdAt: s.createdAt,
      academicClass: {
        id: s.academicClass.id,
        name: s.academicClass.name,
        semester: s.academicClass.semester,
        section: s.academicClass.section,
      },
      subject: s.subject,
      totalStudents,
      presentCount,
      attendancePercentage,
    };
  });

  return {
    sessions: mappedSessions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

// ==========================================
// 5. GET SPECIFIC SESSION
// ==========================================

export const getTeacherSessionById = async (userId: string, sessionId: string) => {
  const profile = await getTeacherProfileByUserId(userId);

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, teacherId: profile.id },
    include: {
      academicClass: { select: { id: true, name: true, semester: true, section: true } },
      subject: { select: { id: true, name: true, code: true } },
      attendanceRecords: {
        select: {
          id: true,
          status: true,
          markedAt: true,
          verificationMethod: true,
          student: {
            select: {
              id: true,
              registrationNumber: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { markedAt: "asc" },
      },
      _count: { select: { attendanceRecords: true, qrTokens: true, securityLogs: true } },
    },
  });

  if (!session) {
    throw { statusCode: 404, message: "Attendance session not found or access denied." };
  }

  return session;
};

// ==========================================
// 6. CLOSE SESSION
// ==========================================

export const closeAttendanceSession = async (userId: string, sessionId: string) => {
  const profile = await getTeacherProfileByUserId(userId);

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, teacherId: profile.id },
  });

  if (!session) {
    throw { statusCode: 404, message: "Attendance session not found or access denied." };
  }

  if (session.status !== SessionStatus.ACTIVE) {
    throw {
      statusCode: 409,
      message: `Cannot close session with status '${session.status}'. Only ACTIVE sessions can be closed.`,
    };
  }

  return await prisma.$transaction(async (tx) => {
    const updatedSession = await tx.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.CLOSED,
        endTime: new Date(),
      },
      include: {
        academicClass: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    await tx.qrToken.updateMany({
      where: { sessionId, isRevoked: false },
      data: { isRevoked: true },
    });

    return updatedSession;
  });
};

// ==========================================
// 7. CANCEL SESSION
// ==========================================

export const cancelAttendanceSession = async (userId: string, sessionId: string) => {
  const profile = await getTeacherProfileByUserId(userId);

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, teacherId: profile.id },
  });

  if (!session) {
    throw { statusCode: 404, message: "Attendance session not found or access denied." };
  }

  if (session.status !== SessionStatus.ACTIVE) {
    throw {
      statusCode: 409,
      message: `Cannot cancel session with status '${session.status}'. Only ACTIVE sessions can be cancelled.`,
    };
  }

  const recordCount = await prisma.attendanceRecord.count({
    where: { sessionId },
  });

  if (recordCount > 0) {
    throw {
      statusCode: 409,
      message: `Cannot cancel session with ${recordCount} recorded student attendance(s). Please close the session instead.`,
    };
  }

  return await prisma.$transaction(async (tx) => {
    const updatedSession = await tx.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.CANCELLED,
        endTime: new Date(),
      },
      include: {
        academicClass: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    await tx.qrToken.updateMany({
      where: { sessionId, isRevoked: false },
      data: { isRevoked: true },
    });

    return updatedSession;
  });
};

// ==========================================
// 8. MARK TEACHER MANUAL ATTENDANCE
// ==========================================

export const markManualAttendance = async (
  userId: string,
  sessionId: string,
  data: { studentId: string; reason: string }
) => {
  const teacherProfile = await getTeacherProfileByUserId(userId);

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId },
    select: { id: true, teacherId: true, classId: true, status: true },
  });

  if (!session) {
    throw { statusCode: 404, message: "Attendance session not found." };
  }

  if (session.teacherId !== teacherProfile.id) {
    throw { statusCode: 403, message: "Access denied. You do not own this attendance session." };
  }

  if (session.status !== SessionStatus.ACTIVE) {
    throw {
      statusCode: 409,
      message: `Cannot mark manual attendance on session with status '${session.status}'. Only ACTIVE sessions permit manual fallback.`,
    };
  }

  const student = await prisma.studentProfile.findFirst({
    where: { id: data.studentId },
    select: {
      id: true,
      classId: true,
      user: { select: { id: true, name: true, isActive: true } },
    },
  });

  if (!student) {
    throw { statusCode: 404, message: "Student profile not found." };
  }

  if (!student.user.isActive) {
    throw { statusCode: 400, message: "Student account is inactive." };
  }

  if (student.classId !== session.classId) {
    throw { statusCode: 400, message: "Student does not belong to the academic class of this attendance session." };
  }

  const existingRecord = await prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId, studentId: student.id } },
  });

  if (existingRecord) {
    throw { statusCode: 409, message: "Student attendance has already been recorded for this session." };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const txSession = await tx.attendanceSession.findUnique({
        where: { id: sessionId },
        select: { status: true, teacherId: true },
      });

      if (!txSession || txSession.teacherId !== teacherProfile.id || txSession.status !== SessionStatus.ACTIVE) {
        throw { statusCode: 409, message: "Session status changed or ownership mismatch during processing." };
      }

      const attendanceRecord = await tx.attendanceRecord.create({
        data: {
          sessionId,
          studentId: student.id,
          status: AttendanceStatus.PRESENT,
          markedAt: new Date(),
          verificationMethod: "TEACHER_MANUAL",
        },
        select: {
          id: true,
          status: true,
          markedAt: true,
          verificationMethod: true,
          student: {
            select: {
              id: true,
              registrationNumber: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      const audit = await tx.attendanceManualAudit.create({
        data: {
          attendanceId: attendanceRecord.id,
          sessionId,
          teacherId: teacherProfile.id,
          studentId: student.id,
          reason: data.reason,
          createdAt: new Date(),
        },
        select: {
          id: true,
          reason: true,
          createdAt: true,
        },
      });

      return {
        ...attendanceRecord,
        audit,
      };
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw { statusCode: 409, message: "Student attendance has already been recorded for this session." };
    }
    throw err;
  }
};

// ==========================================
// 9. GET SESSION STUDENT ROSTER
// ==========================================

export const getSessionStudentRoster = async (
  userId: string,
  sessionId: string,
  filters: { search?: string }
) => {
  const teacherProfile = await getTeacherProfileByUserId(userId);

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId },
    select: { id: true, teacherId: true, classId: true },
  });

  if (!session) {
    throw { statusCode: 404, message: "Attendance session not found." };
  }

  if (session.teacherId !== teacherProfile.id) {
    throw { statusCode: 403, message: "Access denied. You do not own this attendance session." };
  }

  const whereStudent: any = { classId: session.classId };
  if (filters.search) {
    whereStudent.OR = [
      { registrationNumber: { contains: filters.search } },
      { user: { name: { contains: filters.search } } },
    ];
  }

  const students = await prisma.studentProfile.findMany({
    where: whereStudent,
    orderBy: { registrationNumber: "asc" },
    select: {
      id: true,
      registrationNumber: true,
      user: { select: { id: true, name: true, isActive: true } },
      attendanceRecords: {
        where: { sessionId },
        select: {
          id: true,
          status: true,
          markedAt: true,
          verificationMethod: true,
        },
      },
    },
  });

  return students.map((s) => {
    const record = s.attendanceRecords[0] || null;
    return {
      studentId: s.id,
      registrationNumber: s.registrationNumber,
      name: s.user.name,
      isActive: s.user.isActive,
      isMarked: !!record,
      attendance: record
        ? {
            id: record.id,
            status: record.status,
            markedAt: record.markedAt,
            verificationMethod: record.verificationMethod,
          }
        : null,
    };
  });
};

// ==========================================
// 10. STEP 15: TEACHER DETAILED SESSION REPORT
// ==========================================

export const getTeacherSessionReport = async (userId: string, sessionId: string) => {
  const profile = await getTeacherProfileByUserId(userId);

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, teacherId: profile.id },
    include: {
      academicClass: {
        select: {
          id: true,
          name: true,
          semester: true,
          section: true,
          students: {
            select: {
              id: true,
              registrationNumber: true,
              user: { select: { name: true } },
            },
            orderBy: { registrationNumber: "asc" },
          },
        },
      },
      subject: { select: { id: true, name: true, code: true } },
      attendanceRecords: {
        select: {
          id: true,
          studentId: true,
          status: true,
          markedAt: true,
          verificationMethod: true,
        },
      },
    },
  });

  if (!session) {
    throw { statusCode: 404, message: "Attendance session not found or access denied." };
  }

  const recordMap = new Map<string, typeof session.attendanceRecords[0]>();
  let qrVerifiedCount = 0;
  let manualCount = 0;

  for (const rec of session.attendanceRecords) {
    recordMap.set(rec.studentId, rec);
    if (rec.verificationMethod === "TEACHER_MANUAL") {
      manualCount++;
    } else {
      qrVerifiedCount++;
    }
  }

  const totalStudents = session.academicClass.students.length;
  const presentCount = session.attendanceRecords.length;

  let absentCount = 0;
  let unmarkedCount = 0;
  let attendancePercentage = 0;

  if (session.status === SessionStatus.ACTIVE) {
    unmarkedCount = Math.max(0, totalStudents - presentCount);
    absentCount = 0;
    attendancePercentage = totalStudents > 0 ? roundPercent((presentCount / totalStudents) * 100) : 0;
  } else if (session.status === SessionStatus.CLOSED) {
    absentCount = Math.max(0, totalStudents - presentCount);
    unmarkedCount = 0;
    attendancePercentage = totalStudents > 0 ? roundPercent((presentCount / totalStudents) * 100) : 0;
  } else if (session.status === SessionStatus.CANCELLED) {
    absentCount = 0;
    unmarkedCount = 0;
    attendancePercentage = 0;
  }

  const studentRows = session.academicClass.students.map((st) => {
    const rec = recordMap.get(st.id);
    let attendanceStatus: string;

    if (rec) {
      attendanceStatus = rec.status;
    } else if (session.status === SessionStatus.ACTIVE) {
      attendanceStatus = "UNMARKED";
    } else if (session.status === SessionStatus.CLOSED) {
      attendanceStatus = "ABSENT";
    } else {
      attendanceStatus = "CANCELLED";
    }

    return {
      studentId: st.id,
      registrationNumber: st.registrationNumber,
      name: st.user.name,
      attendanceStatus,
      markedAt: rec ? rec.markedAt : null,
      verificationMethod: rec ? rec.verificationMethod : null,
    };
  });

  return {
    session: {
      id: session.id,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
    },
    subject: session.subject,
    academicClass: {
      id: session.academicClass.id,
      name: session.academicClass.name,
      semester: session.academicClass.semester,
      section: session.academicClass.section,
    },
    statistics: {
      totalStudents,
      presentCount,
      absentCount,
      unmarkedCount,
      qrVerifiedCount,
      manualCount,
      attendancePercentage,
    },
    studentRows,
  };
};

// ==========================================
// 11. STEP 15: TEACHER AGGREGATE SUMMARY
// ==========================================

export const getTeacherAggregateSummary = async (userId: string) => {
  const profile = await getTeacherProfileByUserId(userId);

  // Fetch CLOSED sessions belonging to teacher
  const sessions = await prisma.attendanceSession.findMany({
    where: { teacherId: profile.id, status: SessionStatus.CLOSED },
    include: {
      academicClass: {
        select: {
          id: true,
          name: true,
          semester: true,
          section: true,
          _count: { select: { students: true } },
        },
      },
      subject: { select: { id: true, name: true, code: true } },
      _count: { select: { attendanceRecords: true } },
    },
  });

  // Group by (classId, subjectId)
  const groupMap = new Map<string, {
    academicClass: { id: string; name: string; semester: number; section: string };
    subject: { id: string; name: string; code: string };
    completedSessions: number;
    totalPossibleAttendances: number;
    totalRecordedAttendances: number;
  }>();

  for (const s of sessions) {
    const key = `${s.classId}_${s.subjectId}`;
    const totalEnrolled = s.academicClass._count.students;
    const present = s._count.attendanceRecords;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        academicClass: {
          id: s.academicClass.id,
          name: s.academicClass.name,
          semester: s.academicClass.semester,
          section: s.academicClass.section,
        },
        subject: s.subject,
        completedSessions: 0,
        totalPossibleAttendances: 0,
        totalRecordedAttendances: 0,
      });
    }

    const item = groupMap.get(key)!;
    item.completedSessions += 1;
    item.totalPossibleAttendances += totalEnrolled;
    item.totalRecordedAttendances += present;
  }

  return Array.from(groupMap.values()).map((g) => ({
    academicClass: g.academicClass,
    subject: g.subject,
    completedSessions: g.completedSessions,
    totalPossibleAttendances: g.totalPossibleAttendances,
    totalRecordedAttendances: g.totalRecordedAttendances,
    averageAttendancePercentage: g.totalPossibleAttendances > 0
      ? roundPercent((g.totalRecordedAttendances / g.totalPossibleAttendances) * 100)
      : 0,
  }));
};
