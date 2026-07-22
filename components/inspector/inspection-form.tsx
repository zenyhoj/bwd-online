"use client";

import { useActionState, useEffect, useState, useRef } from "react";

import { searchReferenceAccountsAction, updateInspectionAction } from "@/actions/inspections";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import type { Inspection, InspectionStatus } from "@/types";

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
  const [statusValue, setStatusValue] = useState<InspectionStatus>(inspection.status);
  const [plumbingApprovedValue, setPlumbingApprovedValue] = useState(inspection.plumbing_approved === true);
  const [inspectedAtValue, setInspectedAtValue] = useState(() => toDateTimeLocalValue(inspection.inspected_at));

  const [searchQuery, setSearchQuery] = useState(inspection.reference_account_name ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const refAccNumRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    const result = await searchReferenceAccountsAction(searchQuery);
    if (result.success && result.data) {
      setSearchResults(result.data);
    } else {
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const handleSelectAccount = (account: any) => {
    setSearchQuery(account.name);
    setSearchResults([]);
    setHasSearched(false);
    
    if (latRef.current) latRef.current.value = account.latitude;
    if (lngRef.current) lngRef.current.value = account.longitude;
    if (refAccNumRef.current && account.accountNumber) refAccNumRef.current.value = account.accountNumber;
  };

  const resetEditableValues = () => {
    setStatusValue(inspection.status);
    setPlumbingApprovedValue(inspection.plumbing_approved === true);
    setInspectedAtValue(
      inspection.inspected_at ? toDateTimeLocalValue(inspection.inspected_at) : toDateTimeLocalValue(new Date().toISOString())
    );
  };

  const handleEditToggle = () => {
    if (isEditingApproved) {
      resetEditableValues();
      setIsEditingApproved(false);
      return;
    }

    setIsEditingApproved(true);
  };

  useEffect(() => {
    setStatusValue(inspection.status);
    setPlumbingApprovedValue(inspection.plumbing_approved === true);

    if (inspection.inspected_at) {
      setInspectedAtValue(toDateTimeLocalValue(inspection.inspected_at));
      return;
    }

    setInspectedAtValue(toDateTimeLocalValue(new Date().toISOString()));
  }, [inspection.id, inspection.inspected_at, inspection.plumbing_approved, inspection.status]);

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
              onClick={handleEditToggle}
              className="w-full sm:w-auto"
            >
              {isEditingApproved ? "Cancel edit" : "Edit"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${isReadOnly ? "opacity-75" : ""}`}>
          <input type="hidden" name="inspectionId" value={inspection.id} />
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusValue}
              onChange={(event) => {
                const nextStatus = event.target.value as InspectionStatus;
                setStatusValue(nextStatus);
                if (nextStatus !== "approved") {
                  setPlumbingApprovedValue(false);
                }
              }}
              disabled={isReadOnly}
            >
              <option value="in_progress">In progress</option>
              <option value="approved">Approved</option>
              <option value="rejected">Disapproved</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plumbingApproved">Plumbing result</Label>
            <select
              id="plumbingApproved"
              name="plumbingApproved"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusValue === "approved" && plumbingApprovedValue ? "true" : "false"}
              onChange={(event) => setPlumbingApprovedValue(event.target.value === "true")}
              disabled={isReadOnly || statusValue !== "approved"}
            >
              <option value="true">Approved</option>
              <option value="false">Disapproved</option>
            </select>
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label htmlFor="pulledPlumberName">Plumber (from application)</Label>
            <Input id="pulledPlumberName" value={pulledPlumberName ?? ""} readOnly disabled />
            {!hasPulledPlumber ? (
              <p className="text-[10px] leading-tight text-destructive">Set an accredited plumber in Inhouse installation.</p>
            ) : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" defaultValue={inspection.remarks ?? ""} disabled={isReadOnly} required rows={2} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="materialList">Material list</Label>
            <Textarea
              id="materialList"
              name="materialList"
              defaultValue={inspection.material_list ?? ""}
              placeholder="List the required materials for the applicant, one item per line."
              disabled={isReadOnly}
              required
              rows={2}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 relative">
            <Label htmlFor="referenceAccountName">Reference account name</Label>
            <div className="flex gap-2">
              <Input
                id="referenceAccountName"
                name="referenceAccountName"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isReadOnly}
                required
              />
              {!isReadOnly && (
                <Button type="button" variant="secondary" onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {hasSearched && searchResults.length === 0 && !isSearching && (
              <p className="text-xs text-muted-foreground mt-1">No reference accounts found.</p>
            )}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full top-[100%] mt-1 rounded-md border border-border bg-background shadow-md">
                <ul className="max-h-48 overflow-auto py-1">
                  {searchResults.map((acc, i) => (
                    <li
                      key={i}
                      className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                      onClick={() => handleSelectAccount(acc)}
                    >
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">Acc: {acc.accountNumber || "N/A"} | Lat: {acc.latitude}, Lng: {acc.longitude}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referenceAccountNumber">Reference account number</Label>
            <Input
              id="referenceAccountNumber"
              name="referenceAccountNumber"
              defaultValue={inspection.reference_account_number ?? ""}
              disabled={isReadOnly}
              required
              ref={refAccNumRef}
              placeholder="0441-12-031"
              pattern="\d{4}-\d{2}-\d{3}"
              title="Account number must be in XXXX-XX-XXX format (e.g. 0441-12-031)"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input
              id="accountNumber"
              name="accountNumber"
              defaultValue={inspection.account_number ?? ""}
              disabled={isReadOnly}
              required
              placeholder="0441-12-031"
              pattern="\d{4}-\d{2}-\d{3}"
              title="Account number must be in XXXX-XX-XXX format (e.g. 0441-12-031)"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" name="latitude" type="number" step="0.0000001" defaultValue={inspection.latitude ?? undefined} disabled={isReadOnly} required ref={latRef} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" name="longitude" type="number" step="0.0000001" defaultValue={inspection.longitude ?? undefined} disabled={isReadOnly} required ref={lngRef} />
          </div>
          <div className="sm:col-span-2">
            <FormMessage state={state} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!hasPulledPlumber || isReadOnly} loading={pending}>
              Save inspection
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
