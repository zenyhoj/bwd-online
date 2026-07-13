"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActionContext, parseFormData, withErrorHandling } from "@/actions/_helpers";
import type { ActionState } from "@/types";

function toProperCase(str: string): string {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
}

const applicantSchema = z.object({
  lastName: z.string().min(2, "Last name must be at least 2 characters").transform(toProperCase),
  firstName: z.string().min(2, "First name must be at least 2 characters").transform(toProperCase),
  middleInitial: z.string().trim().max(3).optional().transform((val) => (val ? toProperCase(val) : val)),
  sex: z.enum(["Male", "Female"]),
  age: z.coerce.number().int().min(1).max(120),
  address: z.string().min(10, "Address must be at least 10 characters"),
  cellphoneNumber: z.string().min(11).max(20),
  purposeOfSeminar: z.enum(["new_service", "reconnection", "change_name", "others"]).optional()
});

const applicantUpdateSchema = applicantSchema.extend({
  applicantId: z.string().uuid("Applicant ID is invalid")
});

export async function createApplicantAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(applicantSchema, {
      lastName: formData.get("lastName"),
      firstName: formData.get("firstName"),
      middleInitial: formData.get("middleInitial"),
      sex: formData.get("sex"),
      age: formData.get("age"),
      address: formData.get("address"),
      cellphoneNumber: formData.get("cellphoneNumber"),
      purposeOfSeminar: formData.get("purposeOfSeminar")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const middleInitial = parsed.data.middleInitial?.trim();
    const fullName = `${parsed.data.lastName}, ${parsed.data.firstName}${middleInitial ? ` ${middleInitial}` : ""}`.trim();

    const { data: applicant, error } = await supabase
      .from("applicants")
      .insert({
        organization_id: profile.organization_id,
        profile_id: profile.id,
        full_name: fullName,
        gender: parsed.data.sex,
        age: parsed.data.age,
        number_of_users: 1, // Defaulting to 1; actual value is stored in applications
        address: parsed.data.address,
        cellphone_number: parsed.data.cellphoneNumber,
        purpose_of_seminar: parsed.data.purposeOfSeminar
      })
      .select("id")
      .single();

    if (error || !applicant) {
      return { success: false, message: error?.message ?? "Unable to create applicant." };
    }

    revalidatePath("/applicant");
    revalidatePath("/applicant/seminar");
    return {
      success: true,
      message: "Applicant created successfully. Continue with the seminar modules.",
      redirectTo: `/applicant/seminar?applicant=${applicant.id}`
    };
  });
}

export async function updateApplicantAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const { supabase, profile } = await getActionContext();
    const parsed = await parseFormData(applicantUpdateSchema, {
      applicantId: formData.get("applicantId"),
      lastName: formData.get("lastName"),
      firstName: formData.get("firstName"),
      middleInitial: formData.get("middleInitial"),
      sex: formData.get("sex"),
      age: formData.get("age"),
      address: formData.get("address"),
      cellphoneNumber: formData.get("cellphoneNumber"),
      purposeOfSeminar: formData.get("purposeOfSeminar")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const middleInitial = parsed.data.middleInitial?.trim();
    const fullName = `${parsed.data.lastName}, ${parsed.data.firstName}${middleInitial ? ` ${middleInitial}` : ""}`.trim();

    const { error } = await supabase
      .from("applicants")
      .update({
        full_name: fullName,
        gender: parsed.data.sex,
        age: parsed.data.age,
        // number_of_users is omitted, leaving existing value
        address: parsed.data.address,
        cellphone_number: parsed.data.cellphoneNumber,
        purpose_of_seminar: parsed.data.purposeOfSeminar
      })
      .eq("id", parsed.data.applicantId)
      .eq("profile_id", profile.id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/applicant");
    revalidatePath("/applicant/applications/new");
    revalidatePath("/applicant/seminar");

    return {
      success: true,
      message: "Applicant information updated."
    };
  });
}
