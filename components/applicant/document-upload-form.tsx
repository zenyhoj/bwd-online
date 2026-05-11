"use client";

import { useActionState } from "react";

import { uploadDocumentAction } from "@/actions/documents";
import { initialActionState } from "@/actions/state";
import { documentTypeLabels } from "@/lib/constants";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DocumentUploadFormProps = {
  applicationId: string;
  allowedDocumentTypes?: string[];
};

export function DocumentUploadForm({ applicationId, allowedDocumentTypes }: DocumentUploadFormProps) {
  const [state, formAction, pending] = useActionState(uploadDocumentAction, initialActionState);
  const documentEntries = Object.entries(documentTypeLabels).filter(([value]) =>
    allowedDocumentTypes ? allowedDocumentTypes.includes(value) : true
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload required documents</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1.1fr)_auto] lg:items-start">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document type</Label>
              <select
                id="documentType"
                name="documentType"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="h-11"
                required
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Accepted: PDF, JPG, JPEG, or PNG under 1 MB. If your file is too large, compress it by lowering image resolution/quality or using a PDF compressor.
              </p>
            </div>
            <div className="lg:pt-7">
              <Button type="submit" loading={pending} className="h-11 w-full lg:w-auto">
                Upload
              </Button>
            </div>
          </div>
          <FormMessage state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
