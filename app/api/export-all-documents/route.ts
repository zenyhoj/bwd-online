import { NextResponse } from "next/server";
import JSZip from "jszip";
import { format } from "date-fns";

import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const profile = await requireRole("admin");

    const supabase = createSupabaseAdminClient();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "all";

    let lastExportAt: string | null = null;
    if (mode === "new") {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("last_document_export_at")
        .eq("id", profile.organization_id)
        .single();
      if (orgData?.last_document_export_at) {
        lastExportAt = orgData.last_document_export_at as string;
      }
    }

    // Fetch all non-rejected documents and join with their applications to get the applicant's name
    let query = supabase
      .from("documents")
      .select(`
        id, 
        file_path, 
        file_name, 
        status,
        applications!inner (
          id,
          full_name
        )
      `)
      .eq("organization_id", profile.organization_id)
      .neq("status", "rejected"); // We only want to export valid uploaded files

    if (lastExportAt) {
      query = query.gt("updated_at", lastExportAt);
    }

    const { data: documents, error: documentsError } = await query;

    if (documentsError || !documents || documents.length === 0) {
      console.error("Documents fetch error:", documentsError);
      return new NextResponse("No valid documents found for export", { status: 404 });
    }

    // Download files and add to zip, organized by applicant name folders
    const zip = new JSZip();
    
    // We use a mapping to keep track of folder names to handle duplicates securely (though unlikely to have huge collisions)
    // It groups files by ApplicantName_ApplicationID
    const downloadPromises = documents.map(async (doc) => {
      // Safe extraction of application data
      const appData = Array.isArray(doc.applications) ? doc.applications[0] : doc.applications;
      const rawFullName = appData?.full_name || "Unknown_Applicant";
      const applicantName = rawFullName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
      
      // Use application ID prefix in case of same names to avoid conflict
      const appIdShort = appData?.id ? String(appData.id).slice(0, 8) : "unknown";
      const folderName = `${applicantName}_${appIdShort}`;

      const { data: fileData, error } = await supabase.storage
        .from("application-documents")
        .download(doc.file_path);

      if (error) {
        console.error(`Error downloading file ${doc.file_path}:`, error);
        return;
      }

      if (fileData) {
        // Convert Blob to ArrayBuffer
        const arrayBuffer = await fileData.arrayBuffer();
        // Add file to specific folder
        zip.folder(folderName)?.file(doc.file_name, arrayBuffer);
      }
    });

    await Promise.all(downloadPromises);

    // Generate the zip buffer
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    const dateStr = format(new Date(), "yyyyMMdd_HHmmss");
    const filename = mode === "new" 
      ? `new_verified_documents_${dateStr}.zip`
      : `all_verified_documents_${dateStr}.zip`;

    // Update the last_document_export_at timestamp for the organization
    await supabase
      .from("organizations")
      .update({ last_document_export_at: new Date().toISOString() } as never)
      .eq("id", profile.organization_id);

    // Return response
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error) {
    console.error("Export all documents error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
