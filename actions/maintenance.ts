"use server";

import { revalidatePath } from "next/cache";
import { isSuperAdmin, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function purgeCompletedApplicationDocumentsAction() {
  try {
    const profile = await requireRole("admin");
    const supabase = createSupabaseAdminClient();
    
    // 1. Specific Email Restriction
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== "joe.balingit@gmail.com") {
      return { error: "Only Joe Balingit (joe.balingit@gmail.com) can perform this administrative action." };
    }

    // 2. Export Safeguard
    const { data: orgData } = await supabase
      .from("organizations")
      .select("last_document_export_at")
      .eq("id", profile.organization_id)
      .single();

    if (!orgData?.last_document_export_at) {
      return { error: "Storage cannot be purged because documents have never been exported. Please perform a full export first." };
    }

    // Check for documents updated after the last export
    const { count: unexportedCount } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .gt("updated_at", orgData.last_document_export_at);

    if ((unexportedCount ?? 0) > 0) {
      return { error: `There are ${unexportedCount} new or updated documents since the last export. Please run a "New Documents" export before purging storage to ensure everything is backed up.` };
    }

    // Find all applications that have been 'converted' (fully completed)
    const { data: applications, error: appsError } = await supabase
      .from("applications")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("status", "converted");

    if (appsError) {
      console.error("Failed to fetch converted applications:", appsError);
      return { error: "Failed to fetch eligible applications for purging." };
    }

    if (!applications || applications.length === 0) {
      return { success: true, count: 0, message: "No completed applications found to purge." };
    }

    const applicationIds = applications.map((a) => a.id);

    // Find all documents belonging to these applications
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, file_path")
      .in("application_id", applicationIds)
      .eq("organization_id", profile.organization_id);

    if (docsError) {
      console.error("Failed to fetch documents for purging:", docsError);
      return { error: "Failed to fetch eligible documents for purging." };
    }

    if (!documents || documents.length === 0) {
      return { success: true, count: 0, message: "No stored documents found for the completed applications." };
    }

    const filePaths = documents.map((doc) => doc.file_path);

    // Remove the files from the storage bucket
    const { error: storageError } = await supabase.storage
      .from("application-documents")
      .remove(filePaths);

    if (storageError) {
      console.error("Failed to delete files from storage:", storageError);
      return { error: "Failed to delete files from backend storage." };
    }

    // Optional: Update the database records to note they were purged.
    // This allows the UI to display a clear message instead of a broken image link if someone tries to view it.
    const documentIds = documents.map((doc) => doc.id);
    const { error: updateError } = await supabase
      .from("documents")
      .update({ review_notes: "File automatically purged to free up storage space." })
      .in("id", documentIds);

    if (updateError) {
      console.warn("Files were deleted but failed to update database notes:", updateError);
      // We still consider it a success because the storage is free.
    }

    revalidatePath("/admin");
    return { success: true, count: filePaths.length, message: `Successfully purged ${filePaths.length} documents from storage.` };
  } catch (error) {
    console.error("Purge documents error:", error);
    return { error: "An unexpected error occurred during the purge process." };
  }
}

export async function getExportMetadataAction(mode: "new" | "all") {
  try {
    const profile = await requireRole("admin");
    const supabase = createSupabaseAdminClient();

    let lastExportAt: string | null = null;
    if (mode === "new") {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("last_document_export_at")
        .eq("id", profile.organization_id)
        .single();
      lastExportAt = orgData?.last_document_export_at || null;
    }

    let query = supabase
      .from("documents")
      .select(`
        id, 
        file_path, 
        file_name, 
        status,
        updated_at,
        applications!inner (
          id,
          full_name
        )
      `)
      .eq("organization_id", profile.organization_id)
      .neq("status", "rejected");

    if (lastExportAt) {
      query = query.gt("updated_at", lastExportAt);
    }

    const { data: documents, error } = await query;
    if (error) throw error;

    return { success: true, documents: documents || [] };
  } catch (error) {
    console.error("getExportMetadataAction error:", error);
    return { error: "Failed to fetch document list." };
  }
}

export async function updateLastExportAtAction() {
  try {
    const profile = await requireRole("admin");
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from("organizations")
      .update({ last_document_export_at: new Date().toISOString() } as never)
      .eq("id", profile.organization_id);

    if (error) throw error;
    revalidatePath("/admin/export");
    return { success: true };
  } catch (error) {
    console.error("updateLastExportAtAction error:", error);
    return { error: "Failed to update export timestamp." };
  }
}
