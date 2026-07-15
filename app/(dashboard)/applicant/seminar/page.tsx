import { redirect } from "next/navigation";
import Link from "next/link";
import { SeminarModuleList } from "@/components/applicant/seminar-module-list";
import { DocumentSubmissionChoice } from "@/components/applicant/document-submission-choice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
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
  
  if (applications.length > 0) {
    seminarState.allCompleted = true;
    seminarState.completedCount = seminarState.items.length;
  }

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
  const inspectionApproved =
    selectedApplication?.inspections?.some((inspection) => inspection.status === "approved") ?? false;
  const documentsReady = selectedApplication && inspectionApproved
    ? areDocumentsReadyForPayment(selectedApplication)
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
        ? !inspectionApproved
          ? {
              href: `/applicant?applicant=${applicantId}&application=${selectedApplication?.id ?? ""}`,
              label: "View inspection status",
              description: "Your next step is to wait for the in-house inspection approval before document upload opens."
            }
          : {
            href: `/applicant/documents?application=${selectedApplication?.id ?? ""}`,
            label: "Upload documents",
            description: "Your next step is to upload the required documents before payment can be scheduled."
          }
        : {
            href: `/applicant?applicant=${applicantId}&application=${selectedApplication?.id ?? ""}`,
            label: "Open dashboard",
            description: "Your seminar is complete. Check the dashboard for the current application status."
          };
  const documentChoiceHrefs = !hasApplication
    ? {
        online: `/applicant/applications/new?applicant=${applicantId}&documentMode=online`,
        office: `/applicant/applications/new?applicant=${applicantId}&documentMode=office`
      }
    : null;

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
    <div className="space-y-6 max-w-4xl mx-auto">
      {seminarState.allCompleted ? (
        <Card className="border-0 bg-[linear-gradient(135deg,rgba(47,160,183,0.14),rgba(255,179,26,0.18))]">
          <CardContent className="flex flex-col gap-2 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/55">Next step unlocked</p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Seminar completed</CardTitle>
                <p className="max-w-2xl text-sm text-foreground/80 mt-2">
                  {documentChoiceHrefs
                    ? "Your next step is to choose how you will submit the required documents, then complete your application."
                    : completionCta.description}
                </p>
              </div>
              <Link
                href={`/certificate/${applicantId}`}
                target="_blank"
                className={buttonVariants({ variant: "outline" })}
              >
                View Certificate
              </Link>
            </div>
            {documentChoiceHrefs ? (
              <div className="mt-5 border-t border-emerald-700/10 pt-5">
                <DocumentSubmissionChoice
                  variant="links"
                  onlineHref={documentChoiceHrefs.online}
                  officeHref={documentChoiceHrefs.office}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-3xl">Seminar room</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Complete each seminar item in sequence before filling out your application information.
            </p>
          </CardHeader>
        </Card>
        <Card className="min-w-[240px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {seminarState.completedCount} of {seminarState.items.length} seminar items completed
            </p>
            {seminarState.allCompleted ? (
              <p className="font-medium text-foreground/80">
                {documentChoiceHrefs ? "Choose your document submission method." : `${completionCta.label} is ready.`}
              </p>
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
        documentChoiceHrefs={documentChoiceHrefs}
      />
    </div>
  );
}
