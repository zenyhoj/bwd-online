import { PaymentSchedulerForm } from "@/components/admin/payment-scheduler-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { areDocumentsReadyForPayment } from "@/lib/document-workflow";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { Payment } from "@/types";

type PaymentWorkflowApplication = {
  id: string;
  full_name: string;
  service_type: string;
  status: string;
  inspections?: { status?: string | null; plumbing_approved?: boolean | null }[] | null;
  documents?: unknown[] | null;
  payments?: Payment[] | null;
  concessionaires?: { id: string }[] | null;
};

type PaymentWorkflowItem = {
  application: PaymentWorkflowApplication;
  payment: Payment | null;
};

function formatPaymentType(paymentType: string) {
  if (paymentType === "inspection_fee") {
    return "Application fee";
  }

  return paymentType.replaceAll("_", " ");
}

function formatScheduledAmount(amount: number) {
  return amount > 0 ? formatCurrency(amount) : "To be set on OR";
}

function getOfficePaymentDisplay(payment: { office_payment_at?: string | null; due_date: string }) {
  return payment.office_payment_at ? formatDateTime(payment.office_payment_at) : formatDate(payment.due_date);
}

function getLatestPayment(payments: Payment[]) {
  return [...payments].sort((a, b) => {
    const aTime = new Date(a.paid_at ?? a.office_payment_at ?? a.due_date ?? 0).getTime();
    const bTime = new Date(b.paid_at ?? b.office_payment_at ?? b.due_date ?? 0).getTime();
    return bTime - aTime;
  })[0] ?? null;
}

export default async function AdminPaymentsPage() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();
  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("id, full_name, service_type, status, document_submission_mode, document_review_note, documents_verified_at, inspections(status, plumbing_approved, inspected_at), documents(*), payments(*), concessionaires(id)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  if (applicationsError) {
    throw applicationsError;
  }

  const paymentWorkflowItems = ((applications ?? []) as PaymentWorkflowApplication[])
    .flatMap<PaymentWorkflowItem>((application) => {
      const inspections =
        ((application.inspections as { status?: string | null; plumbing_approved?: boolean | null }[] | undefined) ?? []);
      const payments = ((application.payments as Payment[] | undefined) ?? []);
      const concessionaires = ((application.concessionaires as { id: string }[] | undefined) ?? []);
      const latestPayment = getLatestPayment(payments);
      const hasApprovedInspection = inspections.some((inspection) => inspection.status === "approved");
      const hasPaidPayment = payments.some((payment) => payment.status === "paid");
      const isConverted = application.status === "converted" || concessionaires.length > 0;

      if (isConverted || !hasApprovedInspection || !areDocumentsReadyForPayment(application as never) || hasPaidPayment) {
        return [];
      }

      return [{ application, payment: latestPayment }];
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Set the office payment date for inspection-approved applications and update collection status.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentWorkflowItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No applicants are waiting for payment scheduling or payment confirmation right now.
            </p>
          ) : (
            <div className="grid gap-4">
              {paymentWorkflowItems.map(({ application, payment }) => (
                <div key={application.id} className="space-y-3 rounded-lg border border-border/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{application.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {application.service_type.replaceAll("_", " ")}
                      </p>
                    </div>
                    <StatusBadge status={payment?.status ?? application.status} />
                  </div>
                  {payment ? (
                    <div className="grid gap-3 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Payment</p>
                        <p className="mt-1 font-semibold">{formatPaymentType(payment.payment_type)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Amount</p>
                        <p className="mt-1 font-semibold">{formatScheduledAmount(payment.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Schedule</p>
                        <p className="mt-1 font-semibold">{getOfficePaymentDisplay(payment)}</p>
                      </div>
                    </div>
                  ) : null}
                  <PaymentSchedulerForm applicationId={application.id} payment={payment ?? undefined} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
