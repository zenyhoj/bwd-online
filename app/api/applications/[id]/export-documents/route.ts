import { NextResponse } from "next/server";
import JSZip from "jszip";
import { format } from "date-fns";

import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireRole("admin");
    const { id } = await params;

    const supabase = createSupabaseAdminClient();

    // 1. Fetch the application to ensure it exists and belongs to the admin's organization.
    // Also fetch the applicant's name to use in the filename.
    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, organization_id, full_name")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (applicationError || !application) {
      console.error("Application fetch error:", applicationError);
      return new NextResponse("Application not found", { status: 404 });
    }

    const applicantName = application.full_name.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

    // 2. Fetch all verified/pending documents (exclude rejected/missing)
    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("id, file_path, file_name, status")
      .eq("application_id", id)
      .eq("organization_id", profile.organization_id)
      .neq("status", "rejected"); // We only want to export valid uploaded files

    if (documentsError || !documents || documents.length === 0) {
      return new NextResponse("No valid documents found for export", { status: 404 });
    }

    // 3. Download files and add to zip
    const zip = new JSZip();
    const downloadPromises = documents.map(async (doc) => {
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
        zip.file(doc.file_name, arrayBuffer);
      }
    });

    await Promise.all(downloadPromises);

    // 4. Generate the zip buffer
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // 5. Generate filename: applicant_name_date.zip
    const dateStr = format(new Date(), "yyyyMMdd_HHmmss");
    const filename = `${applicantName}_${dateStr}.zip`;

    // 6. Return response
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error) {
    console.error("Export documents error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
