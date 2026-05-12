"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAccreditedPlumbersAction() {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Try to find organization from profiles first, then fallback to applicants
  let organizationId: string | null = null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profile?.organization_id) {
    organizationId = profile.organization_id;
  } else {
    const { data: applicant } = await supabase
      .from("applicants")
      .select("organization_id")
      .eq("profile_id", user.id)
      .single();
    
    if (applicant?.organization_id) {
      organizationId = applicant.organization_id;
    }
  }

  if (!organizationId) {
    console.error("Organization not found for user:", user.id);
    return { error: "Organization not found" };
  }

  const { data: plumbers, error } = await supabase
    .from("accredited_plumbers")
    .select("full_name, phone, notes")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    console.error("Error fetching plumbers:", error);
    return { error: "Failed to fetch plumbers" };
  }

  return { data: plumbers };
}
