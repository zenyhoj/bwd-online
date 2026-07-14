import { getAllApplicantsPaginated } from "@/lib/queries";
import { ApplicantListForm } from "@/components/admin/applicant-list-form";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminApplicantsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const page = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const search = typeof resolvedParams.search === "string" ? resolvedParams.search : undefined;
  
  const applicantsPaginated = await getAllApplicantsPaginated({
    page: isNaN(page) ? 1 : page,
    pageSize: 10
  }, search);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Applicants</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all registered applicants who go through the online seminar.
        </p>
      </div>
      <ApplicantListForm applicantsPaginated={applicantsPaginated} />
    </div>
  );
}
