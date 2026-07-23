import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export default async function AdminConcessionairesPage() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();
  const { data: inspections } = await supabase
    .from("inspections")
    .select("*, applications(full_name)")
    .eq("organization_id", profile.organization_id)
    .eq("status", "approved")
    .order("inspected_at", { ascending: false });

  const approvedInspections = inspections ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Concessionaires</h1>
        <p className="text-sm text-muted-foreground">Approved inspections ready for payment and water meter installation.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account name</TableHead>
                <TableHead>Assigned account number</TableHead>
                <TableHead>Inspection date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedInspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No records found. Applications with approved inspections will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                approvedInspections.map((inspection) => {
                  const record = inspection as Record<string, unknown>;
                  const appRelation = record.applications as { full_name?: string } | null;
                  const accountName = appRelation?.full_name ?? String(record.reference_account_name ?? "N/A");
                  const accountNumber = String(record.account_number ?? "").trim();
                  const inspectionDate = record.inspected_at
                    ? String(record.inspected_at)
                    : record.scheduled_at
                    ? String(record.scheduled_at)
                    : null;

                  return (
                    <TableRow key={String(record.id)}>
                      <TableCell className="font-medium whitespace-nowrap">{accountName}</TableCell>
                      <TableCell>
                        {accountNumber ? (
                          <span className="font-mono">{accountNumber}</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(inspectionDate)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
