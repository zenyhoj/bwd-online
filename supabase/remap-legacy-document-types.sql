-- Optional cleanup after applicant-document-requirements.sql has been applied and committed.
-- Run this only if you want old document rows to count toward the closest new requirement.

update public.documents
set document_type = 'tax_declaration'
where document_type = 'tax_declaration_title';

update public.documents
set document_type = 'representative_authorization_letter'
where document_type = 'authorization_letter';

update public.documents
set document_type = 'water_permit_receipt'
where document_type = 'water_permit';
