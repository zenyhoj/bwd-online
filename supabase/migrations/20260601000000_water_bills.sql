-- Make application_id and applicant_id nullable in concessionaires table
ALTER TABLE public.concessionaires ALTER COLUMN application_id DROP NOT NULL;
ALTER TABLE public.concessionaires ALTER COLUMN applicant_id DROP NOT NULL;

-- Create water_bills table
CREATE TABLE IF NOT EXISTS public.water_bills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) not null,
  concessionaire_id uuid references public.concessionaires(id) not null,
  account_number text not null,
  account_name text not null,
  address text,
  amount numeric not null,
  amount_after_duedate numeric,
  due_date date not null,
  status text not null default 'unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add RLS
ALTER TABLE public.water_bills ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage water bills" ON public.water_bills
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Concessionaires can view their own water bills
CREATE POLICY "Concessionaires can view their own bills" ON public.water_bills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.concessionaires c
      JOIN public.applicants a ON a.id = c.applicant_id
      WHERE c.id = water_bills.concessionaire_id
      AND a.profile_id = auth.uid()
    )
  );
