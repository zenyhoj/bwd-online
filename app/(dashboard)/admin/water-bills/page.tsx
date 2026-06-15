import { WaterBillsUpload } from "@/components/admin/water-bills-upload";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Water Bills | BWD Online Admin",
};

export default async function AdminWaterBillsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return redirect("/");
  }

  // Get total count of water bills for this organization
  const { count, error: countError } = await supabase
    .from("water_bills")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id);

  if (countError) {
    console.error("Failed to fetch water bills count:", countError);
  }

  // Get the last upload date (max created_at)
  const { data: latestBill, error: dateError } = await supabase
    .from("water_bills")
    .select("created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dateError) {
    console.error("Failed to fetch latest water bill:", dateError);
  }

  const recordsCount = count ?? 0;
  const lastUploadDate = latestBill?.created_at ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Water Bills</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage monthly water bills for all concessionaires.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <WaterBillsUpload recordsCount={recordsCount} lastUploadDate={lastUploadDate} />
        </div>
        <div>
          <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="p-6 flex flex-col space-y-1.5">
              <h3 className="font-semibold leading-none tracking-tight">How it works</h3>
            </div>
            <div className="p-6 pt-0 text-sm text-muted-foreground space-y-4">
              <p>
                When you upload an Excel file, the system will process every row and automatically match the <strong>Account Number</strong> to existing concessionaires in the database.
              </p>
              <p>
                If an Account Number is found that doesn't exist yet, a <strong>Legacy Account</strong> is created automatically.
              </p>
              <p>
                When a legacy concessionaire downloads the app and registers, they can use the &quot;Link Existing Account&quot; feature on their dashboard to instantly gain access to their billing history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
