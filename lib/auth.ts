import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/routes";
import type { AppRole, Profile } from "@/types/domain";

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentProfile() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  return profile as Profile;
}

export async function isSuperAdmin() {
  const user = await getSessionUser();
  if (!user || !user.email) return false;
  
  const superAdmins = ["joe.balingit@gmail.com"];
  return superAdmins.includes(user.email);
}

export async function requireRole(role: AppRole) {
  const profile = await getCurrentProfile();

  if (profile.role !== role) {
    redirect(roleHome[profile.role] as never);
  }

  return profile;
}
