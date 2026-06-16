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

drop index if exists public.idx_inspections_inspector_status;
create index if not exists idx_inspections_registry_inspector_status
on public.inspections (registry_inspector_id, status, scheduled_at desc);

alter table public.inspections
drop column if exists inspector_id,
drop column if exists account_reference;
