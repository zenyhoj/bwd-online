"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { deleteSeminarItemSchema, editSeminarItemSchema, reorderSeminarItemsSchema, seminarItemSchema, seminarProgressSchema } from "@/schemas";
import type { ActionState } from "@/types";

type ActionContext = Awaited<ReturnType<typeof getActionContext>>;

function isMissingMediaUrlsColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" &&
    (error.message?.includes("'media_urls'") ?? false)
  );
}

async function uploadSeminarFiles(
  supabase: ActionContext["supabase"],
  organizationId: string,
  files: File[]
) {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${organizationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("seminar-media").upload(filePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from("seminar-media").getPublicUrl(filePath);
    uploadedUrls.push(publicUrlData.publicUrl);
  }

  return uploadedUrls;
}

function parseExistingMediaUrls(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string" && url.length > 0) : [];
  } catch {
    return [];
  }
}

export async function updateSeminarProgressAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(seminarProgressSchema, {
      applicantId: formData.get("applicantId"),
      seminarItemId: formData.get("seminarItemId"),
      completed: formData.get("completed")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { data: seminarItem, error: seminarItemError } = await supabase
      .from("seminar_items")
      .select("id")
      .eq("id", parsed.data.seminarItemId)
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .single();

    if (seminarItemError || !seminarItem) {
      return { success: false, message: "This seminar item is no longer available." };
    }

    const { data: orderedItems, error: orderedItemsError } = await supabase
      .from("seminar_items")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (orderedItemsError) {
      return { success: false, message: orderedItemsError.message };
    }

    const targetIndex = (orderedItems ?? []).findIndex((item) => item.id === parsed.data.seminarItemId);

    if (targetIndex === -1) {
      return { success: false, message: "This seminar item is no longer available." };
    }

    const requiredPreviousItemIds = (orderedItems ?? []).slice(0, targetIndex).map((item) => item.id);

    if (requiredPreviousItemIds.length > 0) {
      const { data: completedPreviousItems, error: completedPreviousItemsError } = await supabase
        .from("applicant_seminar_progress")
        .select("seminar_item_id")
        .eq("organization_id", profile.organization_id)
        .eq("applicant_id", parsed.data.applicantId)
        .eq("completed", true)
        .in("seminar_item_id", requiredPreviousItemIds);

      if (completedPreviousItemsError) {
        return { success: false, message: completedPreviousItemsError.message };
      }

      const completedPreviousIds = new Set((completedPreviousItems ?? []).map((item) => item.seminar_item_id));
      const hasIncompletePreviousItem = requiredPreviousItemIds.some((id) => !completedPreviousIds.has(id));

      if (hasIncompletePreviousItem) {
        return { success: false, message: "Complete the previous seminar item first." };
      }
    }

    const { error } = await supabase.from("applicant_seminar_progress").upsert(
      {
        organization_id: profile.organization_id,
        applicant_id: parsed.data.applicantId,
        seminar_item_id: parsed.data.seminarItemId,
        completed: parsed.data.completed,
        completed_at: parsed.data.completed ? new Date().toISOString() : null
      },
      { onConflict: "applicant_id,seminar_item_id" }
    );

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/applicant/seminar");
    revalidatePath("/applicant/applications/new");
    revalidatePath("/applicant");
    return { success: true, message: "Seminar item marked as complete." };
  });
}

export async function createSeminarItemAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage seminar items." };
    }

    const parsed = await parseFormData(seminarItemSchema, {
      title: formData.get("title"),
      description: formData.get("description"),
      mediaType: formData.get("mediaType"),
      mediaUrl: formData.get("mediaUrl"),
      mediaFile: formData.get("mediaFile"),
      mediaFiles: formData.getAll("mediaFiles")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { data: lastItem, error: lastItemError } = await supabase
      .from("seminar_items")
      .select("display_order")
      .eq("organization_id", profile.organization_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastItemError) {
      return { success: false, message: lastItemError.message };
    }

    let finalMediaUrl = parsed.data.mediaUrl || null;
    let finalMediaUrls: string[] | null = null;

    if (parsed.data.mediaType === "image") {
      const imageFiles = (parsed.data.mediaFiles ?? []).filter(
        (file): file is File => file instanceof File && file.size > 0
      );

      if (imageFiles.length > 0) {
        try {
          finalMediaUrls = await uploadSeminarFiles(supabase, profile.organization_id, imageFiles);
          finalMediaUrl = finalMediaUrls[0] ?? null;
        } catch (error) {
          return { success: false, message: error instanceof Error ? error.message : "Failed to upload images." };
        }
      }
    } else if (parsed.data.mediaFile && parsed.data.mediaFile instanceof File && parsed.data.mediaFile.size > 0) {
      try {
        const [uploadedUrl] = await uploadSeminarFiles(supabase, profile.organization_id, [parsed.data.mediaFile]);
        finalMediaUrl = uploadedUrl ?? null;
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Failed to upload file." };
      }
    }

    const payload = {
      organization_id: profile.organization_id,
      title: parsed.data.title,
      description: parsed.data.description,
      media_type: parsed.data.mediaType,
      media_url: finalMediaUrl,
      media_urls: parsed.data.mediaType === "image" ? finalMediaUrls : null,
      display_order: (lastItem?.display_order ?? -1) + 1,
      created_by: profile.id
    };

    let { error } = await supabase.from("seminar_items").insert(payload);

    if (isMissingMediaUrlsColumn(error)) {
      const fallbackResult = await supabase.from("seminar_items").insert({
        organization_id: payload.organization_id,
        title: payload.title,
        description: payload.description,
        media_type: payload.media_type,
        media_url: payload.media_url,
        display_order: payload.display_order,
        created_by: payload.created_by
      });

      error = fallbackResult.error;
    }

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/seminars");
    revalidatePath("/applicant/seminar");
    return { success: true, message: "Seminar item added." };
  });
}

export async function deleteSeminarItemAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage seminar items." };
    }

    const parsed = await parseFormData(deleteSeminarItemSchema, {
      seminarItemId: formData.get("seminarItemId")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { error } = await supabase
      .from("seminar_items")
      .delete()
      .eq("id", parsed.data.seminarItemId)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/seminars");
    revalidatePath("/applicant/seminar");
    return { success: true, message: "Seminar item deleted." };
  });
}

export async function updateSeminarItemAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage seminar items." };
    }

    const parsed = await parseFormData(editSeminarItemSchema, {
      id: formData.get("id"),
      title: formData.get("title"),
      description: formData.get("description"),
      mediaType: formData.get("mediaType"),
      mediaUrl: formData.get("mediaUrl"),
      mediaFile: formData.get("mediaFile"),
      mediaFiles: formData.getAll("mediaFiles"),
      isActive: formData.get("isActive")
    });

    if (parsed.error) {
      return parsed.error;
    }

    let finalMediaUrl = parsed.data.mediaUrl || null;
    let finalMediaUrls: string[] | null = null;

    if (parsed.data.mediaType === "image") {
      const keptExistingImageUrls = parseExistingMediaUrls(formData.get("existingMediaUrls"));
      const imageFiles = (parsed.data.mediaFiles ?? []).filter(
        (file): file is File => file instanceof File && file.size > 0
      );

      if (imageFiles.length > 0) {
        try {
          const uploadedImageUrls = await uploadSeminarFiles(supabase, profile.organization_id, imageFiles);
          finalMediaUrls = [...keptExistingImageUrls, ...uploadedImageUrls];
          finalMediaUrl = finalMediaUrls[0] ?? null;
        } catch (error) {
          return { success: false, message: error instanceof Error ? error.message : "Failed to upload images." };
        }
      } else {
        finalMediaUrls = keptExistingImageUrls;
        finalMediaUrl = finalMediaUrls[0] ?? null;
      }
    } else if (parsed.data.mediaFile && parsed.data.mediaFile instanceof File && parsed.data.mediaFile.size > 0) {
      try {
        const [uploadedUrl] = await uploadSeminarFiles(supabase, profile.organization_id, [parsed.data.mediaFile]);
        finalMediaUrl = uploadedUrl ?? null;
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Failed to upload file." };
      }
    } else if (!finalMediaUrl && formData.get("existingMediaUrl")) {
      if (parsed.data.mediaType === "pdf") {
        finalMediaUrl = formData.get("existingMediaUrl") as string;
      }
    }

    const payload = {
        title: parsed.data.title,
        description: parsed.data.description,
        media_type: parsed.data.mediaType,
        media_url: finalMediaUrl,
        media_urls: parsed.data.mediaType === "image" ? finalMediaUrls : null,
        is_active: parsed.data.isActive
      };

    let { error } = await supabase
      .from("seminar_items")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("organization_id", profile.organization_id);

    if (isMissingMediaUrlsColumn(error)) {
      const fallbackResult = await supabase
        .from("seminar_items")
        .update({
          title: payload.title,
          description: payload.description,
          media_type: payload.media_type,
          media_url: payload.media_url,
          is_active: payload.is_active
        })
        .eq("id", parsed.data.id)
        .eq("organization_id", profile.organization_id);

      error = fallbackResult.error;
    }

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/seminars");
    revalidatePath("/applicant/seminar");
    return { success: true, message: "Seminar item updated." };
  });
}

export async function reorderSeminarItemsAction(items: { id: string; displayOrder: number }[]): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage seminar items." };
    }

    const parsed = reorderSeminarItemsSchema.safeParse({ items });

    if (!parsed.success) {
      return { success: false, message: "Invalid input data." };
    }

    // Since Supabase doesn't have a single bulk update RPC out of the box in this project without custom SQL,
    // we do an upsert to the seminar_items table or multiple updates.
    // However, multiple updates inside a Promise.all is perfectly fine for a small number of items (usually < 20).
    const updates = parsed.data.items.map((item) =>
      supabase
        .from("seminar_items")
        .update({ display_order: item.displayOrder })
        .eq("id", item.id)
        .eq("organization_id", profile.organization_id)
    );

    const results = await Promise.all(updates);
    const hasError = results.some((res) => res.error);

    if (hasError) {
      return { success: false, message: "Failed to update order for some items." };
    }

    revalidatePath("/admin/seminars");
    revalidatePath("/applicant/seminar");
    return { success: true, message: "Seminar order updated." };
  });
}
