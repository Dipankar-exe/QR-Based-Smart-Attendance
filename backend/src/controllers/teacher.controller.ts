import { Request, Response } from "express";
import { SessionStatus } from "@prisma/client";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import * as teacherService from "../services/teacher.service.js";

const getParamId = (req: Request, paramName: string = "id"): string => {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
};

export const getAssignments = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const assignments = await teacherService.getTeacherAssignments(req.user.id);
  res.status(200).json({ status: "success", data: assignments });
});

export const startSession = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const session = await teacherService.startAttendanceSession(req.user.id, req.body);
  res.status(201).json({ status: "success", data: session });
});

export const getQrPayload = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const qrData = await teacherService.generateTeacherQrPayload(req.user.id, getParamId(req));

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.status(200).json({ status: "success", data: qrData });
});

export const getSessions = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    status: req.query.status as SessionStatus | undefined,
    classId: req.query.classId as string | undefined,
    subjectId: req.query.subjectId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
  const result = await teacherService.getTeacherSessions(req.user.id, filters);
  res.status(200).json({ status: "success", data: result.sessions, pagination: result.pagination });
});

export const getSessionById = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const session = await teacherService.getTeacherSessionById(req.user.id, getParamId(req));
  res.status(200).json({ status: "success", data: session });
});

export const closeSession = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const session = await teacherService.closeAttendanceSession(req.user.id, getParamId(req));
  res.status(200).json({ status: "success", data: session });
});

export const cancelSession = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const session = await teacherService.cancelAttendanceSession(req.user.id, getParamId(req));
  res.status(200).json({ status: "success", data: session });
});

export const markManualAttendance = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const sessionId = getParamId(req, "sessionId");
  const attendance = await teacherService.markManualAttendance(
    req.user.id,
    sessionId,
    req.body
  );
  res.status(201).json({
    status: "success",
    message: "Manual attendance marked successfully",
    data: attendance,
  });
});

export const getSessionStudents = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const sessionId = getParamId(req, "sessionId");
  const search = req.query.search as string | undefined;
  const roster = await teacherService.getSessionStudentRoster(req.user.id, sessionId, { search });
  res.status(200).json({ status: "success", data: roster });
});

export const getSessionReport = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const sessionId = getParamId(req, "sessionId");
  const report = await teacherService.getTeacherSessionReport(req.user.id, sessionId);
  res.status(200).json({ status: "success", data: report });
});

export const getAggregateSummary = asyncWrapper(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ status: "fail", message: "Unauthorized" });
    return;
  }
  const summary = await teacherService.getTeacherAggregateSummary(req.user.id);
  res.status(200).json({ status: "success", data: summary });
});
