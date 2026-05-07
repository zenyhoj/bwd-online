import { z } from "zod";

export const accreditedPlumberSchema = z.object({
  fullName: z.string().min(3),
  licenseNumber: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const deleteAccreditedPlumberSchema = z.object({
  plumberId: z.string().uuid()
});

export const inhouseInstallationSchema = z.object({
  applicationId: z.string().uuid(),
  accreditedPlumberId: z.string().uuid(),
  completed: z.coerce.boolean(),
  completedAt: z.string().optional(),
  signedAt: z.string().optional()
});

export const installationScheduleSchema = z.object({
  applicationId: z.string().uuid(),
  scheduledAt: z.string().min(1)
});
