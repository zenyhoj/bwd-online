"use client";

import { useActionState, useEffect, useState } from "react";

import { updateInspectionAction } from "@/actions/inspections";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { Inspection } from "@/types";

type InspectionFormProps = {
  inspection: Inspection;
  pulledPlumberName: string | null;
};

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function InspectionForm({ inspection, pulledPlumberName }: InspectionFormProps) {
  const [state, formAction, pending] = useActionState(updateInspectionAction, initialActionState);
  const hasPulledPlumber = Boolean(pulledPlumberName?.trim());
  const isApproved = inspection.status === "approved";
  const [isEditingApproved, setIsEditingApproved] = useState(!isApproved);
  const isReadOnly = isApproved && !isEditingApproved;
  const [inspectedAtValue, setInspectedAtValue] = useState(() => toDateTimeLocalValue(inspection.inspected_at));

  useEffect(() => {
    if (inspection.inspected_at) {
      setInspectedAtValue(toDateTimeLocalValue(inspection.inspected_at));
      return;
    }

    setInspectedAtValue(toDateTimeLocalValue(new Date().toISOString()));
  }, [inspection.inspected_at]);

  return (
    <Card className={isReadOnly ? "border-border/70 bg-muted/30" : undefined}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Inspection findings</CardTitle>
            {isReadOnly ? (
              <p className="mt-2 text-sm text-muted-foreground">
                This approved inspection is locked. Use edit to make corrections.
              </p>
            ) : null}
          </div>
          {isApproved ? (
            <Button
              type="button"
              variant={isEditingApproved ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsEditingApproved((value) => !value)}
              className="w-full sm:w-auto"
            >
              {isEditingApproved ? "Cancel edit" : "Edit"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className={`grid gap-4 md:grid-cols-2 ${isReadOnly ? "opacity-75" : ""}`}>
          <input type="hidden" name="inspectionId" value={inspection.id} />
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={inspection.status}
              disabled={isReadOnly}
            >
              <option value="in_progress">In progress</option>
              <option value="approved">Approved</option>
              <option value="rejected">Disapproved</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plumbingApproved">Plumbing result</Label>
            <select
              id="plumbingApproved"
              name="plumbingApproved"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={inspection.plumbing_approved ? "true" : "false"}
              disabled={isReadOnly}
            >
              <option value="true">Approved</option>
              <option value="false">Disapproved</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="inspectedAt">Inspected at</Label>
            <Input
              id="inspectedAt"
              name="inspectedAt"
              type="datetime-local"
              value={inspectedAtValue}
              onChange={(event) => setInspectedAtValue(event.target.value)}
              disabled={isReadOnly}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" defaultValue={inspection.remarks ?? ""} disabled={isReadOnly} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="materialList">Material list</Label>
            <Textarea
              id="materialList"
              name="materialList"
              defaultValue={inspection.material_list ?? ""}
              placeholder="List the required materials for the applicant, one item per line."
              disabled={isReadOnly}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" name="latitude" type="number" step="0.0000001" defaultValue={inspection.latitude ?? undefined} disabled={isReadOnly} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" name="longitude" type="number" step="0.0000001" defaultValue={inspection.longitude ?? undefined} disabled={isReadOnly} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pulledPlumberName">Plumber (from application)</Label>
            <Input id="pulledPlumberName" value={pulledPlumberName ?? ""} readOnly disabled />
            {!hasPulledPlumber ? (
              <p className="text-xs text-destructive">Set an accredited plumber in Inhouse installation before saving.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="referenceAccountNumber">Reference account number</Label>
            <Input
              id="referenceAccountNumber"
              name="referenceAccountNumber"
              defaultValue={inspection.reference_account_number ?? ""}
              disabled={isReadOnly}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referenceAccountName">Reference account name</Label>
            <Input
              id="referenceAccountName"
              name="referenceAccountName"
              defaultValue={inspection.reference_account_name ?? ""}
              disabled={isReadOnly}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input id="accountNumber" name="accountNumber" defaultValue={inspection.account_number ?? ""} disabled={isReadOnly} required />
          </div>
          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={!hasPulledPlumber || isReadOnly} loading={pending}>
              Save inspection
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
