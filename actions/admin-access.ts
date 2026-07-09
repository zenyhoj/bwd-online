"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { parseFormData, withErrorHandling } from "@/actions/_helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { staffInviteSchema } from "@/schemas";
import type { ActionState } from "@/types";

async function getInviteRedirectUrl() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const protocol = forwardedProto ?? (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${protocol}://${host}/accept-invite`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL("/accept-invite", process.env.NEXT_PUBLIC_SITE_URL).toString();
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/accept-invite`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/accept-invite`;
  }

  return "http://localhost:3000/accept-invite";
}

export async function inviteStaffAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return withErrorHandling(async () => {
    const profile = await getCurrentProfile();

    if (profile.role !== "admin") {
      return { success: false, message: "Only administrators can invite staff accounts." };
    }

    const parsed = await parseFormData(staffInviteSchema, {
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      role: formData.get("role")
    });

    if (parsed.error) {
      return parsed.error;
    }

    const adminClient = createSupabaseAdminClient();
    const redirectTo = await getInviteRedirectUrl();
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("full_name", parsed.data.fullName)
      .maybeSingle();

    if (existingProfile) {
      return { success: false, message: "A staff profile with this name already exists in your organization." };
    }

    const inviteResult = await adminClient.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo,
      data: {
        full_name: parsed.data.fullName,
        role: parsed.data.role
      }
    });

    let userId = inviteResult.data?.user?.id;

    if (inviteResult.error) {
      if (
        inviteResult.error.message.includes("already been registered") ||
        inviteResult.error.message.includes("already exists")
      ) {
        let foundUser = null;
        let page = 1;
        
        while (!foundUser) {
          const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
          if (usersError || !usersData.users || usersData.users.length === 0) {
            break;
          }
          foundUser = usersData.users.find((u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase());
          if (foundUser || usersData.users.length < 100) {
            break;
          }
          page++;
        }

        if (foundUser) {
          userId = foundUser.id;
        } else {
          return {
            success: false,
            message: "User exists but couldn't be located to upgrade."
          };
        }
      } else {
        return {
          success: false,
          message: inviteResult.error.message ?? "Unable to send the staff invitation."
        };
      }
    }

    if (!userId) {
      return {
        success: false,
        message: "Unable to retrieve the user account."
      };
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        organization_id: profile.organization_id,
        role: parsed.data.role,
        full_name: parsed.data.fullName,
        is_active: true,
        customer_type: null
      },
      { onConflict: "id" }
    );

    if (profileError) {
      return { success: false, message: profileError.message };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/access");

    const isExistingUser = inviteResult.error != null;
    return {
      success: true,
      message: isExistingUser 
        ? `Existing user account was successfully upgraded to ${parsed.data.role}.`
        : `Admin invitation sent to ${parsed.data.email}.`
    };
  });
}
