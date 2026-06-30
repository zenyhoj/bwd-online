create table if not exists public.document_verification_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  application_id uuid not null references public.applications (id) on delete cascade,
  applicant_id uuid not null references public.applicants (id) on delete cascade,
  applicant_name text not null,
  admin_account_id uuid not null references public.profiles (id) on delete restrict,
  admin_account_name text not null,
  date_verified timestamptz not null default timezone('utc', now()),
  list_of_verified_documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_document_verification_audit_org_date
on public.document_verification_audit_logs (organization_id, date_verified desc);

create index if not exists idx_document_verification_audit_application
on public.document_verification_audit_logs (application_id, date_verified desc);

alter table public.document_verification_audit_logs enable row level security;

drop policy if exists "document_verification_audit_logs_admin_org_manage" on public.document_verification_audit_logs;
create policy "document_verification_audit_logs_admin_org_manage"
on public.document_verification_audit_logs
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);
