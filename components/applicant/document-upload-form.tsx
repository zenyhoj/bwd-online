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
        <form action={formAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="space-y-2">
            <Label htmlFor="documentType">Document type</Label>
            <select
              id="documentType"
              name="documentType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={documentEntries[0]?.[0] ?? "tax_declaration_title"}
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
            <Input id="file" name="file" type="file" required />
          </div>
          <Button type="submit" loading={pending}>
            Upload
          </Button>
          <div className="md:col-span-3">
            <FormMessage state={state} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
