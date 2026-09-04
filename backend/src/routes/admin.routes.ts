import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { validateBody, validateQuery } from "../middleware/validate.middleware.js";

import {
  // Departments
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  // Classes
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  // Subjects
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  // Teachers
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  updateTeacherStatus,
  // Students
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  updateStudentStatus,
  // Assignments
  createAssignment,
  getAssignments,
  deleteAssignment,
  // Attendance Reporting
  getAttendanceOverview,
  getAttendanceSessions,
} from "../controllers/admin.controller.js";

import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createClassSchema,
  updateClassSchema,
  createSubjectSchema,
  updateSubjectSchema,
  createTeacherSchema,
  updateTeacherSchema,
  createStudentSchema,
  updateStudentSchema,
  updateStatusSchema,
  createAssignmentSchema,
  getAdminSessionsQuerySchema,
} from "../validators/admin.validator.js";

const router = Router();

// Apply authentication & ADMIN authorization globally to all admin routes
router.use(authenticate, authorizeRoles("ADMIN"));

// ==========================================
// DEPARTMENTS
// ==========================================
router.post("/departments", validateBody(createDepartmentSchema), createDepartment);
router.get("/departments", getDepartments);
router.get("/departments/:id", getDepartmentById);
router.patch("/departments/:id", validateBody(updateDepartmentSchema), updateDepartment);
router.delete("/departments/:id", deleteDepartment);

// ==========================================
// ACADEMIC CLASSES
// ==========================================
router.post("/classes", validateBody(createClassSchema), createClass);
router.get("/classes", getClasses);
router.get("/classes/:id", getClassById);
router.patch("/classes/:id", validateBody(updateClassSchema), updateClass);
router.delete("/classes/:id", deleteClass);

// ==========================================
// SUBJECTS
// ==========================================
router.post("/subjects", validateBody(createSubjectSchema), createSubject);
router.get("/subjects", getSubjects);
router.get("/subjects/:id", getSubjectById);
router.patch("/subjects/:id", validateBody(updateSubjectSchema), updateSubject);
router.delete("/subjects/:id", deleteSubject);

// ==========================================
// TEACHERS
// ==========================================
router.post("/teachers", validateBody(createTeacherSchema), createTeacher);
router.get("/teachers", getTeachers);
router.get("/teachers/:id", getTeacherById);
router.patch("/teachers/:id", validateBody(updateTeacherSchema), updateTeacher);
router.patch("/teachers/:id/status", validateBody(updateStatusSchema), updateTeacherStatus);

// ==========================================
// STUDENTS
// ==========================================
router.post("/students", validateBody(createStudentSchema), createStudent);
router.get("/students", getStudents);
router.get("/students/:id", getStudentById);
router.patch("/students/:id", validateBody(updateStudentSchema), updateStudent);
router.patch("/students/:id/status", validateBody(updateStatusSchema), updateStudentStatus);

// ==========================================
// TEACHING ASSIGNMENTS
// ==========================================
router.post("/assignments", validateBody(createAssignmentSchema), createAssignment);
router.get("/assignments", getAssignments);
router.delete("/assignments/:id", deleteAssignment);

// ==========================================
// ATTENDANCE REPORTING
// ==========================================
router.get("/attendance/overview", getAttendanceOverview);
router.get("/attendance/sessions", validateQuery(getAdminSessionsQuerySchema), getAttendanceSessions);

export default router;
