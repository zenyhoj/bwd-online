alter table public.applications
add column if not exists document_submission_mode text not null default 'online';

alter table public.applications
add column if not exists document_review_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'applications_document_submission_mode_check'
  ) then
    alter table public.applications
      add constraint applications_document_submission_mode_check
      check (document_submission_mode in ('online', 'office'));
  end if;
end
$$;
