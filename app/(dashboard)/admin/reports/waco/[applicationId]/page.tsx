import { notFound } from "next/navigation";

import { WacoReport } from "@/components/reports/waco-report";
import { InspectionReport } from "@/components/reports/inspection-report";
import { PrintButton } from "@/components/reports/print-button";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdminApplicationDetail } from "@/lib/queries";
import type { Payment } from "@/types";

type WacoReportPageProps = {
  params: Promise<{
    applicationId: string;
  }>;
};

export default async function WacoReportPage({ params }: WacoReportPageProps) {
  const { applicationId } = await params;
  
  if (!applicationId) {
    notFound();
  }

  // Use admin client to bypass RLS for report generation
  const supabase = createSupabaseAdminClient();
  
  // 1. Fetch Application with pre-loaded generic data
  const application = await getAdminApplicationDetail(applicationId);
  if (!application) {
    notFound();
  }

  // 2. Extract latest inspection
  const inspections = ((application.inspections as { id?: string; status?: string; scheduled_at?: string | null; account_number?: string | null; latitude?: string | null; longitude?: string | null }[] | undefined) ?? []);
  const latestInspection = [...inspections].sort((a, b) => new Date(b.scheduled_at ?? 0).getTime() - new Date(a.scheduled_at ?? 0).getTime())[0] ?? null;

  // 3. Extract latest payment
  const payments = ((application.payments as Payment[] | undefined) ?? []);
  const latestPayment = [...payments].sort((a, b) => new Date(b.paid_at ?? 0).getTime() - new Date(a.paid_at ?? 0).getTime())[0] ?? null;

  // 4. Fetch Plumber if assigned
  let plumberName: string | null = null;
  if (application.accredited_plumber_id) {
    const { data: plumber } = await supabase
      .from("accredited_plumbers")
      .select("full_name")
      .eq("id", application.accredited_plumber_id)
      .single();
    if (plumber) {
      plumberName = plumber.full_name;
    }
  }

  const { data: latestSeminarProgress } = await supabase
    .from("applicant_seminar_progress")
    .select("completed_at, updated_at, created_at")
    .eq("applicant_id", String(application.applicant_id))
    .eq("completed", true)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestLegacySeminarProgress } = await supabase
    .from("seminar_progress")
    .select("completed_at, updated_at, created_at")
    .eq("application_id", String(application.id))
    .eq("completed", true)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const applicationSeminarFallback = application.seminar_completed
    ? String(application.submitted_at ?? application.created_at ?? "") || null
    : null;
  const seminarDate =
    latestSeminarProgress?.completed_at ??
    latestSeminarProgress?.updated_at ??
    latestSeminarProgress?.created_at ??
    latestLegacySeminarProgress?.completed_at ??
    latestLegacySeminarProgress?.updated_at ??
    latestLegacySeminarProgress?.created_at ??
    applicationSeminarFallback ??
    null;

  return (
    <div className="flex w-full flex-col items-center gap-8 p-4 print:gap-0 print:p-0 min-h-screen bg-muted/20 print:bg-white print:block relative">
      <PrintButton />
      
      <div className="print:shadow-none">
        <WacoReport
          application={application as any}
          inspection={latestInspection as any}
          payment={latestPayment}
          plumberName={plumberName}
          seminarCompletedAt={seminarDate}
        />
      </div>
    </div>
  );
}
