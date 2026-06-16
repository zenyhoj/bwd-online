import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { ApplicantSwitcher } from "@/components/applicant/applicant-switcher";
import { ApplicationSwitcher } from "@/components/applicant/application-switcher";
import { ApplicantDocumentPanel } from "@/components/applicant/applicant-document-panel";
import { QuickSubmitOfficeButton } from "@/components/applicant/quick-submit-office-button";
import { InhouseInstallationForm } from "@/components/shared/inhouse-installation-form";
import { LinkAccountCard } from "@/components/applicant/link-account-card";
import { UnlinkAccountButton } from "@/components/applicant/unlink-account-button";
import { PushPromptCard } from "@/components/pwa/push-prompt-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { areDocumentsReadyForPayment } from "@/lib/document-workflow";
import { formatDate, formatDateTime } from "@/lib/format";
import { getAccreditedPlumbers, getApplicants, getApplicantApplications, getApplicantSeminarState } from "@/lib/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function getScheduledInspectionDate(application: {
  inspections?: { scheduled_at?: string | null; inspected_at?: string | null; status?: string | null }[];
}) {
  const scheduledDates =
    (application.inspections ?? [])
      .map((inspection) => inspection.scheduled_at ?? null)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return scheduledDates[0] ?? null;
}

function hasApprovedInspection(application: {
  inspections?: { status?: string | null; scheduled_at?: string | null }[];
}) {
  if (!application.inspections || application.inspections.length === 0) return false;
  const latest = [...application.inspections].sort(
    (a, b) => new Date(b.scheduled_at ?? 0).getTime() - new Date(a.scheduled_at ?? 0).getTime()
  )[0];
  return latest?.status === "approved";
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

function getAssignedAccount(application: {
  water_meter_installed_at?: string | null;
  inspections?: {
    account_number?: string | null;
    inspected_at?: string | null;
    scheduled_at?: string | null;
  }[];
  concessionaires?: {
    concessionaire_number?: string | null;
    meter_number?: string | null;
    connection_date?: string | null;
  } | {
    concessionaire_number?: string | null;
    meter_number?: string | null;
    connection_date?: string | null;
  }[];
}) {
  const concessionairesList = application.concessionaires;
  const concessionaire = Array.isArray(concessionairesList) ? concessionairesList[0] : concessionairesList;
  const latestInspectionWithAccount =
    [...(application.inspections ?? [])]
      .filter((inspection) => Boolean(inspection.account_number))
      .sort((a, b) => {
        const aTime = new Date(a.inspected_at ?? a.scheduled_at ?? 0).getTime();
        const bTime = new Date(b.inspected_at ?? b.scheduled_at ?? 0).getTime();
        return bTime - aTime;
      })[0] ?? null;

  return {
    accountNumber: concessionaire?.concessionaire_number ?? latestInspectionWithAccount?.account_number ?? null,
    connectionDate: concessionaire?.connection_date ?? application.water_meter_installed_at ?? null,
    meterNumber: concessionaire?.meter_number ?? null,
    isConverted: Boolean(concessionaire) || Boolean(application.water_meter_installed_at)
  };
}

function getEffectiveWorkflowStatus(application: {
  status?: string | null;
  inhouse_installation_completed?: boolean | null;
  water_meter_installation_scheduled_at?: string | null;
  water_meter_installed_at?: string | null;
  payments?: {
    due_date?: string | null;
    paid_at?: string | null;
    status?: string | null;
  }[];
  inspections?: { status?: string | null; scheduled_at?: string | null }[];
}) {
  const latestPayment = getLatestPayment(application);
  const hasInspectionApproved = hasApprovedInspection(application);
  const hasScheduled = (application.inspections ?? []).length > 0;

  if (application.status === "converted") {
    return "converted";
  }

  if (application.water_meter_installed_at) {
    return "ready for conversion";
  }

  if (application.water_meter_installation_scheduled_at) {
    return "installation scheduled";
  }

  if (latestPayment?.status === "paid") {
    return "ready for installation";
  }

  if (hasInspectionApproved) {
    return "inspection approved";
  }

  if (hasScheduled) {
    const latest = [...(application.inspections ?? [])].sort(
      (a, b) => new Date(b.scheduled_at ?? 0).getTime() - new Date(a.scheduled_at ?? 0).getTime()
    )[0];
    if (latest?.status === "rejected") {
      return "inspection disapproved";
    }
    return "inspection scheduled";
  }

  if (application.inhouse_installation_completed) {
    return "plumbing completed";
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

function formatServiceType(value: string | null | undefined) {
  if (!value) {
    return "Service type not set";
  }

  return value.replaceAll("_", " ");
}

function getPrimaryAction({
  allCompleted,
  hasApplication,
  hasPayment,
  isCompleted,
  inhouseCompleted,
  inspectionApproved,
  documentsReady,
  documentSubmissionMode,
  selectedApplicantId,
  selectedApplicationId
}: {
  allCompleted: boolean;
  hasApplication: boolean;
  hasPayment: boolean;
  isCompleted: boolean;
  inhouseCompleted: boolean;
  inspectionApproved: boolean;
  documentsReady: boolean;
  documentSubmissionMode?: string | null;
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

  if (isCompleted) {
    return null;
  }

  if (hasPayment) {
    return {
      href: selectedApplicationId ? `/applicant/payments?application=${selectedApplicationId}` : "/applicant/payments",
      label: "Open payments"
    };
  }

  if (!inhouseCompleted) {
    return {
      href: selectedApplicationId
        ? `/applicant?applicant=${selectedApplicantId}&application=${selectedApplicationId}#inhouse-installation`
        : "/applicant#inhouse-installation",
      label: "Complete inhouse plumbing"
    };
  }

  if (!inspectionApproved) {
    return {
      href: selectedApplicationId ? `/applicant?applicant=${selectedApplicantId}&application=${selectedApplicationId}` : "/applicant",
      label: "View inspection status"
    };
  }

  if (!documentsReady) {
    if (documentSubmissionMode === "office") {
      return {
        href: selectedApplicationId ? `/applicant?applicant=${selectedApplicantId}&application=${selectedApplicationId}#documents` : "/applicant#documents",
        label: "Wait for office verification"
      };
    }
    return {
      href: selectedApplicationId ? `/applicant?applicant=${selectedApplicantId}&application=${selectedApplicationId}#documents` : "/applicant#documents",
      label: "Upload documents"
    };
  }

  return {
    href: selectedApplicationId ? `/applicant?applicant=${selectedApplicantId}&application=${selectedApplicationId}` : "/applicant",
    label: "Wait for payment schedule"
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

  const supabase = createSupabaseAdminClient();
  const { data: concessionaires } = await supabase
    .from("concessionaires")
    .select("id, concessionaire_number, applicant_id")
    .in("applicant_id", applicants.map(a => a.id));
  const isConverted = concessionaires && concessionaires.length > 0;

  const accountNames: Record<string, string> = {};
  if (isConverted) {
    const { data: bills } = await supabase
      .from("water_bills")
      .select("concessionaire_id, name")
      .in("concessionaire_id", concessionaires.map((c) => c.id))
      .order("due", { ascending: false });

    if (bills) {
      for (const bill of bills) {
        if (!accountNames[bill.concessionaire_id] && bill.name) {
          accountNames[bill.concessionaire_id] = bill.name;
        }
      }
    }
  }

  const selectedApplicationId = getStringParam(resolvedSearchParams, "application") ?? applications[0]?.id ?? null;
  const selectedApplication = applications.find((application) => application.id === selectedApplicationId) ?? applications[0];
  
  const { data: documents } = selectedApplication
    ? await supabase.from("documents").select("*").eq("application_id", selectedApplication.id).order("created_at", { ascending: false })
    : { data: [] };

  const latestPayment = selectedApplication ? getLatestPayment(selectedApplication) : null;
  const assignedAccount = selectedApplication
    ? getAssignedAccount(selectedApplication)
    : { accountNumber: null, connectionDate: null, meterNumber: null, isConverted: false };
  const effectiveWorkflowStatus = selectedApplication ? getEffectiveWorkflowStatus(selectedApplication) : null;
  const latestInspectionSchedule = selectedApplication ? getScheduledInspectionDate(selectedApplication) : null;
  const latestInspection = selectedApplication?.inspections
    ? [...selectedApplication.inspections].sort(
        (a, b) => new Date(b.scheduled_at ?? 0).getTime() - new Date(a.scheduled_at ?? 0).getTime()
      )[0] ?? null
    : null;
  const inspectionApproved = selectedApplication ? hasApprovedInspection(selectedApplication) : false;
  const documentsReady =
    selectedApplication && inspectionApproved
      ? areDocumentsReadyForPayment(selectedApplication)
      : false;
  const inhouseCompleted = Boolean(selectedApplication?.inhouse_installation_completed);
  const onlineSeminarCompletedAt =
    seminarState.allCompleted
      ? [...seminarState.progress]
          .filter((entry) => entry.completed && entry.completed_at)
          .sort((a, b) => new Date(String(b.completed_at)).getTime() - new Date(String(a.completed_at)).getTime())[0]
          ?.completed_at ?? null
      : null;
  const selectedApplicantName = selectedApplicant?.full_name ?? "No applicant selected";

  const primaryAction = getPrimaryAction({
    allCompleted: seminarState.allCompleted,
    hasApplication: Boolean(selectedApplication),
    hasPayment: Boolean(selectedApplication?.payments?.[0]),
    isCompleted: selectedApplication?.status === "converted",
    inhouseCompleted: Boolean(selectedApplication?.inhouse_installation_completed_at),
    inspectionApproved,
    documentsReady,
    documentSubmissionMode: selectedApplication?.document_submission_mode,
    selectedApplicantId,
    selectedApplicationId: selectedApplication?.id
  });
  const showPrimaryActionButton = Boolean(primaryAction) && !(selectedApplication && !latestPayment && !inhouseCompleted);

  const isInhousePlumbingActive = selectedApplication && !inhouseCompleted && primaryAction?.label === "Complete inhouse plumbing";
  const isInspectionActive = selectedApplication && inhouseCompleted && !inspectionApproved;
  const isUploadDocsActive = selectedApplication && inspectionApproved && !documentsReady && primaryAction?.label === "Upload documents";
  const isPaymentActive = selectedApplication && inspectionApproved && documentsReady && latestPayment?.status !== "paid";
  const isWaterMeterActive = selectedApplication && latestPayment?.status === "paid" && !selectedApplication.water_meter_installed_at;

  return (
    <div className="space-y-6">
      <PushPromptCard />

      <div className="grid gap-6 md:grid-cols-12 min-w-0">
        <div className="md:col-span-12 space-y-6 min-w-0">
          <Card className="border-border/70 shadow-sm min-w-0">
            <CardHeader className="pb-4 min-w-0 w-full">
              <CardTitle className="text-2xl font-semibold tracking-tight break-words">Application Workflow: {selectedApplicantName}</CardTitle>
              <CardDescription className="break-words">Track the status of your water connection application, schedule inspections, and view requirements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 min-w-0">

          <div className="flex flex-wrap items-center gap-2">
            {effectiveWorkflowStatus ? <StatusBadge status={effectiveWorkflowStatus} /> : null}
            <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              {applications.length} application{applications.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              Seminar {seminarState.completedCount}/{seminarState.items.length || 0}
            </span>
          </div>

          {(() => {
            if (!selectedApplication) return null;
            
            if (selectedApplication.status === "converted" || selectedApplication.water_meter_installed_at) {
              return (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-4">
                  <p className="font-medium text-emerald-700">Workflow completed: Active connection</p>
                  <p className="mt-1 text-sm text-emerald-700/80">
                    Your application is now an active water connection. Your account number is assigned.
                  </p>
                </div>
              );
            }
            if (selectedApplication.water_meter_installation_scheduled_at) {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for Installation: Water meter scheduled</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your water meter installation is scheduled. Please prepare for the installation date.
                  </p>
                </div>
              );
            }
            if (latestPayment?.status === "paid") {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for BWD: Schedule water meter</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your payment is confirmed. BWD will now schedule the installation of your water meter.
                  </p>
                </div>
              );
            }
            if (latestPayment) {
              return (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
                  <p className="font-medium text-primary">Action required: Pay application fee</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Please visit the BWD office on your scheduled date to pay the fees.
                  </p>
                </div>
              );
            }
            if (documentsReady) {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for BWD: Schedule payment</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your documents are verified. BWD will now schedule your office payment date.
                  </p>
                </div>
              );
            }
            if (inspectionApproved) {
              return (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
                  <p className="font-medium text-primary">Action required: Upload documents</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your inspection is approved. Please upload the required documents next, or bring them to the office.
                  </p>
                </div>
              );
            }

            if (latestInspectionSchedule) {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for Inspector: Inspection scheduled</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your inspection is scheduled for <span className="font-semibold text-foreground">{formatDateTime(latestInspectionSchedule)}</span>. Please prepare for the site visit and await the inspector's approval.
                  </p>
                </div>
              );
            }
            if (inhouseCompleted) {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for BWD: Schedule inspection</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your in-house plumbing and documents are complete. BWD will now schedule an inspection.
                  </p>
                </div>
              );
            }
            return (
              <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
                <p className="font-medium text-primary">Action required: Complete in-house plumbing</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mark the in-house plumbing as completed first, including the plumber and proof photo, before moving to document review and payment.
                </p>
              </div>
            );
          })()}

          {selectedApplication ? (
            <div
              className={`rounded-xl border p-4 ${
                assignedAccount.accountNumber
                  ? "border-emerald-300 bg-emerald-50/70"
                  : "border-border/70 bg-muted/10"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Assigned account number
                  </p>
                  <p className={`mt-1 font-mono text-2xl font-bold ${assignedAccount.accountNumber ? "text-emerald-700" : "text-muted-foreground"}`}>
                    {assignedAccount.accountNumber ?? "Not assigned yet"}
                  </p>
                </div>
                {assignedAccount.accountNumber ? (
                  <div className="grid gap-2 text-sm sm:grid-cols-2 md:text-right">
                    <p>
                      <span className="block text-xs text-muted-foreground">Connection date</span>
                      <span className="font-medium">
                        {assignedAccount.connectionDate ? formatDate(assignedAccount.connectionDate) : "Pending conversion"}
                      </span>
                    </p>
                    <p>
                      <span className="block text-xs text-muted-foreground">Meter number</span>
                      <span className="font-medium">{assignedAccount.meterNumber ?? "Not recorded"}</span>
                    </p>
                  </div>
                ) : (
                  <p className="max-w-md text-sm text-muted-foreground">
                    Your account number will appear here after BWD converts the approved application into an active concessionaire record.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: "clamp(8px, 1.5vw, 12px)" }}>
            <div className={`rounded-xl border p-3 transition-colors ${
              isInhousePlumbingActive
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                : "border-border/60 bg-muted/5 hover:bg-muted/10"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold uppercase tracking-[0.14em] text-muted-foreground text-[10px] xl:text-xs">Plumbing</p>
                {selectedApplication?.inhouse_installation_completed && (
                  <div className="mt-0.5 sm:mt-0">
                    <StatusBadge status="completed" />
                  </div>
                )}
              </div>
              <p className="mt-2 font-medium tabular-nums leading-tight text-foreground/80 text-xs xl:text-sm">
                {selectedApplication?.inhouse_installation_completed_at
                  ? formatDate(selectedApplication.inhouse_installation_completed_at)
                  : "Pending"}
              </p>
            </div>

            <div className={`rounded-xl border p-3 transition-colors ${
              isInspectionActive
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                : "border-border/60 bg-muted/5 hover:bg-muted/10"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold uppercase tracking-[0.14em] text-muted-foreground text-[10px] xl:text-xs">Inspection</p>
                {latestInspection && (
                  <div className="mt-0.5 sm:mt-0">
                    <StatusBadge status={latestInspection.status === "rejected" ? "disapproved" : (latestInspection.status ?? "pending")} />
                  </div>
                )}
              </div>
              <p className="mt-2 font-medium tabular-nums leading-tight text-foreground/80 text-xs xl:text-sm">
                {latestInspectionSchedule ? formatDateTime(latestInspectionSchedule) : "Not scheduled"}
              </p>
            </div>

            <div className={`rounded-xl border p-3 transition-colors ${
              isPaymentActive || isUploadDocsActive
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                : "border-border/60 bg-muted/5 hover:bg-muted/10"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold uppercase tracking-[0.14em] text-muted-foreground text-[10px] xl:text-xs">Payment</p>
                {latestPayment && (
                  <div className="mt-0.5 sm:mt-0">
                    <StatusBadge status={latestPayment.status ?? "scheduled"} />
                  </div>
                )}
              </div>
              <p className="mt-2 font-medium tabular-nums leading-tight text-foreground/80 text-xs xl:text-sm">
                {latestPayment ? (
                  latestPayment.status === "paid" 
                    ? formatDate(latestPayment.paid_at ?? latestPayment.office_payment_at ?? null) 
                    : formatDate(latestPayment.due_date ?? null)
                ) : "Not scheduled"}
              </p>
            </div>

            <div className={`rounded-xl border p-3 transition-colors ${
              isWaterMeterActive
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                : selectedApplication?.water_meter_installed_at
                  ? "border-emerald-500/30 bg-emerald-50/30"
                  : selectedApplication?.water_meter_installation_scheduled_at
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 bg-muted/5 hover:bg-muted/10"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <p className={`uppercase tracking-[0.14em] font-bold text-[10px] xl:text-xs ${
                  selectedApplication?.water_meter_installed_at 
                    ? "text-emerald-600" 
                    : selectedApplication?.water_meter_installation_scheduled_at 
                      ? "text-primary" 
                      : "text-muted-foreground"
                }`}>Water Meter</p>
                {selectedApplication?.water_meter_installed_at && (
                  <div className="mt-0.5 sm:mt-0">
                    <StatusBadge status="completed" />
                  </div>
                )}
              </div>
              <p className={`mt-2 font-medium tabular-nums leading-tight text-xs xl:text-sm ${
                selectedApplication?.water_meter_installed_at 
                  ? "text-emerald-600" 
                  : selectedApplication?.water_meter_installation_scheduled_at 
                    ? "text-primary" 
                    : "text-foreground/80"
              }`}>
                {selectedApplication?.water_meter_installed_at
                  ? formatDate(selectedApplication.water_meter_installed_at)
                  : selectedApplication?.water_meter_installation_scheduled_at
                    ? formatDate(selectedApplication.water_meter_installation_scheduled_at)
                    : "Not scheduled"}
              </p>
            </div>
          </div>

          {showPrimaryActionButton ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className={`h-10 w-full text-xs font-bold md:w-auto md:text-sm ${
                primaryAction?.label === "Wait for office verification" 
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 pointer-events-none"
                  : ""
              }`}>
                <Link href={primaryAction?.href ?? "/applicant"}>
                  {primaryAction?.label}
                  {primaryAction?.label !== "Wait for office verification" && <ArrowRight className="ml-2 h-3.5 w-3.5 md:h-4 md:w-4" />}
                </Link>
              </Button>
              {(primaryAction?.label === "Upload documents" || primaryAction?.label === "Wait for office verification") && selectedApplication ? (
                <QuickSubmitOfficeButton
                  applicationId={selectedApplication.id}
                  submissionMode={selectedApplication.document_submission_mode ?? undefined}
                />
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedApplication ? (
        <Card className={cn(
          "border-border/70 shadow-sm transition-all duration-300 relative overflow-hidden",
          isInhousePlumbingActive && "ring-2 ring-primary border-primary/50 shadow-xl shadow-primary/10 bg-[linear-gradient(180deg,rgba(37,99,235,0.015),transparent)]"
        )}>
          {isInhousePlumbingActive && (
            <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary animate-pulse-slow">
              Active Next Step
            </span>
          )}
          <CardContent className="p-6">
            <InhouseInstallationForm
              applicationId={selectedApplication.id}
              plumbers={plumbers}
              currentPlumberId={selectedApplication.accredited_plumber_id}
              currentCompletedAt={selectedApplication.inhouse_installation_completed_at}
              currentProofImageUrl={selectedApplication.inhouse_installation_proof_image_url}
              currentSignedAt={selectedApplication.inhouse_installation_signed_at}
              minimumCompletedAt={onlineSeminarCompletedAt}
              isCompleted={selectedApplication.inhouse_installation_completed}
              isLocked={Boolean(selectedApplication.water_meter_installed_at || selectedApplication.status === "converted")}
            />
          </CardContent>
        </Card>
      ) : null}

      {selectedApplication && inhouseCompleted ? (
        <Card className={cn(
          "border-border/70 shadow-sm transition-all duration-300 relative overflow-hidden",
          isInspectionActive && "ring-2 ring-primary border-primary/50 shadow-xl shadow-primary/10 bg-[linear-gradient(180deg,rgba(37,99,235,0.015),transparent)]"
        )}>
          {isInspectionActive && (
            <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary animate-pulse-slow">
              Active Next Step
            </span>
          )}
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-semibold">Inspection Details</CardTitle>
                <CardDescription>Track BWD inspection schedule, assigned inspector, and findings.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {latestInspection ? (
                  <StatusBadge status={latestInspection.status === "rejected" ? "disapproved" : (latestInspection.status ?? "pending")} />
                ) : (
                  <StatusBadge status="pending schedule" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!latestInspection ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
                In-house plumbing is complete. BWD is now scheduling an inspector to visit your site. Please await the scheduled date and time.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Scheduled Date & Time</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {latestInspection.scheduled_at ? formatDateTime(latestInspection.scheduled_at) : "TBD"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Assigned Inspector</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {latestInspection.inspector_name ?? "Assigned soon"}
                    </p>
                  </div>
                  {latestInspection.inspected_at && (
                    <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Inspected At</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDateTime(latestInspection.inspected_at)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {latestInspection.remarks && (
                    <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Remarks / Findings</p>
                      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{latestInspection.remarks}</p>
                    </div>
                  )}

                  {latestInspection.material_list && (
                    <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Required Materials</p>
                      <ul className="mt-2 space-y-1 text-sm text-foreground list-disc list-inside">
                        {latestInspection.material_list
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {selectedApplication && inspectionApproved ? (
        <ApplicantDocumentPanel
          application={selectedApplication as any}
          documents={documents ?? []}
          isUploadUnlocked={inspectionApproved}
          isActive={isUploadDocsActive}
        />
      ) : null}

          <Card className="border-border/70 shadow-sm min-w-0">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 min-w-0">
              <div className="min-w-0 w-full">
                <CardTitle className="text-2xl font-semibold break-words">Concessionaire Accounts & Water Bills</CardTitle>
                <CardDescription className="break-words">Manage your active water connections, view bills, and link legacy accounts.</CardDescription>
              </div>
              {applicants.length <= 1 && (
                <div className="flex justify-end gap-2 shrink-0">
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/applicant/new">New Application</Link>
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {applicants.length > 1 ? (
                <ApplicantSwitcher
                  applicants={applicants}
                  selectedApplicantId={selectedApplicant?.id}
                  basePath="/applicant"
                  title="Accounts"
                  description="Switch accounts."
                />
              ) : null}

              {isConverted ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-6">
                  <h2 className="text-xl font-bold text-emerald-800">
                    You have {concessionaires.length > 1 ? `${concessionaires.length} active water connections!` : "an active water connection!"}
                  </h2>
                  <p className="mt-2 text-sm text-emerald-700/80">
                    Your account is successfully linked. You can now view your water bills from the navigation menu.
                  </p>
                  <div className="mt-4 space-y-1 rounded-md bg-emerald-100/50 p-3">
                    {concessionaires?.map((c) => {
                      const name = accountNames[c.id] || applicants.find((a) => a.id === c.applicant_id)?.full_name || "Unknown Account";
                      return (
                        <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between group gap-2 sm:gap-0">
                          <div className="flex items-center text-sm font-medium text-emerald-800 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shrink-0" />
                            <span className="font-mono shrink-0">{c.concessionaire_number}</span>
                            <span className="mx-2 text-emerald-600/50 shrink-0">—</span>
                            <span className="truncate">{name}</span>
                          </div>
                          <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <UnlinkAccountButton concessionaireId={c.id} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button asChild variant="outline" className="border-emerald-500/50 text-emerald-700 hover:bg-emerald-100/50 bg-white">
                      <Link href="/applicant/water-bills">View Water Bills</Link>
                    </Button>
                    <Button asChild variant="outline" className="gap-2 rounded-full border-emerald-500/20 text-emerald-700 hover:bg-emerald-50 bg-white whitespace-nowrap shadow-sm font-medium">
                      <a href="#link-account">
                        <Plus className="h-4 w-4" />
                        Link another account
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}

              <div id="link-account" className={isConverted ? "opacity-90 transition-opacity hover:opacity-100 max-w-2xl" : "max-w-2xl"}>
                <LinkAccountCard />
              </div>
            </CardContent>
          </Card>

      {applications.length > 1 ? (
        <ApplicationSwitcher
          applications={applications}
          selectedApplicationId={selectedApplication?.id}
          basePath="/applicant"
          title="Other applications"
          description="You have multiple applications. Choose which one to view."
        />
      ) : null}
        </div>
      </div>
    </div>
  );
}
