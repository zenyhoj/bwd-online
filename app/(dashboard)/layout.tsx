import { AppShell } from "@/components/app-shell";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getApplicants, getApplicantSeminarState, getLatestApplicantApplication } from "@/lib/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const superAdmin = await isSuperAdmin();
  const supabase = createSupabaseAdminClient();

  let applicantNavMode: "preseminar" | "hasApplication" | "newApplication" | undefined;
  const navBadges: Record<string, number> = {};

  if (profile.role === "applicant") {
    const applicants = await getApplicants();
    const firstApplicantId = applicants[0]?.id ?? null;

    const [seminarState, latestApplication] = await Promise.all([
      firstApplicantId ? getApplicantSeminarState(firstApplicantId) : Promise.resolve({ allCompleted: false, items: [], completedCount: 0 }),
      getLatestApplicantApplication()
    ]);

    if (!seminarState.allCompleted) {
      applicantNavMode = "preseminar";
      // Badge: how many seminar items remain
      const remaining = ("items" in seminarState ? seminarState.items.length : 0) - ("completedCount" in seminarState ? seminarState.completedCount : 0);
      if (remaining > 0) navBadges["/applicant/seminar"] = remaining;
    } else if (latestApplication) {
      applicantNavMode = "hasApplication";

      // Badge: pending payments
      const { count: pendingPayments } = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("application_id", latestApplication.id)
        .eq("status", "scheduled");
      if ((pendingPayments ?? 0) > 0) navBadges["/applicant/payments"] = pendingPayments ?? 0;

      // Badge: pending document reviews
      const { count: pendingDocs } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("application_id", latestApplication.id)
        .eq("status", "pending");
      if ((pendingDocs ?? 0) > 0) navBadges["/applicant/documents"] = pendingDocs ?? 0;
    } else {
      applicantNavMode = "newApplication";
    }
  }

  if (profile.role === "admin") {
    // Badge on Dashboard: total applications needing inhouse plumbing or inspection
    const { data: queue } = await supabase
      .from("applications")
      .select("id, inhouse_installation_completed, inspections(id, status), payments(id), concessionaires(id)", { count: "exact" })
      .eq("organization_id", profile.organization_id)
      .neq("status", "converted");

    if (queue) {
      let actionNeeded = 0;
      for (const app of queue) {
        const inspections = (app.inspections as { id: string; status?: string }[] | undefined) ?? [];
        const payments = (app.payments as { id: string }[] | undefined) ?? [];
        const concessionaires = (app.concessionaires as { id: string }[] | undefined) ?? [];
        const hasApprovedInspection = inspections.some((i) => i.status === "approved");
        const converted = concessionaires.length > 0;
        if (!converted && (!app.inhouse_installation_completed || !hasApprovedInspection || payments.length === 0)) {
          actionNeeded++;
        }
      }
      if (actionNeeded > 0) navBadges["/admin"] = actionNeeded;

      // Badge on Inspections: inspections that need a result entered
      const { count: pendingInspections } = await supabase
        .from("inspections")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .eq("status", "scheduled");
      if ((pendingInspections ?? 0) > 0) navBadges["/admin/inspections"] = pendingInspections ?? 0;

      // Badge on Payments: payments scheduled but not yet paid
      const { count: unpaidPayments } = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .eq("status", "scheduled");
      if ((unpaidPayments ?? 0) > 0) navBadges["/admin/payments"] = unpaidPayments ?? 0;

      // Badge for Document Export (Quarterly)
      const { data: orgData } = await supabase
        .from("organizations")
        .select("last_document_export_at")
        .eq("id", profile.organization_id)
        .single();
        
      if (orgData) {
        const lastExport = orgData.last_document_export_at as string | null;
        if (!lastExport) {
          navBadges["/admin/export"] = 1; // Needs initial export
        } else {
          const daysSinceLastExport = (Date.now() - new Date(lastExport).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastExport >= 80) {
            navBadges["/admin/export"] = 1; // Nearing or past 90 days
          }
        }
      }
    }
  }

  return (
    <AppShell profile={profile} applicantNavMode={applicantNavMode} navBadges={navBadges} isSuperAdmin={superAdmin}>
      {children}
    </AppShell>
  );
}
