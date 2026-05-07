do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'concessionaire_classification_v2'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.concessionaire_classification_v2 as enum (
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
  end if;
end
$$;

alter table public.applications
  alter column concessionaire_classification drop default;

alter table public.applications
  alter column concessionaire_classification
  type public.concessionaire_classification_v2
  using (
    case concessionaire_classification::text
      when 'residential_commercial_c' then 'residential'
      when 'commercial_a_b' then 'commercial_a'
      when 'commercial_industrial_bulk' then 'industrial'
      else concessionaire_classification::text
    end
  )::public.concessionaire_classification_v2;

drop type if exists public.concessionaire_classification;

alter type public.concessionaire_classification_v2
  rename to concessionaire_classification;
