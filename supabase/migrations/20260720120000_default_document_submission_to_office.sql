-- Change the default value for document_submission_mode to 'office'
ALTER TABLE public.applications
  ALTER COLUMN document_submission_mode SET DEFAULT 'office';

-- Update any pending or under_review applications to 'office' so they can proceed offline
UPDATE public.applications
SET document_submission_mode = 'office'
WHERE status IN ('submitted', 'under_review', 'inspection_scheduled', 'inspection_completed');
