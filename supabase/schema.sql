-- Bootstrap schema for a fresh Supabase project.
-- This file is not fully idempotent: rerunning it against an existing database
-- can fail on enums, tables, indexes, and triggers that already exist.
-- For existing projects, apply only the needed incremental SQL patch files in
-- the supabase/ folder instead of rerunning this whole file.

create extension if not exists "pgcrypto";

create type public.app_role as enum ('applicant', 'admin', 'inspector');
create type public.customer_type as enum ('residential', 'commercial', 'government', 'industrial', 'others');
create type public.concessionaire_classification as enum (
  'residential',
  'commercial_c',
  'industrial',
  'commercial_b',
  'commercial_c_1',
  'commercial',
  'commercial_a',
  'government',
  'special',
  'bulksale',
  'unbilled',
  'special_2',
  'government_2'
);
create type public.application_service_type as enum ('new_connection', 'reconnection');
create type public.application_status as enum (
  'draft',
  'submitted',
  'under_review',
  'inspection_scheduled',
  'inspection_completed',
  'documents_verified',
  'payment_scheduled',
  'approved',
  'rejected',
  'converted'
);
create type public.inspection_status as enum (
  'scheduled',
  'in_progress',
  'approved',
  'rejected',
  'rescheduled'
);
create type public.document_type as enum (
  'tax_declaration_title',
  'authorization_letter',
  'water_permit'
);
create type public.document_status as enum ('pending', 'verified', 'rejected');
create type public.payment_status as enum ('scheduled', 'paid', 'overdue', 'cancelled');
create type public.payment_type as enum ('inspection_fee', 'connection_fee', 'materials', 'other');
create type public.seminar_purpose as enum ('new_service', 'reconnection', 'change_name', 'others');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text,
  phone text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  role public.app_role not null,
  customer_type public.customer_type,
  full_name text not null,
  phone text,
  gender text,
  age integer check (age >= 0),
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.applicants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  gender text,
  age integer check (age >= 0),
  address text,
  cellphone_number text,
  purpose_of_seminar public.seminar_purpose,
  number_of_users integer check (number_of_users > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger handle_updated_at before update on public.applicants
  for each row execute procedure public.set_updated_at();

create table public.accredited_plumbers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  license_number text,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.inspectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  applicant_id uuid not null references public.applicants (id) on delete cascade,
  accredited_plumber_id uuid references public.accredited_plumbers (id) on delete set null,
  cellphone_number text,
  service_type public.application_service_type not null,
  status public.application_status not null default 'draft',
  full_name text not null,
  gender text not null,
  age integer not null check (age > 0),
  address text not null,
  number_of_users integer not null check (number_of_users > 0),
  concessionaire_classification public.concessionaire_classification,
  document_submission_mode text not null default 'online' check (document_submission_mode in ('online', 'office')),
  document_review_note text,
  inhouse_installation_scheduled_at timestamptz,
  inhouse_installation_scheduled_by uuid references public.profiles (id) on delete set null,
  inhouse_installation_completed boolean not null default false,
  inhouse_installation_completed_at timestamptz,
  inhouse_installation_proof_image_url text,
  inhouse_installation_signed_at timestamptz,
  inhouse_installation_updated_by uuid references public.profiles (id) on delete set null,
  seminar_completed boolean not null default false,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.seminar_items (
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

create table public.applicant_seminar_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  applicant_id uuid not null references public.applicants (id) on delete cascade,
  seminar_item_id uuid not null references public.seminar_items (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (applicant_id, seminar_item_id)
);

create table public.seminar_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  application_id uuid not null references public.applications (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  module_key text not null,
  module_title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (application_id, module_key)
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  application_id uuid not null references public.applications (id) on delete cascade,
  scheduled_by uuid references public.profiles (id) on delete set null,
  registry_inspector_id uuid references public.inspectors (id) on delete set null,
  inspector_name text,
  scheduled_at timestamptz,
  inspected_at timestamptz,
  status public.inspection_status not null default 'scheduled',
  plumbing_approved boolean,
  remarks text,
  material_list text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  plumber_name text,
  reference_account_number text,
  reference_account_name text,
  account_number text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  application_id uuid not null references public.applications (id) on delete cascade,
  applicant_id uuid not null references public.applicants (id) on delete cascade,
  document_type public.document_type not null,
  file_path text not null,
  file_url text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  status public.document_status not null default 'pending',
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  application_id uuid not null references public.applications (id) on delete cascade,
  scheduled_by uuid references public.profiles (id) on delete set null,
  payment_type public.payment_type not null,
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date not null,
  office_payment_at timestamptz,
  status public.payment_status not null default 'scheduled',
  paid_at timestamptz,
  official_receipt_number text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.concessionaires (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  application_id uuid not null unique references public.applications (id) on delete restrict,
  applicant_id uuid not null references public.applicants (id) on delete restrict,
  concessionaire_number text not null,
  connection_date date not null,
  meter_number text,
  account_status text not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
$$;

create or replace function public.current_profile_organization_id()
returns uuid
language sql
stable
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
$$;

create index idx_profiles_organization_role on public.profiles (organization_id, role);
create index idx_accredited_plumbers_org_active on public.accredited_plumbers (organization_id, is_active, full_name);
create index idx_inspectors_org_active on public.inspectors (organization_id, is_active, full_name);
create index idx_applications_org_status_created on public.applications (organization_id, status, created_at desc);
create index idx_applications_applicant_created on public.applications (applicant_id, created_at desc);
create index idx_seminar_items_org_active_order on public.seminar_items (organization_id, is_active, display_order, created_at desc);
create index idx_applicant_seminar_progress_applicant on public.applicant_seminar_progress (applicant_id, seminar_item_id, completed);
create index idx_seminar_progress_application on public.seminar_progress (application_id, completed);
create index idx_inspections_org_status_scheduled on public.inspections (organization_id, status, scheduled_at desc);
create index idx_inspections_registry_inspector_status on public.inspections (registry_inspector_id, status, scheduled_at desc);
create index idx_documents_application_status on public.documents (application_id, status, document_type);
create unique index idx_documents_application_document_type_unique on public.documents (application_id, document_type);
create index idx_payments_application_due_date on public.payments (application_id, due_date desc);
create index idx_concessionaires_org_connection_date on public.concessionaires (organization_id, connection_date desc);

create trigger organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger accredited_plumbers_updated_at
before update on public.accredited_plumbers
for each row execute function public.set_updated_at();

create trigger inspectors_updated_at
before update on public.inspectors
for each row execute function public.set_updated_at();

create trigger applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create trigger seminar_items_updated_at
before update on public.seminar_items
for each row execute function public.set_updated_at();

create trigger applicant_seminar_progress_updated_at
before update on public.applicant_seminar_progress
for each row execute function public.set_updated_at();

create trigger seminar_progress_updated_at
before update on public.seminar_progress
for each row execute function public.set_updated_at();

create trigger inspections_updated_at
before update on public.inspections
for each row execute function public.set_updated_at();

create trigger documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger concessionaires_updated_at
before update on public.concessionaires
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('seminar-media', 'seminar-media', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('inhouse-installation-proofs', 'inhouse-installation-proofs', true)
on conflict (id) do update set public = true;
