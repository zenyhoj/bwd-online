import { notFound } from "next/navigation";

import { PrintButton } from "@/components/reports/print-button";
import { InspectionReport } from "@/components/reports/inspection-report";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type InspectionReportPageProps = {
  params: Promise<{ inspectionId: string }>;
};

export default async function InspectionReportPage({ params }: InspectionReportPageProps) {
  const { inspectionId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: inspection } = await supabase.from("inspections").select("*").eq("id", inspectionId).single();

  if (!inspection) {
    notFound();
  }

  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", inspection.application_id)
    .single();

  if (!application) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="print-hidden flex justify-end p-6">
        <PrintButton />
      </div>
      <InspectionReport application={application} inspection={inspection} />
    </div>
  );
}
