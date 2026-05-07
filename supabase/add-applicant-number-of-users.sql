alter table public.applicants
add column if not exists number_of_users integer;

alter table public.applicants
drop constraint if exists applicants_number_of_users_check;

alter table public.applicants
add constraint applicants_number_of_users_check
check (number_of_users is null or number_of_users > 0);
