-- Allow applicants to view the accredited_plumbers table
drop policy if exists "accredited_plumbers_select_all" on public.accredited_plumbers;
create policy "accredited_plumbers_select_all"
on public.accredited_plumbers
for select
using (true);
