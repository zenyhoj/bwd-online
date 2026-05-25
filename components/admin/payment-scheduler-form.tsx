"use client";

import { useActionState, useEffect, useState } from "react";

import { schedulePaymentAction, updatePaymentStatusAction } from "@/actions/payments";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getFeeBreakdown } from "@/lib/fee-schedule";
import type { Payment } from "@/types";

type PaymentSchedulerFormProps = {
  applicationId: string;
  payment?: Payment;
  canSchedule?: boolean;
  scheduleHint?: string;
  classification?: string | null;
};

export function PaymentSchedulerForm({
  applicationId,
  payment,
  canSchedule = true,
  scheduleHint,
  classification
}: PaymentSchedulerFormProps) {
  const action = payment ? updatePaymentStatusAction : schedulePaymentAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [minOfficePaymentAt, setMinOfficePaymentAt] = useState("");
  const isPaidLocked = payment?.status === "paid";
  
  // Default to 'paid' when editing an existing scheduled payment, to prioritize confirmation.
  const [mode, setMode] = useState<"scheduled" | "paid">("paid");

  useEffect(() => {
    setMinOfficePaymentAt(
      new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    );
  }, []);

  // ── Fee breakdown card ──────────────────────────────────────────────────────
  const fee = getFeeBreakdown(classification);

  // ── Locked read-only view once payment is paid ──────────────────────────────
  if (isPaidLocked && payment) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-5">
        <div>
          <h3 className="font-semibold text-emerald-900">Payment completed</h3>
          <p className="text-sm text-emerald-800">
            This record is locked because it is already marked as paid.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
            <div className="mt-3">
              <StatusBadge status="paid" />
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Amount</p>
            <p className="mt-3 text-lg font-semibold">{formatCurrency(payment.amount ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Official receipt no.</p>
            <p className="mt-3 font-semibold">{payment.official_receipt_number?.trim() || "—"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date of payment</p>
            <p className="mt-3 font-semibold">{formatDateTime(payment.paid_at)}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Editable form ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Fee breakdown info card */}
      {fee && (
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Application fee — {fee.label}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total fee: </span>
              <span className="font-semibold">{formatCurrency(fee.total)}</span>
            </div>
            {fee.installment && (
              <div className="text-muted-foreground">
                <span>Installment option: </span>
                <span className="font-medium text-foreground">{formatCurrency(fee.installment.initial)} initial</span>
                <span> + </span>
                <span className="font-medium text-foreground">{formatCurrency(fee.installment.monthly)}/mo × {fee.installment.months} months</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div>
        <h3 className="font-semibold">{payment ? "Manage payment" : "Schedule office payment"}</h3>
        <p className="text-sm text-muted-foreground">
          {payment
            ? "Confirm the payment details or reschedule the office visit."
            : "Set the exact date and time when the applicant should report to the BWD office for payment."}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        {payment ? <input type="hidden" name="paymentId" value={payment.id} /> : null}
        {!payment ? <input type="hidden" name="applicationId" value={applicationId} /> : null}

        {payment ? (
          <div className="space-y-5">
            {/* Action Selector */}
            <div className="space-y-2">
              <Label htmlFor={`mode-${payment.id}`}>Action</Label>
              <select
                id={`mode-${payment.id}`}
                name="status"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={mode}
                onChange={(e) => setMode(e.target.value as "scheduled" | "paid")}
              >
                <option value="paid">Confirm payment</option>
                <option value="scheduled">Reschedule payment date</option>
              </select>
            </div>

            {mode === "paid" ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                {/* Official receipt amount */}
                <div className="space-y-2">
                  <Label htmlFor={`amount-${payment.id}`}>Receipt amount</Label>
                  <Input
                    id={`amount-${payment.id}`}
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={payment.amount > 0 ? payment.amount : undefined}
                    placeholder="0.00"
                    required
                    className="h-11"
                  />
                </div>

                {/* Official receipt no. */}
                <div className="space-y-2">
                  <Label htmlFor={`or-${payment.id}`}>Receipt number</Label>
                  <Input
                    id={`or-${payment.id}`}
                    name="officialReceiptNumber"
                    defaultValue={payment.official_receipt_number ?? ""}
                    placeholder="E.g. 123456"
                    className="h-11"
                  />
                </div>

                {/* Date of payment */}
                <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                  <Label htmlFor={`paidAt-${payment.id}`}>Date of payment</Label>
                  <Input
                    id={`paidAt-${payment.id}`}
                    name="paidAt"
                    type="datetime-local"
                    min={payment.office_payment_at ? new Date(new Date(payment.office_payment_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined}
                    defaultValue={
                      payment.paid_at
                        ? new Date(new Date(payment.paid_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                        : payment.office_payment_at
                        ? new Date(new Date(payment.office_payment_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                        : minOfficePaymentAt
                    }
                    className="h-11"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor={`officePaymentAt-${payment.id}`}>New office payment date and time</Label>
                <Input
                  id={`officePaymentAt-${payment.id}`}
                  name="officePaymentAt"
                  type="datetime-local"
                  min={minOfficePaymentAt || undefined}
                  defaultValue={
                    payment.office_payment_at
                      ? new Date(new Date(payment.office_payment_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                      : minOfficePaymentAt
                  }
                  required
                  className="h-11"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor={`paymentType-${applicationId}`}>Payment type</Label>
              <Input
                id={`paymentType-${applicationId}`}
                value="Application fee"
                readOnly
                disabled
                className="h-11"
              />
              <input type="hidden" name="paymentType" value="inspection_fee" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`officePaymentAt-${applicationId}`}>Office payment date and time</Label>
              <Input
                id={`officePaymentAt-${applicationId}`}
                name="officePaymentAt"
                type="datetime-local"
                min={minOfficePaymentAt || undefined}
                required
                disabled={!canSchedule}
                className="h-11"
              />
            </div>
          </div>
        )}

        {!payment && !canSchedule ? (
          <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-sm text-muted-foreground">
            {scheduleHint ?? "Office payment can be scheduled after the inspector approves the inhouse inspection."}
          </div>
        ) : null}

        <div className="space-y-4 pt-2">
          {state.message && <FormMessage state={state} />}
          <Button type="submit" disabled={!payment && !canSchedule} loading={pending} className="w-full sm:w-auto px-6">
            {payment ? (mode === "paid" ? "Confirm payment" : "Save new schedule") : "Set office payment date"}
          </Button>
        </div>
      </form>
    </div>
  );
}
