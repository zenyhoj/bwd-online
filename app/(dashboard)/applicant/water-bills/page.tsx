import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Droplets } from "lucide-react";
import { formatDate } from "@/lib/format";

export const metadata = {
  title: "My Water Bills | BWD Online",
};

export default async function ApplicantWaterBillsPage() {
  const profile = await getCurrentProfile();

  if (profile.role !== "applicant") {
    redirect("/login");
  }

  const supabase = createSupabaseAdminClient();

  // Get the applicant's ID
  const { data: applicants } = await supabase
    .from("applicants")
    .select("id")
    .eq("profile_id", profile.id);

  if (!applicants || applicants.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Water Bills</h1>
        <p className="text-muted-foreground">You do not have a linked concessionaire account yet.</p>
      </div>
    );
  }

  const applicantIds = applicants.map((a) => a.id);

  // Get concessionaires linked to this applicant
  const { data: concessionaires } = await supabase
    .from("concessionaires")
    .select("id, concessionaire_number")
    .in("applicant_id", applicantIds);

  if (!concessionaires || concessionaires.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Water Bills</h1>
        <p className="text-muted-foreground">You do not have a linked concessionaire account yet.</p>
      </div>
    );
  }

  const concessionaireIds = concessionaires.map((c) => c.id);

  // Fetch water bills
  const { data: bills } = await supabase
    .from("water_bills")
    .select("*")
    .in("concessionaire_id", concessionaireIds)
    .order("due_date", { ascending: false });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Water Bills</h1>
        <p className="text-muted-foreground">
          View your monthly water consumption bills and due dates.
        </p>
      </div>

      <Alert className="rounded-xl border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 text-blue-900 shadow-sm dark:border-blue-900/30 dark:from-blue-950/30 dark:to-sky-950/20 dark:text-blue-200">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription>
          <strong>For your reference:</strong> This page shows your latest water bill details. If you have already paid,
          your payment is recorded in your official BWD ledger.
        </AlertDescription>
      </Alert>

      {!bills || bills.length === 0 ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Droplets className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <h3 className="text-lg font-medium">No bills found</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              We couldn't find any water bills attached to your account yet. New bills will appear here when they are generated.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bills.map((bill) => (
            <Card key={bill.id} className="relative overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md">
              <div
                className={`absolute right-0 top-0 h-full w-1.5 ${bill.status === "paid" ? "bg-emerald-500" : "bg-primary"}`}
              />
              <CardHeader className="space-y-3 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Account # {bill.account_number}
                  </CardDescription>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      bill.status === "paid"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    }`}
                  >
                    {bill.status === "paid" ? "Paid" : "Unpaid"}
                  </span>
                </div>
                <CardDescription className="text-xs font-medium uppercase tracking-wider">Bill amount</CardDescription>
                <CardTitle className="text-3xl font-bold leading-none">{formatCurrency(bill.amount)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Due date</span>
                    <span className="text-sm font-semibold text-foreground">{formatDate(bill.due_date)}</span>
                  </div>
                </div>

                {bill.amount_after_duedate !== null && (
                  <div className="rounded-lg border border-destructive/15 bg-destructive/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-muted-foreground">Amount after due date</span>
                      <span className="text-sm font-bold text-destructive">{formatCurrency(bill.amount_after_duedate)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
