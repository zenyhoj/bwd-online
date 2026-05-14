"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Upload, FileText, CheckCircle2, Image as ImageIcon, Loader2 } from "lucide-react";

import { uploadDocumentAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { documentTypeLabels } from "@/lib/constants";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { compressImage } from "@/lib/image-utils";

type DocumentUploadFormProps = {
  applicationId: string;
  allowedDocumentTypes?: string[];
};

export function DocumentUploadForm({ applicationId, allowedDocumentTypes }: DocumentUploadFormProps) {
  const [state, formAction, pending] = useActionState(uploadDocumentAction, initialActionState);
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const documentEntries = Object.entries(documentTypeLabels).filter(([value]) =>
    allowedDocumentTypes ? allowedDocumentTypes.includes(value) : true
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Check both inputs
    const fileInput = fileInputRef.current?.files?.[0];
    const cameraInput = cameraInputRef.current?.files?.[0];
    const file = fileInput || cameraInput;

    if (!file) {
      // Let the browser show required error if we had a hidden required input, 
      // but since we are using custom buttons, we should handle it.
      return;
    }

    const finalFormData = new FormData();
    finalFormData.append("applicationId", applicationId);
    finalFormData.append("documentType", formData.get("documentType") as string);

    if (file.type.startsWith("image/")) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        finalFormData.append("file", compressed);
      } catch (err) {
        console.error("Compression failed", err);
        finalFormData.append("file", file);
      } finally {
        setIsCompressing(false);
      }
    } else {
      finalFormData.append("file", file);
    }

    formAction(finalFormData);
  };

  return (
    <Card className="border-primary/20 shadow-sm overflow-hidden">
      <CardHeader className="bg-primary/[0.02] border-b border-primary/10">
        <CardTitle className="text-xl">Upload required documents</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentType" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Document type
              </Label>
              <select
                id="documentType"
                name="documentType"
                className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue={documentEntries[0]?.[0] ?? "owner_valid_id"}
              >
                {documentEntries.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select file or take photo
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 py-8"
                  onClick={() => {
                    cameraInputRef.current?.click();
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <Camera className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Take Photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 py-8"
                  onClick={() => {
                    fileInputRef.current?.click();
                    if (cameraInputRef.current) cameraInputRef.current.value = "";
                  }}
                >
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Upload File</span>
                </Button>
              </div>
              
              {/* Hidden Inputs */}
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {selectedFileName && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {selectedFileName.toLowerCase().endsWith(".pdf") ? (
                  <FileText className="h-5 w-5" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFileName}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Ready to upload</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <p className="text-[10px] leading-relaxed text-muted-foreground uppercase tracking-wider font-medium text-center bg-muted/30 p-2 rounded-lg">
              Files are automatically compressed to save space while maintaining clarity.
            </p>
            
            <Button 
              type="submit" 
              disabled={pending || isCompressing || !selectedFileName} 
              className="h-12 w-full text-sm font-bold shadow-lg shadow-primary/20"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing Image...
                </>
              ) : pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Start Upload"
              )}
            </Button>
          </div>
          
          <FormMessage state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
