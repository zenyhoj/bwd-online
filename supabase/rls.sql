alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.accredited_plumbers enable row level security;
alter table public.inspectors enable row level security;
alter table public.applications enable row level security;
alter table public.seminar_items enable row level security;
alter table public.applicant_seminar_progress enable row level security;
alter table public.seminar_progress enable row level security;
alter table public.inspections enable row level security;
alter table public.documents enable row level security;
alter table public.document_verification_audit_logs enable row level security;
alter table public.payments enable row level security;
alter table public.concessionaires enable row level security;

drop policy if exists "profiles_select_self_or_org_admin" on public.profiles;
create policy "profiles_select_self_or_org_admin"
on public.profiles
for select
using (
  id = auth.uid()
  or (
    public.current_profile_role() = 'admin'
    and organization_id = public.current_profile_organization_id()
  )
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "admins_manage_profiles" on public.profiles;
create policy "admins_manage_profiles"
on public.profiles
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "organizations_select_own_org" on public.organizations;
create policy "organizations_select_own_org"
on public.organizations
for select
using (id = public.current_profile_organization_id());

drop policy if exists "accredited_plumbers_select_same_org" on public.accredited_plumbers;
create policy "accredited_plumbers_select_same_org"
on public.accredited_plumbers
for select
using (organization_id = public.current_profile_organization_id());

drop policy if exists "accredited_plumbers_admin_manage" on public.accredited_plumbers;
create policy "accredited_plumbers_admin_manage"
on public.accredited_plumbers
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "inspectors_select_same_org" on public.inspectors;
create policy "inspectors_select_same_org"
on public.inspectors
for select
using (organization_id = public.current_profile_organization_id());

drop policy if exists "inspectors_admin_manage" on public.inspectors;
create policy "inspectors_admin_manage"
on public.inspectors
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "seminar_items_select_same_org" on public.seminar_items;
create policy "seminar_items_select_same_org"
on public.seminar_items
for select
using (organization_id = public.current_profile_organization_id());

drop policy if exists "seminar_items_admin_manage" on public.seminar_items;
create policy "seminar_items_admin_manage"
on public.seminar_items
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "applicant_seminar_progress_applicant_manage_own" on public.applicant_seminar_progress;
create policy "applicant_seminar_progress_applicant_manage_own"
on public.applicant_seminar_progress
for all
using (public.user_owns_applicant(applicant_id))
with check (
  public.user_owns_applicant(applicant_id)
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "applicant_seminar_progress_admin_org_manage" on public.applicant_seminar_progress;
create policy "applicant_seminar_progress_admin_org_manage"
on public.applicant_seminar_progress
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "applications_applicant_own_rows" on public.applications;
create policy "applications_applicant_own_rows"
on public.applications
for select
using (public.user_owns_applicant(applicant_id));

drop policy if exists "applications_applicant_insert" on public.applications;
create policy "applications_applicant_insert"
on public.applications
for insert
with check (
  public.user_owns_applicant(applicant_id)
  and organization_id = public.current_profile_organization_id()
  and public.current_profile_role() = 'applicant'
);

drop policy if exists "applications_applicant_update_own" on public.applications;
create policy "applications_applicant_update_own"
on public.applications
for update
using (public.user_owns_applicant(applicant_id))
with check (public.user_owns_applicant(applicant_id));

drop policy if exists "applications_admin_org_manage" on public.applications;
create policy "applications_admin_org_manage"
on public.applications
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "applications_inspector_assigned_select" on public.applications;
create policy "applications_inspector_assigned_select"
on public.applications
for select
using (
  public.current_profile_role() = 'inspector'
  and exists (
    select 1
    from public.inspections i
    join public.inspectors ir on ir.id = i.registry_inspector_id
    join public.profiles p on p.id = auth.uid()
    where i.application_id = applications.id
      and ir.organization_id = public.current_profile_organization_id()
      and ir.full_name ilike p.full_name
  )
);

drop policy if exists "seminar_progress_applicant_own" on public.seminar_progress;
create policy "seminar_progress_applicant_own"
on public.seminar_progress
for all
using (applicant_id = auth.uid())
with check (
  applicant_id = auth.uid()
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "seminar_progress_admin_org" on public.seminar_progress;
create policy "seminar_progress_admin_org"
on public.seminar_progress
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "inspections_admin_org_manage" on public.inspections;
create policy "inspections_admin_org_manage"
on public.inspections
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "inspections_inspector_select_assigned" on public.inspections;
create policy "inspections_inspector_select_assigned"
on public.inspections
for select
using (
  public.current_profile_role() = 'inspector'
  and exists (
    select 1
    from public.inspectors ir
    join public.profiles p on p.id = auth.uid()
    where ir.id = inspections.registry_inspector_id
      and ir.organization_id = public.current_profile_organization_id()
      and ir.full_name ilike p.full_name
  )
);

drop policy if exists "inspections_inspector_update_assigned" on public.inspections;
create policy "inspections_inspector_update_assigned"
on public.inspections
for update
using (
  public.current_profile_role() = 'inspector'
  and exists (
    select 1
    from public.inspectors ir
    join public.profiles p on p.id = auth.uid()
    where ir.id = inspections.registry_inspector_id
      and ir.organization_id = public.current_profile_organization_id()
      and ir.full_name ilike p.full_name
  )
)
with check (
  public.current_profile_role() = 'inspector'
  and exists (
    select 1
    from public.inspectors ir
    join public.profiles p on p.id = auth.uid()
    where ir.id = inspections.registry_inspector_id
      and ir.organization_id = public.current_profile_organization_id()
      and ir.full_name ilike p.full_name
  )
);

drop policy if exists "inspections_applicant_select_own" on public.inspections;
create policy "inspections_applicant_select_own"
on public.inspections
for select
using (
  exists (
    select 1
    from public.applications a
    where a.id = inspections.application_id
      and public.user_owns_applicant(a.applicant_id)
  )
);

drop policy if exists "documents_applicant_own" on public.documents;
create policy "documents_applicant_own"
on public.documents
for all
using (public.user_owns_applicant(applicant_id))
with check (
  public.user_owns_applicant(applicant_id)
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "documents_admin_org_manage" on public.documents;
create policy "documents_admin_org_manage"
on public.documents
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "documents_inspector_select_assigned" on public.documents;
create policy "documents_inspector_select_assigned"
on public.documents
for select
using (
  public.current_profile_role() = 'inspector'
  and exists (
    select 1
    from public.inspections i
    join public.inspectors ir on ir.id = i.registry_inspector_id
    join public.profiles p on p.id = auth.uid()
    where i.application_id = documents.application_id
      and ir.organization_id = public.current_profile_organization_id()
      and ir.full_name ilike p.full_name
  )
);

drop policy if exists "documents_reviewer_update" on public.documents;
create policy "documents_reviewer_update"
on public.documents
for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
      and organization_id = documents.organization_id
      and role = 'admin'
  )
);

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

drop policy if exists "Public access to seminar media" on storage.objects;
create policy "Public access to seminar media"
on storage.objects for select
to public
using (bucket_id = 'seminar-media');

drop policy if exists "Admin can insert seminar media" on storage.objects;
create policy "Admin can insert seminar media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'seminar-media' and
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "Admin can update seminar media" on storage.objects;
create policy "Admin can update seminar media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'seminar-media' and
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "Admin can delete seminar media" on storage.objects;
create policy "Admin can delete seminar media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'seminar-media' and
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "payments_applicant_select_own" on public.payments;
create policy "payments_applicant_select_own"
on public.payments
for select
using (
  exists (
    select 1
    from public.applications a
    where a.id = payments.application_id
      and public.user_owns_applicant(a.applicant_id)
  )
);

drop policy if exists "payments_admin_org_manage" on public.payments;
create policy "payments_admin_org_manage"
on public.payments
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "concessionaires_admin_org_manage" on public.concessionaires;
create policy "concessionaires_admin_org_manage"
on public.concessionaires
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "concessionaires_applicant_select_own" on public.concessionaires;
create policy "concessionaires_applicant_select_own"
on public.concessionaires
for select
using (public.user_owns_applicant(applicant_id));

drop policy if exists "storage_applicant_upload_own_documents" on storage.objects;
create policy "storage_applicant_upload_own_documents"
on storage.objects
for insert
with check (
  bucket_id = 'application-documents'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_authenticated_read_documents" on storage.objects;
create policy "storage_authenticated_read_documents"
on storage.objects
for select
using (
  bucket_id = 'application-documents'
  and exists (
    select 1
    from public.documents d
    where d.file_path = storage.objects.name
      and (
        public.user_owns_applicant(d.applicant_id)
        or (
          public.current_profile_role() = 'admin'
          and d.organization_id = public.current_profile_organization_id()
        )
        or (
          public.current_profile_role() = 'inspector'
          and exists (
            select 1
            from public.inspections i
            join public.inspectors ir on ir.id = i.registry_inspector_id
            join public.profiles p on p.id = auth.uid()
            where i.application_id = d.application_id
              and ir.organization_id = public.current_profile_organization_id()
              and ir.full_name ilike p.full_name
          )
        )
      )
  )
);

drop policy if exists "storage_admin_update_documents_same_org" on storage.objects;
create policy "storage_admin_update_documents_same_org"
on storage.objects
for update
using (
  bucket_id = 'application-documents'
  and exists (
    select 1
    from public.documents d
    where d.file_path = storage.objects.name
      and public.current_profile_role() = 'admin'
      and d.organization_id = public.current_profile_organization_id()
  )
)
with check (
  bucket_id = 'application-documents'
  and exists (
    select 1
    from public.documents d
    where d.file_path = storage.objects.name
      and public.current_profile_role() = 'admin'
      and d.organization_id = public.current_profile_organization_id()
  )
);
