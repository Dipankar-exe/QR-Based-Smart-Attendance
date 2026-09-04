import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";

export const scanQrSchema = z.object({
  payload: z.string().trim().min(1, "QR payload is required"),
  location: z
    .object({
      latitude: z.number().finite("Latitude must be a finite number").min(-90).max(90),
      longitude: z.number().finite("Longitude must be a finite number").min(-180).max(180),
      accuracy: z.number().finite("Accuracy must be a finite number").positive("Accuracy must be positive"),
      timestamp: z.number().finite("Timestamp must be a finite number").positive("Timestamp must be positive"),
    })
    .optional(),
});

export const getStudentAttendanceQuerySchema = z.object({
  status: z.nativeEnum(AttendanceStatus).optional(),
  subjectId: z.string().uuid("Invalid subject ID").optional(),
});
