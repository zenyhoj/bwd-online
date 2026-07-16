update public.applications as application
set classified_document_types = (
  select array(
    select classification.document_type
    from (
      select unnest(application.classified_document_types) as document_type
      union
      select document.document_type
      from public.documents as document
      where document.application_id = application.id
        and document.status = 'verified'
    ) as classification
    order by classification.document_type::text
  )
)
where application.status in ('documents_verified', 'payment_scheduled', 'approved', 'converted')
  and exists (
    select 1
    from public.documents as document
    where document.application_id = application.id
      and document.status = 'verified'
      and not (document.document_type = any(application.classified_document_types))
  );
