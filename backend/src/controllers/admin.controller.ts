import { Request, Response } from "express";
import { SessionStatus } from "@prisma/client";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import * as adminService from "../services/admin.service.js";

// Helper to safely extract route param string
const getParamId = (req: Request, paramName: string = "id"): string => {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
};

// ==========================================
// DEPARTMENTS
// ==========================================

export const createDepartment = asyncWrapper(async (req: Request, res: Response) => {
  const department = await adminService.createDepartment(req.body);
  res.status(201).json({ status: "success", data: department });
});

export const getDepartments = asyncWrapper(async (_req: Request, res: Response) => {
  const departments = await adminService.getDepartments();
  res.status(200).json({ status: "success", data: departments });
});

export const getDepartmentById = asyncWrapper(async (req: Request, res: Response) => {
  const department = await adminService.getDepartmentById(getParamId(req));
  res.status(200).json({ status: "success", data: department });
});

export const updateDepartment = asyncWrapper(async (req: Request, res: Response) => {
  const department = await adminService.updateDepartment(getParamId(req), req.body);
  res.status(200).json({ status: "success", data: department });
});

export const deleteDepartment = asyncWrapper(async (req: Request, res: Response) => {
  await adminService.deleteDepartment(getParamId(req));
  res.status(200).json({ status: "success", message: "Department deleted successfully" });
});

// ==========================================
// CLASSES
// ==========================================

export const createClass = asyncWrapper(async (req: Request, res: Response) => {
  const academicClass = await adminService.createClass(req.body);
  res.status(201).json({ status: "success", data: academicClass });
});

export const getClasses = asyncWrapper(async (req: Request, res: Response) => {
  const filters = {
    departmentId: req.query.departmentId as string | undefined,
    semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
    batchYear: req.query.batchYear ? parseInt(req.query.batchYear as string, 10) : undefined,
  };
  const classes = await adminService.getClasses(filters);
  res.status(200).json({ status: "success", data: classes });
});

export const getClassById = asyncWrapper(async (req: Request, res: Response) => {
  const academicClass = await adminService.getClassById(getParamId(req));
  res.status(200).json({ status: "success", data: academicClass });
});

export const updateClass = asyncWrapper(async (req: Request, res: Response) => {
  const academicClass = await adminService.updateClass(getParamId(req), req.body);
  res.status(200).json({ status: "success", data: academicClass });
});

export const deleteClass = asyncWrapper(async (req: Request, res: Response) => {
  await adminService.deleteClass(getParamId(req));
  res.status(200).json({ status: "success", message: "Academic class deleted successfully" });
});

// ==========================================
// SUBJECTS
// ==========================================

export const createSubject = asyncWrapper(async (req: Request, res: Response) => {
  const subject = await adminService.createSubject(req.body);
  res.status(201).json({ status: "success", data: subject });
});

export const getSubjects = asyncWrapper(async (req: Request, res: Response) => {
  const filters = {
    departmentId: req.query.departmentId as string | undefined,
    semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
    search: req.query.search as string | undefined,
  };
  const subjects = await adminService.getSubjects(filters);
  res.status(200).json({ status: "success", data: subjects });
});

export const getSubjectById = asyncWrapper(async (req: Request, res: Response) => {
  const subject = await adminService.getSubjectById(getParamId(req));
  res.status(200).json({ status: "success", data: subject });
});

export const updateSubject = asyncWrapper(async (req: Request, res: Response) => {
  const subject = await adminService.updateSubject(getParamId(req), req.body);
  res.status(200).json({ status: "success", data: subject });
});

export const deleteSubject = asyncWrapper(async (req: Request, res: Response) => {
  await adminService.deleteSubject(getParamId(req));
  res.status(200).json({ status: "success", message: "Subject deleted successfully" });
});

// ==========================================
// TEACHERS
// ==========================================

export const createTeacher = asyncWrapper(async (req: Request, res: Response) => {
  const teacher = await adminService.createTeacher(req.body);
  res.status(201).json({ status: "success", data: teacher });
});

export const getTeachers = asyncWrapper(async (req: Request, res: Response) => {
  const filters = {
    departmentId: req.query.departmentId as string | undefined,
    isActive: req.query.isActive !== undefined ? req.query.isActive === "true" : undefined,
    search: req.query.search as string | undefined,
  };
  const teachers = await adminService.getTeachers(filters);
  res.status(200).json({ status: "success", data: teachers });
});

export const getTeacherById = asyncWrapper(async (req: Request, res: Response) => {
  const teacher = await adminService.getTeacherById(getParamId(req));
  res.status(200).json({ status: "success", data: teacher });
});

export const updateTeacher = asyncWrapper(async (req: Request, res: Response) => {
  const teacher = await adminService.updateTeacher(getParamId(req), req.body);
  res.status(200).json({ status: "success", data: teacher });
});

export const updateTeacherStatus = asyncWrapper(async (req: Request, res: Response) => {
  const teacher = await adminService.updateTeacherStatus(getParamId(req), req.body.isActive);
  res.status(200).json({ status: "success", data: teacher });
});

// ==========================================
// STUDENTS
// ==========================================

export const createStudent = asyncWrapper(async (req: Request, res: Response) => {
  const student = await adminService.createStudent(req.body);
  res.status(201).json({ status: "success", data: student });
});

export const getStudents = asyncWrapper(async (req: Request, res: Response) => {
  const filters = {
    departmentId: req.query.departmentId as string | undefined,
    classId: req.query.classId as string | undefined,
    isActive: req.query.isActive !== undefined ? req.query.isActive === "true" : undefined,
    search: req.query.search as string | undefined,
  };
  const students = await adminService.getStudents(filters);
  res.status(200).json({ status: "success", data: students });
});

export const getStudentById = asyncWrapper(async (req: Request, res: Response) => {
  const student = await adminService.getStudentById(getParamId(req));
  res.status(200).json({ status: "success", data: student });
});

export const updateStudent = asyncWrapper(async (req: Request, res: Response) => {
  const student = await adminService.updateStudent(getParamId(req), req.body);
  res.status(200).json({ status: "success", data: student });
});

export const updateStudentStatus = asyncWrapper(async (req: Request, res: Response) => {
  const student = await adminService.updateStudentStatus(getParamId(req), req.body.isActive);
  res.status(200).json({ status: "success", data: student });
});

// ==========================================
// ASSIGNMENTS
// ==========================================

export const createAssignment = asyncWrapper(async (req: Request, res: Response) => {
  const assignment = await adminService.createAssignment(req.body);
  res.status(201).json({ status: "success", data: assignment });
});

export const getAssignments = asyncWrapper(async (req: Request, res: Response) => {
  const filters = {
    teacherId: req.query.teacherId as string | undefined,
    classId: req.query.classId as string | undefined,
    subjectId: req.query.subjectId as string | undefined,
  };
  const assignments = await adminService.getAssignments(filters);
  res.status(200).json({ status: "success", data: assignments });
});

export const deleteAssignment = asyncWrapper(async (req: Request, res: Response) => {
  await adminService.deleteAssignment(getParamId(req));
  res.status(200).json({ status: "success", message: "Assignment deleted successfully" });
});

// ==========================================
// STEP 15: ADMIN ATTENDANCE REPORTING
// ==========================================

export const getAttendanceOverview = asyncWrapper(async (_req: Request, res: Response) => {
  const overview = await adminService.getAdminAttendanceOverview();
  res.status(200).json({ status: "success", data: overview });
});

export const getAttendanceSessions = asyncWrapper(async (req: Request, res: Response) => {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    teacherId: req.query.teacherId as string | undefined,
    departmentId: req.query.departmentId as string | undefined,
    classId: req.query.classId as string | undefined,
    subjectId: req.query.subjectId as string | undefined,
    status: req.query.status as SessionStatus | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
  const result = await adminService.getAdminAttendanceSessions(filters);
  res.status(200).json({ status: "success", data: result.sessions, pagination: result.pagination });
});
