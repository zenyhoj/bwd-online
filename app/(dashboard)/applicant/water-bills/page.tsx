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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Water Bills</h1>
        <p className="text-muted-foreground">
          View your monthly water consumption bills and due dates.
        </p>
      </div>

      <Alert className="bg-blue-50/50 border-blue-500/20 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription>
          <strong>Information Only:</strong> The water bill presented is only for information purposes. If the water bill is already paid/settled, it is already reflected on your permanent ledger at the BWD office.
        </AlertDescription>
      </Alert>

      {(!bills || bills.length === 0) ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Droplets className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No bills found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              We couldn't find any water bills attached to your account yet. New bills will appear here when they are generated.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bills.map((bill) => (
            <Card key={bill.id} className="relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-2 h-full ${
                bill.status === "paid" ? "bg-emerald-500" : "bg-primary"
              }`} />
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  Account # {bill.account_number}
                </CardDescription>
                <CardTitle className="text-3xl font-bold font-mono">
                  ₱{bill.amount.toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Due:</span>
                  <span className="text-sm font-bold text-destructive">{formatDate(bill.due_date)}</span>
                </div>

                {bill.amount_after_duedate !== null && (
                  <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Amount after due date</span>
                      <span className="text-sm font-bold text-destructive font-mono">₱{bill.amount_after_duedate.toFixed(2)}</span>
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
