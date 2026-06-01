import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "react-qr-code";
import { getPublicApplicantCertificate } from "@/lib/queries";
import { format } from "date-fns";

export default async function CertificatePage({
  params
}: {
  params: Promise<{ applicantId: string }>;
}) {
  const resolvedParams = await params;
  const applicantId = resolvedParams.applicantId;

  const data = await getPublicApplicantCertificate(applicantId);

  if (!data || !data.allCompleted) {
    notFound();
  }

  const { applicant, organization, seminarItems, progress } = data;

  // Get base URL for QR Code
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const verificationUrl = `${protocol}://${host}/certificate/${applicantId}`;

  // Find the latest completion date
  const completedAtDates = progress
    .map(p => p.completed_at ? new Date(p.completed_at).getTime() : 0)
    .filter(t => t > 0);
  
  const completionTime = completedAtDates.length > 0 ? Math.max(...completedAtDates) : Date.now();
  const formattedDate = format(new Date(completionTime), "do 'day of' MMMM yyyy");

  // Only display completed items
  const completedItemIds = new Set(progress.filter(p => p.completed).map(p => p.seminar_item_id));
  const completedCourses = seminarItems.filter(item => completedItemIds.has(item.id));

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white;
          }
        }
      `}</style>
      <div className="min-h-screen bg-muted/20 py-8 px-4 flex items-center justify-center print:bg-white print:py-0 print:px-0">
      <div 
        className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black shadow-xl mx-auto p-2 print:shadow-none print:m-0 print:p-2"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <div className="w-full h-full min-h-[291mm] border-[8px] border-double border-gray-300 p-10 flex flex-col justify-between print:min-h-[291mm]">

        
        {/* Certificate Content Wrapper */}
        <div className="flex-1 flex flex-col items-center pt-8">
          
          {/* Header */}
          <div className="flex items-center gap-6 mb-16 self-start">
            <div className="h-24 w-24 shrink-0 flex items-center justify-center bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-main.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <h2 className="font-black text-[24px] uppercase tracking-wide text-gray-900">{organization?.name || "Organization Name"}</h2>
              <p className="text-[16px] font-medium text-gray-600 mt-1">Rizal Avenue, Brgy. 3, Buenavista, Agusan del Norte</p>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[32px] font-black uppercase tracking-[0.15em] text-gray-800 mb-16">
            Certificate of Completion
          </h1>

          {/* Name Section */}
          <div className="w-full max-w-2xl text-center mb-10">
            <div className="border-b-[3px] border-gray-800 mb-4"></div>
            <h2 className="text-[32px] font-bold uppercase tracking-widest text-gray-900 py-2">
              {applicant.full_name}
            </h2>
            <div className="border-t-[3px] border-gray-800 mt-4"></div>
          </div>

          {/* Subtext */}
          <p className="text-center text-[16px] max-w-2xl mb-8 leading-relaxed font-medium text-gray-700">
            Congratulations for successfully completing the {organization?.name || "Organization"} Online Pre-Membership seminar with the following courses:
          </p>

          {/* Courses List */}
          <div className="w-full max-w-xl text-left mb-16">
            <ol className="list-decimal pl-8 space-y-3 text-[16px] font-sans">
              {completedCourses.map((course) => (
                <li key={course.id} className="pl-4">{course.title}</li>
              ))}
            </ol>
          </div>

          {/* Date */}
          <p className="text-[16px] font-bold uppercase tracking-wider text-gray-800 mt-auto mb-12">
            Given this {formattedDate}
          </p>
          
        </div>

        {/* Footer & QR Code */}
        <div className="flex flex-col items-center pb-4">
          <div className="p-2 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
            <QRCode value={verificationUrl} size={104} />
          </div>
          <p className="text-[16px] mt-4 text-center font-medium text-gray-500">
            This Certificate is not valid without the system generated QR Code.
          </p>
        </div>
        
        </div>
      </div>
    </div>
    </>
  );
}
