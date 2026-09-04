import { z } from "zod";
import { SessionStatus } from "@prisma/client";

export const startSessionSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
});

export const getSessionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.nativeEnum(SessionStatus).optional(),
    classId: z.string().uuid("Invalid class ID").optional(),
    subjectId: z.string().uuid("Invalid subject ID").optional(),
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

export const sessionParamSchema = z.object({
  id: z.string().uuid("Invalid session ID"),
});

export const manualAttendanceSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  reason: z
    .string()
    .trim()
    .min(5, "Reason must be at least 5 characters long")
    .max(200, "Reason cannot exceed 200 characters"),
});

export const getSessionStudentsQuerySchema = z.object({
  search: z.string().trim().optional(),
});
