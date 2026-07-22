-- Set the default value for new rows
ALTER TABLE public.applications 
ALTER COLUMN document_submission_mode SET DEFAULT 'office';

-- Update any submitted or under_review applications to 'office' so they can proceed offline
UPDATE public.applications
SET document_submission_mode = 'office'
WHERE status IN ('submitted', 'under_review', 'inspection_scheduled', 'inspection_completed');
