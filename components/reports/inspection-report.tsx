import { DynamicInspectionReportMap } from "@/components/reports/dynamic-map";
import { format } from "date-fns";
import type { Application, Inspection } from "@/types";

type InspectionReportProps = {
  application: Application;
  inspection: Inspection;
};

export function InspectionReport({ application, inspection }: InspectionReportProps) {
  const printedDate = format(new Date(), "MM-dd-yyyy");

  return (
    <div className="a4-page mx-auto flex h-[297mm] w-[210mm] flex-col bg-white p-[0.75in] font-sans text-[11pt] text-black shadow-sm overflow-hidden">
      <header className="mb-4 text-center">
        <p>Republic of the Philippines</p>
        <p>BUENAVISTA WATER DISTRICT</p>
        <p>Rizal Ave., Brgy. 3, Buenavista, Agusan del Norte</p>
        <p>Telefax: (085-343-4037) Email: bwd_adn@yahoo.com</p>
      </header>

      <div className="mb-4 border-b-[1px] border-dashed border-black"></div>

      <h1 className="mb-6 text-center text-[12pt] font-bold tracking-wide">IN-HOUSE PLUMBING INSPECTION REPORT</h1>

      <section className="mb-6">
        <h2 className="mb-2 font-bold">Account Information</h2>
        <table className="w-full border-collapse border border-black text-left text-[10pt]">
          <thead>
            <tr>
              <th className="border border-black p-2 font-normal">Name</th>
              <th className="border border-black p-2 font-normal">Sex</th>
              <th className="border border-black p-2 font-normal">Account No.</th>
              <th className="border border-black p-2 font-normal">Contact No.</th>
              <th className="border border-black p-2 font-normal">Address</th>
              <th className="border border-black p-2 font-normal text-center">No. of Users</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2">{application.full_name}</td>
              <td className="border border-black p-2">{application.gender}</td>
              <td className="border border-black p-2">{inspection.account_number ?? ""}</td>
              <td className="border border-black p-2">{application.cellphone_number ?? ""}</td>
              <td className="border border-black p-2">{application.address}</td>
              <td className="border border-black p-2 text-center">{application.number_of_users}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="font-bold">Sketch Map</h2>
          <p className="text-[10pt]">Reference Account No.: {inspection.reference_account_number ?? "___________________"}</p>
        </div>
        <div className="h-[250px] border border-black p-1">
          {inspection.latitude !== null && inspection.longitude !== null ? (
            <DynamicInspectionReportMap
              latitude={inspection.latitude}
              longitude={inspection.longitude}
              applicantName={application.full_name}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
              No coordinates recorded
            </div>
          )}
        </div>
      </section>

      <section className="mb-6 flex-grow overflow-hidden">
        <h2 className="mb-2 font-bold">Materials</h2>
        <div className="h-full whitespace-pre-wrap text-[10pt]">
          {inspection.material_list ?? ""}
        </div>
      </section>

      <section className="mt-auto pt-4">
        <div className="mb-4">
          <h2 className="mb-8 font-bold">Prepared by:</h2>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex h-8 w-64 items-end justify-center border-b border-black text-center text-[10pt]">
                {inspection.inspector_name ?? ""}
              </div>
              <p className="w-64 text-center">Inspector</p>
            </div>
            <div>
              <p className="text-[10pt]">Date Printed: {printedDate}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
