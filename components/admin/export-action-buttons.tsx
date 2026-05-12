"use client";

import { useState } from "react";
import JSZip from "jszip";
import { format } from "date-fns";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getExportMetadataAction, updateLastExportAtAction } from "@/actions/maintenance";

interface ExportActionButtonsProps {
  hasPending: boolean;
}

export function ExportActionButtons({ hasPending }: ExportActionButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (mode: "new" | "all") => {
    try {
      setIsExporting(true);
      setError(null);
      setProgress(0);
      setStatus("Fetching document list...");

      const metadataResult = await getExportMetadataAction(mode);
      if ("error" in metadataResult) {
        throw new Error(metadataResult.error);
      }

      const documents = metadataResult.documents;
      if (documents.length === 0) {
        setStatus("No new documents found.");
        setIsExporting(false);
        return;
      }

      const zip = new JSZip();
      const total = documents.length;
      let completed = 0;

      setStatus(`Downloading ${total} files...`);

      // Download files sequentially or in small batches to avoid overloading
      for (const doc of documents) {
        try {
          const response = await fetch(`/api/storage/download?path=${encodeURIComponent(doc.file_path)}`);
          if (!response.ok) throw new Error(`Failed to download ${doc.file_name}`);
          
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();

          // Prepare folder name
          const appData = Array.isArray(doc.applications) ? doc.applications[0] : doc.applications;
          const rawFullName = appData?.full_name || "Unknown_Applicant";
          const applicantName = rawFullName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
          const appIdShort = appData?.id ? String(appData.id).slice(0, 8) : "unknown";
          const folderName = `${applicantName}_${appIdShort}`;

          zip.folder(folderName)?.file(doc.file_name, arrayBuffer);
          
          completed++;
          const currentProgress = Math.round((completed / total) * 100);
          setProgress(currentProgress);
        } catch (err) {
          console.error(err);
          // Continue with other files even if one fails
        }
      }

      setStatus("Generating ZIP archive...");
      const zipContent = await zip.generateAsync({ type: "blob" }, (metadata) => {
        // JSZip also provides internal progress for zipping
        // We can mix it in or just stay at 100 for downloads
      });

      const dateStr = format(new Date(), "yyyyMMdd_HHmmss");
      const filename = mode === "new" 
        ? `new_documents_${dateStr}.zip`
        : `all_documents_${dateStr}.zip`;

      // Trigger download
      const url = window.URL.createObjectURL(zipContent);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatus("Updating export timestamp...");
      await updateLastExportAtAction();

      setStatus("Export completed successfully!");
      setTimeout(() => setStatus(null), 5000);
    } catch (err: any) {
      setError(err.message || "An error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button 
          onClick={() => handleExport("new")} 
          disabled={!hasPending || isExporting}
          className="gap-2 relative overflow-hidden"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {!hasPending ? "No New Documents" : isExporting ? "Exporting..." : "Download Pending Documents (ZIP)"}
        </Button>

        <Button 
          variant="outline" 
          onClick={() => handleExport("all")} 
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export ALL Documents (Ignore Date)
        </Button>
      </div>

      {isExporting && (
        <div className="space-y-2 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-primary flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              {status}
            </span>
            <span className="font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {status && !isExporting && !error && (
        <div className="flex items-center gap-2 text-sm text-green-600 animate-in fade-in duration-500">
          <CheckCircle2 className="h-4 w-4" />
          {status}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive animate-in shake duration-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
