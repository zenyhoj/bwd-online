import { DocumentUploadForm } from "@/components/applicant/document-upload-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDocumentDownloadHref } from "@/lib/document-links";
import type { Application, Document } from "@/types";
import { areDocumentsReadyForPayment, getDocumentRequirementRows } from "@/lib/document-workflow";
import { cn } from "@/lib/utils";

type ApplicantDocumentPanelProps = {
  application: Application;
  documents: Document[];
  isUploadUnlocked: boolean;
  isActive?: boolean;
};

export function ApplicantDocumentPanel({ application, documents, isUploadUnlocked, isActive }: ApplicantDocumentPanelProps) {
  const requirementRows = getDocumentRequirementRows(documents);
  const documentsReady = isUploadUnlocked ? areDocumentsReadyForPayment(application) : false;
  
  const actionableTypes = documentsReady ? [] : requirementRows
    .filter((row) => row.status === "missing" || row.status === "rejected")
    .map((row) => row.type);
    
  const displayRows = documentsReady 
    ? requirementRows.filter((row) => row.document !== null) 
    : requirementRows;

  return (
    <div id="documents" className="space-y-6 scroll-mt-24">
      <div className="space-y-4">
        {actionableTypes.length > 0 ? (
          <>
            <DocumentUploadForm applicationId={application.id} allowedDocumentTypes={actionableTypes} isActive={isActive} />
          </>
        ) : (
          <Card className={cn(
            "border-border/70 shadow-sm transition-all duration-300 relative overflow-hidden",
            isActive && "ring-2 ring-primary border-primary/50 shadow-xl shadow-primary/10 bg-[linear-gradient(180deg,rgba(37,99,235,0.015),transparent)]"
          )}>
            {isActive && (
              <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary animate-pulse-slow">
                Active Next Step
              </span>
            )}
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
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Document requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={documentsReady ? "verified" : "pending"} />
            <span className="text-sm text-muted-foreground">
              {documentsReady
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
    </div>
  );
}
