import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export default async function AdminConcessionairesPage() {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();
  const { data: applications } = await supabase
    .from("applications")
    .select("*, accredited_plumbers(full_name), concessionaires(*)")
    .eq("organization_id", profile.organization_id)
    .in("status", ["converted", "approved"])
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Concessionaires</h1>
        <p className="text-sm text-muted-foreground">Approved and converted applications now in active service.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Concessionaire records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Concessionaire no.</TableHead>
                <TableHead>Inhouse status</TableHead>
                <TableHead>Plumber</TableHead>
                <TableHead>Connection date</TableHead>
                <TableHead>Meter no.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(applications ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No records found. Applications ready for conversion will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                (applications ?? []).map((application) => {
                  const record = application as Record<string, unknown>;
                  const concessionaire = (record.concessionaires as Record<string, unknown>[] | undefined)?.[0];
                  const isReady = record.status === "approved" && !concessionaire;

                  return (
                    <TableRow key={String(record.id)}>
                      <TableCell className="font-medium whitespace-nowrap">{String(record.full_name)}</TableCell>
                      <TableCell>
                        {concessionaire ? (
                          <span className="font-mono">{String(concessionaire.concessionaire_number)}</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-600 ring-1 ring-inset ring-blue-700/10">
                            Ready for conversion
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{Boolean(record.inhouse_installation_completed) ? "Completed" : "Pending"}</TableCell>
                      <TableCell>{String((record.accredited_plumbers as { full_name?: string } | null)?.full_name ?? "N/A")}</TableCell>
                      <TableCell>
                        {concessionaire 
                          ? formatDate(String(concessionaire.connection_date)) 
                          : record.water_meter_installed_at 
                            ? formatDate(String(record.water_meter_installed_at))
                            : "N/A"}
                      </TableCell>
                      <TableCell>{String(concessionaire?.meter_number ?? "N/A")}</TableCell>
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
