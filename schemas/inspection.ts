import { z } from "zod";

export const inspectionScheduleSchema = z.object({
  applicationId: z.string().uuid(),
  inspectorId: z.string().uuid(),
  scheduledAt: z.string().min(1)
});

export const inspectionRescheduleSchema = z.object({
  inspectionId: z.string().uuid(),
  scheduledAt: z.string().min(1)
});

export const inspectionUpdateSchema = z.object({
  inspectionId: z.string().uuid(),
  status: z.enum(["in_progress", "approved", "rejected", "rescheduled"]),
  plumbingApproved: z.boolean(),
  inspectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  remarks: z.string().min(5),
  materialList: z.string().trim().min(3),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  referenceAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{3}$/, "Reference account number must be in XXXX-XX-XXX format (e.g. 0441-12-031)."),
  referenceAccountName: z.string().trim().min(3),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{3}$/, "Account number must be in XXXX-XX-XXX format (e.g. 0441-12-031).")
});
