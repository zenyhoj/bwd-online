alter table public.applications
add column if not exists optional_document_types public.document_type[] not null default '{}'::public.document_type[];

comment on column public.applications.optional_document_types is
'Document types that an administrator marked optional for this application.';
