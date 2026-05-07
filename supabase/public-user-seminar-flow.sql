alter table public.applications
add column if not exists cellphone_number text;

create table if not exists public.seminar_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null,
  media_type text not null default 'text' check (media_type in ('text', 'image', 'video', 'pdf')),
  media_url text,
  media_urls text[],
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.applicant_seminar_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  seminar_item_id uuid not null references public.seminar_items (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (applicant_id, seminar_item_id)
);

create index if not exists idx_seminar_items_org_active_order
on public.seminar_items (organization_id, is_active, display_order, created_at desc);

create index if not exists idx_applicant_seminar_progress_applicant
on public.applicant_seminar_progress (applicant_id, seminar_item_id, completed);

drop trigger if exists seminar_items_updated_at on public.seminar_items;
create trigger seminar_items_updated_at
before update on public.seminar_items
for each row execute function public.set_updated_at();

drop trigger if exists applicant_seminar_progress_updated_at on public.applicant_seminar_progress;
create trigger applicant_seminar_progress_updated_at
before update on public.applicant_seminar_progress
for each row execute function public.set_updated_at();

alter table public.seminar_items enable row level security;
alter table public.applicant_seminar_progress enable row level security;

drop policy if exists "seminar_items_select_same_org" on public.seminar_items;
create policy "seminar_items_select_same_org"
on public.seminar_items
for select
using (organization_id = public.current_profile_organization_id());

drop policy if exists "seminar_items_admin_manage" on public.seminar_items;
create policy "seminar_items_admin_manage"
on public.seminar_items
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "applicant_seminar_progress_applicant_manage_own" on public.applicant_seminar_progress;
create policy "applicant_seminar_progress_applicant_manage_own"
on public.applicant_seminar_progress
for all
using (applicant_id = auth.uid())
with check (
  applicant_id = auth.uid()
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "applicant_seminar_progress_admin_org_manage" on public.applicant_seminar_progress;
create policy "applicant_seminar_progress_admin_org_manage"
on public.applicant_seminar_progress
for all
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);
