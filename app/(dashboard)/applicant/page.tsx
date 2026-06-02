import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ApplicantSwitcher } from "@/components/applicant/applicant-switcher";
import { ApplicationSwitcher } from "@/components/applicant/application-switcher";
import { InhouseInstallationForm } from "@/components/shared/inhouse-installation-form";
import { LinkAccountCard } from "@/components/applicant/link-account-card";
import { PushPromptCard } from "@/components/pwa/push-prompt-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { areDocumentsReadyForPayment } from "@/lib/document-workflow";
import { formatDate } from "@/lib/format";
import { getAccreditedPlumbers, getApplicants, getApplicantApplications, getApplicantSeminarState } from "@/lib/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function getScheduledInspectionDate(application: {
  inspections?: { scheduled_at?: string | null; inspected_at?: string | null; status?: string | null }[];
}) {
  const scheduledDates =
    (application.inspections ?? [])
      .map((inspection) => inspection.scheduled_at ?? null)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return scheduledDates[0] ?? null;
}

function hasApprovedInspection(application: {
  inspections?: { status?: string | null }[];
}) {
  return application.inspections?.some((inspection) => inspection.status === "approved") ?? false;
}

function getLatestPayment(application: {
  payments?: {
    payment_type?: string | null;
    due_date?: string | null;
    office_payment_at?: string | null;
    status?: string | null;
    paid_at?: string | null;
  }[];
}) {
  const payments =
    [...(application.payments ?? [])].sort((a, b) => {
      const aTime = new Date(a.paid_at ?? a.due_date ?? 0).getTime();
      const bTime = new Date(b.paid_at ?? b.due_date ?? 0).getTime();
      return bTime - aTime;
    });

  return payments[0] ?? null;
}

function getAssignedAccount(application: {
  inspections?: {
    account_number?: string | null;
    inspected_at?: string | null;
    scheduled_at?: string | null;
  }[];
  concessionaires?: {
    concessionaire_number?: string | null;
    meter_number?: string | null;
    connection_date?: string | null;
  }[];
}) {
  const concessionaire = application.concessionaires?.[0] ?? null;
  const latestInspectionWithAccount =
    [...(application.inspections ?? [])]
      .filter((inspection) => Boolean(inspection.account_number))
      .sort((a, b) => {
        const aTime = new Date(a.inspected_at ?? a.scheduled_at ?? 0).getTime();
        const bTime = new Date(b.inspected_at ?? b.scheduled_at ?? 0).getTime();
        return bTime - aTime;
      })[0] ?? null;

  return {
    accountNumber: concessionaire?.concessionaire_number ?? latestInspectionWithAccount?.account_number ?? null,
    connectionDate: concessionaire?.connection_date ?? null,
    meterNumber: concessionaire?.meter_number ?? null,
    isConverted: Boolean(concessionaire)
  };
}

function getEffectiveWorkflowStatus(application: {
  status?: string | null;
  inhouse_installation_completed?: boolean | null;
  water_meter_installation_scheduled_at?: string | null;
  water_meter_installed_at?: string | null;
  payments?: {
    due_date?: string | null;
    paid_at?: string | null;
    status?: string | null;
  }[];
}) {
  const latestPayment = getLatestPayment(application);

  if (application.status === "converted") {
    return "converted";
  }

  if (application.water_meter_installed_at) {
    return "ready for conversion";
  }

  if (application.water_meter_installation_scheduled_at) {
    return "installation scheduled";
  }

  if (latestPayment?.status === "paid") {
    return "ready for installation";
  }

  if (application.inhouse_installation_completed) {
    return "inspection approved";
  }

  return application.status ?? "submitted";
}

function formatPaymentType(value: string | null | undefined) {
  if (!value) {
    return "Not scheduled";
  }

  if (value === "inspection_fee") {
    return "Application fee";
  }

  return value.replaceAll("_", " ");
}

function formatServiceType(value: string | null | undefined) {
  if (!value) {
    return "Service type not set";
  }

  return value.replaceAll("_", " ");
}

function getPrimaryAction({
  allCompleted,
  hasApplication,
  hasPayment,
  isCompleted,
  inhouseCompleted,
  inspectionApproved,
  documentsReady,
  selectedApplicantId,
  selectedApplicationId
}: {
  allCompleted: boolean;
  hasApplication: boolean;
  hasPayment: boolean;
  isCompleted: boolean;
  inhouseCompleted: boolean;
  inspectionApproved: boolean;
  documentsReady: boolean;
  selectedApplicantId?: string | null;
  selectedApplicationId?: string | null;
}) {
  if (!selectedApplicantId) {
    return {
      href: "/applicant/new",
      label: "Create new applicant"
    };
  }

  if (!allCompleted) {
    return {
      href: `/applicant/seminar?applicant=${selectedApplicantId}`,
      label: "Continue seminar"
    };
  }

  if (!hasApplication) {
    return {
      href: `/applicant/applications/new?applicant=${selectedApplicantId}`,
      label: "Start application"
    };
  }

  if (isCompleted) {
    return null;
  }

  if (hasPayment) {
    return {
      href: selectedApplicationId ? `/applicant/payments?application=${selectedApplicationId}` : "/applicant/payments",
      label: "Open payments"
    };
  }

  if (!inhouseCompleted) {
    return {
      href: selectedApplicationId
        ? `/applicant?applicant=${selectedApplicantId}&application=${selectedApplicationId}#inhouse-installation`
        : "/applicant#inhouse-installation",
      label: "Complete inhouse plumbing"
    };
  }

  if (!inspectionApproved) {
    return {
      href: selectedApplicationId ? `/applicant?applicant=${selectedApplicantId}&application=${selectedApplicationId}` : "/applicant",
      label: "View inspection status"
    };
  }

  if (!documentsReady) {
    return {
      href: selectedApplicationId ? `/applicant/documents?application=${selectedApplicationId}` : "/applicant/documents",
      label: "Upload documents"
    };
  }

  return {
    href: selectedApplicationId ? `/applicant/documents?application=${selectedApplicationId}` : "/applicant/documents",
    label: "Review documents"
  };
}

type ApplicantDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  return typeof searchParams?.[key] === "string" ? searchParams[key] : undefined;
}

export default async function ApplicantDashboardPage({ searchParams }: ApplicantDashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  
  const applicants = await getApplicants();
  const selectedApplicantId = getStringParam(resolvedSearchParams, "applicant") ?? applicants[0]?.id ?? null;
  const selectedApplicant = applicants.find((a) => a.id === selectedApplicantId) ?? applicants[0];

  const applications = selectedApplicantId ? await getApplicantApplications(selectedApplicantId) : [];
  const seminarState = selectedApplicantId ? await getApplicantSeminarState(selectedApplicantId) : { items: [], progress: [], completedCount: 0, allCompleted: false };
  const plumbers = await getAccreditedPlumbers();

  const supabase = createSupabaseAdminClient();
  const { data: concessionaires } = await supabase
    .from("concessionaires")
    .select("id")
    .in("applicant_id", applicants.map(a => a.id));
  const isConverted = concessionaires && concessionaires.length > 0;

  const selectedApplicationId = getStringParam(resolvedSearchParams, "application") ?? applications[0]?.id ?? null;
  const selectedApplication = applications.find((application) => application.id === selectedApplicationId) ?? applications[0];
  
  const latestPayment = selectedApplication ? getLatestPayment(selectedApplication) : null;
  const assignedAccount = selectedApplication
    ? getAssignedAccount(selectedApplication)
    : { accountNumber: null, connectionDate: null, meterNumber: null, isConverted: false };
  const effectiveWorkflowStatus = selectedApplication ? getEffectiveWorkflowStatus(selectedApplication) : null;
  const latestInspectionSchedule = selectedApplication ? getScheduledInspectionDate(selectedApplication) : null;
  const inspectionApproved = selectedApplication ? hasApprovedInspection(selectedApplication) : false;
  const documentsReady =
    selectedApplication && inspectionApproved
      ? areDocumentsReadyForPayment(selectedApplication)
      : false;
  const inhouseCompleted = Boolean(selectedApplication?.inhouse_installation_completed);
  const onlineSeminarCompletedAt =
    seminarState.allCompleted
      ? [...seminarState.progress]
          .filter((entry) => entry.completed && entry.completed_at)
          .sort((a, b) => new Date(String(b.completed_at)).getTime() - new Date(String(a.completed_at)).getTime())[0]
          ?.completed_at ?? null
      : null;
  const selectedApplicantName = selectedApplicant?.full_name ?? "No applicant selected";

  const primaryAction = getPrimaryAction({
    allCompleted: seminarState.allCompleted,
    hasApplication: Boolean(selectedApplication),
    hasPayment: Boolean(latestPayment),
    isCompleted: selectedApplication?.status === "converted",
    inhouseCompleted,
    inspectionApproved,
    documentsReady,
    selectedApplicantId: selectedApplicant?.id,
    selectedApplicationId: selectedApplication?.id
  });
  const showPrimaryActionButton = Boolean(primaryAction) && !(selectedApplication && !latestPayment && !inhouseCompleted);

  return (
    <div className="space-y-6">
      <PushPromptCard />

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Applicant records</h2>
        <p className="text-sm text-muted-foreground">Choose the applicant record you want to view.</p>
      </div>

      {applicants.length > 1 ? (
        <ApplicantSwitcher
          applicants={applicants}
          selectedApplicantId={selectedApplicant?.id}
          basePath="/applicant"
          title="Records"
          description="Switch records."
        />
      ) : (
        <div className="flex justify-end gap-2">
          {!isConverted && (
            <Button asChild variant="secondary" size="sm">
              <a href="#link-account">Link account for water bill</a>
            </Button>
          )}
          <Button asChild variant="secondary" size="sm">
            <Link href="/applicant/new">Add Applicant</Link>
          </Button>
        </div>
      )}

      {isConverted ? (
        <Card className="border-emerald-500/30 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-emerald-800">
              You have {concessionaires.length > 1 ? `${concessionaires.length} active water connections!` : "an active water connection!"}
            </h2>
            <p className="mt-2 text-sm text-emerald-700/80">
              Your account is successfully linked. You can now view your water bills from the navigation menu.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" className="border-emerald-500/50 text-emerald-700 hover:bg-emerald-100/50 bg-white">
                <Link href="/applicant/water-bills">View Water Bills</Link>
              </Button>
              <Button asChild variant="ghost" className="text-emerald-700 hover:bg-emerald-100/50 hover:text-emerald-800">
                <a href="#link-account">Link another account</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div id="link-account" className={isConverted ? "opacity-90 transition-opacity hover:opacity-100" : ""}>
        <LinkAccountCard />
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Your application - {selectedApplicantName}</h1>
            <p className="text-sm text-muted-foreground">One place to check status, inspection, and payment.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {effectiveWorkflowStatus ? <StatusBadge status={effectiveWorkflowStatus} /> : null}
            <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              {applications.length} application{applications.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              Seminar {seminarState.completedCount}/{seminarState.items.length || 0}
            </span>
          </div>

          {(() => {
            if (!selectedApplication) return null;
            
            if (selectedApplication.status === "converted" || selectedApplication.water_meter_installed_at) {
              return (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-4">
                  <p className="font-medium text-emerald-700">Workflow completed: Active connection</p>
                  <p className="mt-1 text-sm text-emerald-700/80">
                    Your application is now an active water connection. Your account number is assigned.
                  </p>
                </div>
              );
            }
            if (selectedApplication.water_meter_installation_scheduled_at) {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for Installation: Water meter scheduled</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your water meter installation is scheduled. Please prepare for the installation date.
                  </p>
                </div>
              );
            }
            if (latestPayment?.status === "paid") {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for BWD: Schedule water meter</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your payment is confirmed. BWD will now schedule the installation of your water meter.
                  </p>
                </div>
              );
            }
            if (latestPayment) {
              return (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
                  <p className="font-medium text-primary">Action required: Pay application fee</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Please visit the BWD office on your scheduled date to pay the fees.
                  </p>
                </div>
              );
            }
            if (documentsReady) {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for BWD: Schedule payment</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your documents are verified. BWD will now schedule your office payment date.
                  </p>
                </div>
              );
            }
            if (inspectionApproved) {
              return (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
                  <p className="font-medium text-primary">Action required: Upload documents</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your inspection is approved. Please upload the required documents next, or bring them to the office.
                  </p>
                </div>
              );
            }
            if (latestInspectionSchedule) {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for Inspector: Inspection scheduled</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your inspection is scheduled. Please prepare for the site visit and await the inspector's approval.
                  </p>
                </div>
              );
            }
            if (inhouseCompleted) {
              return (
                <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-4">
                  <p className="font-medium text-foreground">Waiting for BWD: Schedule inspection</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your in-house plumbing is marked complete. BWD will now schedule an inspection.
                  </p>
                </div>
              );
            }
            return (
              <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
                <p className="font-medium text-primary">Action required: Complete in-house plumbing</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mark the in-house plumbing as completed first, including the plumber and proof photo, before moving to document review and payment.
                </p>
              </div>
            );
          })()}

          {selectedApplication ? (
            <div
              className={`rounded-xl border p-4 ${
                assignedAccount.accountNumber
                  ? "border-emerald-300 bg-emerald-50/70"
                  : "border-border/70 bg-muted/10"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Assigned account number
                  </p>
                  <p className={`mt-1 font-mono text-2xl font-bold ${assignedAccount.accountNumber ? "text-emerald-700" : "text-muted-foreground"}`}>
                    {assignedAccount.accountNumber ?? "Not assigned yet"}
                  </p>
                </div>
                {assignedAccount.accountNumber ? (
                  <div className="grid gap-2 text-sm sm:grid-cols-2 md:text-right">
                    <p>
                      <span className="block text-xs text-muted-foreground">Connection date</span>
                      <span className="font-medium">
                        {assignedAccount.connectionDate ? formatDate(assignedAccount.connectionDate) : "Pending conversion"}
                      </span>
                    </p>
                    <p>
                      <span className="block text-xs text-muted-foreground">Meter number</span>
                      <span className="font-medium">{assignedAccount.meterNumber ?? "Not recorded"}</span>
                    </p>
                  </div>
                ) : (
                  <p className="max-w-md text-sm text-muted-foreground">
                    Your account number will appear here after BWD converts the approved application into an active concessionaire record.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: "clamp(8px, 1.5vw, 12px)" }}>
            <div className="rounded-xl border border-border/60 bg-muted/5 p-3 transition-colors hover:bg-muted/10">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-bold uppercase tracking-[0.14em] text-muted-foreground text-[10px] xl:text-xs">Inspection</p>
                {selectedApplication?.inspections?.[0] && (
                  <div className="mt-0.5 sm:mt-0">
                    <StatusBadge status={selectedApplication.inspections[0].status ?? "pending"} />
                  </div>
                )}
              </div>
              <p className="mt-2 font-medium tabular-nums leading-tight text-foreground/80 text-xs xl:text-sm">
                {latestInspectionSchedule ? formatDate(latestInspectionSchedule) : "Not scheduled"}
              </p>
            </div>
            
            <div className="rounded-xl border border-border/60 bg-muted/5 p-3 transition-colors hover:bg-muted/10">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-bold uppercase tracking-[0.14em] text-muted-foreground text-[10px] xl:text-xs">Payment</p>
                {latestPayment && (
                  <div className="mt-0.5 sm:mt-0">
                    <StatusBadge status={latestPayment.status ?? "scheduled"} />
                  </div>
                )}
              </div>
              <p className="mt-2 font-medium tabular-nums leading-tight text-foreground/80 text-xs xl:text-sm">
                {latestPayment ? (
                  latestPayment.status === "paid" 
                    ? formatDate(latestPayment.paid_at ?? latestPayment.office_payment_at ?? null) 
                    : formatDate(latestPayment.due_date ?? null)
                ) : "Not scheduled"}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/5 p-3 transition-colors hover:bg-muted/10">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-bold uppercase tracking-[0.14em] text-muted-foreground text-[10px] xl:text-xs">Plumbing</p>
                {selectedApplication?.inhouse_installation_completed && (
                  <div className="mt-0.5 sm:mt-0">
                    <StatusBadge status="completed" />
                  </div>
                )}
              </div>
              <p className="mt-2 font-medium tabular-nums leading-tight text-foreground/80 text-xs xl:text-sm">
                {selectedApplication?.inhouse_installation_completed_at
                  ? formatDate(selectedApplication.inhouse_installation_completed_at)
                  : "Pending"}
              </p>
            </div>

            <div className={`rounded-xl border p-3 transition-colors ${
              selectedApplication?.water_meter_installed_at
                ? "border-emerald-500/30 bg-emerald-50/30"
                : selectedApplication?.water_meter_installation_scheduled_at
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/60 bg-muted/5 hover:bg-muted/10"
            }`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className={`uppercase tracking-[0.14em] font-bold text-[10px] xl:text-xs ${
                  selectedApplication?.water_meter_installed_at 
                    ? "text-emerald-600" 
                    : selectedApplication?.water_meter_installation_scheduled_at 
                      ? "text-primary" 
                      : "text-muted-foreground"
                }`}>Water Meter</p>
                {selectedApplication?.water_meter_installed_at && (
                  <div className="mt-0.5 sm:mt-0">
                    <StatusBadge status="completed" />
                  </div>
                )}
              </div>
              <p className={`mt-2 font-medium tabular-nums leading-tight text-xs xl:text-sm ${
                selectedApplication?.water_meter_installed_at 
                  ? "text-emerald-600" 
                  : selectedApplication?.water_meter_installation_scheduled_at 
                    ? "text-primary" 
                    : "text-foreground/80"
              }`}>
                {selectedApplication?.water_meter_installed_at
                  ? formatDate(selectedApplication.water_meter_installed_at)
                  : selectedApplication?.water_meter_installation_scheduled_at
                    ? formatDate(selectedApplication.water_meter_installation_scheduled_at)
                    : "Not scheduled"}
              </p>
            </div>
          </div>



          {showPrimaryActionButton ? (
            <Button asChild className="h-10 w-full text-xs font-bold md:w-auto md:text-sm">
              <Link href={primaryAction?.href ?? "/applicant"}>
                {primaryAction?.label}
                <ArrowRight className="ml-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {selectedApplication ? (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-6">
            <InhouseInstallationForm
              applicationId={selectedApplication.id}
              plumbers={plumbers}
              currentPlumberId={selectedApplication.accredited_plumber_id}
              currentCompletedAt={selectedApplication.inhouse_installation_completed_at}
              currentProofImageUrl={selectedApplication.inhouse_installation_proof_image_url}
              currentSignedAt={selectedApplication.inhouse_installation_signed_at}
              minimumCompletedAt={onlineSeminarCompletedAt}
              isCompleted={selectedApplication.inhouse_installation_completed}
              isLocked={Boolean(selectedApplication.water_meter_installed_at || selectedApplication.status === "converted")}
            />
        </CardContent>
      </Card>
      ) : null}

      {applications.length > 1 ? (
        <ApplicationSwitcher
          applications={applications}
          selectedApplicationId={selectedApplication?.id}
          basePath="/applicant"
          title="Other applications"
          description="You have multiple applications. Choose which one to view."
        />
      ) : null}

    </div>
  );
}
