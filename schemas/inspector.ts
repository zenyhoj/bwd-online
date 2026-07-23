import { z } from "zod";

export const inspectorSchema = z.object({
  fullName: z.string().trim().min(3, "Enter the inspector's full name."),
  position: z.string().trim().min(2, "Enter the inspector's position."),
  phone: z.string().trim().min(7, "Enter a valid contact number.")
});

export const updateInspectorSchema = inspectorSchema.extend({
  inspectorId: z.string().uuid()
});
