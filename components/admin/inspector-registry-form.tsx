"use client";

import { useActionState, useEffect, useState } from "react";

import { createInspectorAction, deleteInspectorAction, updateInspectorAction } from "@/actions/inspectors";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InspectorRecord } from "@/types";

type InspectorRegistryFormProps = {
  inspectors: InspectorRecord[];
};

function EditInspectorRow({ inspector, onCancel }: { inspector: InspectorRecord; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(updateInspectorAction, initialActionState);

  useEffect(() => {
    if (state.success) {
      onCancel();
    }
  }, [onCancel, state.success]);

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={5} className="p-4">
        <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="inspectorId" value={inspector.id} />
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor={`edit-name-${inspector.id}`} className="text-xs">
              Full name
            </Label>
            <Input
              id={`edit-name-${inspector.id}`}
              name="fullName"
              defaultValue={inspector.full_name}
              className="h-10"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-position-${inspector.id}`} className="text-xs">
              Position
            </Label>
            <Input
              id={`edit-position-${inspector.id}`}
              name="position"
              defaultValue={inspector.position ?? ""}
              className="h-10"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-phone-${inspector.id}`} className="text-xs">
              Contact number
            </Label>
            <Input
              id={`edit-phone-${inspector.id}`}
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={inspector.phone ?? ""}
              className="h-10"
              required
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" size="sm" loading={pending}>
              Save changes
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <FormMessage state={state} autoHideSuccessMs={3000} />
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}

function DeleteInspectorButton({ inspectorId }: { inspectorId: string }) {
  const [state, formAction, pending] = useActionState(deleteInspectorAction, initialActionState);

  return (
    <form action={formAction}>
      <input type="hidden" name="inspectorId" value={inspectorId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        loading={pending}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Remove
      </Button>
      {!state.success && state.message ? <p className="mt-1 text-xs text-destructive">{state.message}</p> : null}
    </form>
  );
}

export function InspectorRegistryForm({ inspectors }: InspectorRegistryFormProps) {
  const [state, formAction, pending] = useActionState(createInspectorAction, initialActionState);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add inspector</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" autoComplete="name" className="h-11" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" name="position" className="h-11" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Contact number</Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" className="h-11" required />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FormMessage state={state} autoHideSuccessMs={3000} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" loading={pending}>
                Add inspector
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspector registry</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {inspectors.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No inspectors registered yet.</p>
          ) : (
            <Table className="min-w-[42rem]">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Contact number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspectors.map((inspector) =>
                  editingId === inspector.id ? (
                    <EditInspectorRow key={inspector.id} inspector={inspector} onCancel={() => setEditingId(null)} />
                  ) : (
                    <TableRow key={inspector.id}>
                      <TableCell className="font-semibold text-foreground">{inspector.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{inspector.position ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{inspector.phone ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className={
                            inspector.is_active
                              ? "inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
                              : "inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                          }
                        >
                          {inspector.is_active ? "Active" : "Archived"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(inspector.id)}>
                            Edit
                          </Button>
                          <DeleteInspectorButton inspectorId={inspector.id} />
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
