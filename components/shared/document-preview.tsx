import { getDocumentDownloadHref, getDocumentViewHref } from "@/lib/document-links";
import { Button } from "@/components/ui/button";
import type { Document } from "@/types";

type DocumentPreviewProps = {
  document: Document;
  compact?: boolean;
};

function getDocumentPreviewKind(document: Document) {
  const mimeType = document.mime_type ?? "";
  const fileName = document.file_name.toLowerCase();

  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    return "pdf";
  }

  if (mimeType === "image/jpeg" || mimeType === "image/png" || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png")) {
    return "image";
  }

  return "other";
}

export function DocumentPreview({ document, compact = false }: DocumentPreviewProps) {
  const previewKind = getDocumentPreviewKind(document);
  const viewHref = getDocumentViewHref(document.id);
  const downloadHref = getDocumentDownloadHref(document.id);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-medium text-muted-foreground"
            title={document.file_name}
          >
            {document.file_name}
          </p>
          <p className="text-xs text-muted-foreground/80">{document.mime_type ?? "Document file"}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={viewHref} target="_blank" rel="noreferrer">
              Open
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={downloadHref}>
              Download
            </a>
          </Button>
        </div>
      </div>

      {previewKind === "image" ? (
        <div className={`overflow-hidden rounded-lg border border-border/70 bg-muted/20 ${compact ? "max-w-xl" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewHref} alt={document.file_name} className="max-h-[420px] w-full object-contain bg-white" />
        </div>
      ) : null}

      {previewKind === "pdf" ? (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/20">
          <iframe
            title={document.file_name}
            src={viewHref}
            className={`w-full bg-white ${compact ? "h-[320px]" : "h-[480px]"}`}
          />
        </div>
      ) : null}

      {previewKind === "other" ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
          Preview is not available for this file type. Use Open or Download to inspect the document.
        </div>
      ) : null}
    </div>
  );
}
