export type Role = "ADMIN" | "TEACHER" | "STUDENT";
export type SessionStatus = "ACTIVE" | "CLOSED" | "CANCELLED";
export type VerificationMethod = "DYNAMIC_QR_GEOFENCE" | "TEACHER_MANUAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt?: string;
  teacherProfile?: {
    id: string;
    employeeId: string;
    departmentId: string;
  } | null;
  studentProfile?: {
    id: string;
    registrationNumber: string;
    departmentId: string;
    classId: string;
  } | null;
}

export interface ApiResponse<T = any> {
  status: "success" | "fail" | "error";
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminOverview {
  totalStudents: number;
  totalTeachers: number;
  totalSessions: number;
  activeSessions: number;
  closedSessions: number;
  cancelledSessions: number;
  institutionAverageAttendancePercentage: number;
}

export interface TeacherAssignment {
  id: string;
  createdAt: string;
  subject: {
    id: string;
    name: string;
    code: string;
    semester: number;
  };
  academicClass: {
    id: string;
    name: string;
    semester: number;
    section: string;
    batchYear?: number;
  };
  teacher: {
    department: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export interface TeacherSessionSummary {
  id: string;
  status: SessionStatus;
  startTime: string;
  endTime?: string | null;
  createdAt: string;
  academicClass: {
    id: string;
    name: string;
    semester: number;
    section: string;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  totalStudents: number;
  presentCount: number;
  attendancePercentage: number;
}

export interface TeacherAggregateSummaryItem {
  academicClass: {
    id: string;
    name: string;
    semester: number;
    section: string;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  completedSessions: number;
  totalPossibleAttendances: number;
  totalRecordedAttendances: number;
  averageAttendancePercentage: number;
}

export interface StudentAttendanceSummary {
  overall: {
    totalCompletedSessions: number;
    totalAttended: number;
    totalAbsent: number;
    overallAttendancePercentage: number;
  };
  subjectWise: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    totalClosedSessions: number;
    attendedClosedSessions: number;
    absentClosedSessions: number;
    attendancePercentage: number;
  }>;
}
