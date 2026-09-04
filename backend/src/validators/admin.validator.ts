import { z } from "zod";
import { SessionStatus } from "@prisma/client";

// Departments
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Department name must be at least 2 characters"),
  code: z.string().trim().min(2, "Department code must be at least 2 characters").toUpperCase(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// Academic Classes
export const createClassSchema = z.object({
  name: z.string().trim().min(2, "Class name must be at least 2 characters"),
  departmentId: z.string().uuid("Invalid department ID"),
  semester: z.number().int().min(1).max(12),
  section: z.string().trim().min(1).max(10).toUpperCase(),
  batchYear: z.number().int().min(2000).max(2100).optional(),
});

export const updateClassSchema = createClassSchema.partial();

// Subjects
export const createSubjectSchema = z.object({
  name: z.string().trim().min(2, "Subject name must be at least 2 characters"),
  code: z.string().trim().min(2, "Subject code must be at least 2 characters").toUpperCase(),
  departmentId: z.string().uuid("Invalid department ID"),
  semester: z.number().int().min(1).max(12),
});

export const updateSubjectSchema = createSubjectSchema.partial();

// Teachers
export const createTeacherSchema = z.object({
  name: z.string().trim().min(2, "Teacher name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  employeeId: z.string().trim().min(2, "Employee ID must be at least 2 characters"),
  departmentId: z.string().uuid("Invalid department ID"),
});

export const updateTeacherSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().email().optional(),
  employeeId: z.string().trim().min(2).optional(),
  departmentId: z.string().uuid().optional(),
});

// Students
export const createStudentSchema = z.object({
  name: z.string().trim().min(2, "Student name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  registrationNumber: z.string().trim().min(2, "Registration number must be at least 2 characters"),
  departmentId: z.string().uuid("Invalid department ID"),
  classId: z.string().uuid("Invalid class ID"),
});

export const updateStudentSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().email().optional(),
  registrationNumber: z.string().trim().min(2).optional(),
  departmentId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
});

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

// Teacher Class Subject Assignments
export const createAssignmentSchema = z.object({
  teacherId: z.string().uuid("Invalid teacher ID"),
  classId: z.string().uuid("Invalid class ID"),
  subjectId: z.string().uuid("Invalid subject ID"),
});

// Step 15 Admin Reporting
export const getAdminSessionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    teacherId: z.string().uuid("Invalid teacher ID").optional(),
    departmentId: z.string().uuid("Invalid department ID").optional(),
    classId: z.string().uuid("Invalid class ID").optional(),
    subjectId: z.string().uuid("Invalid subject ID").optional(),
    status: z.nativeEnum(SessionStatus).optional(),
    dateFrom: z.string().datetime("Invalid dateFrom ISO format").optional(),
    dateTo: z.string().datetime("Invalid dateTo ISO format").optional(),
  })
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: "dateFrom must be less than or equal to dateTo",
      path: ["dateFrom"],
    }
  );
