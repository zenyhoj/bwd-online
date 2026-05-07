import { redirect } from "next/navigation";
import { SeminarModuleList } from "@/components/applicant/seminar-module-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { areDocumentsReadyForPayment } from "@/lib/document-workflow";
import { getApplicantApplications, getApplicants, getApplicantSeminarState } from "@/lib/queries";

export default async function ApplicantSeminarPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  // Auto-resolve applicant: use param, else first applicant, else send to create one
  const applicants = await getApplicants();

  const paramId = typeof resolvedSearchParams?.["applicant"] === "string"
    ? resolvedSearchParams["applicant"]
    : null;

  const applicantId = paramId ?? applicants[0]?.id ?? null;

  if (!applicantId) {
    // No applicant records yet — send them to create one first
    redirect("/applicant/new");
  }

  // If the URL has no param, redirect with it so the URL is canonical
  if (!paramId && applicantId) {
    redirect(`/applicant/seminar?applicant=${applicantId}`);
  }

  const [seminarState, applications] = await Promise.all([
    getApplicantSeminarState(applicantId),
    getApplicantApplications(applicantId)
  ]);

  const selectedApplication = applications[0] ?? null;
  const latestPayment =
    selectedApplication?.payments
      ? [...selectedApplication.payments].sort((a, b) => {
          const aTime = new Date(a.paid_at ?? a.due_date ?? 0).getTime();
          const bTime = new Date(b.paid_at ?? b.due_date ?? 0).getTime();
          return bTime - aTime;
        })[0] ?? null
      : null;
  const hasApplication = Boolean(selectedApplication);
  const inhouseCompleted = Boolean(selectedApplication?.inhouse_installation_completed);
  const documentsReady = selectedApplication
    ? areDocumentsReadyForPayment(selectedApplication, selectedApplication.documents ?? [])
    : false;

  const completionCta = !hasApplication
    ? {
        href: `/applicant/applications/new?applicant=${applicantId}`,
        label: "Proceed to application",
        description: "Your next step is to proceed with the application form."
      }
    : !inhouseCompleted
      ? {
          href: `/applicant?applicant=${applicantId}&application=${selectedApplication?.id ?? ""}#inhouse-installation`,
          label: "Complete inhouse plumbing",
          description: "Your next step is to mark the inhouse plumbing as complete."
        }
      : !latestPayment && !documentsReady
        ? {
            href: `/applicant/documents?application=${selectedApplication?.id ?? ""}`,
            label: "Upload documents",
            description: "Your next step is to upload the required documents before payment can be scheduled."
          }
        : {
            href: `/applicant?applicant=${applicantId}&application=${selectedApplication?.id ?? ""}`,
            label: "Open dashboard",
            description: "Your seminar is complete. Check the dashboard for the current application status."
          };

  if (seminarState.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No seminar items yet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The administrator has not published any seminar content yet. Please check back later.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {seminarState.allCompleted ? (
        <Card className="border-0 bg-[linear-gradient(135deg,rgba(47,160,183,0.14),rgba(255,179,26,0.18))]">
          <CardContent className="flex flex-col gap-2 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/55">Next step unlocked</p>
            <CardTitle className="text-2xl">Seminar completed</CardTitle>
            <p className="max-w-2xl text-sm text-foreground/80">
              {completionCta.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Seminar room</h1>
          <p className="text-sm text-muted-foreground">
            Complete each seminar item in sequence before filling out your application information.
          </p>
        </div>
        <Card className="min-w-[240px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {seminarState.completedCount} of {seminarState.items.length} seminar items completed
            </p>
            {seminarState.allCompleted ? (
              <p className="font-medium text-foreground/80">{completionCta.label} is ready.</p>
            ) : (
              <p>Finish all items to unlock the information form.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <SeminarModuleList
        items={seminarState.items}
        progress={seminarState.progress}
        applicantId={applicantId}
        completionCta={completionCta}
      />
    </div>
  );
}
