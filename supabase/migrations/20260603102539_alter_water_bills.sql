-- Rename existing columns
ALTER TABLE public.water_bills RENAME COLUMN account_name TO name;
ALTER TABLE public.water_bills RENAME COLUMN amount TO total;
ALTER TABLE public.water_bills RENAME COLUMN amount_after_duedate TO amount_after_due_date;
ALTER TABLE public.water_bills RENAME COLUMN due_date TO due;

-- Add new columns
ALTER TABLE public.water_bills ADD COLUMN date_bill text;
ALTER TABLE public.water_bills ADD COLUMN consumption numeric;
ALTER TABLE public.water_bills ADD COLUMN disconnection text;
