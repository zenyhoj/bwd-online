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

export function InspectionForm({ inspection, pulledPlumberName }: InspectionFormProps) {
  const [state, formAction, pending] = useActionState(updateInspectionAction, initialActionState);
  const hasPulledPlumber = Boolean(pulledPlumberName?.trim());
  const [inspectedAtValue, setInspectedAtValue] = useState(inspection.inspected_at?.slice(0, 10) ?? "");

  useEffect(() => {
    if (inspection.inspected_at?.slice(0, 10)) {
      setInspectedAtValue(inspection.inspected_at.slice(0, 10));
      return;
    }

    setInspectedAtValue(new Date().toISOString().slice(0, 10));
  }, [inspection.inspected_at]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection findings</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="inspectionId" value={inspection.id} />
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={inspection.status}
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
            >
              <option value="true">Approved</option>
              <option value="false">Disapproved</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="inspectedAt">Inspected at</Label>
            <Input id="inspectedAt" name="inspectedAt" type="date" value={inspectedAtValue} onChange={(event) => setInspectedAtValue(event.target.value)} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" defaultValue={inspection.remarks ?? ""} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="materialList">Material list</Label>
            <Textarea
              id="materialList"
              name="materialList"
              defaultValue={inspection.material_list ?? ""}
              placeholder="List the required materials for the applicant, one item per line."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" name="latitude" type="number" step="0.0000001" defaultValue={inspection.latitude ?? undefined} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" name="longitude" type="number" step="0.0000001" defaultValue={inspection.longitude ?? undefined} required />
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
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referenceAccountName">Reference account name</Label>
            <Input
              id="referenceAccountName"
              name="referenceAccountName"
              defaultValue={inspection.reference_account_name ?? ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input id="accountNumber" name="accountNumber" defaultValue={inspection.account_number ?? ""} required />
          </div>
          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={!hasPulledPlumber} loading={pending}>
              Save inspection
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
