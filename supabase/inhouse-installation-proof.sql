alter table public.applications
add column if not exists inhouse_installation_proof_image_url text;

alter table public.applications
add column if not exists inhouse_installation_signed_at timestamptz;

insert into storage.buckets (id, name, public)
values ('inhouse-installation-proofs', 'inhouse-installation-proofs', true)
on conflict (id) do update set public = true;
