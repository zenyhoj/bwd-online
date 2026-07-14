import Link from "next/link";
import { User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types";

type Applicant = Database["public"]["Tables"]["applicants"]["Row"];

type ApplicantSwitcherProps = {
  applicants: Applicant[];
  selectedApplicantId?: string | null;
  basePath: string;
  queryParams?: Record<string, string | undefined>;
  title?: string;
  description?: string;
};

export function ApplicantSwitcher({
  applicants,
  selectedApplicantId,
  basePath,
  queryParams,
  title = "Applicant records",
  description = "Choose which applicant record you want to open."
}: ApplicantSwitcherProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:items-end">
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/applicant/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Applicant
            </Link>
          </Button>
          <p className="text-[10px] leading-tight text-muted-foreground text-center sm:text-right sm:max-w-[250px]">
            (Online Seminar for New Service Connection, Reconnection, Change Meter, etc.)
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {applicants.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-8 text-center">
            <User className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <h3 className="mt-4 text-sm font-semibold">No applicants yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add an applicant to get started.</p>
          </div>
        ) : null}
        
        {applicants.map((applicant, index) => {
          const isSelected = applicant.id === selectedApplicantId;
          const letter = String.fromCharCode(65 + index); // 65 is 'A'
          const query = new URLSearchParams();
          Object.entries(queryParams ?? {}).forEach(([key, value]) => {
            if (value) {
              query.set(key, value);
            }
          });
          query.set("applicant", applicant.id);

          return (
            <Link
              key={applicant.id}
              href={`${basePath}?${query.toString()}` as never}
              className={`rounded-2xl border p-4 transition flex items-center justify-between gap-3 min-w-0 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/80 bg-background hover:border-primary/40 hover:bg-muted/10"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{applicant.full_name} ({letter})</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {applicant.address || "No address provided"}
                  </p>
                </div>
              </div>
              {isSelected ? (
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary whitespace-nowrap shrink-0">
                  Selected
                </span>
              ) : null}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
