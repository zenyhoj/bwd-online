import Link from "next/link";
import { notFound } from "next/navigation";
import { FileClock } from "lucide-react";

import { WacoReport } from "@/components/reports/waco-report";
import { PrintButton } from "@/components/reports/print-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWacoPrintEligibility } from "@/lib/document-workflow";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdminApplicationDetail } from "@/lib/queries";
import type { Document, Payment } from "@/types";

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
  const wacoPrintEligibility = getWacoPrintEligibility({
    application: application as never,
    documents: ((application.documents as Document[] | undefined) ?? []),
    payments
  });

  if (!wacoPrintEligibility.allowed) {
    const message =
      wacoPrintEligibility.reason === "office_documents_unverified"
        ? "WACO printing becomes available after office document verification is completed."
        : "WACO printing becomes available after all required documents have been uploaded.";

    return (
      <main className="flex min-h-[70vh] items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-lg border-border/80 shadow-sm">
          <CardHeader className="items-center text-center">
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileClock className="h-6 w-6" aria-hidden="true" />
            </span>
            <CardTitle>WACO is not available yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-center">
            <p className="text-sm leading-6 text-muted-foreground">{message}</p>
            <Button asChild>
              <Link href={`/admin?selected=${applicationId}`}>Return to application</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

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
    <div className="flex w-full flex-col items-center gap-8 p-4 print:gap-0 print:p-0 min-h-screen print:min-h-0 bg-muted/20 print:bg-white print:block relative">
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
