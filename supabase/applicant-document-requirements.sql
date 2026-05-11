-- Adds the current applicant document requirements to the document_type enum.
-- Existing legacy document rows can remain stored; the app now requires the new document types going forward.

alter type public.document_type add value if not exists 'valid_id';
alter type public.document_type add value if not exists 'authorized_representative';
alter type public.document_type add value if not exists 'proof_of_ownership';
alter type public.document_type add value if not exists 'owner_valid_id';
alter type public.document_type add value if not exists 'representative_authorization_letter';
alter type public.document_type add value if not exists 'representative_valid_id';
alter type public.document_type add value if not exists 'organization_spa';
alter type public.document_type add value if not exists 'lot_title';
alter type public.document_type add value if not exists 'tax_declaration';
alter type public.document_type add value if not exists 'deed_of_sale';
alter type public.document_type add value if not exists 'lot_owner_authorization';
alter type public.document_type add value if not exists 'lot_owner_valid_id';
alter type public.document_type add value if not exists 'water_permit_receipt';
