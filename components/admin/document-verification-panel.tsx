"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, Download } from "lucide-react";

import { completeDocumentVerificationAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { DocumentReviewForm } from "@/components/admin/document-review-form";
import { DocumentPreview } from "@/components/shared/document-preview";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormMessage } from "@/components/forms/form-message";
import { getDocumentDownloadHref } from "@/lib/document-links";
import type { DocumentRequirementRow } from "@/lib/document-workflow";

type DocumentVerificationPanelProps = {
  applicationId: string;
  applicationStatus: string;
  requirements: DocumentRequirementRow[];
};

const NO_DOCUMENT_VALUE = "__no_document__";

export function DocumentVerificationPanel({ applicationId, applicationStatus, requirements }: DocumentVerificationPanelProps) {
  const [selectedType, setSelectedType] = useState<string>(NO_DOCUMENT_VALUE);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(completeDocumentVerificationAction, initialActionState);

  const previewDocument = useMemo(() => requirements.find(r => r.document?.id === previewDocumentId)?.document ?? null, [requirements, previewDocumentId]);

  const selectedRow = useMemo(
    () => requirements.find((row) => row.type === selectedType) ?? null,
    [requirements, selectedType]
  );

  const isDialogOpen = selectedType !== NO_DOCUMENT_VALUE;
  const closeDialog = () => setSelectedType(NO_DOCUMENT_VALUE);

  const hasRejected = requirements.some((row) => row.status === "rejected");
  const hasUnreviewed = requirements.some((row) => row.document && row.status === "pending");
  const canComplete = !hasRejected && !hasUnreviewed;
  
  // If the application is already past the document verification stage, hide the complete button
  const showCompleteForm = applicationStatus === "inspection_completed" || applicationStatus === "under_review";
  const isVerificationComplete = !showCompleteForm && canComplete && requirements.some((row) => row.document);

  if (requirements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
        No document requirements are configured yet.
      </div>
    );
  }

  return (
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
                <TableCell className="font-medium">{row.label}</TableCell>
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
  );
}
