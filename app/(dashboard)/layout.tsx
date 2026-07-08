import { AppShell } from "@/components/app-shell";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAdminDashboardStats, getApplicants, getApplicantSeminarState, getLatestApplicantApplication } from "@/lib/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const superAdmin = await isSuperAdmin();
  const supabase = createSupabaseAdminClient();

  let applicantNavMode: "preseminar" | "hasApplication" | "newApplication" | "converted" | undefined;
  const navBadges: Record<string, number> = {};

  if (profile.role === "applicant") {
    const applicants = await getApplicants();
    const firstApplicantId = applicants[0]?.id ?? null;

    const [seminarState, latestApplication, { data: concessionaires }] = await Promise.all([
      firstApplicantId ? getApplicantSeminarState(firstApplicantId) : Promise.resolve({ allCompleted: false, items: [], completedCount: 0 }),
      getLatestApplicantApplication(),
      supabase
        .from("concessionaires")
        .select("id")
        .in("applicant_id", applicants.map(a => a.id))
    ]);

    if (concessionaires && concessionaires.length > 0) {
      applicantNavMode = "converted";
    } else if (!seminarState.allCompleted) {
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
    const adminStats = await getAdminDashboardStats();

    if (adminStats.activeWorkflowItems > 0) {
      navBadges["/admin"] = adminStats.activeWorkflowItems;
    }

    // Badge on Inspections: inspections that need a result entered
    const { count: pendingInspections } = await supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .eq("status", "scheduled");
    if ((pendingInspections ?? 0) > 0) navBadges["/admin/inspections"] = pendingInspections ?? 0;

    // Badge on Payments: applicants currently waiting in the payment workflow
    if (adminStats.readyForPayment > 0) navBadges["/admin/payments"] = adminStats.readyForPayment;

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

  const { getSessionUser } = await import("@/lib/auth");
  const user = await getSessionUser();
  const email = user?.email ?? null;

  return (
    <AppShell profile={profile} email={email} applicantNavMode={applicantNavMode} navBadges={navBadges} isSuperAdmin={superAdmin}>
      {children}
    </AppShell>
  );
}
