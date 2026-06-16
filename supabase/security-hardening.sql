create unique index if not exists idx_documents_application_document_type_unique
on public.documents (application_id, document_type);

drop policy if exists "storage_applicant_read_own_documents" on storage.objects;
drop policy if exists "storage_admin_update_documents" on storage.objects;
drop policy if exists "storage_authenticated_read_documents" on storage.objects;
drop policy if exists "storage_admin_update_documents_same_org" on storage.objects;

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
