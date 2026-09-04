import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().trim().optional(),
    registrationNumber: z.string().trim().optional(),
    password: z.string().min(1, "Password is required"),
  })
  .refine(
    (data) => !!(data.email || data.registrationNumber),
    { message: "Either email or registration number is required", path: ["email"] }
  );

export type LoginInput = z.infer<typeof loginSchema>;

