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
          <div className="flex flex-col items-center mb-[clamp(24px,6vw,64px)] w-full text-center">
            <div className="h-[clamp(48px,10vw,64px)] w-[clamp(48px,10vw,64px)] shrink-0 flex items-center justify-center bg-white mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-main.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-black text-[clamp(18px,4vw,24px)] uppercase tracking-wide text-gray-900">Buenavista Water District</h2>
              <p className="text-[clamp(12px,2.5vw,16px)] font-medium text-gray-600 mt-1">Rizal Avenue, Brgy. 3, Buenavista, Agusan del Norte</p>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[clamp(24px,5vw,32px)] font-black uppercase tracking-[0.15em] text-gray-800 mb-[clamp(32px,8vw,64px)] text-center">
            Certificate of Completion
          </h1>

          {/* Name Section */}
          <div className="w-full max-w-2xl text-center mb-[clamp(24px,6vw,40px)]">
            <div className="border-b-[3px] border-gray-800 mb-4"></div>
            <h2 className="text-[clamp(24px,5vw,32px)] font-bold uppercase tracking-widest text-gray-900 py-2">
              {applicant.full_name}
            </h2>
            <div className="border-t-[3px] border-gray-800 mt-4"></div>
          </div>

          {/* Subtext */}
          <p className="text-center text-[clamp(14px,3vw,16px)] max-w-2xl mb-8 leading-relaxed font-medium text-gray-700">
            Congratulations for successfully completing the {organization?.name || "Organization"} Online Pre-Membership seminar with the following courses:
          </p>

          {/* Courses List */}
          <div className="w-full max-w-xl text-left mb-[clamp(32px,8vw,64px)]">
            <ol className="list-decimal pl-[clamp(16px,4vw,32px)] space-y-3 text-[clamp(14px,3vw,16px)] font-sans">
              {completedCourses.map((course) => (
                <li key={course.id} className="pl-4">{course.title}</li>
              ))}
            </ol>
          </div>

          {/* Date */}
          <p className="text-[clamp(14px,3vw,16px)] font-bold uppercase tracking-wider text-gray-800 mt-auto mb-[clamp(24px,6vw,48px)]">
            Given this {formattedDate}
          </p>
          
        </div>

        {/* Footer & QR Code */}
        <div className="flex flex-col items-center pb-4">
          <div className="p-2 border-2 border-gray-200 rounded-lg bg-white shadow-sm w-[clamp(80px,25vw,120px)] h-[clamp(80px,25vw,120px)] flex justify-center items-center">
            <QRCode value={verificationUrl} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
          </div>
          <p className="text-[clamp(12px,2.5vw,16px)] mt-4 text-center font-medium text-gray-500">
            This Certificate is not valid without the system generated QR Code.
          </p>
        </div>
        
        </div>
      </div>
    </div>
    </>
  );
}
