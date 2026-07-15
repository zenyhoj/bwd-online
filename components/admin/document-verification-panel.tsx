"use client";

import { useActionState, useId, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, Download, Files } from "lucide-react";

import { completeDocumentVerificationAction, updateDocumentRequirementAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { DocumentReviewForm } from "@/components/admin/document-review-form";
import { DocumentPreview } from "@/components/shared/document-preview";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormMessage } from "@/components/forms/form-message";
import { getDocumentDownloadHref } from "@/lib/document-links";
import type { DocumentRequirementRow } from "@/lib/document-workflow";

type DocumentVerificationPanelProps = {
  applicationId: string;
  applicationStatus: string;
  documentSubmissionMode?: string;
  requirements: DocumentRequirementRow[];
};

const NO_DOCUMENT_VALUE = "__no_document__";

function VerificationDisclosure({
  requirements,
  isOfficeSubmission,
  isVerificationComplete,
  children
}: {
  requirements: DocumentRequirementRow[];
  isOfficeSubmission: boolean;
  isVerificationComplete: boolean;
  children: ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const requiredRows = requirements.filter((row) => row.isRequired);
  const optionalCount = requirements.length - requiredRows.length;
  const uploadedCount = requiredRows.filter((row) => Boolean(row.document)).length;
  const verifiedCount = requiredRows.filter((row) => row.status === "verified").length;
  const rejectedCount = requiredRows.filter((row) => row.status === "rejected").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className="flex w-full flex-col gap-4 p-4 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {isVerificationComplete ? <CheckCircle2 className="h-5 w-5" /> : <Files className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <span className="block font-heading text-base font-semibold text-foreground">Requirements checklist</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {isVerificationComplete
                ? "Document verification is complete."
                : isOfficeSubmission
                  ? `${requiredRows.length} required physical documents to verify at the office.`
                  : `${uploadedCount} of ${requiredRows.length} required files uploaded.`}
            </span>
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {requiredRows.length} required
          </span>
          {optionalCount > 0 ? (
            <span className="rounded-full border border-sky-300/70 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
              {optionalCount} optional
            </span>
          ) : null}
          {isOfficeSubmission ? (
            <span className="rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Office submission
            </span>
          ) : (
            <>
              <span className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {uploadedCount} uploaded
              </span>
              <span className="rounded-full border border-emerald-300/70 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                {verifiedCount} verified
              </span>
              {rejectedCount > 0 ? (
                <span className="rounded-full border border-red-300/70 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  {rejectedCount} rejected
                </span>
              ) : null}
            </>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-foreground sm:ml-1">
            {isExpanded ? "Hide requirements" : "Show requirements"}
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </span>
        </span>
      </button>

      {isExpanded ? (
        <div id={contentId} className="border-t border-border/70 p-4 sm:p-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function DocumentVerificationPanel({ applicationId, applicationStatus, documentSubmissionMode, requirements }: DocumentVerificationPanelProps) {
  const [selectedType, setSelectedType] = useState<string>(NO_DOCUMENT_VALUE);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(completeDocumentVerificationAction, initialActionState);
  const [requirementState, requirementAction, requirementPending] = useActionState(
    updateDocumentRequirementAction,
    initialActionState
  );

  const previewDocument = useMemo(() => requirements.find(r => r.document?.id === previewDocumentId)?.document ?? null, [requirements, previewDocumentId]);

  const selectedRow = useMemo(
    () => requirements.find((row) => row.type === selectedType) ?? null,
    [requirements, selectedType]
  );

  const isDialogOpen = selectedType !== NO_DOCUMENT_VALUE;
  const closeDialog = () => setSelectedType(NO_DOCUMENT_VALUE);

  const isOfficeSubmission = documentSubmissionMode === "office";
  const requiredRows = requirements.filter((row) => row.isRequired);
  const hasRejected = requiredRows.some((row) => row.status === "rejected");
  const hasUnreviewed = requiredRows.some((row) => row.document && row.status === "pending");
  const hasMissingRequired = requiredRows.some((row) => !row.document);
  const canComplete =
    isOfficeSubmission ||
    requiredRows.every((row) => Boolean(row.document) && row.status === "verified");
  
  // If the application is already past the document verification stage, hide the complete button
  const showCompleteForm = applicationStatus === "inspection_completed" || applicationStatus === "under_review";
  const isVerificationComplete = !showCompleteForm && canComplete;

  if (requirements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
        No document requirements are configured yet.
      </div>
    );
  }

  if (isOfficeSubmission && !isVerificationComplete) {
    return (
      <VerificationDisclosure
        requirements={requirements}
        isOfficeSubmission={isOfficeSubmission}
        isVerificationComplete={isVerificationComplete}
      >
        <div className="space-y-8">
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6">
            <p className="text-sm font-semibold text-foreground mb-2">Office Document Verification</p>
            <p className="text-sm text-muted-foreground mb-4">
              The applicant chose to submit and verify their physical documents at the office. Please verify the following requirements manually:
            </p>
            <ul className="space-y-2 mb-6">
              {requirements.map((req) => (
                <li key={req.type} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-foreground">{req.label}</span>
                  <form action={requirementAction} className="shrink-0">
                    <input type="hidden" name="applicationId" value={applicationId} />
                    <input type="hidden" name="documentType" value={req.type} />
                    <label className="sr-only" htmlFor={`office-requirement-${req.type}`}>Requirement level for {req.label}</label>
                    <select
                      id={`office-requirement-${req.type}`}
                      name="isRequired"
                      key={`${req.type}-${req.isRequired}`}
                      defaultValue={String(req.isRequired)}
                      disabled={!showCompleteForm || requirementPending}
                      onChange={(event) => event.currentTarget.form?.requestSubmit()}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    >
                      <option value="true">Required</option>
                      <option value="false">Optional</option>
                    </select>
                  </form>
                </li>
              ))}
            </ul>
            <FormMessage state={requirementState} />

            {showCompleteForm && (
              <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Manual verification completion
                  </p>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    By clicking this button, you certify that you have physically inspected and verified all the required documents at the office.
                  </p>
                </div>

                <form action={formAction} className="shrink-0">
                  <input type="hidden" name="applicationId" value={applicationId} />
                  <Button
                    type="submit"
                    loading={pending}
                    disabled={!canComplete}
                    className="w-full sm:w-auto"
                  >
                    Verify Documents
                  </Button>
                  <div className="mt-2 text-right">
                    <FormMessage state={state} />
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </VerificationDisclosure>
    );
  }

  return (
    <VerificationDisclosure
      requirements={requirements}
      isOfficeSubmission={isOfficeSubmission}
      isVerificationComplete={isVerificationComplete}
    >
      <div className="space-y-8">
      {isVerificationComplete && (
        <div className="flex flex-col gap-6 rounded-2xl bg-primary/5 p-8 sm:flex-row sm:items-center sm:justify-between border border-primary/10">
          <div className="space-y-2">
            <p className="text-lg font-bold text-foreground flex items-center gap-3 tracking-tight">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Verification Complete
            </p>
            <p className="text-sm text-muted-foreground max-w-xl font-medium leading-relaxed">
              All document requirements have been fulfilled. The application can now proceed to the next stage of the workflow.
            </p>
          </div>
          <Button asChild className="shrink-0 w-full sm:w-auto" size="lg">
            <a href={`/api/applications/${applicationId}/export-documents`} download>
              <Download className="mr-2 h-4 w-4" />
              Download ZIP Archive
            </a>
          </Button>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-none">
        <div className="border-b border-border/70 px-4 py-3">
          <FormMessage state={requirementState} />
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Requirement</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.map((row) => (
              <TableRow key={row.type}>
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.label}</span>
                      <Badge variant={row.isRequired ? "default" : "outline"}>
                        {row.isRequired ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <form action={requirementAction}>
                      <input type="hidden" name="applicationId" value={applicationId} />
                      <input type="hidden" name="documentType" value={row.type} />
                      <label className="sr-only" htmlFor={`requirement-${row.type}`}>Requirement level for {row.label}</label>
                      <select
                        id={`requirement-${row.type}`}
                        name="isRequired"
                        key={`${row.type}-${row.isRequired}`}
                        defaultValue={String(row.isRequired)}
                        disabled={!showCompleteForm || requirementPending}
                        onChange={(event) => event.currentTarget.form?.requestSubmit()}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      >
                        <option value="true">Required</option>
                        <option value="false">Optional</option>
                      </select>
                    </form>
                  </div>
                </TableCell>
                <TableCell className="max-w-[150px] sm:max-w-[250px]">
                  {row.document ? (
                    <button 
                      onClick={() => setPreviewDocumentId(row.document!.id)} 
                      className="block truncate text-primary hover:underline text-left w-full" 
                      title={row.document.file_name}
                    >
                      {row.document.file_name}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Not uploaded</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status === "missing" ? "pending" : row.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedType(row.type)}
                  >
                    {row.status === "pending" || row.status === "rejected" ? "Review" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showCompleteForm && (
        <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Manual verification completion
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Review the uploaded documents above. Once you confirm that the applicant has provided all the necessary documents for their specific ownership situation, click here to advance the application.
            </p>
            {hasRejected && (
              <p className="text-xs font-medium text-destructive">Please resolve all rejected documents first.</p>
            )}
            {hasUnreviewed && !hasRejected && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-500">Please review all uploaded documents first.</p>
            )}
            {hasMissingRequired && !hasRejected && !hasUnreviewed && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-500">Required documents are still missing.</p>
            )}
          </div>
          
          <form action={formAction} className="shrink-0">
            <input type="hidden" name="applicationId" value={applicationId} />
            <Button 
              type="submit" 
              loading={pending} 
              disabled={!canComplete}
              className="w-full sm:w-auto"
            >
              Complete Document Verification
            </Button>
            <div className="mt-2 text-right">
              <FormMessage state={state} />
            </div>
          </form>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRow?.label}</DialogTitle>
          </DialogHeader>
          
          {selectedRow ? (
            <div className="mt-2">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedRow.document
                      ? "Review the uploaded file and tag it as valid or invalid."
                      : "No file uploaded for this requirement yet."}
                  </p>
                </div>
                <StatusBadge status={selectedRow.status === "missing" ? "pending" : selectedRow.status} />
              </div>

              {selectedRow.document ? (
                <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                  <div className="min-w-0 rounded-xl border border-border/60 p-4">
                    <DocumentPreview key={selectedRow.document.id} document={selectedRow.document} compact />
                  </div>
                  <div className="xl:sticky xl:top-6">
                    <DocumentReviewForm
                      key={selectedRow.document.id}
                      document={selectedRow.document}
                      showPreview={false}
                      onReviewed={closeDialog}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/10 p-8 text-center">
                  <p className="text-sm font-medium">No uploaded file</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select another requirement with a file, or leave a workflow note for the applicant about this missing document.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocumentId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewDocument?.file_name}</DialogTitle>
          </DialogHeader>
          {previewDocument && (
            <div className="mt-4">
              <DocumentPreview document={previewDocument} />
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </VerificationDisclosure>
  );
}
