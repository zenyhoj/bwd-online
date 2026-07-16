alter table public.applications
add column if not exists classified_document_types public.document_type[] not null default '{}'::public.document_type[];

update public.applications
set classified_document_types = optional_document_types
where cardinality(classified_document_types) = 0
  and cardinality(optional_document_types) > 0;

comment on column public.applications.classified_document_types is
'Document types whose required or optional requirement level was explicitly set by an administrator.';
