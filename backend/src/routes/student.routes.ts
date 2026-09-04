import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { validateBody, validateQuery } from "../middleware/validate.middleware.js";

import {
  scanQrCode,
  getAttendanceHistory,
  getAttendanceSummary,
} from "../controllers/student.controller.js";

import {
  scanQrSchema,
  getStudentAttendanceQuerySchema,
} from "../validators/student.validator.js";

const router = Router();

// Apply authentication & STUDENT authorization globally to all student routes
router.use(authenticate, authorizeRoles("STUDENT"));

// Scan Limiter (15 requests / 1 min)
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { status: "fail", message: "Too many scan attempts. Please try again after 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/attendance/scan", scanLimiter, validateBody(scanQrSchema), scanQrCode);
router.get("/attendance", validateQuery(getStudentAttendanceQuerySchema), getAttendanceHistory);
router.get("/attendance/summary", getAttendanceSummary);

export default router;
