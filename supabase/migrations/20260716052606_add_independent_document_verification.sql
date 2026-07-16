alter table public.applications
add column if not exists documents_verified_at timestamptz,
add column if not exists documents_verified_by uuid references public.profiles (id) on delete set null;

do $$
begin
  if to_regclass('public.document_verification_audit_logs') is not null then
    with latest_verification as (
      select distinct on (application_id)
        application_id,
        date_verified,
        admin_account_id
      from public.document_verification_audit_logs
      order by application_id, date_verified desc
    )
    update public.applications as application
    set
      documents_verified_at = coalesce(latest.date_verified, application.updated_at),
      documents_verified_by = latest.admin_account_id
    from latest_verification as latest
    where latest.application_id = application.id
      and application.documents_verified_at is null;
  end if;
end
$$;

update public.applications
set documents_verified_at = updated_at
where documents_verified_at is null
  and status in ('documents_verified', 'payment_scheduled', 'approved', 'converted');
