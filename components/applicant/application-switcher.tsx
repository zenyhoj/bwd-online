import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApplicationWithRelations } from "@/types";

type ApplicationSwitcherProps = {
  applications: ApplicationWithRelations[];
  selectedApplicationId?: string | null;
  basePath: string;
  queryParams?: Record<string, string | undefined>;
  title?: string;
  description?: string;
};

function getLatestPaymentStatus(application: ApplicationWithRelations) {
  const payments = [...(application.payments ?? [])].sort((a, b) => {
    const aTime = new Date(a.paid_at ?? a.due_date ?? 0).getTime();
    const bTime = new Date(b.paid_at ?? b.due_date ?? 0).getTime();
    return bTime - aTime;
  });

  return payments[0]?.status ?? null;
}

function getSwitcherStatus(application: ApplicationWithRelations) {
  const latestPaymentStatus = getLatestPaymentStatus(application);

  if (latestPaymentStatus === "paid" && application.status !== "converted") {
    return "payment received";
  }

  if (latestPaymentStatus === "overdue") {
    return "payment overdue";
  }

  if (latestPaymentStatus === "cancelled") {
    return "payment cancelled";
  }

  return application.status;
}

export function ApplicationSwitcher({
  applications,
  selectedApplicationId,
  basePath,
  queryParams,
  title = "Applications",
  description = "Choose which application record you want to open."
}: ApplicationSwitcherProps) {
  if (applications.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {applications.map((application) => {
          const isSelected = application.id === selectedApplicationId;
          const query = new URLSearchParams();
          Object.entries(queryParams ?? {}).forEach(([key, value]) => {
            if (value) {
              query.set(key, value);
            }
          });
          query.set("application", application.id);

          return (
            <Link
              key={application.id}
              href={`${basePath}?${query.toString()}` as never}
              className={`rounded-2xl border p-4 transition min-w-0 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/80 bg-background hover:border-primary/40 hover:bg-muted/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{application.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {application.service_type.replaceAll("_", " ")}
                  </p>
                </div>
                {isSelected ? (
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary whitespace-nowrap shrink-0">
                    Selected
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <StatusBadge status={getSwitcherStatus(application)} />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
