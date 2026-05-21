import { redirect } from "next/navigation";

import { ApplicantSwitcher } from "@/components/applicant/applicant-switcher";
import { ApplicationSwitcher } from "@/components/applicant/application-switcher";
import { DocumentSubmissionPreferenceForm } from "@/components/applicant/document-submission-preference-form";
import { DocumentUploadForm } from "@/components/applicant/document-upload-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDocumentDownloadHref } from "@/lib/document-links";
import { areDocumentsReadyForPayment, getDocumentRequirementRows } from "@/lib/document-workflow";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getApplicants, getApplicantApplications } from "@/lib/queries";

type ApplicantDocumentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  return typeof searchParams?.[key] === "string" ? searchParams[key] : undefined;
}

export default async function ApplicantDocumentsPage({ searchParams }: ApplicantDocumentsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const supabase = createSupabaseAdminClient();

  const applicants = await getApplicants();
  const selectedApplicantId = getStringParam(resolvedSearchParams, "applicant") ?? applicants[0]?.id ?? null;

  if (!selectedApplicantId && applicants.length === 0) {
    redirect("/applicant");
  }

  const effectiveApplicantId = selectedApplicantId ?? applicants[0]?.id ?? null;
  const applicationList = effectiveApplicantId ? await getApplicantApplications(effectiveApplicantId) : [];

  const selectedApplicationId = getStringParam(resolvedSearchParams, "application") ?? applicationList[0]?.id ?? null;
  const application = applicationList.find((item) => item.id === selectedApplicationId) ?? applicationList[0] ?? null;

  const { data: documents } = application
    ? await supabase.from("documents").select("*").eq("application_id", application.id).order("created_at", { ascending: false })
    : { data: [] };

  const hasApprovedInspection =
    application?.inspections?.some((inspection) => inspection.status === "approved") ?? false;
  const requirementRows = getDocumentRequirementRows(documents ?? []);
  const documentsReady = application && hasApprovedInspection ? areDocumentsReadyForPayment(application) : false;
  
  const actionableTypes = documentsReady ? [] : requirementRows
    .filter((row) => row.status === "missing" || row.status === "rejected")
    .map((row) => row.type);
    
  const displayRows = documentsReady 
    ? requirementRows.filter((row) => row.document !== null) 
    : requirementRows;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">Upload and monitor document verification status.</p>
      </div>
      <ApplicantSwitcher
        applicants={applicants}
        selectedApplicantId={effectiveApplicantId}
        basePath="/applicant/documents"
        queryParams={{ application: selectedApplicationId ?? undefined }}
        title="Choose applicant"
        description="Switch between applicants to view their documents."
      />
      {applicationList.length > 1 ? (
        <ApplicationSwitcher
          applications={applicationList}
          selectedApplicationId={application?.id}
          basePath="/applicant/documents"
          queryParams={{ applicant: effectiveApplicantId ?? undefined }}
          title="Choose application"
          description="This applicant has multiple applications. Choose one to view documents."
        />
      ) : null}

      {application ? (
        <>
          {!hasApprovedInspection ? (
            <Card>
              <CardHeader>
                <CardTitle>Uploads not open yet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  After the inspector approves the in-house inspection, you can upload PDF, JPG, JPEG, or PNG copies of the required documents here.
                </p>
              </CardContent>
            </Card>
          ) : actionableTypes.length > 0 ? (
            <>
              <DocumentUploadForm applicationId={application.id} allowedDocumentTypes={actionableTypes} />
              <DocumentSubmissionPreferenceForm
                applicationId={application.id}
                submissionMode={application.document_submission_mode ?? "online"}
              />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Uploads complete</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  There are no missing or rejected documents to upload right now.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Document requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={documentsReady ? "verified" : "pending"} />
                <span className="text-sm text-muted-foreground">
                  {!hasApprovedInspection
                    ? "Document uploads will open after your in-house inspection is approved."
                    : documentsReady
                    ? "Documents are complete for payment scheduling."
                    : "Complete or replace all required documents, or inform BWD that you will bring them to the office."}
                </span>
              </div>

              {application.document_review_note ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-medium">Admin note</p>
                  <p className="mt-1 whitespace-pre-wrap">{application.document_review_note}</p>
                </div>
              ) : null}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requirement</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Review note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        No documents were required.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayRows.map((row) => (
                      <TableRow key={row.type}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell>
                          {row.document ? (
                            <a href={getDocumentDownloadHref(row.document.id)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {row.document.file_name}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Not uploaded</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status === "missing" ? "pending" : row.status} />
                        </TableCell>
                        <TableCell>{row.reviewNote ?? (row.status === "missing" ? "Awaiting upload" : "-")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
