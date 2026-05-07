-- Remove public/applicant users and their related records.
-- Admin and inspector accounts are preserved.
-- Run this in the Supabase SQL Editor.

-- Delete applicant records first. This cascades to applications and
-- related rows such as seminar progress, documents, inspections,
-- payments, and concessionaire links that depend on the applications/applicants.
delete from public.applicants;

-- Delete login accounts for users whose profile role is applicant.
-- Deleting from auth.users cascades to public.profiles via ON DELETE CASCADE.
delete from auth.users
where id in (
  select id
  from public.profiles
  where role = 'applicant'
);

-- Verify the cleanup result.
select 'Applicants remaining' as check_name, count(*) as count_value from public.applicants
union all
select 'Applications remaining', count(*) from public.applications
union all
select 'Documents remaining', count(*) from public.documents
union all
select 'Payments remaining', count(*) from public.payments
union all
select 'Admin/Inspector profiles preserved', count(*) from public.profiles where role in ('admin', 'inspector');
