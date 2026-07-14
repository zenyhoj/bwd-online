"use client";

import { useActionState, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Pencil, Search } from "lucide-react";

import { updateApplicantFullByAdminAction } from "@/actions/applicants";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BARANGAYS } from "@/lib/constants";
import { PaginationControls } from "@/components/shared/pagination-controls";
import type { PaginatedResult } from "@/types";

type ApplicantRecord = Record<string, unknown>;

type ApplicantListFormProps = {
  applicantsPaginated: PaginatedResult<ApplicantRecord>;
};

// Helper to parse name back
function parseName(fullName: string) {
  if (!fullName) return { lastName: "", firstName: "", middleInitial: "" };
  const parts = fullName.split(", ");
  const lastName = parts[0] || "";
  const rest = parts.slice(1).join(", ") || "";
  const words = rest.split(" ");
  let middleInitial = "";
  let firstName = rest;

  if (words.length > 1) {
    const lastWord = words[words.length - 1];
    if (lastWord.length <= 2 || lastWord.endsWith(".")) {
      middleInitial = lastWord.replace(".", "");
      firstName = words.slice(0, -1).join(" ");
    }
  }

  return { lastName, firstName, middleInitial };
}

// Helper to parse address back
function parseAddress(fullAddress: string) {
  if (!fullAddress) return { specificAddress: "", barangay: "" };
  // Remove suffix
  const cleaned = fullAddress.replace(/, Buenavista, Agusan del Norte$/i, "").trim();
  const parts = cleaned.split(",").map(s => s.trim());
  const barangay = parts.length > 1 ? parts.pop() || "" : "";
  const specificAddress = parts.join(", ");
  
  // Try to match barangay to constants if possible, else just keep specific address as is
  const isValidBarangay = BARANGAYS.includes(barangay as any);
  if (isValidBarangay) {
    return { specificAddress, barangay };
  } else {
    return { specificAddress: cleaned, barangay: "" };
  }
}

function EditApplicantRow({ applicant, onCancel }: { applicant: ApplicantRecord; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(updateApplicantFullByAdminAction, initialActionState);
  
  const { lastName, firstName, middleInitial } = parseName(String(applicant.full_name || ""));
  const { specificAddress, barangay } = parseAddress(String(applicant.address || ""));

  return (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={7} className="p-4">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="applicantId" value={String(applicant.id)} />
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">First Name <span className="text-destructive">*</span></Label>
              <Input name="firstName" defaultValue={firstName} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Middle Initial</Label>
              <Input name="middleInitial" defaultValue={middleInitial} maxLength={3} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last Name <span className="text-destructive">*</span></Label>
              <Input name="lastName" defaultValue={lastName} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sex <span className="text-destructive">*</span></Label>
              <select name="sex" defaultValue={String(applicant.gender || "Male")} required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Age <span className="text-destructive">*</span></Label>
              <Input name="age" type="number" defaultValue={String(applicant.age || "")} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone <span className="text-destructive">*</span></Label>
              <Input name="cellphoneNumber" defaultValue={String(applicant.cellphone_number || "")} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
              <Input name="emailAddress" type="email" defaultValue={String(applicant.email_address || "")} required className="h-9 text-sm" />
            </div>

            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs">Specific Address <span className="text-destructive">*</span></Label>
              <Input name="specificAddress" defaultValue={specificAddress} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Barangay <span className="text-destructive">*</span></Label>
              <select name="barangay" defaultValue={barangay} required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                <option value="" disabled>Select</option>
                {BARANGAYS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Purpose <span className="text-destructive">*</span></Label>
              <select name="purposeOfSeminar" defaultValue={String(applicant.purpose_of_seminar || "new_service")} required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                <option value="new_service">New Service</option>
                <option value="reconnection">Reconnection</option>
                <option value="change_name">Change Name</option>
                <option value="others">Others</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" size="sm" loading={pending}>Save changes</Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
          <FormMessage state={state} />
        </form>
      </TableCell>
    </TableRow>
  );
}

export function ApplicantListForm({ applicantsPaginated }: ApplicantListFormProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentSearch = searchParams?.get("search") || "";

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get("search") as string;
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (search) {
        params.set("search", search);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset page when searching
      router.push(`/admin/applicants?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <form onSubmit={handleSearch} className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            type="search"
            placeholder="Search by name or address..."
            defaultValue={currentSearch}
            className="pl-9 bg-background"
          />
        </form>
      </div>

      {applicantsPaginated.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
            <Pencil className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No applicants found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {currentSearch ? "Try adjusting your search query." : "Applicants who apply will appear here."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Sex/Age</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applicantsPaginated.data.map((applicant) => {
              if (editingId === String(applicant.id)) {
                return (
                  <EditApplicantRow
                    key={String(applicant.id)}
                    applicant={applicant}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }
              return (
                <TableRow key={String(applicant.id)}>
                  <TableCell className="font-medium">{String(applicant.full_name || "Unknown")}</TableCell>
                  <TableCell>{String(applicant.gender || "-")} / {String(applicant.age || "-")}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{String(applicant.cellphone_number || "-")}</span>
                      <span className="text-xs text-muted-foreground">{String(applicant.email_address || "-")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={String(applicant.address || "")}>
                    {String(applicant.address || "-")}
                  </TableCell>
                  <TableCell>
                    {String(applicant.purpose_of_seminar || "-").replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(String(applicant.id))}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      )}
      
      {applicantsPaginated.pageCount > 1 && (
        <PaginationControls
          pagination={applicantsPaginated}
          basePath="/admin/applicants"
          params={{ search: currentSearch }}
        />
      )}
    </div>
  );
}
