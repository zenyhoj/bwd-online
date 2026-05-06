"use client";

import { useActionState, useState } from "react";

import {
  createAccreditedPlumberAction,
  deleteAccreditedPlumberAction,
  updateAccreditedPlumberAction
} from "@/actions/accredited-plumbers";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AccreditedPlumber } from "@/types";

type AccreditedPlumberFormProps = {
  plumbers: AccreditedPlumber[];
};

// ── Inline edit row ────────────────────────────────────────────────────────────
function EditPlumberRow({
  plumber,
  onCancel
}: {
  plumber: AccreditedPlumber;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateAccreditedPlumberAction, initialActionState);

  return (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={5} className="p-4">
        <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="plumberId" value={plumber.id} />
          <div className="space-y-1">
            <Label className="text-xs">Full name</Label>
            <Input name="fullName" defaultValue={plumber.full_name} required className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phone</Label>
            <Input name="phone" defaultValue={plumber.phone ?? ""} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">License no.</Label>
            <Input name="licenseNumber" defaultValue={plumber.license_number ?? ""} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Area / Notes</Label>
            <Input name="notes" defaultValue={plumber.notes ?? ""} className="h-9 text-sm" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2 flex-wrap">
            <Button type="submit" size="sm" loading={pending}>
              Save changes
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <FormMessage state={state} />
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}

// ── Delete button ──────────────────────────────────────────────────────────────
function DeletePlumberButton({ plumberId }: { plumberId: string }) {
  const [state, formAction, pending] = useActionState(deleteAccreditedPlumberAction, initialActionState);

  return (
    <form action={formAction}>
      <input type="hidden" name="plumberId" value={plumberId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        loading={pending}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        Delete
      </Button>
      {state.message && !state.success ? (
        <p className="mt-1 text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function AccreditedPlumberForm({ plumbers }: AccreditedPlumberFormProps) {
  const [state, formAction, pending] = useActionState(createAccreditedPlumberAction, initialActionState);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle>Add accredited plumber</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">Full name <span className="text-destructive">*</span></Label>
              <Input id="fullName" name="fullName" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License no.</Label>
              <Input id="licenseNumber" name="licenseNumber" className="h-11" />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="notes">Area / Notes</Label>
              <Input id="notes" name="notes" className="h-11" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3 flex-wrap">
              <Button type="submit" loading={pending}>
                Add plumber
              </Button>
              <FormMessage state={state} />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Registry table */}
      <Card>
        <CardHeader>
          <CardTitle>Accredited plumber registry</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {plumbers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No accredited plumbers registered yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License no.</TableHead>
                  <TableHead>Area / Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plumbers.map((plumber) =>
                  editingId === plumber.id ? (
                    <EditPlumberRow
                      key={plumber.id}
                      plumber={plumber}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <TableRow key={plumber.id}>
                      <TableCell className="font-medium">
                        {plumber.full_name}
                        {!plumber.is_active && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Archived
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{plumber.phone ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{plumber.license_number ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{plumber.notes ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(plumber.id)}
                          >
                            Edit
                          </Button>
                          <DeletePlumberButton plumberId={plumber.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
