import { z } from "zod";

import { getRichTextPlainText, normalizeRichText } from "@/lib/rich-text";

export const seminarProgressSchema = z.object({
  applicantId: z.string().uuid(),
  seminarItemId: z.string().uuid(),
  completed: z.coerce.boolean()
});

export const seminarItemSchema = z.object({
  title: z.string().min(3),
  description: z.preprocess(
    (value) => (typeof value === "string" ? normalizeRichText(value) : value),
    z.string().refine((value) => getRichTextPlainText(value).length >= 20, {
      message: "Description must contain at least 20 characters of text."
    })
  ),
  mediaType: z.enum(["text", "image", "video", "pdf"]),
  mediaUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  mediaFile: z.any().optional(),
  mediaFiles: z.array(z.any()).optional()
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
