"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import { deleteAccreditedPlumberSchema, inspectorSchema, updateInspectorSchema } from "@/schemas";
import type { ActionState } from "@/types";

export async function createInspectorAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage inspectors." };
    }

    const parsed = await parseFormData(inspectorSchema, {
      fullName: formData.get("fullName"),
      position: formData.get("position"),
      phone: formData.get("phone")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { error } = await supabase.from("inspectors").insert({
      organization_id: profile.organization_id,
      full_name: parsed.data.fullName,
      position: parsed.data.position,
      phone: parsed.data.phone,
      created_by: profile.id
    });

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/inspectors");
    revalidatePath("/admin");
    revalidatePath("/admin/inspections");
    return { success: true, message: "Inspector added." };
  });
}

export async function updateInspectorAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage inspectors." };
    }

    const parsed = await parseFormData(updateInspectorSchema, {
      inspectorId: formData.get("inspectorId"),
      fullName: formData.get("fullName"),
      position: formData.get("position"),
      phone: formData.get("phone")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { error } = await supabase
      .from("inspectors")
      .update({
        full_name: parsed.data.fullName,
        position: parsed.data.position,
        phone: parsed.data.phone
      })
      .eq("id", parsed.data.inspectorId)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/inspectors");
    revalidatePath("/admin");
    revalidatePath("/admin/inspections");
    return { success: true, message: "Inspector updated." };
  });
}

export async function deleteInspectorAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can manage inspectors." };
    }

    const parsed = await parseFormData(deleteAccreditedPlumberSchema, {
      plumberId: formData.get("inspectorId")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const { data: usage, error: usageError } = await supabase
      .from("inspections")
      .select("id")
      .eq("registry_inspector_id", parsed.data.plumberId)
      .limit(1)
      .maybeSingle();

    if (usageError) {
      return { success: false, message: usageError.message };
    }

    if (usage) {
      const { error } = await supabase
        .from("inspectors")
        .update({ is_active: false })
        .eq("id", parsed.data.plumberId)
        .eq("organization_id", profile.organization_id);

      if (error) {
        return { success: false, message: error.message };
      }

      revalidatePath("/admin/inspectors");
      revalidatePath("/admin");
      revalidatePath("/admin/inspections");
      return { success: true, message: "Inspector archived because it is already assigned to an inspection." };
    }

    const { error } = await supabase
      .from("inspectors")
      .delete()
      .eq("id", parsed.data.plumberId)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/inspectors");
    revalidatePath("/admin");
    revalidatePath("/admin/inspections");
    return { success: true, message: "Inspector removed." };
  });
}
