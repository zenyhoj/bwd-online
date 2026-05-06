"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { deleteSeminarItemSchema, editSeminarItemSchema, reorderSeminarItemsSchema, seminarItemSchema, seminarProgressSchema } from "@/schemas";
import type { ActionState } from "@/types";

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
      mediaFile: formData.get("mediaFile")
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

    if (parsed.data.mediaFile && parsed.data.mediaFile instanceof File && parsed.data.mediaFile.size > 0) {
      const file = parsed.data.mediaFile;
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profile.organization_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("seminar-media").upload(filePath, file);

      if (uploadError) {
        return { success: false, message: "Failed to upload file: " + uploadError.message };
      }

      const { data: publicUrlData } = supabase.storage.from("seminar-media").getPublicUrl(filePath);
      finalMediaUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from("seminar_items").insert({
      organization_id: profile.organization_id,
      title: parsed.data.title,
      description: parsed.data.description,
      media_type: parsed.data.mediaType,
      media_url: finalMediaUrl,
      display_order: (lastItem?.display_order ?? -1) + 1,
      created_by: profile.id
    });

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
      isActive: formData.get("isActive")
    });

    if (parsed.error) {
      return parsed.error;
    }

    let finalMediaUrl = parsed.data.mediaUrl || null;

    if (parsed.data.mediaFile && parsed.data.mediaFile instanceof File && parsed.data.mediaFile.size > 0) {
      const file = parsed.data.mediaFile;
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profile.organization_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("seminar-media").upload(filePath, file);

      if (uploadError) {
        return { success: false, message: "Failed to upload file: " + uploadError.message };
      }

      const { data: publicUrlData } = supabase.storage.from("seminar-media").getPublicUrl(filePath);
      finalMediaUrl = publicUrlData.publicUrl;
    } else if (!finalMediaUrl && formData.get("existingMediaUrl")) {
      // Keep existing media URL if a new file/url wasn't provided but it was already set
      // (Unless they explicitly cleared it and passed no new file)
      // Actually, if mediaType is video and they cleared the URL, finalMediaUrl is null.
      // If it's image/pdf and they didn't upload a new file, we should keep the old URL.
      if (parsed.data.mediaType === "image" || parsed.data.mediaType === "pdf") {
        finalMediaUrl = formData.get("existingMediaUrl") as string;
      }
    }

    const { error } = await supabase
      .from("seminar_items")
      .update({
        title: parsed.data.title,
        description: parsed.data.description,
        media_type: parsed.data.mediaType,
        media_url: finalMediaUrl,
        is_active: parsed.data.isActive
      })
      .eq("id", parsed.data.id)
      .eq("organization_id", profile.organization_id);

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
