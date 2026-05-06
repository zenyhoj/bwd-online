"use client";

import { useActionState } from "react";

import { createConcessionaireAction } from "@/actions/concessionaires";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConcessionaireFormProps = {
  applicationId: string;
  profileId: string;
};

export function ConcessionaireForm({ applicationId, profileId }: ConcessionaireFormProps) {
  const [state, formAction, pending] = useActionState(createConcessionaireAction, initialActionState);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Convert to concessionaire</h3>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="profileId" value={profileId} />
          <div className="space-y-2">
            <Label htmlFor={`concessionaireNumber-${applicationId}`}>Concessionaire no.</Label>
            <Input id={`concessionaireNumber-${applicationId}`} name="concessionaireNumber" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`connectionDate-${applicationId}`}>Connection date</Label>
            <Input id={`connectionDate-${applicationId}`} name="connectionDate" type="date" required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`meterNumber-${applicationId}`}>Meter number</Label>
            <Input id={`meterNumber-${applicationId}`} name="meterNumber" />
          </div>
          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" loading={pending}>
              Create concessionaire
            </Button>
          </div>
        </form>
    </div>
  );
}
