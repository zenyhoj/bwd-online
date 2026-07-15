import fs from "fs";
import path from "path";
import Link from "next/link";
import { ArrowRight, Droplets, Plus } from "lucide-react";

import { ApplicantSwitcher } from "@/components/applicant/applicant-switcher";
import { ApplicationSwitcher } from "@/components/applicant/application-switcher";
import { UserManualModal } from "@/components/applicant/user-manual-modal";
import { ApplicantDocumentPanel } from "@/components/applicant/applicant-document-panel";
import { DocumentSubmissionChoice } from "@/components/applicant/document-submission-choice";
import { InhouseInstallationForm } from "@/components/shared/inhouse-installation-form";
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
      label: "Add an Applicant"
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
      label: "Start Water Service Application"
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
      label: "Mark Plumbing as Complete"
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
        label: "Bring documents to the BWD office"
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
  
  const userManualPath = path.join(process.cwd(), "USER.md");
  const userManualContent = fs.existsSync(userManualPath) ? fs.readFileSync(userManualPath, "utf-8") : "";

  const selectedApplicantId = getStringParam(resolvedSearchParams, "applicant") ?? applicants[0]?.id ?? null;
  const selectedApplicant = applicants.find((a) => a.id === selectedApplicantId) ?? applicants[0];

  const applications = selectedApplicantId ? await getApplicantApplications(selectedApplicantId) : [];
  const seminarState = selectedApplicantId ? await getApplicantSeminarState(selectedApplicantId) : { items: [], progress: [], completedCount: 0, allCompleted: false };
  
  if (applications.length > 0) {
    seminarState.allCompleted = true;
    seminarState.completedCount = seminarState.items.length;
  }

  const plumbers = await getAccreditedPlumbers();

  const supabase = createSupabaseAdminClient();
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
  const isDocumentSubmissionActive =
    selectedApplication &&
    inspectionApproved &&
    !documentsReady &&
    (primaryAction?.label === "Upload documents" || primaryAction?.label === "Bring documents to the BWD office");
  const isPaymentActive = selectedApplication && inspectionApproved && documentsReady && latestPayment?.status !== "paid";
  const isWaterMeterActive = selectedApplication && latestPayment?.status === "paid" && !selectedApplication.water_meter_installed_at;

  return (
    <div className="space-y-6">
      <PushPromptCard />
      {applicants.length === 0 && userManualContent && (
        <UserManualModal markdownContent={userManualContent} />
      )}

      <div className="grid gap-6 md:grid-cols-12 min-w-0">
        <div className="md:col-span-12 space-y-6 min-w-0">
          {applicants.length > 0 ? (
            <ApplicantSwitcher
              applicants={applicants}
              selectedApplicantId={selectedApplicant?.id}
              basePath="/applicant"
              title="Accounts"
              description="Switch accounts."
            />
          ) : null}

          {applications.length > 1 && selectedApplicantId ? (
            <ApplicationSwitcher
              applications={applications}
              selectedApplicationId={selectedApplication?.id}
              basePath="/applicant"
              queryParams={{ applicant: selectedApplicantId }}
              title="Connections"
              description="Switch between this applicant's connections."
            />
          ) : null}

          {!selectedApplication ? (
            <Card className="overflow-hidden border-primary/20 bg-primary/[0.03] shadow-sm">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Droplets className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Already have a water account?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Link an existing account number to view your monthly water bills without starting a new application.
                    </p>
                  </div>
                </div>
                <Button asChild className="w-full shrink-0 sm:w-auto">
                  <Link href="/applicant/water-bills#link-account">
                    Link existing account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border shadow-sm min-w-0 bg-card rounded-xl">
            <CardHeader className="pb-4 min-w-0 w-full border-b border-border/50 bg-muted/30 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-xl font-semibold tracking-tight break-words font-heading">Application Workflow: {selectedApplicantName}</CardTitle>
                <CardDescription className="break-words mt-1 text-sm">Track the status of your water connection application, schedule inspections, and view requirements.</CardDescription>
              </div>
              {applications.length > 0 && selectedApplicantId ? (
                <Button asChild variant="outline" size="sm" className="shrink-0 bg-white dark:bg-slate-950 font-medium tracking-wide">
                  <Link href={`/applicant/applications/new?applicant=${selectedApplicantId}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Application
                  </Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-6 min-w-0 pt-6">
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
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-50/80 p-4 dark:border-emerald-400/30 dark:bg-emerald-400/10">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Workflow completed: Active connection</p>
                  <p className="mt-1 text-sm text-emerald-700/85 dark:text-emerald-100/80">
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
              if (selectedApplication.document_submission_mode === "office") {
                return (
                  <div className="rounded-xl border border-[#FBBC03]/40 bg-[#FBBC03]/10 p-4">
                    <p className="font-medium text-foreground">Action required: Bring documents to the BWD office</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your inspection is approved. Bring the required physical documents to the BWD office for staff verification.
                    </p>
                  </div>
                );
              }

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
                  ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-400/35 dark:bg-emerald-400/10"
                  : "border-border/70 bg-muted/10"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Assigned account number
                  </p>
                  <p className={`mt-1 font-mono text-2xl font-bold ${assignedAccount.accountNumber ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
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

          <div className="relative isolate flex flex-col md:flex-row gap-6 md:gap-2 mt-8 mb-4 pt-2">
            {/* Horizontal Line for Desktop */}
            <div className="absolute top-5 left-6 right-6 h-0.5 -translate-y-1/2 bg-border hidden md:block z-[-1]" />
            <div 
              className="absolute top-5 left-6 h-0.5 -translate-y-1/2 bg-primary transition-all duration-700 ease-in-out hidden md:block z-[-1]" 
              style={{ 
                width: selectedApplication?.water_meter_installed_at ? "calc(100% - 3rem)" : 
                       (latestPayment?.status === "paid" ? "75%" : 
                       (inspectionApproved ? "50%" : 
                       (inhouseCompleted ? "25%" : "0%"))) 
              }} 
            />

            {/* 1. Plumbing Node */}
            <div className="flex-1 relative group">
              <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-3 px-2">
                <div className={`h-10 w-10 shrink-0 rounded-full border-2 flex items-center justify-center font-bold text-sm bg-card transition-all duration-300 ${selectedApplication?.inhouse_installation_completed ? "border-primary text-primary ring-4 ring-primary/10" : (isInhousePlumbingActive ? "border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(2,132,199,0.3)] ring-4 ring-primary/20 scale-110" : "border-border text-muted-foreground")}`}>
                  1
                </div>
                <div className="flex flex-col">
                  <p className={`font-heading font-semibold text-sm transition-colors ${isInhousePlumbingActive || selectedApplication?.inhouse_installation_completed ? "text-foreground" : "text-muted-foreground"}`}>In-House Plumbing</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {selectedApplication?.inhouse_installation_completed_at
                      ? formatDate(selectedApplication.inhouse_installation_completed_at)
                      : "Pending"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Inspection Node */}
            <div className="flex-1 relative group">
              <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-3 px-2">
                <div className={`h-10 w-10 shrink-0 rounded-full border-2 flex items-center justify-center font-bold text-sm bg-card transition-all duration-300 ${inspectionApproved ? "border-primary text-primary ring-4 ring-primary/10" : (isInspectionActive ? "border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(2,132,199,0.3)] ring-4 ring-primary/20 scale-110" : "border-border text-muted-foreground")}`}>
                  2
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <p className={`font-heading font-semibold text-sm transition-colors ${isInspectionActive || inspectionApproved ? "text-foreground" : "text-muted-foreground"}`}>Inspection</p>
                    {latestInspection?.status === "rejected" && <StatusBadge status="disapproved" className="px-1.5 py-0 text-[9px]" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {latestInspectionSchedule ? formatDate(latestInspectionSchedule) : "Not scheduled"}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Payment Node */}
            <div className="flex-1 relative group">
              <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-3 px-2">
                <div className={`h-10 w-10 shrink-0 rounded-full border-2 flex items-center justify-center font-bold text-sm bg-card transition-all duration-300 ${latestPayment?.status === "paid" ? "border-primary text-primary ring-4 ring-primary/10" : (isPaymentActive || isDocumentSubmissionActive ? "border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(2,132,199,0.3)] ring-4 ring-primary/20 scale-110" : "border-border text-muted-foreground")}`}>
                  3
                </div>
                <div className="flex flex-col">
                  <p className={`font-heading font-semibold text-sm transition-colors ${isPaymentActive || isDocumentSubmissionActive || latestPayment?.status === "paid" ? "text-foreground" : "text-muted-foreground"}`}>Office Payment</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {latestPayment ? (
                      latestPayment.status === "paid"
                        ? formatDate(latestPayment.paid_at ?? latestPayment.office_payment_at ?? null)
                        : latestPayment.office_payment_at
                          ? formatDate(latestPayment.office_payment_at)
                          : formatDate(latestPayment.due_date ?? null)
                    ) : "Not scheduled"}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Water Meter Node */}
            <div className="flex-1 relative group">
              <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-3 px-2">
                <div className={`h-10 w-10 shrink-0 rounded-full border-2 flex items-center justify-center font-bold text-sm bg-card transition-all duration-300 ${selectedApplication?.water_meter_installed_at ? "border-emerald-500 text-emerald-600 bg-emerald-50 ring-4 ring-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400" : (isWaterMeterActive ? "border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(2,132,199,0.3)] ring-4 ring-primary/20 scale-110" : "border-border text-muted-foreground")}`}>
                  4
                </div>
                <div className="flex flex-col">
                  <p className={`font-heading font-semibold text-sm transition-colors ${selectedApplication?.water_meter_installed_at ? "text-emerald-700 dark:text-emerald-300" : (isWaterMeterActive ? "text-foreground" : "text-muted-foreground")}`}>Meter Installation</p>
                  <p className={`text-xs mt-1 font-medium ${selectedApplication?.water_meter_installed_at ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {selectedApplication?.water_meter_installed_at
                      ? formatDate(selectedApplication.water_meter_installed_at)
                      : selectedApplication?.water_meter_installation_scheduled_at
                        ? formatDate(selectedApplication.water_meter_installation_scheduled_at)
                        : "Not scheduled"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {selectedApplication && !assignedAccount.isConverted ? (
            <div id="document-submission" className="scroll-mt-24 rounded-2xl border border-border/70 bg-muted/10 p-4 sm:p-5">
              <DocumentSubmissionChoice
                variant="action"
                applicationId={selectedApplication.id}
                selectedMode={
                  selectedApplication.document_submission_mode === "office" ? "office" : "online"
                }
                locked={documentsReady}
                compact
                title="Document submission method"
                description={
                  inspectionApproved
                    ? selectedApplication.document_submission_mode === "office"
                      ? "Bring the required physical documents to the BWD office. You may switch to online upload until verification is completed."
                      : "Online upload is ready below. You may switch to office submission until verification is completed."
                    : "Your choice is saved. You may change it now; actual document submission opens after inspection approval."
                }
              />
            </div>
          ) : null}

          {showPrimaryActionButton ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="h-10 w-full text-xs font-bold md:w-auto md:text-sm">
                <Link href={primaryAction?.href ?? "/applicant"}>
                  {primaryAction?.label}
                  <ArrowRight className="ml-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                </Link>
              </Button>
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
          isActive={Boolean(isDocumentSubmissionActive)}
        />
      ) : null}

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
