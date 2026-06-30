import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Droplets, Plus } from "lucide-react";
import { formatDate } from "@/lib/format";
import { ConcessionaireFilter } from "@/components/applicant/concessionaire-filter";
import { LinkAccountCard } from "@/components/applicant/link-account-card";
import { UnlinkAccountButton } from "@/components/applicant/unlink-account-button";

export const metadata = {
  title: "My Water Bills | BWD Online",
};

export default async function ApplicantWaterBillsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const accountFilter =
    typeof resolvedSearchParams?.["account"] === "string"
      ? resolvedSearchParams["account"]
      : null;

  const profile = await getCurrentProfile();

  if (profile.role !== "applicant") {
    redirect("/login");
  }

  const supabase = createSupabaseAdminClient();

  // Get the applicant's ID
  const { data: applicants } = await supabase
    .from("applicants")
    .select("id, full_name")
    .eq("profile_id", profile.id);

  const applicantIds = (applicants ?? []).map((a) => a.id);

  // Get concessionaires linked to this applicant
  const { data: concessionairesData } = applicantIds.length > 0
    ? await supabase
        .from("concessionaires")
        .select("id, concessionaire_number, applicant_id")
        .in("applicant_id", applicantIds)
    : { data: [] };

  const concessionaires = concessionairesData ?? [];

  // Determine which concessionaire IDs to query bills for
  const filterIds =
    accountFilter && concessionaires.some((c) => c.id === accountFilter)
      ? [accountFilter]
      : concessionaires.map((c) => c.id);

  // Fetch water bills
  const { data: bills, error: billsError } = filterIds.length > 0
    ? await supabase
        .from("water_bills")
        .select("*")
        .in("concessionaire_id", filterIds)
        .order("due", { ascending: false })
    : { data: [], error: null };

  // Build a map of concessionaire_id → latest name from bills for the dropdown labels
  const allBillsForNames = accountFilter && concessionaires.length > 0
    ? await supabase
        .from("water_bills")
        .select("concessionaire_id, name")
        .in("concessionaire_id", concessionaires.map((c) => c.id))
        .order("due", { ascending: false })
        .then((res) => res.data)
    : bills;

  const accountNameMap = new Map<string, string>();
  for (const bill of allBillsForNames ?? []) {
    if (bill.concessionaire_id && bill.name && !accountNameMap.has(bill.concessionaire_id)) {
      accountNameMap.set(bill.concessionaire_id, bill.name);
    }
  }

  const concessionaireOptions = concessionaires.map((c) => ({
    id: c.id,
    concessionaire_number: c.concessionaire_number,
    account_name: accountNameMap.get(c.id) ?? null,
  }));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(value);

  const showFilter = concessionaires.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Water Bills</h1>
          <p className="text-muted-foreground">
            View your monthly water consumption bills and due dates.
          </p>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 items-end sm:items-center">
          {concessionaires.length > 0 ? (
            <Button asChild variant="outline" className="gap-2 rounded-full border-primary/20 text-primary hover:bg-primary/5 bg-background whitespace-nowrap shadow-sm font-medium">
              <a href="#link-account">
                <Plus className="h-4 w-4" />
                Link Account
              </a>
            </Button>
          ) : null}
          {showFilter && (
            <div className="w-full sm:w-auto">
              <ConcessionaireFilter concessionaires={concessionaireOptions} />
            </div>
          )}
        </div>
      </div>

      {concessionaires.length === 0 ? (
        <div id="link-account" className="scroll-mt-24">
          <LinkAccountCard />
        </div>
      ) : null}

      {concessionaires.length > 0 ? (
        <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 bg-muted/20">
            <CardTitle className="text-xl text-foreground">
              You have {concessionaires.length > 1 ? `${concessionaires.length} active water connections` : "an active water connection"}
            </CardTitle>
            <CardDescription>
              These linked accounts are available for water bill viewing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border/70 bg-background">
              {concessionaires.map((concessionaire) => {
                const name =
                  accountNameMap.get(concessionaire.id) ??
                  applicants?.find((applicant) => applicant.id === concessionaire.applicant_id)?.full_name ??
                  "Unknown Account";

                return (
                  <div key={concessionaire.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3 text-sm font-medium">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                        <Droplets className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-foreground">{concessionaire.concessionaire_number}</p>
                        <p className="truncate text-sm text-muted-foreground">{name}</p>
                      </div>
                    </div>
                    <UnlinkAccountButton concessionaireId={concessionaire.id} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!bills || bills.length === 0 ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Droplets className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <h3 className="text-lg font-medium">No bills found</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {concessionaires.length === 0
                ? "Link an existing water account below to view monthly water bills here."
                : accountFilter
                ? "No water bills found for this account. Try selecting a different account or view all."
                : "We couldn't find any water bills attached to your account yet. New bills will appear here when they are generated."}
            </p>
            {billsError && (
              <div className="mt-4 p-4 bg-red-100 text-red-900 rounded-md text-left text-xs max-w-xl break-words">
                <strong>Database Error:</strong> {billsError.message} <br/>
                Details: {billsError.details} <br/>
                Hint: {billsError.hint}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bills.map((bill) => (
            <Card key={bill.id} className="relative overflow-hidden border-border/70 bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
              <div className="absolute right-0 top-0 h-full w-1 bg-primary/70" />
              <CardHeader className="space-y-3 border-b border-border/70 bg-muted/10 pb-4 pr-7">
                <div className="flex flex-col gap-0.5">
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Account # {bill.account_number}
                  </CardDescription>
                  {bill.name && (
                    <div className="text-sm font-semibold text-foreground">
                      {bill.name}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider">Bill amount</CardDescription>
                  <CardTitle className="text-3xl font-bold leading-none tracking-tight text-foreground">{formatCurrency(bill.total)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pr-7">
                <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due date</span>
                    <span className="text-sm font-semibold text-foreground">{bill.due ? formatDate(bill.due) : "N/A"}</span>
                  </div>
                  {bill.date_bill && (
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date bill</span>
                      <span className="text-sm font-semibold text-foreground">{formatDate(bill.date_bill)}</span>
                    </div>
                  )}
                  {bill.consumption !== null && (
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consumption</span>
                      <span className="text-sm font-semibold text-foreground">{bill.consumption} m³</span>
                    </div>
                  )}
                </div>

                {bill.amount_after_due_date !== null && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 dark:bg-destructive/10">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-muted-foreground">Amount after due date</span>
                      <span className="text-sm font-bold text-destructive">{formatCurrency(bill.amount_after_due_date)}</span>
                    </div>
                  </div>
                )}
                {bill.disconnection && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 dark:border-amber-400/30 dark:bg-amber-400/10">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">Disconnection</span>
                      <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{formatDate(bill.disconnection)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {concessionaires.length > 0 ? (
        <div id="link-account" className="scroll-mt-24">
          <LinkAccountCard />
        </div>
      ) : null}

      <Alert className="isolate z-0 flex items-start gap-3 rounded-xl border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 text-blue-900 shadow-sm dark:border-blue-900/30 dark:from-blue-950/30 dark:to-sky-950/20 dark:text-blue-200">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500 dark:text-yellow-400" />
        <div className="flex-1">
          <AlertTitle className="mb-2 font-bold tracking-tight">Payment Instructions</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              <strong>For your reference:</strong> This page shows your latest water bill details. If you have already paid,
              your payment is recorded in your official BWD ledger.
            </p>
            <div className="rounded-lg bg-white/60 p-4 dark:bg-black/20">
              <p className="font-semibold mb-2">How to pay your water bills:</p>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                <li>
                  <strong>GCash:</strong> Upon login, navigate to Bills &rarr; Water Utilities &rarr; Search for <strong>Buenavista Water District (with the square logo)</strong> and provide the exact Account Name and 11 Digit Account Number with Dash.
                </li>
                <li>
                  <strong>Maya:</strong> Upon login, navigate to Bills &rarr; Water Utility &rarr; Search for <strong>Buenavista Water District (with the square logo)</strong> and provide the exact Account Name and 11 Digit Account Number with Dash.
                </li>
                <li>
                  <strong>On-site:</strong> You may also pay your water bills at <strong>Wing-on Buenavista</strong>.
                </li>
              </ul>
              <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-200">
                <span className="font-semibold text-orange-800 dark:text-orange-400">Note:</span> For all disconnected accounts, payments must be made at BWD Office to settle both the bill amount plus the surcharge and disconnection fee.
              </div>
            </div>
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}
