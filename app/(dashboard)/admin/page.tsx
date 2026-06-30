import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, CreditCard, FileCheck2, Wrench, Download } from "lucide-react";

import { WaterMeterSchedulerForm } from "@/components/admin/water-meter-scheduler-form";
import { WaterMeterCompletionForm } from "@/components/admin/water-meter-completion-form";
import { AdditionalDocumentsForm } from "@/components/admin/additional-documents-form";
import { DocumentVerificationPanel } from "@/components/admin/document-verification-panel";
import { InspectionSchedulerForm } from "@/components/admin/inspection-scheduler-form";
import { InspectionForm } from "@/components/inspector/inspection-form";
import { InstallationSchedulerForm } from "@/components/admin/installation-scheduler-form";
import { PaymentSchedulerForm } from "@/components/admin/payment-scheduler-form";
import { QueueFilters } from "@/components/admin/queue-filters";
import { DeleteApplicantButton } from "@/components/admin/delete-applicant-button";
import { InhouseInstallationForm } from "@/components/shared/inhouse-installation-form";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { StatusBadge } from "@/components/shared/status-badge";
import { PushPromptCard } from "@/components/pwa/push-prompt-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { areDocumentsReadyForPayment, getDocumentRequirementRows } from "@/lib/document-workflow";
import { parsePagination } from "@/lib/pagination";
import {
  getAccreditedPlumbers,
  getAdminApplicationDetail,
  getAdminApplicationsQueue,
  getAdminDashboardStats,
  getOrganizationInspectors,
  getApplicantSeminarState
} from "@/lib/queries";
import type { Document, Payment } from "@/types";

type AdminDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  return typeof searchParams?.[key] === "string" ? searchParams[key] : undefined;
}

function getScheduledInspectionDate(record: Record<string, unknown>) {
  const inspections =
    ((record.inspections as { scheduled_at?: string | null }[] | undefined) ?? []).filter(
      (inspection) => Boolean(inspection.scheduled_at)
    );

  if (inspections.length === 0) {
    return null;
  }

  return inspections
    .map((inspection) => inspection.scheduled_at ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function getLatestPaymentRecord(record: Record<string, unknown>) {
  const payments =
    ((record.payments as { id?: string; status?: string; paid_at?: string | null; due_date?: string | null }[] | undefined) ?? []);

  return [...payments].sort((a, b) => {
    const aTime = new Date(a.paid_at ?? a.due_date ?? 0).getTime();
    const bTime = new Date(b.paid_at ?? b.due_date ?? 0).getTime();
    return bTime - aTime;
  })[0] ?? null;
}

function getEffectiveApplicationStatus(record: Record<string, unknown>) {
  const status = String(record.status);
  const converted = (((record.concessionaires as { id: string }[] | undefined) ?? []).length ?? 0) > 0;
  const installationComplete = Boolean(record.inhouse_installation_completed);
  const latestPayment = getLatestPaymentRecord(record);
  const waterMeterInstalled = Boolean(record.water_meter_installed_at);

  if (waterMeterInstalled && (converted || status === "converted")) {
    return "converted";
  }

  if (latestPayment?.status === "paid" && installationComplete) {
    return "approved";
  }

  return status;
}

function nextAction(record: Record<string, unknown>) {
  const status = getEffectiveApplicationStatus(record);
  const inspections =
    ((record.inspections as {
      id: string;
      status?: string;
      plumbing_approved?: boolean | null;
      scheduled_at?: string | null;
    }[] | undefined) ?? []);
  const paymentsList = (record.payments as { id: string; status?: string; created_at?: string }[] | undefined) ?? [];
  const latestPayment = [...paymentsList].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0] ?? null;
  const converted = (((record.concessionaires as { id: string }[] | undefined) ?? []).length ?? 0) > 0;
  const hasApprovedInspection = inspections.some(
    (inspection) => inspection.status === "approved"
  );
  const hasScheduledInspection = inspections.length > 0;
  const inhousePlumbingComplete = Boolean(record.inhouse_installation_completed);
  const documents = ((record.documents as Document[] | undefined) ?? []);
  const documentsReady = areDocumentsReadyForPayment(record as never);
  const waterMeterScheduled = Boolean(record.water_meter_installation_scheduled_at);
  const waterMeterInstalled = Boolean(record.water_meter_installed_at);
  const workflowComplete = waterMeterInstalled && (converted || status === "converted");

  if (workflowComplete) return "Completed";
  if (!inhousePlumbingComplete) return "Wait for applicant plumbing";
  if (!hasScheduledInspection) return "Schedule inspection";
  if (!hasApprovedInspection) return "Wait for inspector result";
  if (!documentsReady) return documents.length > 0 ? "Verify uploaded documents" : "Wait for applicant documents";
  if (paymentsList.length === 0) return "Schedule payment date";
  if (latestPayment?.status !== "paid") return "Confirm applicant payment";
  if (!waterMeterScheduled) return "Schedule water meter";
  if (!waterMeterInstalled) return "Wait for water meter completion";
  return "Completed";
}

function queueStage(record: Record<string, unknown>) {
  if (typeof record.workflow_stage === "string") {
    return record.workflow_stage;
  }
  const status = getEffectiveApplicationStatus(record);
  const inspections =
    ((record.inspections as {
      id: string;
      status?: string;
      plumbing_approved?: boolean | null;
      scheduled_at?: string | null;
    }[] | undefined) ?? []);
  const paymentsList = (record.payments as { id: string; status?: string; created_at?: string }[] | undefined) ?? [];
  const latestPayment = [...paymentsList].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0] ?? null;
  const converted = (((record.concessionaires as { id: string }[] | undefined) ?? []).length ?? 0) > 0;
  const hasApprovedInspection = inspections.some(
    (inspection) => inspection.status === "approved"
  );
  const hasScheduledInspection = inspections.length > 0;
  const inhousePlumbingComplete = Boolean(record.inhouse_installation_completed);
  const documents = ((record.documents as Document[] | undefined) ?? []);
  const documentsReady = areDocumentsReadyForPayment(record as never);
  const waterMeterScheduled = Boolean(record.water_meter_installation_scheduled_at);
  const waterMeterInstalled = Boolean(record.water_meter_installed_at);
  const workflowComplete = waterMeterInstalled && (converted || status === "converted");

  if (workflowComplete) return "completed";
  if (!inhousePlumbingComplete) return "for-inhouse-plumbing";
  if (!hasScheduledInspection) return "for-inspection";
  if (!hasApprovedInspection) return "under-review";
  if (!documentsReady) return "for-documents";
  if (paymentsList.length === 0 || latestPayment?.status !== "paid") return "for-payment";
  if (!waterMeterScheduled) return "for-water-meter-schedule";
  if (!waterMeterInstalled) return "for-water-meter-complete";
  return "for-conversion";
}

function queueStageLabel(stage: string) {
  switch (stage) {
    case "for-inhouse-plumbing":
      return "For inhouse plumbing";
    case "for-inspection":
      return "For inspection";
    case "under-review":
      return "Under review";
    case "for-documents":
      return "For documents";
    case "for-payment":
      return "For payment";
    case "for-installation":
      return "For installation";
    case "for-water-meter-schedule":
      return "For water meter scheduling";
    case "for-water-meter-complete":
      return "For water meter completion";
    case "for-conversion":
      return "For conversion";
    case "completed":
      return "Completed";
    default:
      return "Under review";
  }
}

function workflowStepState({
  inspections,
  payments,
  applicationStatus,
  inhousePlumbingCompleted,
  documentsReady,
  waterMeterScheduled,
  waterMeterInstalled
}: {
  inspections: { status?: string; scheduled_at?: string | null }[];
  payments: Payment[];
  applicationStatus: string;
  inhousePlumbingCompleted: boolean;
  documentsReady: boolean;
  waterMeterScheduled: boolean;
  waterMeterInstalled: boolean;
}) {
  const hasScheduledInspection = inspections.length > 0;
  const hasApprovedInspection = inspections.some((inspection) => inspection.status === "approved");
  const latestPayment = [...payments].sort((a, b) => new Date(b.paid_at ?? 0).getTime() - new Date(a.paid_at ?? 0).getTime())[0];
  const isPaid = latestPayment?.status === "paid";

  return {
    plumbing: inhousePlumbingCompleted ? "Complete" : "Pending",
    inspection: !inhousePlumbingCompleted ? "Waiting" : hasApprovedInspection ? "Complete" : hasScheduledInspection ? "Scheduled" : "Pending",
    payment: isPaid ? "Complete" : payments.length > 0 ? "Scheduled" : hasApprovedInspection && documentsReady ? "Ready" : hasApprovedInspection ? "Review docs" : "Waiting",
    waterMeter: waterMeterInstalled ? "Complete" : waterMeterScheduled ? "Scheduled" : isPaid ? "Ready" : "Waiting",
    conversion:
      applicationStatus === "converted" ? "Complete" : waterMeterInstalled ? "Ready" : "Waiting"
  };
}



export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const parsedPagination = parsePagination(resolvedSearchParams);
  const pagination = {
    ...parsedPagination,
    pageSize: getStringParam(resolvedSearchParams, "pageSize") ? parsedPagination.pageSize : 5
  };
  const q = getStringParam(resolvedSearchParams, "q") ?? "";
  const workflow = getStringParam(resolvedSearchParams, "workflow") ?? "all";

  const [applications, stats, inspectors, plumbers] = await Promise.all([
    getAdminApplicationsQueue(pagination, { q, workflow }),
    getAdminDashboardStats(),
    getOrganizationInspectors(),
    getAccreditedPlumbers()
  ]);
  const searchMatchesAcrossAllStages =
    q && workflow !== "all"
      ? await getAdminApplicationsQueue({ page: 1, pageSize: 1000 }, { q, workflow: "all" })
      : null;

  const selectedId = getStringParam(resolvedSearchParams, "selected") ?? String(applications.data[0]?.id ?? "");
  const selectedApplication = selectedId ? await getAdminApplicationDetail(selectedId) : null;
  const seminarState = selectedApplication ? await getApplicantSeminarState(String(selectedApplication.applicant_id)) : null;
  const hasActiveFilters = Boolean(q) || workflow !== "all";
  const noQueueResults = applications.data.length === 0;
  const hasMatchesInOtherStages = Boolean(searchMatchesAcrossAllStages && searchMatchesAcrossAllStages.count > 0);

  const {
    readyForInspection,
    awaitingInspectionResult,
    documentsInWorkflow,
    readyForPayment,
    readyForConversion: readyForConversionEffective,
    pendingDocumentReviews
  } = stats;

  const workflowStages = [
    {
      key: "for-inhouse-plumbing",
      title: "For inhouse plumbing",
      description: "Applicants pending in-house plumbing completion."
    },
    {
      key: "for-inspection",
      title: "For inspection",
      description: "Applicants ready to be scheduled for inspection."
    },
    {
      key: "under-review",
      title: "Under review",
      description: "Applicants with inspection activity still being reviewed."
    },
    {
      key: "for-documents",
      title: "For documents",
      description: "Applicants with approved inspections waiting for document verification."
    },
    {
      key: "for-payment",
      title: "For payment",
      description: "Applicants with approved inspections waiting for office payment scheduling."
    },
    {
      key: "for-water-meter-schedule",
      title: "For water meter scheduling",
      description: "Applicants with paid fees waiting for water meter installation scheduling."
    },
    {
      key: "for-water-meter-complete",
      title: "For water meter completion",
      description: "Applicants with scheduled water meter installations awaiting completion."
    },
    {
      key: "for-conversion",
      title: "For conversion",
      description: "Applicants with completed workflow steps ready for final conversion."
    },
    {
      key: "completed",
      title: "Completed",
      description: "Applicants already converted and finished."
    }
  ] as const;


  const selectedDocuments = ((selectedApplication?.documents as Document[] | undefined) ?? []);
  const selectedDocumentRequirements = getDocumentRequirementRows(selectedDocuments);
  const selectedPayments = ((selectedApplication?.payments as Payment[] | undefined) ?? []);
  const latestSelectedPayment = selectedPayments[0] ?? null;
  const canScheduleInstallation = latestSelectedPayment?.status === "paid";
  const selectedApplicationStatus = String(selectedApplication?.status ?? "");
  const selectedInspections =
    ((selectedApplication?.inspections as {
      id?: string;
      status?: string;
      plumbing_approved?: boolean | null;
      scheduled_at?: string | null;
      inspected_at?: string | null;
    }[] | undefined) ?? []);
  const hasScheduledInspection = selectedInspections.length > 0;
  const latestSelectedInspection =
    [...selectedInspections]
      .sort((a, b) => new Date(b.scheduled_at ?? 0).getTime() - new Date(a.scheduled_at ?? 0).getTime())[0] ?? null;
  const inhousePlumbingCompleted = Boolean(selectedApplication?.inhouse_installation_completed);
  const canScheduleInspection = inhousePlumbingCompleted;
  const canSchedulePayment = selectedInspections.some(
    (inspection) => inspection.status === "approved"
  );
  const documentsReadyForPayment = areDocumentsReadyForPayment(selectedApplication as never);
  const canRequestAdditionalDocuments =
    Boolean(selectedApplication) &&
    documentsReadyForPayment &&
    selectedApplicationStatus !== "converted" &&
    latestSelectedPayment?.status !== "paid";
  const canMarkInstallationComplete =
    Boolean(selectedApplication) && selectedApplicationStatus !== "converted";
  const inspectionWorkflowComplete = canSchedulePayment;
  const selectedInspectionSchedule =
    selectedInspections
      .map((inspection) => inspection.scheduled_at ?? null)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
  const selectedQueueStage = selectedApplication ? queueStage(selectedApplication) : "under-review";
  const waterMeterScheduled = Boolean(selectedApplication?.water_meter_installation_scheduled_at);
  const waterMeterInstalled = Boolean(selectedApplication?.water_meter_installed_at);
  const stepState = workflowStepState({
    inspections: selectedInspections,
    payments: selectedPayments,
    applicationStatus: selectedApplicationStatus,
    inhousePlumbingCompleted,
    documentsReady: documentsReadyForPayment,
    waterMeterScheduled,
    waterMeterInstalled
  });

  let activeAction: string | null = null;
  if (selectedApplication) {
    if (!inhousePlumbingCompleted) activeAction = "inhouse-plumbing";
    else if (!inspectionWorkflowComplete) activeAction = "inspection";
    else if (!documentsReadyForPayment) activeAction = "documents";
    else if (!latestSelectedPayment || latestSelectedPayment.status !== "paid") activeAction = "payment";
    else if (!selectedApplication.water_meter_installation_scheduled_at) activeAction = "water-meter-schedule";
    else if (!selectedApplication.water_meter_installed_at) activeAction = "water-meter-complete";
  }

  return (
    <div className="space-y-6">
      <PushPromptCard />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin queue</h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, and manage one application at a time without loading every workflow form at once.
          </p>
        </div>
        <Link href="/admin/inspections" className="text-sm text-primary hover:underline">
          View inspection reports
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card className="relative overflow-hidden border-border/70 bg-card shadow-sm transition-colors hover:bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total in queue</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{applications.count}</p>
                <p className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">active applications</p>
              </div>
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <ClipboardList className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card shadow-sm transition-colors hover:bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Need schedule</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-foreground">{readyForInspection}</span>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">apps</span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">appointments pending</p>
              </div>
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Wrench className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card shadow-sm transition-colors hover:bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Awaiting result</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-300">{awaitingInspectionResult}</span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">scheduled inspections</p>
              </div>
              <div className="rounded-full bg-amber-500/10 p-2 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                <CalendarClock className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card shadow-sm transition-colors hover:bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Docs to review</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-sky-700 dark:text-sky-300">{documentsInWorkflow}</span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                  {pendingDocumentReviews > 0 ? `${pendingDocumentReviews} uploaded for review` : "awaiting documents"}
                </p>
              </div>
              <div className="rounded-full bg-sky-500/10 p-2 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300">
                <FileCheck2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card shadow-sm transition-colors hover:bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ready for payment</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-indigo-700 dark:text-indigo-300">{readyForPayment}</span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">awaiting payment</p>
              </div>
              <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card shadow-sm transition-colors hover:bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ready for conversion</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">{readyForConversionEffective}</span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">ready for account</p>
              </div>
              <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <QueueFilters 
            initialQ={q}
            initialWorkflow={workflow}
            workflowStages={workflowStages}
          />



          {!noQueueResults ? (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-4">
                <div>
                  <p className="font-semibold">Matching applicants</p>
                  <p className="text-sm text-muted-foreground">
                    Showing {applications.data.length} applicant{applications.data.length === 1 ? "" : "s"} on this page.
                  </p>
                </div>
                <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-sm font-medium">
                  {workflow === "all" ? "All stages" : queueStageLabel(workflow)}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Contact number</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(applications.data as Record<string, unknown>[]).map((record) => {
                    const isSelected = String(record.id) === selectedId;
                    const stage = queueStage(record);
                    const query = new URLSearchParams();
                    query.set("page", String(applications.page));
                    query.set("pageSize", String(applications.pageSize));
                    if (q) query.set("q", q);
                    if (workflow !== "all") query.set("workflow", workflow);
                    query.set("selected", String(record.id));

                    return (
                      <TableRow
                        key={`queue-${String(record.id)}`}
                        className={isSelected ? "border-l-4 border-l-primary bg-primary/5" : "hover:bg-muted/20"}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium whitespace-nowrap">{String(record.full_name)}</p>
                            <p className="text-xs text-muted-foreground">
                              {String(record.service_type).replaceAll("_", " ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{record.cellphone_number ? String(record.cellphone_number) : "No contact number"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stage === "for-documents" ? "default" : "secondary"} className="whitespace-nowrap text-[10px]">
                            {queueStageLabel(stage)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant={isSelected ? "secondary" : "outline"} size="sm">
                            <Link href={`/admin?${query.toString()}` as never}>{isSelected ? "Selected" : "Open"}</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <PaginationControls
            basePath="/admin"
            pagination={applications}
            params={{
              q: q || undefined,
              workflow: workflow !== "all" ? workflow : undefined,
              selected: selectedId || undefined
            }}
          />

          {noQueueResults ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-sm text-muted-foreground">
              {hasActiveFilters ? (
                <>
                  No applicants matched your current search and workflow filter.
                  {q
                    ? hasMatchesInOtherStages
                      ? ` "${q}" exists in the database, but not under the selected "${workflow.replaceAll("-", " ")}" stage.`
                      : ` No record was found for "${q}".`
                    : ""}
                </>
              ) : (
                "No applications are in the queue yet."
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>



      {selectedApplication ? (
        <div className="space-y-6 pb-12">
          <div className="space-y-6">
            <Card className="overflow-hidden border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/50 bg-muted/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {queueStageLabel(selectedQueueStage)}
                      </span>
                    </div>
                    <CardTitle>{String(selectedApplication.full_name)}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {String(selectedApplication.service_type).replaceAll("_", " ")} • Submitted{" "}
                      {formatDateTime((selectedApplication.submitted_at as string | null | undefined) ?? null)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={getEffectiveApplicationStatus(selectedApplication as Record<string, unknown>)} />
                    <div className="flex items-center gap-3">
                      {seminarState?.allCompleted ? (
                        <Button variant="outline" asChild className="font-medium shadow-sm transition-transform hover:scale-105 active:scale-95">
                          <Link href={`/certificate/${selectedApplication.applicant_id}`} target="_blank">
                            View Certificate
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className="font-medium shadow-sm">
                          View Certificate
                        </Button>
                      )}

                      {latestSelectedPayment?.status === "paid" ? (
                        <Button variant="default" asChild className="font-medium shadow-sm transition-transform hover:scale-105 active:scale-95">
                          <Link href={`/admin/reports/waco/${selectedApplication.id}`} target="_blank">
                            Print WACO
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="default" disabled className="font-medium shadow-sm">
                          Print WACO
                        </Button>
                      )}

                      {latestSelectedInspection?.id ? (
                        latestSelectedInspection?.status === "approved" ? (
                          <Button variant="default" asChild className="font-medium shadow-sm transition-transform hover:scale-105 active:scale-95">
                            <Link href={`/admin/reports/${latestSelectedInspection.id}`} target="_blank">
                              Print Inspection
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="default" disabled className="font-medium shadow-sm">
                            Print Inspection
                          </Button>
                        )
                      ) : null}
                      {/* Temporary Cleanup Button - Comment out or remove when done */}
                      {/* <DeleteApplicantButton applicantId={String(selectedApplication.applicant_id)} /> */}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-b border-border/50 px-6 py-4">
                  <div className="flex items-center gap-0 overflow-x-auto w-full custom-scrollbar pb-2 sm:pb-0">
                    {[
                      { label: "Plumbing", value: stepState.plumbing },
                      { label: "Inspection", value: stepState.inspection },
                      { label: "Payment", value: stepState.payment },
                      { label: "Water Meter", value: stepState.waterMeter },
                      { label: "Conversion", value: stepState.conversion }
                    ].map((step, idx, arr) => {
                      const isDone = step.value === "Complete";
                      const isActive = !isDone && (idx === 0 || arr[idx - 1]?.value === "Complete");
                      return (
                        <div key={step.label} className={`flex items-center ${idx < arr.length - 1 ? 'flex-1' : ''}`}>
                          <div className={`flex flex-col shrink-0 items-center gap-1 px-3 py-1 rounded-lg text-center min-w-[90px] text-xs font-medium ${
                            isDone ? "text-emerald-600" : isActive ? "text-primary" : "text-muted-foreground/50"
                          }`}>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              isDone ? "bg-emerald-100 text-emerald-600" : isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/40"
                            }`}>{idx + 1}</span>
                            <span>{step.label}</span>
                            <span className={`text-[10px] font-normal ${
                              isDone ? "text-emerald-500" : isActive ? "text-primary/70" : "text-muted-foreground/40"
                            }`}>{step.value}</span>
                          </div>
                          {idx < arr.length - 1 && (
                            <div className={`h-px flex-1 shrink-0 min-w-[16px] ${
                              arr[idx].value === "Complete" ? "bg-emerald-300" : "bg-border/60"
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-border/50">
                  <div className="p-6 bg-primary/[0.03]">
                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">Next action</p>
                    <h3 className="mt-3 text-2xl font-bold text-foreground">{nextAction(selectedApplication)}</h3>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                      {activeAction === "inhouse-plumbing" && "Waiting for applicant: In-house plumbing must be completed by the applicant before you can schedule an inspection."}
                      {activeAction === "inspection" && !hasScheduledInspection && "Action required: In-house plumbing is complete. Schedule an inspection date for the applicant."}
                      {activeAction === "inspection" && hasScheduledInspection && "Waiting for inspector: Inspection is scheduled. Wait for the inspector to submit the result."}
                      {activeAction === "documents" && selectedDocuments.some(d => d.status === 'pending') && "Action required: Inspection is complete. The applicant has uploaded documents. Verify them or note missing requirements."}
                      {activeAction === "documents" && !selectedDocuments.some(d => d.status === 'pending') && "Waiting for applicant: Inspection is complete. Waiting for the applicant to upload all required documents."}
                      {activeAction === "payment" && !latestSelectedPayment && "Action required: Documents are verified. Schedule the office payment date for the applicant."}
                      {activeAction === "payment" && latestSelectedPayment && "Waiting for applicant: Payment is scheduled. Await applicant payment at the office and confirm it here."}
                      {activeAction === "water-meter-schedule" && "Action required: Application fee paid. Schedule the water meter installation."}
                      {activeAction === "water-meter-complete" && "Waiting for installation: Water meter installation is scheduled. Wait for completion and mark it here."}
                      {!activeAction && "Workflow completed: All workflow steps have been finished and the account is converted."}
                    </p>
                  </div>

                  <div className="p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">Current details</p>
                    <dl className="mt-6 grid gap-6 sm:grid-cols-2 text-sm">
                      <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
                        <dt className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Inspection schedule</dt>
                        <dd className="mt-2 text-xs font-medium text-foreground whitespace-nowrap">{selectedInspectionSchedule ? formatDateTime(selectedInspectionSchedule) : "None"}</dd>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
                        <dt className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Inspection result</dt>
                        <dd className="mt-2 space-y-1.5">
                          <div>
                            <StatusBadge status={latestSelectedInspection?.status ?? "Not scheduled"} />
                          </div>
                          {latestSelectedInspection?.inspected_at && (
                            <p className="text-xs font-medium text-foreground whitespace-nowrap">
                              {formatDateTime(latestSelectedInspection.inspected_at)}
                            </p>
                          )}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
                        <dt className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Uploaded documents</dt>
                        <dd className="mt-2 flex flex-col gap-1.5 items-start">
                          <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            {selectedDocuments.length}
                            {selectedDocuments.some((document) => document.status === "pending") ? (
                              <Badge className="bg-sky-600/10 text-sky-700 hover:bg-sky-600/10">
                                Needs review
                              </Badge>
                            ) : null}
                          </div>
                          {selectedDocuments.length > 0 && (
                            <p className="text-xs font-medium text-foreground whitespace-nowrap">
                              {formatDateTime(selectedDocuments.map(d => d.created_at).sort().reverse()[0])}
                            </p>
                          )}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
                        <dt className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Payment records</dt>
                        <dd className="mt-2 flex flex-col gap-1.5 items-start">
                          <div className="text-lg font-semibold text-foreground">{selectedPayments.length}</div>
                          {latestSelectedPayment && (
                            <p className="text-xs font-medium text-foreground whitespace-nowrap">
                              {formatDateTime(latestSelectedPayment.paid_at ?? latestSelectedPayment.office_payment_at ?? latestSelectedPayment.due_date)}
                            </p>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {activeAction ? (
                  <div className="border-t border-border/50 p-6 bg-primary/[0.02]">
                    <div className="rounded-xl border-2 border-primary/20 bg-background p-6 shadow-sm">
                      <div className="mb-6 flex items-start justify-between gap-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Active Workflow Step</p>
                        <Badge variant="default" className="text-[10px] shrink-0 font-medium px-2.5 py-0.5">Next</Badge>
                      </div>
                      {activeAction === "inhouse-plumbing" && (
                        <InhouseInstallationForm
                          applicationId={String(selectedApplication.id)}
                          plumbers={plumbers}
                          currentPlumberId={(selectedApplication.accredited_plumber_id as string | null | undefined) ?? null}
                          currentCompletedAt={(selectedApplication.inhouse_installation_completed_at as string | null | undefined) ?? null}
                          currentProofImageUrl={(selectedApplication.inhouse_installation_proof_image_url as string | null | undefined) ?? null}
                          currentSignedAt={(selectedApplication.inhouse_installation_signed_at as string | null | undefined) ?? null}
                          isCompleted={false}
                          variant="admin"
                        />
                      )}
                      {activeAction === "inspection" && (
                        <div className="space-y-6">
                          <InspectionSchedulerForm
                            applicationId={String(selectedApplication.id)}
                            inspectors={inspectors}
                            existingInspection={
                              latestSelectedInspection?.id
                                ? {
                                    id: String(latestSelectedInspection.id),
                                    status: latestSelectedInspection.status,
                                    scheduled_at: latestSelectedInspection.scheduled_at,
                                    inspector_name: (latestSelectedInspection as Record<string, unknown>).inspector_name as string | null ?? null
                                  }
                                : null
                            }
                          />
                          {latestSelectedInspection?.id && (
                            <InspectionForm
                              inspection={latestSelectedInspection as any}
                              pulledPlumberName={(selectedApplication.accredited_plumbers as { full_name: string } | undefined)?.full_name ?? null}
                            />
                          )}
                        </div>
                      )}
                      {activeAction === "payment" && (
                        <PaymentSchedulerForm
                          applicationId={String(selectedApplication.id)}
                          payment={latestSelectedPayment ?? undefined}
                          canSchedule={canSchedulePayment}
                          scheduleHint="You can schedule the office payment date here after the inspection is approved."
                          classification={(selectedApplication as Record<string, unknown>).concessionaire_classification as string | null}
                        />
                      )}
                      {activeAction === "documents" && null}
                      {activeAction === "water-meter-schedule" && (
                        <WaterMeterSchedulerForm
                          applicationId={String(selectedApplication.id)}
                          scheduledAt={(selectedApplication.water_meter_installation_scheduled_at as string | null | undefined) ?? null}
                          canSchedule={Boolean(selectedApplication.inhouse_installation_completed)}
                          minDateOverride={latestSelectedPayment?.paid_at ?? null}
                        />
                      )}
                      {activeAction === "water-meter-complete" && (
                        <WaterMeterCompletionForm
                          applicationId={String(selectedApplication.id)}
                          scheduledAt={(selectedApplication.water_meter_installation_scheduled_at as string)}
                        />
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="border-t border-border/50 p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">Document verification</p>
                  <div className="space-y-4">
                    {selectedDocuments.some((document) => document.status === "pending") ? (
                      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                        Applicant uploaded document(s) that need admin review.
                      </div>
                    ) : null}
                    {selectedDocuments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No uploaded documents yet. Use document validation notes to list lacking documents for the applicant.
                      </p>
                    ) : null}
                    {canRequestAdditionalDocuments ? (
                      <AdditionalDocumentsForm
                        applicationId={String(selectedApplication.id)}
                        reviewNote={(selectedApplication.document_review_note as string | null | undefined) ?? null}
                      />
                    ) : null}
                    <DocumentVerificationPanel 
                      applicationId={String(selectedApplication.id)}
                      applicationStatus={String(selectedApplication.status)}
                      documentSubmissionMode={String(selectedApplication.document_submission_mode)}
                      requirements={selectedDocumentRequirements} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow actions are handled inline in the 'Next action' panel above. */}
          </div>
        </div>
      ) : noQueueResults ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Change the search text or selected workflow stage to find an applicant."
              : "No application is available to manage yet."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No application is selected yet. Pick one from the queue to open the management panel.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
