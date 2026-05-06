"use client";

import { useActionState } from "react";

import { createInspectorAction, deleteInspectorAction } from "@/actions/inspectors";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InspectorRecord } from "@/types";

type InspectorRegistryFormProps = {
  inspectors: InspectorRecord[];
};

function DeleteInspectorButton({ inspectorId }: { inspectorId: string }) {
  const [state, formAction, pending] = useActionState(deleteInspectorAction, initialActionState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="inspectorId" value={inspectorId} />
      <Button type="submit" variant="outline" loading={pending}>
        Remove
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function InspectorRegistryForm({ inspectors }: InspectorRegistryFormProps) {
  const [state, formAction, pending] = useActionState(createInspectorAction, initialActionState);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add inspector</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <FormMessage state={state} />
            </div>
            <div className="md:col-span-2">
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
        <CardContent className="space-y-4">
          {inspectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inspectors registered yet.</p>
          ) : (
            inspectors.map((inspector) => (
              <div
                key={inspector.id}
                className="flex flex-col gap-4 rounded-xl border border-border/80 p-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{inspector.is_active ? "Active" : "Archived"}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{inspector.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {inspector.phone ? `Phone: ${inspector.phone}` : "No phone recorded"}
                  </p>
                  {inspector.notes ? <p className="text-sm text-muted-foreground">{inspector.notes}</p> : null}
                </div>
                <DeleteInspectorButton inspectorId={inspector.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
