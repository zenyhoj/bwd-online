import { z } from "zod";

export const seminarProgressSchema = z.object({
  applicantId: z.string().uuid(),
  seminarItemId: z.string().uuid(),
  completed: z.coerce.boolean()
});

export const seminarItemSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  mediaType: z.enum(["text", "image", "video", "pdf"]),
  mediaUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  mediaFile: z.any().optional(), // Using z.any() because File is tricky to validate directly on the server without custom logic sometimes, though z.instanceof(File) works in newer Zod
  displayOrder: z.coerce.number().int().min(0).max(999)
});

export const deleteSeminarItemSchema = z.object({
  seminarItemId: z.string().uuid()
});

export const editSeminarItemSchema = seminarItemSchema.extend({
  id: z.string().uuid(),
  isActive: z.coerce.boolean()
});

export const reorderSeminarItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    displayOrder: z.number().int().min(0)
  }))
});
