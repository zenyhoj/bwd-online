import { formatDateTime } from "@/lib/format";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Calendar, History, FileCheck } from "lucide-react";

import { ExportActionButtons } from "@/components/admin/export-action-buttons";

export const metadata = { title: "Export Documents | Admin | BWD Online" };

export default async function AdminExportPage() {
  const profile = await requireRole("admin");
  const supabase = createSupabaseAdminClient();

  // Fetch organization details
  const { data: org } = await supabase
    .from("organizations")
    .select("last_document_export_at")
    .eq("id", profile.organization_id)
    .single();

  const lastExportAt = org?.last_document_export_at ? new Date(org.last_document_export_at) : null;
  const nextScheduledAt = lastExportAt ? new Date(lastExportAt.getTime() + 90 * 24 * 60 * 60 * 1000) : null;

  // Fetch pending document count (documents verified AFTER last export)
  let countQuery = supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .eq("status", "verified");

  if (lastExportAt) {
    countQuery = countQuery.gt("updated_at", lastExportAt.toISOString());
  }

  const { count: pendingCount } = await countQuery;
  const hasPending = (pendingCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Export Documents</h1>
        <p className="text-sm text-muted-foreground">
          Manage your quarterly document backups and download verification records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Export Date</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {org?.last_document_export_at ? formatDateTime(org.last_document_export_at) : "Never exported"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Due Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextScheduledAt ? formatDateTime(nextScheduledAt.toISOString()).split(",")[0] : "ASAP"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Based on a 90-day cycle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Verified Docs</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Since last export</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Download Archives</CardTitle>
          <CardDescription>
            Download a ZIP file containing documents organized into applicant folders. The system will automatically update the "Last Export Date" once the download succeeds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExportActionButtons hasPending={hasPending} />
          
          <p className="text-sm text-muted-foreground pt-2">
            <strong>Note:</strong> Large archives may take a few moments to prepare. You can see the real-time progress above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
