import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ApplicantSwitcher } from "@/components/applicant/applicant-switcher";
import { InhouseInstallationForm } from "@/components/shared/inhouse-installation-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { areDocumentsReadyForPayment } from "@/lib/document-workflow";
import { formatDate, formatDateTime } from "@/lib/format";
import { getAccreditedPlumbers, getApplicants, getApplicantApplications, getApplicantSeminarState } from "@/lib/queries";

function getScheduledInspectionDate(application: {
  inspections?: { scheduled_at?: string | null; inspected_at?: string | null }[];
}) {
  const scheduledDates =
    (application.inspections ?? [])
      .map((inspection) => inspection.scheduled_at ?? null)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return scheduledDates[0] ?? null;
}

function getLatestPayment(application: {
  payments?: {
    payment_type?: string | null;
    due_date?: string | null;
    office_payment_at?: string | null;
    status?: string | null;
    paid_at?: string | null;
  }[];
}) {
  const payments =
    [...(application.payments ?? [])].sort((a, b) => {
      const aTime = new Date(a.paid_at ?? a.due_date ?? 0).getTime();
      const bTime = new Date(b.paid_at ?? b.due_date ?? 0).getTime();
      return bTime - aTime;
    });

  return payments[0] ?? null;
}

function getEffectiveWorkflowStatus(application: {
  status?: string | null;
  inhouse_installation_completed?: boolean | null;
  payments?: {
    due_date?: string | null;
    paid_at?: string | null;
    status?: string | null;
  }[];
}) {
  const latestPayment = getLatestPayment(application);

  if (application.status === "converted") {
    return "converted";
  }

  if (latestPayment?.status === "paid" && application.inhouse_installation_completed) {
    return "approved";
  }

  if (latestPayment?.status === "paid") {
    return "payment received";
  }

  return application.status ?? "submitted";
}

function formatPaymentType(value: string | null | undefined) {
  if (!value) {
    return "Not scheduled";
  }

  if (value === "inspection_fee") {
    return "Application fee";
  }

  return value.replaceAll("_", " ");
}

function getPrimaryAction({
  allCompleted,
  hasApplication,
  hasPayment,
  documentsReady,
  selectedApplicantId,
  selectedApplicationId
}: {
  allCompleted: boolean;
  hasApplication: boolean;
  hasPayment: boolean;
  documentsReady: boolean;
  selectedApplicantId?: string | null;
  selectedApplicationId?: string | null;
}) {
  if (!selectedApplicantId) {
    return {
      href: "/applicant/new",
      label: "Create new applicant"
    };
  }

  if (!allCompleted) {
    return {
      href: `/applicant/seminar?applicant=${selectedApplicantId}`,
      label: "Continue seminar"
    };
  }

  if (!hasApplication) {
    return {
      href: `/applicant/applications/new?applicant=${selectedApplicantId}`,
      label: "Start application"
    };
  }

  if (hasPayment) {
    return {
      href: selectedApplicationId ? `/applicant/payments?application=${selectedApplicationId}` : "/applicant/payments",
      label: "Open payments"
    };
  }

  if (!documentsReady) {
    return {
      href: selectedApplicationId ? `/applicant/documents?application=${selectedApplicationId}` : "/applicant/documents",
      label: "Upload documents"
    };
  }

  return {
    href: selectedApplicationId ? `/applicant/documents?application=${selectedApplicationId}` : "/applicant/documents",
    label: "Review documents"
  };
}

type ApplicantDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  return typeof searchParams?.[key] === "string" ? searchParams[key] : undefined;
}

export default async function ApplicantDashboardPage({ searchParams }: ApplicantDashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  
  const applicants = await getApplicants();
  const selectedApplicantId = getStringParam(resolvedSearchParams, "applicant") ?? applicants[0]?.id ?? null;
  const selectedApplicant = applicants.find((a) => a.id === selectedApplicantId) ?? applicants[0];

  const applications = selectedApplicantId ? await getApplicantApplications(selectedApplicantId) : [];
  const seminarState = selectedApplicantId ? await getApplicantSeminarState(selectedApplicantId) : { items: [], progress: [], completedCount: 0, allCompleted: false };
  const plumbers = await getAccreditedPlumbers();

  const selectedApplicationId = getStringParam(resolvedSearchParams, "application") ?? applications[0]?.id ?? null;
  const selectedApplication = applications.find((application) => application.id === selectedApplicationId) ?? applications[0];
  
  const latestPayment = selectedApplication ? getLatestPayment(selectedApplication) : null;
  const effectiveWorkflowStatus = selectedApplication ? getEffectiveWorkflowStatus(selectedApplication) : null;
  const latestInspectionSchedule = selectedApplication ? getScheduledInspectionDate(selectedApplication) : null;
  const documentsReady = selectedApplication ? areDocumentsReadyForPayment(selectedApplication, selectedApplication.documents ?? []) : false;
  const selectedApplicantName = selectedApplicant?.full_name ?? "No applicant selected";

  const historyView = getStringParam(resolvedSearchParams, "history") === "all" ? "all" : "selected";
  const historyApplications = historyView === "all" ? applications : selectedApplication ? [selectedApplication] : [];

  const primaryAction = getPrimaryAction({
    allCompleted: seminarState.allCompleted,
    hasApplication: Boolean(selectedApplication),
    hasPayment: Boolean(latestPayment),
    documentsReady,
    selectedApplicantId: selectedApplicant?.id,
    selectedApplicationId: selectedApplication?.id
  });

  const selectedHistoryHref = (() => {
    const query = new URLSearchParams();
    if (selectedApplicant?.id) query.set("applicant", selectedApplicant.id);
    if (selectedApplication?.id) query.set("application", selectedApplication.id);
    return `/applicant${query.toString() ? `?${query.toString()}` : ""}`;
  })();

  const allHistoryHref = (() => {
    const query = new URLSearchParams();
    if (selectedApplicant?.id) query.set("applicant", selectedApplicant.id);
    if (selectedApplication?.id) query.set("application", selectedApplication.id);
    query.set("history", "all");
    return `/applicant?${query.toString()}`;
  })();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Applicant records</h2>
        <p className="text-sm text-muted-foreground">Choose the applicant record you want to view.</p>
      </div>

      <ApplicantSwitcher
        applicants={applicants}
        selectedApplicantId={selectedApplicant?.id}
        basePath="/applicant"
        queryParams={{ history: historyView === "all" ? "all" : undefined }}
        title="Records"
        description="Switch records."
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Your application - {selectedApplicantName}</h1>
            <p className="text-sm text-muted-foreground">One place to check status, inspection, and payment.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {effectiveWorkflowStatus ? <StatusBadge status={effectiveWorkflowStatus} /> : null}
            <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              {applications.length} application{applications.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              Seminar {seminarState.completedCount}/{seminarState.items.length || 0}
            </span>
          </div>

          {selectedApplication && !latestPayment && !documentsReady ? (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
              <p className="font-medium text-primary">Next step: upload documents</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your application cannot be scheduled for payment yet. Upload the required documents first, or inform BWD that you will bring them to the office.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border/70 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Inspection</p>
              <p className="mt-1 font-medium">{formatDateTime(latestInspectionSchedule)}</p>
            </div>
            <div className="rounded-lg border border-border/70 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Payment</p>
              <div className="mt-1">{latestPayment ? <StatusBadge status={latestPayment.status ?? "scheduled"} /> : "Not scheduled"}</div>
            </div>
            <div className="rounded-lg border border-border/70 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Plumbing</p>
              <p className="mt-1 font-medium">
                {selectedApplication?.inhouse_installation_completed_at
                  ? `Completed ${formatDate(selectedApplication.inhouse_installation_completed_at)}`
                  : "Pending"}
              </p>
            </div>
            <div className={`rounded-lg border p-3 ${
              selectedApplication?.water_meter_installation_scheduled_at
                ? "border-primary/50 bg-primary/5 shadow-sm"
                : "border-border/70"
            }`}>
              <p className={`text-xs uppercase tracking-[0.14em] ${selectedApplication?.water_meter_installation_scheduled_at ? "text-primary font-semibold" : "text-muted-foreground"}`}>Water Meter</p>
              <p className={`mt-1 font-medium ${selectedApplication?.water_meter_installation_scheduled_at ? "text-primary" : ""}`}>
                {selectedApplication?.water_meter_installation_scheduled_at
                  ? formatDateTime(selectedApplication.water_meter_installation_scheduled_at)
                  : "Not scheduled"}
              </p>
            </div>
          </div>

          <Button asChild className="h-10 w-full md:w-auto">
            <Link href={primaryAction.href}>
              {primaryAction.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Application history</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {historyView === "all"
                  ? "Most recent activity across all applicant records."
                  : "Most recent activity for the selected applicant record."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant={historyView === "selected" ? "secondary" : "outline"} size="sm">
                <Link href={selectedHistoryHref}>Selected only</Link>
              </Button>
              <Button asChild variant={historyView === "all" ? "secondary" : "outline"} size="sm">
                <Link href={allHistoryHref}>Show all</Link>
              </Button>
              <span className="rounded-full border border-border/80 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                {historyApplications.length} showing
              </span>
              <span className="rounded-full border border-border/80 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                {applications.filter((application) => getLatestPayment(application)).length} with payment
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {historyApplications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No applicant information has been submitted yet. Finish the seminar and complete your form to appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {historyApplications.map((application) => {
                const latestApplicationPayment = getLatestPayment(application);
                const effectiveApplicationWorkflowStatus = getEffectiveWorkflowStatus(application);

                return (
                  <div key={application.id} className="rounded-lg border border-border/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{application.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {application.service_type.replaceAll("_", " ")} - Submitted {formatDateTime(application.submitted_at)}
                        </p>
                      </div>
                      <StatusBadge status={effectiveApplicationWorkflowStatus} />
                    </div>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
                      <p><span className="text-muted-foreground">Inspection:</span> {formatDateTime(getScheduledInspectionDate(application))}</p>
                      <p><span className="text-muted-foreground">Payment:</span> {latestApplicationPayment ? formatPaymentType(latestApplicationPayment.payment_type) : "Not scheduled"}</p>
                      <p><span className="text-muted-foreground">Plumbing:</span> {application.inhouse_installation_completed_at ? formatDate(application.inhouse_installation_completed_at) : "Pending"}</p>
                      <p><span className="text-muted-foreground">Water Meter:</span> {application.water_meter_installation_scheduled_at ? <span className="font-semibold text-primary">{formatDateTime(application.water_meter_installation_scheduled_at)}</span> : "Not scheduled"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedApplication ? (
        <InhouseInstallationForm
          applicationId={selectedApplication.id}
          plumbers={plumbers}
          currentPlumberId={selectedApplication.accredited_plumber_id}
          currentCompletedAt={selectedApplication.inhouse_installation_completed_at}
          currentProofImageUrl={selectedApplication.inhouse_installation_proof_image_url}
          currentSignedAt={selectedApplication.inhouse_installation_signed_at}
          isCompleted={selectedApplication.inhouse_installation_completed}
        />
      ) : null}
    </div>
  );
}
