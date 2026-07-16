import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicantSwitcher } from "@/components/applicant/applicant-switcher";
import { ApplicationSwitcher } from "@/components/applicant/application-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { areDocumentsReadyForPayment, getDocumentRequirementRows } from "@/lib/document-workflow";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getApplicants, getApplicantApplications } from "@/lib/queries";

const applicationFeeGuide = [
  {
    title: "Residential & Commercial C Connection",
    details: [
      "Php 3,000.00 total application fee.",
      "Php 1,500.00 may be paid as the initial payment.",
      "The remaining Php 1,500.00 may be paid in monthly installments for six (6) months.",
      "Equivalent monthly added charge: Php 250.00 until fully paid.",
      "The installment balance must be paid on time to avoid service disconnection."
    ]
  },
  {
    title: "Commercial A and B",
    details: ["Php 4,000.00 application fee."]
  },
  {
    title: "Commercial / Industrial & Bulk Connection",
    details: ["Php 5,000.00 application fee."]
  }
];

const documentaryRequirements = [
  "Photocopy of Valid ID (owner).",
  "Authorization Letter from Applicant (authorized representative).",
  "Photocopy of Valid ID (authorized representative).",
  "Special Power of Attorney (SPA for accounts named after organizations or establishments).",
  "Lot Title.",
  "Tax Declaration.",
  "Deed of Sale (if the title is not under the applicant name).",
  "Authorization from the Lot and House Owner (if not lot owner).",
  "ID of Lot Owner.",
  "Official Receipt of Water Permit."
];

function formatScheduledAmount(amount: number) {
  return amount > 0 ? formatCurrency(amount) : "To be set on official receipt";
}

function formatPaymentType(value: string | null | undefined) {
  if (!value) {
    return "Application fee";
  }

  if (value === "inspection_fee") {
    return "Application fee";
  }

  return value.replaceAll("_", " ");
}

function getOfficePaymentDisplay(payment: { office_payment_at?: string | null; due_date: string }) {
  return payment.office_payment_at ? formatDateTime(payment.office_payment_at) : formatDate(payment.due_date);
}

function getStringParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  return typeof searchParams?.[key] === "string" ? searchParams[key] : undefined;
}

type ApplicantPaymentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ApplicantPaymentsPage({ searchParams }: ApplicantPaymentsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  // Use admin client — ownership is already verified via getApplicants() which
  // only returns applicants belonging to the authenticated profile.
  const supabase = createSupabaseAdminClient();

  const applicants = await getApplicants();
  const selectedApplicantId = getStringParam(resolvedSearchParams, "applicant") ?? applicants[0]?.id ?? null;

  if (!selectedApplicantId && applicants.length === 0) {
    redirect("/applicant");
  }

  const effectiveApplicantId = selectedApplicantId ?? applicants[0]?.id ?? null;
  const applicationList = effectiveApplicantId ? await getApplicantApplications(effectiveApplicantId) : [];

  const selectedApplicationId = getStringParam(resolvedSearchParams, "application") ?? applicationList[0]?.id ?? null;
  const application = applicationList.find((item) => item.id === selectedApplicationId) ?? applicationList[0] ?? null;

  const { data: payments } = application
    ? await supabase.from("payments").select("*").eq("application_id", application.id).order("due_date", { ascending: true })
    : { data: [] };
  const inspectionApproved =
    application?.inspections?.some((inspection) => inspection.status === "approved") ?? false;
  const documentRows = application
    ? getDocumentRequirementRows(
        application.documents ?? [],
        application.optional_document_types ?? [],
        application.classified_document_types ?? [],
        application.status
      )
    : [];
  const documentsReady =
    application && inspectionApproved
      ? areDocumentsReadyForPayment(application)
      : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          View the date you should go to the office for payment, plus your payment status.
        </p>
      </div>

      <Alert className="isolate z-0 flex items-start gap-3 rounded-xl border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 text-blue-900 shadow-sm dark:border-blue-900/30 dark:from-blue-950/30 dark:to-sky-950/20 dark:text-blue-200">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500 dark:text-yellow-400" />
        <div className="flex-1">
          <AlertTitle className="mb-2 font-bold tracking-tight">Important Payment Notice</AlertTitle>
          <AlertDescription className="space-y-3">
          <p>
            The payment information on this page is <strong>only intended for the application fee</strong> and not for water bills.
          </p>
          <div className="rounded-lg bg-white/60 p-4 dark:bg-black/20">
            <p className="font-semibold mb-2">How to pay your water bills:</p>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              <li>
                <strong>GCash:</strong> Upon login, navigate to Bills &rarr; Water Utilities &rarr; Search for <strong>Buenavista Water District (with the square logo)</strong> and provide the exact Account Name and 11 Digit Account Number with Dash.
              </li>
              <li>
                <strong>Maya:</strong> Upon login, navigate to Bills &rarr; Water Utility &rarr; Search for <strong>Buenavista Water District (with the square logo)</strong> and provide the exact Account Name and 11 Digit Account Number with Dash.
              </li>
              <li>
                <strong>On-site:</strong> You may also pay your water bills at <strong>Wing-on Buenavista</strong>.
              </li>
            </ul>
          </div>
        </AlertDescription>
        </div>
      </Alert>
      <ApplicantSwitcher
        applicants={applicants}
        selectedApplicantId={effectiveApplicantId}
        basePath="/applicant/payments"
        queryParams={{ application: selectedApplicationId ?? undefined }}
        title="Choose applicant"
        description="Switch between applicants to view their payment schedule."
      />
      {applicationList.length > 1 ? (
        <ApplicationSwitcher
          applications={applicationList}
          selectedApplicationId={application?.id}
          basePath="/applicant/payments"
          queryParams={{ applicant: effectiveApplicantId ?? undefined }}
          title="Choose application"
          description="This applicant has multiple applications. Choose one to view payments."
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Office payment schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            Applicant: <span className="font-medium text-foreground">{application?.full_name ?? "No applicant selected"}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {application && (payments ?? []).length === 0 && !inspectionApproved ? (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
              <p className="font-medium text-primary">Inspection approval is still required for payment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can submit documents now. Payment scheduling opens after the in-house inspection is approved and the required documents are verified.
              </p>
            </div>
          ) : null}

          {application && (payments ?? []).length === 0 && inspectionApproved && !documentsReady ? (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
              <p className="font-medium text-primary">Documents are required before payment scheduling</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The admin can only schedule your payment after all required documents are verified, or after you choose to bring the documents to the office.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {documentRows
                  .filter((row) => row.isRequired && row.status !== "verified")
                  .map((row) => (
                    <li key={row.type}>
                      {row.label}
                      {row.status === "rejected" && row.reviewNote ? ` - ${row.reviewNote}` : row.status === "missing" ? " - not uploaded yet" : ""}
                    </li>
                  ))}
              </ul>
              <div className="mt-4">
                <Button asChild>
                  <Link
                    href={
                      `/applicant/documents?${new URLSearchParams({
                        ...(effectiveApplicantId ? { applicant: effectiveApplicantId } : {}),
                        ...(application?.id ? { application: application.id } : {})
                      }).toString()}`
                    }
                  >
                    Go to documents
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          {(payments ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No payment schedule has been set yet.<br />
              The admin will schedule your office payment after inspection approval and document verification.
            </div>
          ) : (
            <div className="space-y-3">
              {(payments ?? []).map((payment) => (
                <div
                  key={payment.id}
                  className={`relative overflow-hidden rounded-xl border p-5 ${
                    payment.status === "scheduled"
                      ? "border-primary/30 bg-primary/[0.04] shadow-sm"
                      : payment.status === "paid"
                      ? "border-emerald-200/80 bg-emerald-50/40"
                      : "border-border/70 bg-muted/20"
                  }`}
                >
                  <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${
                    payment.status === "scheduled" ? "bg-primary" :
                    payment.status === "paid" ? "bg-emerald-500" : "bg-border"
                  }`} />

                  <div className="pl-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {formatPaymentType(payment.payment_type)}
                        </p>
                        <p className="text-2xl font-bold tracking-tight">
                          {formatScheduledAmount(payment.amount)}
                        </p>
                      </div>
                      <StatusBadge status={payment.status} />
                    </div>

                    <div className={`mt-4 rounded-lg p-3 ${
                      payment.status === "scheduled"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/40 border border-border/60"
                    }`}>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {payment.status === "paid" ? "Paid on" : "Go to BWD Office on"}
                      </p>
                      <p className={`mt-1 text-lg font-semibold ${payment.status === "scheduled" ? "text-primary" : ""}`}>
                        {getOfficePaymentDisplay(payment)}
                      </p>
                      {payment.status === "scheduled" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Bring your documentary requirements to the office on this date.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}


          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Application fee guide</p>
              <div className="mt-4 space-y-4">
                {applicationFeeGuide.map((item) => (
                  <div key={item.title} className="space-y-2">
                    <p className="font-medium">{item.title}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {item.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Documentary requirements to bring to BWD Office
              </p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {documentaryRequirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
