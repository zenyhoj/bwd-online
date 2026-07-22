import { z } from "zod";

export const concessionaireSchema = z.object({
  applicationId: z.string().uuid(),
  profileId: z.string().uuid(),
  concessionaireNumber: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{3}$/, "Concessionaire account number must be in XXXX-XX-XXX format (e.g. 0441-12-031)."),
  connectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meterNumber: z.string().optional()
});
