import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type DocumentDownloadRouteProps = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: Request, { params }: DocumentDownloadRouteProps) {
  const { documentId } = await params;
  const profile = await getCurrentProfile();
  const supabase = createSupabaseAdminClient();
  const requestUrl = new URL(_request.url);
  const forceDownload = requestUrl.searchParams.get("download") === "1";

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, file_path, organization_id, applicant_id")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !document) {
    return NextResponse.json({ message: "Document not found." }, { status: 404 });
  }

  if (profile.role === "admin" && document.organization_id !== profile.organization_id) {
    return NextResponse.json({ message: "Document not found." }, { status: 404 });
  }

  if (profile.role === "applicant") {
    const { data: applicant, error: applicantError } = await supabase
      .from("applicants")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (applicantError || !applicant || applicant.id !== document.applicant_id) {
      return NextResponse.json({ message: "Document not found." }, { status: 404 });
    }
  }

  if (profile.role !== "admin" && profile.role !== "applicant") {
    return NextResponse.json({ message: "You are not allowed to access this document." }, { status: 403 });
  }

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from("application-documents")
    .createSignedUrl(document.file_path, 60, {
      download: forceDownload
    });

  if (signedUrlError || !signedUrl?.signedUrl) {
    return NextResponse.json({ message: "Unable to generate secure download link." }, { status: 500 });
  }

  const response = NextResponse.redirect(signedUrl.signedUrl);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
