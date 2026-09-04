import { Request, Response } from "express";
import { AttendanceStatus } from "@prisma/client";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import * as studentService from "../services/student.service.js";

export const scanQrCode = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }

  const meta = {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
  };

  const attendance = await studentService.processStudentQrScan(
    req.user.id,
    req.body.payload,
    req.body.location,
    meta
  );

  res.status(201).json({
    status: "success",
    message: "Attendance marked successfully",
    data: attendance,
  });
});

export const getAttendanceHistory = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }

  const filters = {
    status: req.query.status as AttendanceStatus | undefined,
    subjectId: req.query.subjectId as string | undefined,
  };

  const history = await studentService.getStudentAttendanceHistory(req.user.id, filters);
  res.status(200).json({ status: "success", data: history });
});

export const getAttendanceSummary = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }

  const summary = await studentService.getStudentAttendanceSummary(req.user.id);
  res.status(200).json({ status: "success", data: summary });
});
