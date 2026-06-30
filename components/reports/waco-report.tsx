import { format } from "date-fns";
import type { Application, Inspection, Payment } from "@/types";

type WacoReportProps = {
  application: Application;
  inspection?: Inspection | null;
  payment?: Payment | null;
  plumberName?: string | null;
  seminarCompletedAt?: string | null;
};

function toProperCase(value?: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("en-PH")
    .replace(/\b([a-z])/g, (letter) => letter.toLocaleUpperCase("en-PH"));
}

export function WacoReport({ application, inspection, payment, plumberName, seminarCompletedAt }: WacoReportProps) {
  // Try to use payment paid_at, fallback to current date if needed for printed date maybe?
  // The screenshot shows Date printed or manual date.
  // Actually, the screenshot has blanks for most dates.
  
  return (
    <>
      <style type="text/css" media="print">
        {`
          @page {
            size: 8.5in 13in;
            margin: 0;
          }
        `}
      </style>
      <div className="mx-auto flex h-[13in] w-[8.5in] flex-col bg-white p-[0.5in] font-sans text-[10pt] text-black shadow-sm leading-snug">
        <header className="mb-4 text-center text-[10pt]">
        <p>Republic of the Philippines</p>
        <p>BUENAVISTA WATER DISTRICT</p>
        <p>Rizal Ave., Brgy. 3, Buenavista, Agusan del Norte</p>
        <p>Telefax: (085-343-4037) Email: bwd_adn@yahoo.com</p>
      </header>

      <h1 className="mb-3 text-center text-[11pt] font-bold tracking-wide">WATER APPLICATION AND CONSTRUCTION ORDER</h1>

      <div className="mb-4 border-b-[1px] border-dashed border-black"></div>

      {/* Account Information Section */}
      <section className="mb-4">
        <h2 className="mb-1 font-bold text-[10pt]">Account Information</h2>
        <table className="w-full border-collapse border border-black text-left text-[9pt]">
          <thead>
            <tr>
              <th className="border border-black p-1 font-normal">Account Name</th>
              <th className="border border-black p-1 font-normal">Sex</th>
              <th className="border border-black p-1 font-normal">Address</th>
              <th className="border border-black p-1 font-normal">Account No.</th>
              <th className="border border-black p-1 font-normal text-center">No. of Users</th>
              <th className="border border-black p-1 font-normal">Long(x)</th>
              <th className="border border-black p-1 font-normal">Lat(y)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5">{application.full_name}</td>
              <td className="border border-black p-1.5">{application.gender}</td>
              <td className="border border-black p-1.5">{application.address}</td>
              <td className="border border-black p-1.5">{inspection?.account_number ?? ""}</td>
              <td className="border border-black p-1.5 text-center">{application.number_of_users}</td>
              <td className="border border-black p-1.5 text-xs">{inspection?.longitude ?? ""}</td>
              <td className="border border-black p-1.5 text-xs">{inspection?.latitude ?? ""}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Applicant Agreement */}
      <section className="mb-4 text-[9.5pt] text-justify leading-relaxed">
        <p className="mb-2">
          I hereby apply for a water service connection size <span className="inline-block w-16 border-b border-black"></span> to be located at the above-mentioned address.
        </p>
        <p className="mb-3">
          I understand that the connection will not be made until it is approved and all basic charges are paid. I
          assume responsibility for METER and all water that passes through the connection. I'll conform to the Rules
          and Regulations of the District.
        </p>
        <div className="mb-5 grid grid-cols-3 gap-4 text-center text-[9pt]">
          <div>
            <p className="text-[8pt] uppercase tracking-wide">Applicant contact no.</p>
            <div className="h-5 border-b border-black text-center font-medium leading-5">{application.cellphone_number ?? ""}</div>
          </div>
          <div>
            <p className="text-[8pt] uppercase tracking-wide">Seminar date</p>
            <div className="h-5 border-b border-black text-center font-medium leading-5">
              {seminarCompletedAt ? format(new Date(seminarCompletedAt), "MM-dd-yyyy") : ""}
            </div>
          </div>
          <div>
            <p className="text-[8pt] uppercase tracking-wide">Accredited plumber</p>
            <div className="h-5 border-b border-black text-center font-medium leading-5">{plumberName ?? ""}</div>
          </div>
        </div>
        <div className="flex items-end justify-start gap-12">
          <div className="flex flex-col items-center">
            <div className="h-4 w-56 border-b border-black"></div>
            <p className="mt-1">Applicant's Signature</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-4 w-32 border-b border-black"></div>
            <p className="mt-1">Date</p>
          </div>
        </div>
      </section>

      <div className="mb-4 border-b-[1px] border-dashed border-black"></div>

      {/* Investigation and Availability */}
      <section className="mb-4 grid grid-cols-2 gap-8 text-[9.5pt]">
        <div>
          <h3 className="mb-2 font-bold">Investigation of Application</h3>
          <p className="mb-1">System is:</p>
          <div className="mb-4 flex items-center gap-4">
            <label className="flex items-center gap-1">
              <div className="flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                {inspection?.plumbing_approved === true ? "✓" : ""}
              </div> Adequate
            </label>
            <label className="flex items-center gap-1">
              <div className="flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                {inspection?.plumbing_approved === false ? "✓" : ""}
              </div> Not Adequate
            </label>
          </div>
          <div className="mt-6">
            <p className="mb-6">Investigated & Verified by:</p>
            <div className="flex items-end gap-2">
              <div className="h-5 w-48 border-b border-black text-center font-medium">
                {inspection?.inspector_name ?? ""}
              </div>
              <span>Date:</span>
              <div className="h-5 w-24 border-b border-black text-center font-medium">
                {inspection?.inspected_at ? format(new Date(inspection.inspected_at), "MM-dd-yyyy") : ""}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2 font-bold">Availability of Applicant's Plumbing Installation</h3>
          <div className="mb-4 mt-6 flex items-center gap-4">
            <label className="flex items-center gap-1">
              <div className="flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                {application?.inhouse_installation_completed === true ? "✓" : ""}
              </div> Available
            </label>
            <label className="flex items-center gap-1">
              <div className="flex h-4 w-4 items-center justify-center border border-black text-xs font-bold">
                {application?.inhouse_installation_completed === false ? "✓" : ""}
              </div> Not Available
            </label>
          </div>
          <div className="mt-6">
            <p className="mb-6">Investigated & Verified by:</p>
            <div className="flex items-end gap-2">
              <div className="h-5 w-48 border-b border-black text-center font-medium">
                {inspection?.inspector_name ?? ""}
              </div>
              <span>Date:</span>
              <div className="h-5 w-24 border-b border-black text-center font-medium">
                {application?.inhouse_installation_completed_at ? format(new Date(application.inhouse_installation_completed_at), "MM-dd-yyyy") : ""}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-4 border-b-[1px] border-dashed border-black"></div>

      {/* Footer 3 Columns */}
      <section className="grid grid-cols-[1fr_0.8fr_1fr] gap-6 text-[9.5pt] flex-grow">
        {/* Col 1: Amount of Charge Due */}
        <div>
          <h3 className="mb-2 font-bold">Amount of Charge Due</h3>
          <div className="space-y-1">
            <p>Installation Fee:</p>
            <div className="flex justify-between items-end">
              <span>a. With Promo</span>
              <div className="h-4 w-24 border-b border-black"></div>
            </div>
            <div className="flex justify-between items-end">
              <span>b. Without Promo</span>
              <div className="h-4 w-24 border-b border-black"></div>
            </div>
            <div className="flex items-end gap-1">
              <span>BOD Res. No.</span>
              <div className="h-4 flex-grow border-b border-black"></div>
              <span>s.</span>
              <div className="h-4 w-12 border-b border-black"></div>
            </div>
            <div className="flex justify-between items-end">
              <span>Meter Deposit</span>
              <div className="h-4 w-24 border-b border-black"></div>
            </div>
            <div className="flex justify-between items-end">
              <span>Other Charges</span>
              <div className="h-4 w-24 border-b border-black"></div>
            </div>
            <div className="flex justify-between items-end">
              <span>Labor:</span>
              <div className="h-4 w-24 border-b border-black"></div>
            </div>
            <p className="pt-1">Materials:</p>
            {[...Array(8)].map((_, i) => (
              <div key={`mat-${i}`} className="h-4 w-full border-b border-black"></div>
            ))}
            <div className="flex justify-between items-end pt-2">
              <span>Total Amount: P</span>
              <div className="h-4 w-28 border-b border-black"></div>
            </div>
          </div>
        </div>

        {/* Col 2: Official Receipt & Form of Payment */}
        <div className="border-l border-dashed border-black pl-6 flex flex-col gap-8">
          <div>
            <h3 className="mb-4 font-bold">Official Receipt No.</h3>
            <div className="h-4 w-full border-b border-black mb-4 flex items-end justify-center text-sm font-semibold">
              {(payment as any)?.or_number ?? ""}
            </div>
            <div className="space-y-3">
              <div className="flex items-end gap-1">
                <span>Amount: P</span>
                <div className="h-4 flex-grow border-b border-black text-center">
                  {payment?.amount ? payment.amount.toFixed(2) : ""}
                </div>
              </div>
              <div className="flex items-end gap-1">
                <span>Date:</span>
                <div className="h-4 flex-grow border-b border-black text-center">
                  {payment?.paid_at ? format(new Date(payment.paid_at), "MM-dd-yyyy") : ""}
                </div>
              </div>
              <div className="flex items-end gap-1">
                <span>Balance Due: P</span>
                <div className="h-4 flex-grow border-b border-black"></div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-bold uppercase">Form of Payment</h3>
            <div className="space-y-2">
              <div className="flex items-end gap-1">
                <span>For BOD Res. #</span>
                <div className="h-4 w-12 border-b border-black"></div>
                <span>S.</span>
                <div className="h-4 w-10 border-b border-black"></div>
              </div>
              <div className="flex justify-end items-end gap-1">
                <div className="h-4 w-24 border-b border-black"></div>
                <span>Month</span>
              </div>
              <div className="flex items-end gap-1">
                <span>P</span>
                <div className="h-4 w-20 border-b border-black"></div>
                <span>/ Month</span>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="h-5 border-b border-black px-1 text-[9pt] leading-5">
                  {toProperCase(inspection?.reference_account_name)}
                </div>
                <p className="mt-1 text-[8pt] leading-tight">Ref. Acct. Name</p>
              </div>
              <div>
                <div className="h-5 border-b border-black px-1 text-[9pt] leading-5">
                  {inspection?.reference_account_number ?? ""}
                </div>
                <p className="mt-1 text-[8pt] leading-tight">Ref. Acct. No.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Installation Details */}
        <div className="border-l border-dashed border-black pl-6 flex flex-col justify-between">
          <div>
            <h3 className="mb-2 font-bold">Installation Details</h3>
            <div className="space-y-4">
              <div>
                <p>Installed by:</p>
                <div className="h-5 w-full border-b border-black"></div>
                <p className="text-[8pt] text-center mt-1">BWD Plumber</p>
              </div>
              <div>
                <div className="h-5 w-full border-b border-black"></div>
                <p className="text-[8pt] text-center mt-1">Date</p>
              </div>
              <div>
                <div className="h-5 w-full border-b border-black"></div>
                <p className="text-[8pt] text-center mt-1">Initial Reading</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-bold text-[9pt]">Service Connection Record</h3>
            <div className="space-y-4">
              <div>
                <div className="h-4 w-full border-b border-black"></div>
                <p className="text-[8pt] mt-1">S.C. No.</p>
              </div>
              <div>
                <div className="h-4 w-full border-b border-black"></div>
                <p className="text-[8pt] mt-1">Meter No.</p>
              </div>
              <div>
                <div className="h-4 w-full border-b border-black text-center font-medium">
                  {inspection?.account_number ?? ""}
                </div>
                <p className="text-[8pt] mt-1">Account No.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-4 mt-4 border-b-[1px] border-dashed border-black"></div>

      {/* Final Signatures */}
      <section className="mt-4 flex justify-between gap-6 text-[9pt]">
        <div className="flex-1">
          <p className="mb-8">Checked by:</p>
          <div className="border-t border-black pt-1 pr-4">
            <p className="font-bold uppercase">Gerlee Blanche K. Jaramillo</p>
            <p>Accounting Processor A</p>
          </div>
        </div>
        <div className="flex-1">
          <p className="mb-8">Recommended by:</p>
          <div className="border-t border-black pt-1 pr-4">
            <p className="font-bold uppercase">Janette R. Aloyon</p>
            <p>Division Manager C</p>
            <p>Div. A, Finance & Comm'l/</p>
            <p>Admin. & Services</p>
          </div>
        </div>
        <div className="flex-1">
          <p className="mb-8">Approved by:</p>
          <div className="border-t border-black pt-1 pr-4">
            <p className="font-bold uppercase">ELISA B. ALIBAY</p>
            <p>General Manager C</p>
          </div>
        </div>
      </section>

      </div>
    </>
  );
}
