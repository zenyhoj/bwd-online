import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, CreditCard, Wrench, Download } from "lucide-react";

import { WaterMeterSchedulerForm } from "@/components/admin/water-meter-scheduler-form";
import { WaterMeterCompletionForm } from "@/components/admin/water-meter-completion-form";
import { DocumentVerificationPanel } from "@/components/admin/document-verification-panel";
import { InspectionSchedulerForm } from "@/components/admin/inspection-scheduler-form";
import { InstallationSchedulerForm } from "@/components/admin/installation-scheduler-form";
import { PaymentSchedulerForm } from "@/components/admin/payment-scheduler-form";
import { QueueFilters } from "@/components/admin/queue-filters";
import { InhouseInstallationForm } from "@/components/shared/inhouse-installation-form";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { StatusBadge } from "@/components/shared/status-badge";
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
  getOrganizationInspectors
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

  if (converted || status === "converted") {
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

  if (converted || status === "converted") return "Completed";
  if (!inhousePlumbingComplete) return "Complete in-house plumbing";
  if (!hasScheduledInspection) return "Schedule inspection";
  if (!hasApprovedInspection) return "Await inspection result";
  if (!documentsReady) return "Review documents";
  if (paymentsList.length === 0 || latestPayment?.status !== "paid") return "Confirm payment";
  if (!waterMeterScheduled) return "Schedule water meter";
  if (!waterMeterInstalled) return "Complete water meter";
  return "Convert account";
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

  if (converted || status === "converted") return "completed";
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
  const hasActiveFilters = Boolean(q) || workflow !== "all";
  const noQueueResults = applications.data.length === 0;
  const hasMatchesInOtherStages = Boolean(searchMatchesAcrossAllStages && searchMatchesAcrossAllStages.count > 0);

  const { readyForInspection, awaitingInspectionResult, readyForPayment, readyForConversion: readyForConversionEffective } = stats;

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
    else if (!selectedApplication.inhouse_installation_completed) activeAction = "mark-installation";
    else if (!selectedApplication.water_meter_installation_scheduled_at) activeAction = "water-meter-schedule";
    else if (!selectedApplication.water_meter_installed_at) activeAction = "water-meter-complete";
  }

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Total in queue</p>
                <p className="mt-0.5 text-2xl font-bold">{applications.count}</p>
                <p className="text-[10px] text-muted-foreground/60 font-medium uppercase">active applications</p>
              </div>
              <div className="rounded-lg bg-blue-500/5 p-1.5">
                <ClipboardList className="h-4 w-4 text-blue-500/40" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-primary/5 shadow-none transition-all hover:bg-primary/[0.08]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-1">Need Schedule</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tighter">{readyForInspection}</span>
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase">apps</span>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground/60 font-medium">appointments pending</p>
              </div>
              <div className="rounded-full bg-primary/10 text-primary/40 p-1.5">
                <Wrench className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-amber-500/5 shadow-none transition-all hover:bg-amber-500/[0.08]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600/70 mb-1">Awaiting Result</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tighter text-amber-600/90">{awaitingInspectionResult}</span>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground/60 font-medium">scheduled inspections</p>
              </div>
              <div className="rounded-full bg-amber-500/10 text-amber-500/40 p-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-indigo-600/5 shadow-none transition-all hover:bg-indigo-600/[0.08]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600/70 mb-1">Ready for Payment</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tighter text-indigo-600/90">{readyForPayment}</span>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground/60 font-medium">awaiting payment</p>
              </div>
              <div className="rounded-full bg-indigo-600/10 text-indigo-600/40 p-1.5">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-emerald-600/5 shadow-none transition-all hover:bg-emerald-600/[0.08]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 mb-1">Ready for Conversion</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tighter text-emerald-600/90">{readyForConversionEffective}</span>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground/60 font-medium">ready for account</p>
              </div>
              <div className="rounded-full bg-emerald-600/10 text-emerald-600/40 p-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
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
                    <TableHead>Stage</TableHead>
                    <TableHead>Next action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(applications.data as Record<string, unknown>[]).map((record) => {
                    const recordStage = queueStage(record);
                    const isSelected = String(record.id) === selectedId;
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
                            <p className="font-medium">{String(record.full_name)}</p>
                            <p className="text-xs text-muted-foreground">
                              {String(record.service_type).replaceAll("_", " ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-block rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                            {queueStageLabel(recordStage)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{nextAction(record)}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={getEffectiveApplicationStatus(record)} />
                        </TableCell>
                        <TableCell>
                          {formatDateTime((record.submitted_at as string | null | undefined) ?? null)}
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
        <div className="mx-auto max-w-4xl space-y-6 pb-12">
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
                        latestSelectedPayment?.status === "paid" ? (
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
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-b border-border/50 px-6 py-4">
                  <div className="flex items-center gap-0 overflow-x-auto">
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
                        <div key={step.label} className="flex items-center">
                          <div className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-center min-w-[90px] text-xs font-medium ${
                            isDone ? "text-emerald-600" : isActive ? "text-primary" : "text-muted-foreground/50"
                          }`}>
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                              isDone ? "bg-emerald-100 text-emerald-600" : isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/40"
                            }`}>{idx + 1}</span>
                            <span>{step.label}</span>
                            <span className={`text-[10px] font-normal ${
                              isDone ? "text-emerald-500" : isActive ? "text-primary/70" : "text-muted-foreground/40"
                            }`}>{step.value}</span>
                          </div>
                          {idx < arr.length - 1 && (
                            <div className={`h-px w-6 shrink-0 ${
                              arr[idx].value === "Complete" ? "bg-emerald-300" : "bg-border/60"
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] divide-y lg:divide-y-0 lg:divide-x divide-border/50">
                  <div className="p-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current details</p>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Inspection schedule</dt>
                        <dd className="mt-1 font-medium">{formatDateTime(selectedInspectionSchedule)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Inspection result</dt>
                        <dd className="mt-1">
                          <StatusBadge status={latestSelectedInspection?.status ?? "Not scheduled"} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Uploaded documents</dt>
                        <dd className="mt-1 font-medium">{selectedDocuments.length}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Payment records</dt>
                        <dd className="mt-1 font-medium">{selectedPayments.length}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="p-6 bg-primary/[0.02]">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Next action</p>
                    <p className="mt-3 text-lg font-semibold">{nextAction(selectedApplication)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {activeAction === "inhouse-plumbing" && "In-house plumbing must be completed by the applicant before scheduling an inspection."}
                      {activeAction === "inspection" && "Finish the remaining inspection steps before moving to payment scheduling."}
                      {activeAction === "documents" && "Inspection is complete. Verify the uploaded documents or note the missing requirements before payment scheduling."}
                      {activeAction === "payment" && "Inspection and documents are complete. Continue with payment confirmation."}
                      {activeAction === "mark-installation" && "Payment confirmed. Mark the installation as complete."}
                      {activeAction === "water-meter-schedule" && "Application fee paid. Schedule the water meter installation."}
                      {activeAction === "water-meter-complete" && "Water meter installation is scheduled. Wait for completion and mark it here."}
                      {!activeAction && "All workflow steps have been completed."}
                    </p>
                    {activeAction ? (
                      <div className="mt-8 rounded-xl border-2 border-primary/20 bg-background p-6 shadow-sm">
                        <div className="mb-6 flex items-start justify-between gap-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Active Workflow Step</p>
                          <Badge variant="default" className="text-[10px] shrink-0">Next</Badge>
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
                        {activeAction === "mark-installation" && (
                          <InhouseInstallationForm
                            applicationId={String(selectedApplication.id)}
                            plumbers={plumbers}
                            currentPlumberId={(selectedApplication.accredited_plumber_id as string | null | undefined) ?? null}
                            currentCompletedAt={(selectedApplication.inhouse_installation_completed_at as string | null | undefined) ?? null}
                            currentProofImageUrl={(selectedApplication.inhouse_installation_proof_image_url as string | null | undefined) ?? null}
                            currentSignedAt={(selectedApplication.inhouse_installation_signed_at as string | null | undefined) ?? null}
                            isCompleted={Boolean(selectedApplication.inhouse_installation_completed)}
                            variant="admin"
                          />
                        )}
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
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-border/50 p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">Document verification</p>
                  <div className="space-y-4">
                    {selectedDocuments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No uploaded documents yet. Use the note form above to list lacking documents for the applicant.
                      </p>
                    ) : null}
                    <DocumentVerificationPanel 
                      applicationId={String(selectedApplication.id)}
                      applicationStatus={String(selectedApplication.status)}
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
