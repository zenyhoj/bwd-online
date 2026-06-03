import { WaterBillsUpload } from "@/components/admin/water-bills-upload";
import { ClearWaterBillsButton } from "@/components/admin/clear-water-bills-button";

export const metadata = {
  title: "Water Bills | BWD Online Admin",
};

export default function AdminWaterBillsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Water Bills</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage monthly water bills for all concessionaires.
          </p>
        </div>
        <div className="flex shrink-0">
          <ClearWaterBillsButton />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <WaterBillsUpload />
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
