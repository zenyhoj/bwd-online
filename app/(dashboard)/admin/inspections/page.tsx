import Form from "next/form";
import Link from "next/link";
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardList, Filter, Search, SlidersHorizontal } from "lucide-react";

import { InspectionScheduleInlineEditor } from "@/components/admin/inspection-schedule-inline-editor";
import { InspectionForm } from "@/components/inspector/inspection-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type InspectionApplicationRelation = {
  full_name?: string;
  accredited_plumbers?: { full_name?: string } | null;
} | null;

type AdminInspectionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  return typeof searchParams?.[key] === "string" ? searchParams[key] : undefined;
}

function getPlumbingResult(plumbingApproved: boolean | null) {
  if (plumbingApproved === null) {
    return "Pending";
  }

  return plumbingApproved ? "Approved" : "Disapproved";
}

function matchesStatusFilter(statusFilter: string, inspectionStatus: string) {
  if (statusFilter === "all") {
    return true;
  }

  if (statusFilter === "needs_update") {
    return inspectionStatus === "scheduled" || inspectionStatus === "in_progress";
  }

  return inspectionStatus === statusFilter;
}

export default async function AdminInspectionsPage({ searchParams }: AdminInspectionsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const q = getStringParam(resolvedSearchParams, "q")?.trim() ?? "";
  const statusFilter = getStringParam(resolvedSearchParams, "status") ?? "all";
  const inspectorFilter = getStringParam(resolvedSearchParams, "inspector") ?? "all";
  const scheduledDateFilter = getStringParam(resolvedSearchParams, "scheduledDate") ?? "";
  const editorQ = getStringParam(resolvedSearchParams, "editorQ")?.trim() ?? "";
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();
  const { data: inspections } = await supabase
    .from("inspections")
    .select("*, applications(full_name, accredited_plumbers(full_name))")
    .eq("organization_id", profile.organization_id)
    .order("scheduled_at", { ascending: false });

  const allInspectionRows = inspections ?? [];
  const inspectorOptions = Array.from(
    new Set(
      allInspectionRows
        .map((inspection) => inspection.inspector_name?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));
  const inspectionRows = allInspectionRows.filter((inspection) => {
    const applicantName = ((inspection.applications as InspectionApplicationRelation)?.full_name ?? "").toLowerCase();
    const inspectorName = (inspection.inspector_name ?? "").toLowerCase();
    const matchesQuery =
      q.length === 0 ||
      applicantName.includes(q.toLowerCase()) ||
      inspectorName.includes(q.toLowerCase());
    const matchesStatus = matchesStatusFilter(statusFilter, inspection.status);
    const matchesInspector = inspectorFilter === "all" || inspection.inspector_name === inspectorFilter;
    const matchesScheduledDate =
      scheduledDateFilter.length === 0 || (inspection.scheduled_at?.slice(0, 10) ?? "") === scheduledDateFilter;

    return matchesQuery && matchesStatus && matchesInspector && matchesScheduledDate;
  });
  const selectedId = getStringParam(resolvedSearchParams, "selected") ?? inspectionRows[0]?.id ?? "";
  const selectedInspection = inspectionRows.find((inspection) => inspection.id === selectedId) ?? inspectionRows[0] ?? null;
  const editorSearchRows = allInspectionRows
    .filter((inspection) => {
      if (!editorQ) {
        return true;
      }

      const applicantName = ((inspection.applications as InspectionApplicationRelation)?.full_name ?? "").toLowerCase();
      const inspectorName = (inspection.inspector_name ?? "").toLowerCase();
      const query = editorQ.toLowerCase();

      return applicantName.includes(query) || inspectorName.includes(query);
    })
    .slice(0, 6);
  const pendingCount = inspectionRows.filter((inspection) => inspection.status === "scheduled").length;
  const approvedCount = inspectionRows.filter((inspection) => inspection.status === "approved").length;
  const rescheduledCount = inspectionRows.filter((inspection) => inspection.status === "rescheduled").length;
  const quickFilters = [
    { value: "all", label: "All", count: allInspectionRows.length },
    {
      value: "needs_update",
      label: "Needs update",
      count: allInspectionRows.filter(
        (inspection) => inspection.status === "scheduled" || inspection.status === "in_progress"
      ).length
    },
    {
      value: "approved",
      label: "Approved",
      count: allInspectionRows.filter((inspection) => inspection.status === "approved").length
    },
    {
      value: "rejected",
      label: "Disapproved",
      count: allInspectionRows.filter((inspection) => inspection.status === "rejected").length
    },
    {
      value: "rescheduled",
      label: "Rescheduled",
      count: allInspectionRows.filter((inspection) => inspection.status === "rescheduled").length
    }
  ];
  const hasActiveFilters =
    q.length > 0 || statusFilter !== "all" || inspectorFilter !== "all" || scheduledDateFilter.length > 0;
  const activeFilterCount =
    (q.length > 0 ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (inspectorFilter !== "all" ? 1 : 0) +
    (scheduledDateFilter.length > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operations</p>
          <h1 className="text-3xl font-semibold">Inspection schedule</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground lg:text-right">
          Review schedules, record inspector feedback, and mark each inspection as approved or disapproved.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total inspections</p>
                <p className="mt-1 text-3xl font-bold">{inspectionRows.length}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">matching current filters</p>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3">
                <ClipboardList className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-primary">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Awaiting update</p>
                <p className="mt-1 text-3xl font-bold">{pendingCount}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">scheduled or in progress</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Approved / rescheduled</p>
                <p className="mt-1 text-3xl font-bold">{approvedCount + rescheduledCount}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">already reviewed</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Inspections</CardTitle>
              <p className="text-sm text-muted-foreground">
                Filter the queue, then open a row to update schedule details and inspection findings.
              </p>
            </div>
            <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-sm font-medium">
              {inspectionRows.length} visible
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Queue filters</p>
                  <p className="text-sm text-muted-foreground">
                    Search for a specific applicant to quickly find their inspection record.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">
                  {statusFilter === "all" ? "All statuses" : statusFilter.replaceAll("_", " ")}
                </Badge>
                {hasActiveFilters ? (
                  <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                    {activeFilterCount} active
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 px-4 py-4">
              <Form action="/admin/inspections" className="flex w-full max-w-xl flex-wrap items-center gap-3">
                <div className="relative flex-1">
                  <label htmlFor="inspection-q" className="sr-only">
                    Search
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="inspection-q"
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search applicant name..."
                    className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
                  />
                </div>
                <Button type="submit" className="whitespace-nowrap">
                  Search
                </Button>
                {q ? (
                  <Button asChild variant="outline">
                    <Link href="/admin/inspections">Clear</Link>
                  </Button>
                ) : null}
              </Form>

              <div className="flex flex-wrap gap-2">
                {quickFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    asChild
                    variant={statusFilter === filter.value ? "secondary" : "outline"}
                    size="sm"
                  >
                    <Link
                      href={
                        (
                          `/admin/inspections?${new URLSearchParams({
                            ...(q ? { q } : {}),
                            ...(filter.value !== "all" ? { status: filter.value } : {}),
                            ...(inspectorFilter !== "all" ? { inspector: inspectorFilter } : {}),
                            ...(scheduledDateFilter ? { scheduledDate: scheduledDateFilter } : {})
                          }).toString()}`
                        ) as never
                      }
                    >
                      {filter.label} ({filter.count})
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-4">
              <div>
                <p className="font-semibold">Scheduled inspections</p>
                <p className="text-sm text-muted-foreground">
                  Select an applicant row to open the editor and update the inspection record.
                </p>
              </div>
              <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-sm font-medium">
                {inspectionRows.length === 1 ? "1 record" : `${inspectionRows.length} records`}
              </div>
            </div>
            <Table className="text-[11px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3">Applicant</TableHead>
                  <TableHead className="px-3">Inspector</TableHead>
                  <TableHead className="px-3">Schedule</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                  <TableHead className="px-3">Plumbing result</TableHead>
                  <TableHead className="px-3">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspectionRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-4">
                        <div className="rounded-full bg-muted p-3">
                          <ClipboardList className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-foreground">No inspections found</p>
                        <p className="text-xs text-muted-foreground">
                          {hasActiveFilters
                            ? "No records match your current filters. Try clearing filters or selecting a different status."
                            : "No inspections have been scheduled yet."}
                        </p>
                        {hasActiveFilters ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href="/admin/inspections">Clear filters</Link>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  inspectionRows.map((inspection) => {
                    return (
                      <TableRow
                        key={inspection.id}
                        className={inspection.id === selectedInspection?.id ? "border-l-4 border-l-primary bg-primary/5" : "hover:bg-muted/20"}
                      >
                        <TableCell className="px-3 py-3 font-medium whitespace-nowrap">
                          <Link
                            href={(
                              `/admin/inspections?${new URLSearchParams({
                                ...(q ? { q } : {}),
                                ...(statusFilter !== "all" ? { status: statusFilter } : {}),
                                ...(inspectorFilter !== "all" ? { inspector: inspectorFilter } : {}),
                                ...(scheduledDateFilter ? { scheduledDate: scheduledDateFilter } : {}),
                                selected: inspection.id
                              }).toString()}#inspection-editor`
                            ) as never}
                            className="text-foreground hover:text-primary hover:underline"
                          >
                            {(inspection.applications as InspectionApplicationRelation)?.full_name ?? "Unknown"}
                          </Link>
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap">{inspection.inspector_name ?? "Unassigned"}</TableCell>
                        <TableCell className="px-3 py-3">
                          <InspectionScheduleInlineEditor
                            inspectionId={inspection.id}
                            scheduledAt={inspection.scheduled_at}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <StatusBadge status={inspection.status} className="text-[11px]" />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <StatusBadge status={getPlumbingResult(inspection.plumbing_approved)} className="text-[11px]" />
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap">
                          {inspection.status === "approved" || inspection.status === "rejected" ? (
                            <Link href={`/admin/reports/${inspection.id}`} className="text-primary hover:underline font-bold text-[11px] uppercase tracking-wider">
                              Open report
                            </Link>
                          ) : (
                            <span className="text-muted-foreground/40 font-bold text-[11px] uppercase tracking-wider cursor-not-allowed" title="Inspection must be approved or disapproved first">
                              Pending
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedInspection ? (
        <Card id="inspection-editor" className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Inspection editor
                  </span>
                </div>
                <CardTitle>
                  {(selectedInspection.applications as InspectionApplicationRelation)?.full_name ?? "Unknown applicant"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedInspection.inspector_name ?? "Unassigned inspector"} • Scheduled{" "}
                  {formatDateTime(selectedInspection.scheduled_at)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select an applicant name above to open the findings form for that inspection.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedInspection.status} />
                <StatusBadge status={getPlumbingResult(selectedInspection.plumbing_approved)} />
              </div>
            </div>
            <div className="rounded-lg border border-border/80 bg-background p-3">
              <form className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]" action="/admin/inspections">
                {q ? <input type="hidden" name="q" value={q} /> : null}
                {statusFilter !== "all" ? <input type="hidden" name="status" value={statusFilter} /> : null}
                {inspectorFilter !== "all" ? <input type="hidden" name="inspector" value={inspectorFilter} /> : null}
                {scheduledDateFilter ? <input type="hidden" name="scheduledDate" value={scheduledDateFilter} /> : null}
                <input type="hidden" name="selected" value={selectedInspection.id} />
                <div className="relative">
                  <label htmlFor="editorQ" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Find applicant for approval
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
                  <input
                    id="editorQ"
                    name="editorQ"
                    defaultValue={editorQ}
                    placeholder="Search completed in-house plumbing applicants"
                    className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full md:w-auto">
                    Search
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button asChild variant="outline" className="w-full md:w-auto">
                    <Link href={`/admin/inspections?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
                      ...(inspectorFilter !== "all" ? { inspector: inspectorFilter } : {}),
                      ...(scheduledDateFilter ? { scheduledDate: scheduledDateFilter } : {}),
                      selected: selectedInspection.id
                    }).toString()}#inspection-editor`}>
                      Clear
                    </Link>
                  </Button>
                </div>
              </form>
              {editorQ ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {editorSearchRows.length > 0 ? (
                    editorSearchRows.map((inspection) => {
                      const applicantName =
                        (inspection.applications as InspectionApplicationRelation)?.full_name ?? "Unknown applicant";
                      const query = new URLSearchParams({
                        ...(q ? { q } : {}),
                        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
                        ...(inspectorFilter !== "all" ? { inspector: inspectorFilter } : {}),
                        ...(scheduledDateFilter ? { scheduledDate: scheduledDateFilter } : {}),
                        editorQ,
                        selected: inspection.id
                      });

                      return (
                        <Button
                          key={inspection.id}
                          asChild
                          variant={inspection.id === selectedInspection.id ? "secondary" : "outline"}
                          size="sm"
                        >
                          <Link href={`/admin/inspections?${query.toString()}#inspection-editor`}>
                            {applicantName}
                          </Link>
                        </Button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No inspection-ready applicants matched "{editorQ}".</p>
                  )}
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              You are editing this inspection now. Update the schedule, result, and material list below.
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <InspectionForm
              inspection={selectedInspection}
              pulledPlumberName={
                (selectedInspection.applications as InspectionApplicationRelation)?.accredited_plumbers?.full_name ?? null
              }
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}


