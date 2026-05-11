import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { buildPaginatedResult } from "@/lib/pagination";
import { getCurrentProfile } from "@/lib/auth";
import { areDocumentsReadyForPayment } from "@/lib/document-workflow";
import type {
  AccreditedPlumber,
  ApplicantSeminarProgress,
  Application,
  ApplicationWithRelations,
  Document,
  Inspection,
  InspectorRecord,
  PaginatedResult,
  PaginationParams,
  Payment,
  Profile,
  SeminarItem
} from "@/types";

function isMissingOfficePaymentAtColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42703" &&
    (error.message?.includes("office_payment_at") ?? false)
  );
}

export async function getSeminarItems() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("seminar_items")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SeminarItem[];
}

export async function getApplicantSeminarProgress(applicantId: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("applicant_seminar_progress")
    .select("*")
    .eq("applicant_id", applicantId);

  if (error) {
    throw error;
  }

  return (data ?? []) as ApplicantSeminarProgress[];
}

export async function getApplicantSeminarState(applicantId: string) {
  const [items, progress] = await Promise.all([getSeminarItems(), getApplicantSeminarProgress(applicantId)]);
  const completedIds = new Set(progress.filter((item) => item.completed).map((item) => item.seminar_item_id));
  const completedCount = items.filter((item) => completedIds.has(item.id)).length;
  const allCompleted = items.length > 0 && completedCount === items.length;

  return {
    items,
    progress,
    completedCount,
    allCompleted
  };
}

export async function getApplicantApplications(applicantId: string) {
  const supabase = createSupabaseAdminClient();

  const applicantApplicationsQuery = () =>
    supabase
      .from("applications")
      .select(
        "*, inspections(scheduled_at,status,plumbing_approved,remarks,inspected_at), payments(id,payment_type,amount,due_date,office_payment_at,status,paid_at,official_receipt_number,notes)"
      )
      .eq("applicant_id", applicantId)
      .order("created_at", { ascending: false });

  const applicantApplicationsLegacyQuery = () =>
    supabase
      .from("applications")
      .select(
        "*, inspections(scheduled_at,status,plumbing_approved,remarks,inspected_at), payments(id,payment_type,amount,due_date,status,paid_at,official_receipt_number,notes)"
      )
      .eq("applicant_id", applicantId)
      .order("created_at", { ascending: false });

  const { data, error } = await applicantApplicationsQuery();

  if (error) {
    if (isMissingOfficePaymentAtColumn(error)) {
      const { data: legacyData, error: legacyError } = await applicantApplicationsLegacyQuery();
      if (legacyError) throw legacyError;
      return (legacyData ?? []) as ApplicationWithRelations[];
    }
    throw error;
  }

  return (data ?? []) as ApplicationWithRelations[];
}

export async function getApplicants() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("applicants")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getAccreditedPlumbers() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("accredited_plumbers")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AccreditedPlumber[];
}

export async function getAllAccreditedPlumbers() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("accredited_plumbers")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AccreditedPlumber[];
}

export async function getAdminApplications(pagination: PaginationParams): Promise<PaginatedResult<Record<string, unknown>>> {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();
  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize - 1;

  const { data, count, error } = await supabase
    .from("applications")
    .select(
      "id, applicant_id, full_name, service_type, status, submitted_at, created_at, document_submission_mode, document_review_note, inhouse_installation_completed, inhouse_installation_completed_at, water_meter_installation_scheduled_at, accredited_plumbers(full_name), inspections(id,status,plumbing_approved,scheduled_at), documents(*), payments(id,status,paid_at,due_date), concessionaires(id)",
      { count: "exact" }
    )
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return buildPaginatedResult((data ?? []) as Record<string, unknown>[], count ?? 0, pagination);
}

function getAdminQueueStage(record: Record<string, unknown>) {
  const status = String(record.status);
  const inspections =
    ((record.inspections as {
      id?: string;
      status?: string;
      scheduled_at?: string | null;
    }[] | undefined) ?? []);
  const payments = ((record.payments as { id?: string; status?: string; paid_at?: string | null; due_date?: string | null }[] | undefined) ?? []);
  const latestPayment =
    [...payments].sort((a, b) => {
      const aTime = new Date(a.paid_at ?? a.due_date ?? 0).getTime();
      const bTime = new Date(b.paid_at ?? b.due_date ?? 0).getTime();
      return bTime - aTime;
    })[0] ?? null;
  const converted = (((record.concessionaires as { id?: string }[] | undefined) ?? []).length ?? 0) > 0;
  const hasApprovedInspection = inspections.some((inspection) => inspection.status === "approved");
  const hasScheduledInspection = inspections.length > 0;
  const documents = ((record.documents as Document[] | undefined) ?? []);
  const installationComplete = Boolean(record.inhouse_installation_completed);
  const documentsReady = areDocumentsReadyForPayment(record as never);
  const waterMeterScheduled = Boolean(record.water_meter_installation_scheduled_at);
  const waterMeterInstalled = Boolean(record.water_meter_installed_at);
  const effectiveStatus =
    converted || status === "converted"
      ? "converted"
      : latestPayment?.status === "paid" && installationComplete
        ? "approved"
        : status;

  if (effectiveStatus === "converted") return "completed";
  if (!installationComplete) return "for-inhouse-plumbing";
  if (!hasScheduledInspection) return "for-inspection";
  if (!hasApprovedInspection) return "under-review";
  if (!documentsReady) return "for-documents";
  if (payments.length === 0 || latestPayment?.status !== "paid") return "for-payment";
  if (!waterMeterScheduled) return "for-water-meter-schedule";
  if (!waterMeterInstalled) return "for-water-meter-complete";
  return "for-conversion";
}

const adminQueueStagePriority: Record<string, number> = {
  "for-inspection": 10,
  "for-documents": 20,
  "for-payment": 30,
  "for-water-meter-schedule": 40,
  "for-water-meter-complete": 50,
  "for-conversion": 60,
  "under-review": 70,
  "for-inhouse-plumbing": 80,
  completed: 90
};

function getAdminQueueSortTime(record: Record<string, unknown>, stage: string) {
  if (stage === "for-inspection") {
    return new Date(String(record.inhouse_installation_completed_at ?? record.created_at ?? 0)).getTime();
  }

  return new Date(String(record.submitted_at ?? record.created_at ?? 0)).getTime();
}

export async function getAdminApplicationsQueue(
  pagination: PaginationParams,
  filters?: { q?: string; status?: string; workflow?: string }
): Promise<PaginatedResult<Record<string, unknown>>> {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  let query = supabase
    .from("applications")
    .select(
      "id, applicant_id, full_name, service_type, status, submitted_at, created_at, document_submission_mode, document_review_note, inhouse_installation_completed, inhouse_installation_completed_at, water_meter_installation_scheduled_at, accredited_plumbers(full_name), inspections(id,status,plumbing_approved,scheduled_at), documents(*), payments(id,status,paid_at,due_date), concessionaires(id)",
      { count: "exact" }
    )
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  if (filters?.q) {
    const searchTerms = filters.q.split(/[\s,]+/).filter(Boolean);
    for (const term of searchTerms) {
      query = query.ilike("full_name", `%${term}%`);
    }
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const allRecords = (data ?? []) as Record<string, unknown>[];

  const workflowFiltered =
    !filters?.workflow || filters.workflow === "all"
      ? allRecords
      : allRecords.filter((record) => getAdminQueueStage(record) === filters.workflow);

  const sortedWorkflowRecords = [...workflowFiltered].sort((a, b) => {
    const stageA = getAdminQueueStage(a);
    const stageB = getAdminQueueStage(b);
    const priorityA = adminQueueStagePriority[stageA] ?? 999;
    const priorityB = adminQueueStagePriority[stageB] ?? 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const timeA = getAdminQueueSortTime(a, stageA);
    const timeB = getAdminQueueSortTime(b, stageB);

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""));
  });

  const from = (pagination.page - 1) * pagination.pageSize;
  const to = from + pagination.pageSize;

  return buildPaginatedResult(sortedWorkflowRecords.slice(from, to), sortedWorkflowRecords.length, pagination);
}

export async function getAdminApplicationDetail(applicationId: string) {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("applications")
    .select("*, inspections(*), documents(*), payments(*), accredited_plumbers(full_name), concessionaires(*)")
    .eq("organization_id", profile.organization_id)
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Record<string, unknown> | null;
}

export async function getOrganizationInspectors() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("inspectors")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as InspectorRecord[];
}

export async function getAllInspectors() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("inspectors")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as InspectorRecord[];
}

export async function getOrganizationStaff() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Profile[];
}

export async function getCurrentInspectorRegistryIds() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("inspectors")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .ilike("full_name", profile.full_name);

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => item.id);
}

export async function getInspectorAssignments() {
  const supabase = createSupabaseAdminClient();
  const [profile, registryInspectorIds] = await Promise.all([
    getCurrentProfile(),
    getCurrentInspectorRegistryIds()
  ]);

  if (registryInspectorIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("inspections")
    .select("*, applications(*)")
    .eq("organization_id", profile.organization_id)
    .in("registry_inspector_id", registryInspectorIds)
    .order("scheduled_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as (Inspection & { applications: Application | null })[];
}

export async function getApplicationDocuments(applicationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Document[];
}

export async function getApplicationPayments(applicationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("application_id", applicationId)
    .order("due_date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Payment[];
}

export async function getLatestApplicantApplication() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  // Get all applicant IDs belonging to this profile
  const { data: applicants } = await supabase
    .from("applicants")
    .select("id")
    .eq("profile_id", profile.id);

  const applicantIds = (applicants ?? []).map((a) => a.id);
  if (applicantIds.length === 0) return null;

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .in("applicant_id", applicantIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Application | null;
}

export async function getAdminSeminarItems() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("seminar_items")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SeminarItem[];
}
