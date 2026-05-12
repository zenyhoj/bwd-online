import { AccreditedPlumbersTable } from "@/components/applicant/accredited-plumbers-table";

export default function ApplicantPlumbersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Accredited Plumbers</h1>
        <p className="text-sm text-muted-foreground">
          View the list of official plumbers authorized by the Water District for in-house installations.
        </p>
      </div>
      <AccreditedPlumbersTable />
    </div>
  );
}
