import { PaymentSchedulerForm } from "@/components/admin/payment-scheduler-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { areDocumentsReadyForPayment } from "@/lib/document-workflow";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

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

export default async function AdminPaymentsPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentProfile();
  const [{ data: payments }, { data: applications }] = await Promise.all([
    supabase
      .from("payments")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("due_date", { ascending: true }),
    supabase
      .from("applications")
      .select("id, full_name, service_type, status, document_submission_mode, document_review_note, inspections(status, plumbing_approved, inspected_at), documents(*), payments(id)")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
  ]);

  const readyToSchedule = (applications ?? []).filter((application) => {
    const inspections =
      ((application.inspections as {
        status?: string | null;
        plumbing_approved?: boolean | null;
      }[] | undefined) ?? []);
    const documents = ((application.documents as typeof application.documents) ?? []) as never[];
    const existingPayments = ((application.payments as { id: string }[] | undefined) ?? []).length;

    return (
      existingPayments === 0 &&
      inspections.some((inspection) => inspection.status === "approved") &&
      areDocumentsReadyForPayment(application)
    );
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
          <CardTitle>Ready to schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {readyToSchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No applications are waiting for payment scheduling right now.
            </p>
          ) : (
            <div className="grid gap-4">
              {readyToSchedule.map((application) => (
                <div key={application.id} className="space-y-3 rounded-lg border border-border/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{application.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {application.service_type.replaceAll("_", " ")}
                      </p>
                    </div>
                    <StatusBadge status={application.status} />
                  </div>
                  <PaymentSchedulerForm applicationId={application.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Scheduled payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(payments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment schedules have been created yet.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Office payment schedule</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payments ?? []).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatPaymentType(payment.payment_type)}</TableCell>
                      <TableCell>{formatScheduledAmount(payment.amount)}</TableCell>
                      <TableCell>{getOfficePaymentDisplay(payment)}</TableCell>
                      <TableCell><StatusBadge status={payment.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="grid gap-4">
                {(payments ?? []).map((payment) => (
                  <PaymentSchedulerForm key={payment.id} applicationId={payment.application_id} payment={payment} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
