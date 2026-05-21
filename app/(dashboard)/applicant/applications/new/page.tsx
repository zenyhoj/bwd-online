import Link from "next/link";
import { redirect } from "next/navigation";

import { ApplicationForm } from "@/components/applicant/application-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicants, getApplicantApplications, getApplicantSeminarState } from "@/lib/queries";

export default async function NewApplicationPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const applicantId = typeof resolvedSearchParams?.["applicant"] === "string" ? resolvedSearchParams["applicant"] : null;

  if (!applicantId) {
    redirect("/applicant");
  }

  const [seminarState, applications, applicants] = await Promise.all([
    getApplicantSeminarState(applicantId),
    getApplicantApplications(applicantId),
    getApplicants()
  ]);

  if (!seminarState.allCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seminar completion required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Finish all seminar items first. Your application form unlocks only after the seminar series is
            complete.
          </p>
          <Button asChild>
            <Link href={`/applicant/seminar?applicant=${applicantId}`}>Return to seminar room</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selectedApplicant = applicants.find(a => a.id === applicantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Start application</h1>
        <p className="text-sm text-muted-foreground">
          Submit a water connection application for <span className="font-medium text-foreground">{selectedApplicant?.full_name ?? "this applicant"}</span>.
        </p>
      </div>

      {applications.length > 0 ? (
        <Card className="border-border/70 bg-muted/20">
          <CardContent className="flex flex-col gap-4 p-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>
              This applicant already has {applications.length} active application{applications.length === 1 ? "" : "s"}.
            </p>
            <Button asChild variant="outline">
              <Link href={`/applicant?applicant=${applicantId}`}>Open dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ApplicationForm applicantId={applicantId} applicant={selectedApplicant ?? null} />
      )}

    </div>
  );
}
