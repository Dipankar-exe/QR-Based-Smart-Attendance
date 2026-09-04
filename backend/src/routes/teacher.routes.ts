import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { validateBody, validateQuery } from "../middleware/validate.middleware.js";

import {
  getAssignments,
  startSession,
  getQrPayload,
  getSessions,
  getSessionById,
  closeSession,
  cancelSession,
  markManualAttendance,
  getSessionStudents,
  getSessionReport,
  getAggregateSummary,
} from "../controllers/teacher.controller.js";

import {
  startSessionSchema,
  getSessionsQuerySchema,
  manualAttendanceSchema,
  getSessionStudentsQuerySchema,
} from "../validators/teacher.validator.js";

const router = Router();

// Apply authentication & TEACHER authorization globally to all teacher routes
router.use(authenticate, authorizeRoles("TEACHER"));

router.get("/assignments", getAssignments);
router.post("/attendance-sessions", validateBody(startSessionSchema), startSession);
router.get("/attendance-sessions", validateQuery(getSessionsQuerySchema), getSessions);
router.get("/attendance-summary", getAggregateSummary);
router.get("/attendance-sessions/:id", getSessionById);
router.get("/attendance-sessions/:id/qr", getQrPayload);
router.get("/attendance-sessions/:sessionId/report", getSessionReport);
router.patch("/attendance-sessions/:id/close", closeSession);
router.patch("/attendance-sessions/:id/cancel", cancelSession);

// Step 14 & 15 Routes
router.post(
  "/attendance-sessions/:sessionId/manual-attendance",
  validateBody(manualAttendanceSchema),
  markManualAttendance
);
router.get(
  "/attendance-sessions/:sessionId/students",
  validateQuery(getSessionStudentsQuerySchema),
  getSessionStudents
);

export default router;
