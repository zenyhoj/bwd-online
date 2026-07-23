create table if not exists public.inspectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  position text,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.inspectors
add column if not exists position text;

alter table public.inspections
add column if not exists registry_inspector_id uuid references public.inspectors (id) on delete set null;

create index if not exists idx_inspectors_org_active
on public.inspectors (organization_id, is_active, full_name);

drop trigger if exists inspectors_updated_at on public.inspectors;
create trigger inspectors_updated_at
before update on public.inspectors
for each row execute function public.set_updated_at();

alter table public.inspectors enable row level security;

drop policy if exists "inspectors_select_same_org" on public.inspectors;
create policy "inspectors_select_same_org"
on public.inspectors
for select
using (organization_id = public.current_profile_organization_id());

drop policy if exists "inspectors_admin_manage" on public.inspectors;
create policy "inspectors_admin_manage"
on public.inspectors
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);
