import bcrypt from "bcrypt";
import { SessionStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";

// Helper for Prisma unique constraint error mapping
const handlePrismaError = (error: any) => {
  if (error.code === "P2002") {
    const fields = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(", ") : error.meta.target) : "field";
    throw { statusCode: 409, message: `Unique constraint failed on ${fields}` };
  }
  if (error.code === "P2003" || error.code === "P2014") {
    throw { statusCode: 409, message: "Cannot complete operation because related records depend on this item." };
  }
  throw error;
};

const roundPercent = (num: number): number => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

// ==========================================
// 1. DEPARTMENT MANAGEMENT
// ==========================================

export const createDepartment = async (data: { name: string; code: string }) => {
  try {
    return await prisma.department.create({ data });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const getDepartments = async () => {
  return await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { students: true, teachers: true, classes: true, subjects: true },
      },
    },
  });
};

export const getDepartmentById = async (id: string) => {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      classes: true,
      subjects: true,
      _count: { select: { students: true, teachers: true } },
    },
  });
  if (!department) throw { statusCode: 404, message: "Department not found" };
  return department;
};

export const updateDepartment = async (id: string, data: { name?: string; code?: string }) => {
  await getDepartmentById(id);
  try {
    return await prisma.department.update({
      where: { id },
      data,
    });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const deleteDepartment = async (id: string) => {
  await getDepartmentById(id);
  try {
    return await prisma.department.delete({ where: { id } });
  } catch (err) {
    handlePrismaError(err);
  }
};

// ==========================================
// 2. ACADEMIC CLASS MANAGEMENT
// ==========================================

export const createClass = async (data: {
  name: string;
  departmentId: string;
  semester: number;
  section: string;
  batchYear?: number;
}) => {
  const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!dept) throw { statusCode: 400, message: "Referenced department does not exist" };

  try {
    return await prisma.academicClass.create({ data });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const getClasses = async (filters: { departmentId?: string; semester?: number; batchYear?: number }) => {
  const where: any = {};
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.semester) where.semester = filters.semester;
  if (filters.batchYear) where.batchYear = filters.batchYear;

  return await prisma.academicClass.findMany({
    where,
    orderBy: [{ semester: "asc" }, { section: "asc" }],
    include: {
      department: { select: { id: true, name: true, code: true } },
      _count: { select: { students: true, teacherAssignments: true, sessions: true } },
    },
  });
};

export const getClassById = async (id: string) => {
  const academicClass = await prisma.academicClass.findUnique({
    where: { id },
    include: {
      department: true,
      _count: { select: { students: true, teacherAssignments: true, sessions: true } },
    },
  });
  if (!academicClass) throw { statusCode: 404, message: "Academic class not found" };
  return academicClass;
};

export const updateClass = async (
  id: string,
  data: { name?: string; departmentId?: string; semester?: number; section?: string; batchYear?: number }
) => {
  const existingClass = await getClassById(id);

  const targetDeptId = data.departmentId ?? existingClass.departmentId;
  const targetSemester = data.semester ?? existingClass.semester;

  if (data.departmentId && data.departmentId !== existingClass.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) throw { statusCode: 400, message: "Referenced department does not exist" };

    const enrolledStudents = await prisma.studentProfile.count({ where: { classId: id } });
    if (enrolledStudents > 0) {
      throw {
        statusCode: 409,
        message: "Cannot change class department while students are enrolled in this class.",
      };
    }
  }

  if (targetDeptId !== existingClass.departmentId || targetSemester !== existingClass.semester) {
    const activeAssignments = await prisma.teacherClassSubject.count({ where: { classId: id } });
    if (activeAssignments > 0) {
      throw {
        statusCode: 409,
        message: "Cannot change class department or semester while active teacher assignments exist for this class.",
      };
    }
  }

  try {
    return await prisma.academicClass.update({
      where: { id },
      data,
    });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const deleteClass = async (id: string) => {
  await getClassById(id);
  try {
    return await prisma.academicClass.delete({ where: { id } });
  } catch (err) {
    handlePrismaError(err);
  }
};

// ==========================================
// 3. SUBJECT MANAGEMENT
// ==========================================

export const createSubject = async (data: {
  name: string;
  code: string;
  departmentId: string;
  semester: number;
}) => {
  const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!dept) throw { statusCode: 400, message: "Referenced department does not exist" };

  try {
    return await prisma.subject.create({ data });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const getSubjects = async (filters: { departmentId?: string; semester?: number; search?: string }) => {
  const where: any = {};
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.semester) where.semester = filters.semester;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { code: { contains: filters.search } },
    ];
  }

  return await prisma.subject.findMany({
    where,
    orderBy: [{ semester: "asc" }, { code: "asc" }],
    include: {
      department: { select: { id: true, name: true, code: true } },
      _count: { select: { teacherAssignments: true, sessions: true } },
    },
  });
};

export const getSubjectById = async (id: string) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      department: true,
      _count: { select: { teacherAssignments: true, sessions: true } },
    },
  });
  if (!subject) throw { statusCode: 404, message: "Subject not found" };
  return subject;
};

export const updateSubject = async (
  id: string,
  data: { name?: string; code?: string; departmentId?: string; semester?: number }
) => {
  const existingSubject = await getSubjectById(id);

  if (
    (data.departmentId && data.departmentId !== existingSubject.departmentId) ||
    (data.semester && data.semester !== existingSubject.semester)
  ) {
    const activeAssignments = await prisma.teacherClassSubject.count({ where: { subjectId: id } });
    if (activeAssignments > 0) {
      throw {
        statusCode: 409,
        message: "Cannot change subject department or semester while active teacher assignments exist for this subject.",
      };
    }
  }

  try {
    return await prisma.subject.update({
      where: { id },
      data,
    });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const deleteSubject = async (id: string) => {
  await getSubjectById(id);
  try {
    return await prisma.subject.delete({ where: { id } });
  } catch (err) {
    handlePrismaError(err);
  }
};

// ==========================================
// 4. TEACHER ACCOUNT MANAGEMENT
// ==========================================

export const createTeacher = async (data: {
  name: string;
  email: string;
  password: string;
  employeeId: string;
  departmentId: string;
}) => {
  const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!dept) throw { statusCode: 400, message: "Referenced department does not exist" };

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
  const passwordHash = await bcrypt.hash(data.password, saltRounds);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: "TEACHER",
          isActive: true,
        },
      });

      const profile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          employeeId: data.employeeId,
          departmentId: data.departmentId,
        },
        include: {
          department: { select: { id: true, name: true, code: true } },
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        teacherProfile: profile,
      };
    });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const getTeachers = async (filters: { departmentId?: string; isActive?: boolean; search?: string }) => {
  const where: any = { role: "TEACHER" };
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.departmentId) where.teacherProfile = { departmentId: filters.departmentId };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { email: { contains: filters.search } },
      { teacherProfile: { employeeId: { contains: filters.search } } },
    ];
  }

  return await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      teacherProfile: {
        select: {
          id: true,
          employeeId: true,
          department: { select: { id: true, name: true, code: true } },
          _count: { select: { assignments: true, attendanceSessions: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const getTeacherById = async (id: string) => {
  const teacher = await prisma.user.findFirst({
    where: { id, role: "TEACHER" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      teacherProfile: {
        include: {
          department: true,
          assignments: {
            include: {
              academicClass: true,
              subject: true,
            },
          },
        },
      },
    },
  });

  if (!teacher) throw { statusCode: 404, message: "Teacher account not found" };
  return teacher;
};

export const updateTeacher = async (
  id: string,
  data: { name?: string; email?: string; employeeId?: string; departmentId?: string }
) => {
  const teacher = await getTeacherById(id);
  const profileId = teacher.teacherProfile?.id;
  if (!profileId) throw { statusCode: 404, message: "Teacher profile missing" };

  if (data.departmentId && data.departmentId !== teacher.teacherProfile?.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) throw { statusCode: 400, message: "Referenced department does not exist" };

    const activeAssignments = await prisma.teacherClassSubject.count({ where: { teacherId: profileId } });
    if (activeAssignments > 0) {
      throw {
        statusCode: 409,
        message: "Cannot change teacher department while active class/subject assignments exist for this teacher.",
      };
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (data.name || data.email) {
        await tx.user.update({
          where: { id },
          data: {
            name: data.name,
            email: data.email,
          },
        });
      }

      if (data.employeeId || data.departmentId) {
        await tx.teacherProfile.update({
          where: { id: profileId },
          data: {
            employeeId: data.employeeId,
            departmentId: data.departmentId,
          },
        });
      }

      return await getTeacherById(id);
    });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const updateTeacherStatus = async (id: string, isActive: boolean) => {
  await getTeacherById(id);
  return await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
};

// ==========================================
// 5. STUDENT ACCOUNT MANAGEMENT
// ==========================================

export const createStudent = async (data: {
  name: string;
  email: string;
  password: string;
  registrationNumber: string;
  departmentId: string;
  classId: string;
}) => {
  const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!dept) throw { statusCode: 400, message: "Referenced department does not exist" };

  const academicClass = await prisma.academicClass.findUnique({ where: { id: data.classId } });
  if (!academicClass) throw { statusCode: 400, message: "Referenced class does not exist" };

  if (academicClass.departmentId !== data.departmentId) {
    throw { statusCode: 400, message: "Selected class does not belong to the specified department" };
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
  const passwordHash = await bcrypt.hash(data.password, saltRounds);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: "STUDENT",
          isActive: true,
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          registrationNumber: data.registrationNumber,
          departmentId: data.departmentId,
          classId: data.classId,
        },
        include: {
          department: { select: { id: true, name: true, code: true } },
          academicClass: { select: { id: true, name: true, semester: true, section: true } },
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        studentProfile: profile,
      };
    });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const getStudents = async (filters: {
  departmentId?: string;
  classId?: string;
  isActive?: boolean;
  search?: string;
}) => {
  const where: any = { role: "STUDENT" };
  if (filters.isActive !== undefined) where.isActive = filters.isActive;

  const profileWhere: any = {};
  if (filters.departmentId) profileWhere.departmentId = filters.departmentId;
  if (filters.classId) profileWhere.classId = filters.classId;
  if (Object.keys(profileWhere).length > 0) where.studentProfile = profileWhere;

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { email: { contains: filters.search } },
      { studentProfile: { registrationNumber: { contains: filters.search } } },
    ];
  }

  return await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      studentProfile: {
        select: {
          id: true,
          registrationNumber: true,
          department: { select: { id: true, name: true, code: true } },
          academicClass: { select: { id: true, name: true, semester: true, section: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const getStudentById = async (id: string) => {
  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      studentProfile: {
        include: {
          department: true,
          academicClass: true,
          _count: { select: { attendanceRecords: true, securityLogs: true } },
        },
      },
    },
  });

  if (!student) throw { statusCode: 404, message: "Student account not found" };
  return student;
};

export const updateStudent = async (
  id: string,
  data: { name?: string; email?: string; registrationNumber?: string; departmentId?: string; classId?: string }
) => {
  const student = await getStudentById(id);
  const profileId = student.studentProfile?.id;
  if (!profileId) throw { statusCode: 404, message: "Student profile missing" };

  const targetDeptId = data.departmentId ?? student.studentProfile?.departmentId;
  const targetClassId = data.classId ?? student.studentProfile?.classId;

  if (!targetDeptId || !targetClassId) {
    throw { statusCode: 400, message: "Both department and class must be assigned" };
  }

  const targetClass = await prisma.academicClass.findUnique({ where: { id: targetClassId } });
  if (!targetClass) throw { statusCode: 400, message: "Referenced class does not exist" };

  if (targetClass.departmentId !== targetDeptId) {
    throw { statusCode: 400, message: "Updated class does not belong to the selected department" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (data.name || data.email) {
        await tx.user.update({
          where: { id },
          data: {
            name: data.name,
            email: data.email,
          },
        });
      }

      if (data.registrationNumber || data.departmentId || data.classId) {
        await tx.studentProfile.update({
          where: { id: profileId },
          data: {
            registrationNumber: data.registrationNumber,
            departmentId: data.departmentId,
            classId: data.classId,
          },
        });
      }

      return await getStudentById(id);
    });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const updateStudentStatus = async (id: string, isActive: boolean) => {
  await getStudentById(id);
  return await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
};

// ==========================================
// 6. TEACHER → CLASS → SUBJECT ASSIGNMENTS
// ==========================================

export const createAssignment = async (data: {
  teacherId: string;
  classId: string;
  subjectId: string;
}) => {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { id: data.teacherId },
    include: { user: true },
  });

  if (!teacherProfile || teacherProfile.user.role !== "TEACHER") {
    throw { statusCode: 400, message: "Teacher profile not found" };
  }

  if (!teacherProfile.user.isActive) {
    throw { statusCode: 400, message: "Teacher account is inactive" };
  }

  const academicClass = await prisma.academicClass.findUnique({ where: { id: data.classId } });
  if (!academicClass) throw { statusCode: 400, message: "Academic class not found" };

  const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
  if (!subject) throw { statusCode: 400, message: "Subject not found" };

  if (teacherProfile.departmentId !== academicClass.departmentId) {
    throw { statusCode: 400, message: "Teacher department does not match class department" };
  }

  if (academicClass.departmentId !== subject.departmentId) {
    throw { statusCode: 400, message: "Class department does not match subject department" };
  }

  if (academicClass.semester !== subject.semester) {
    throw { statusCode: 400, message: `Class semester (${academicClass.semester}) does not match subject semester (${subject.semester})` };
  }

  try {
    return await prisma.teacherClassSubject.create({
      data,
      include: {
        teacher: { include: { user: { select: { id: true, name: true, email: true } }, department: true } },
        academicClass: true,
        subject: true,
      },
    });
  } catch (err) {
    handlePrismaError(err);
  }
};

export const getAssignments = async (filters: {
  teacherId?: string;
  classId?: string;
  subjectId?: string;
}) => {
  const where: any = {};
  if (filters.teacherId) where.teacherId = filters.teacherId;
  if (filters.classId) where.classId = filters.classId;
  if (filters.subjectId) where.subjectId = filters.subjectId;

  return await prisma.teacherClassSubject.findMany({
    where,
    include: {
      teacher: {
        select: {
          id: true,
          employeeId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      academicClass: { select: { id: true, name: true, semester: true, section: true } },
      subject: { select: { id: true, name: true, code: true, semester: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const deleteAssignment = async (id: string) => {
  const assignment = await prisma.teacherClassSubject.findUnique({ where: { id } });
  if (!assignment) throw { statusCode: 404, message: "Assignment not found" };

  try {
    return await prisma.teacherClassSubject.delete({ where: { id } });
  } catch (err) {
    handlePrismaError(err);
  }
};

// ==========================================
// 7. STEP 15: ADMIN ATTENDANCE OVERVIEW
// ==========================================

export const getAdminAttendanceOverview = async () => {
  const [
    totalStudents,
    totalTeachers,
    totalSessions,
    activeSessions,
    closedSessionsCount,
    cancelledSessions,
    closedSessionsData,
  ] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.teacherProfile.count(),
    prisma.attendanceSession.count(),
    prisma.attendanceSession.count({ where: { status: SessionStatus.ACTIVE } }),
    prisma.attendanceSession.count({ where: { status: SessionStatus.CLOSED } }),
    prisma.attendanceSession.count({ where: { status: SessionStatus.CANCELLED } }),
    prisma.attendanceSession.findMany({
      where: { status: SessionStatus.CLOSED },
      select: {
        academicClass: { select: { _count: { select: { students: true } } } },
        _count: { select: { attendanceRecords: true } },
      },
    }),
  ]);

  let totalPossibleAttendance = 0;
  let totalRecordedAttendance = 0;

  for (const s of closedSessionsData) {
    totalPossibleAttendance += s.academicClass._count.students;
    totalRecordedAttendance += s._count.attendanceRecords;
  }

  const institutionAverageAttendancePercentage = totalPossibleAttendance > 0
    ? roundPercent((totalRecordedAttendance / totalPossibleAttendance) * 100)
    : 0;

  return {
    totalStudents,
    totalTeachers,
    totalSessions,
    activeSessions,
    closedSessions: closedSessionsCount,
    cancelledSessions,
    institutionAverageAttendancePercentage,
  };
};

// ==========================================
// 8. STEP 15: ADMIN INSTITUTION-WIDE SESSIONS
// ==========================================

export const getAdminAttendanceSessions = async (filters: {
  page?: number;
  limit?: number;
  teacherId?: string;
  departmentId?: string;
  classId?: string;
  subjectId?: string;
  status?: SessionStatus;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 10));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.teacherId) where.teacherId = filters.teacherId;
  if (filters.classId) where.classId = filters.classId;
  if (filters.subjectId) where.subjectId = filters.subjectId;
  if (filters.status) where.status = filters.status;
  if (filters.departmentId) where.academicClass = { departmentId: filters.departmentId };

  if (filters.dateFrom || filters.dateTo) {
    where.startTime = {};
    if (filters.dateFrom) where.startTime.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.startTime.lte = new Date(filters.dateTo);
  }

  const [sessions, total] = await Promise.all([
    prisma.attendanceSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        teacher: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        academicClass: {
          select: {
            id: true,
            name: true,
            semester: true,
            section: true,
            department: { select: { id: true, name: true, code: true } },
            _count: { select: { students: true } },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { attendanceRecords: true } },
      },
    }),
    prisma.attendanceSession.count({ where }),
  ]);

  const mappedSessions = sessions.map((s) => {
    const totalStudents = s.academicClass._count.students;
    const presentCount = s._count.attendanceRecords;
    let attendancePercentage = 0;

    if (s.status === SessionStatus.CLOSED || s.status === SessionStatus.ACTIVE) {
      attendancePercentage = totalStudents > 0 ? roundPercent((presentCount / totalStudents) * 100) : 0;
    }

    return {
      id: s.id,
      status: s.status,
      startTime: s.startTime,
      endTime: s.endTime,
      createdAt: s.createdAt,
      teacher: {
        id: s.teacher.id,
        employeeId: s.teacher.employeeId,
        name: s.teacher.user.name,
        email: s.teacher.user.email,
      },
      academicClass: {
        id: s.academicClass.id,
        name: s.academicClass.name,
        semester: s.academicClass.semester,
        section: s.academicClass.section,
        department: s.academicClass.department,
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
