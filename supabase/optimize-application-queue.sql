-- Optimization for Application Queue
-- 1. Create a trigram index for fast case-insensitive name searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_applications_full_name_trgm ON applications USING gin (full_name gin_trgm_ops);

-- 2. Create a view to pre-calculate workflow stages
-- This allows the application to filter and sort thousands of rows directly in the database
CREATE OR REPLACE VIEW admin_applications_queue_view AS
SELECT 
    a.id,
    a.organization_id,
    a.full_name,
    a.service_type,
    a.status,
    a.submitted_at,
    a.created_at,
    a.inhouse_installation_completed,
    a.inhouse_installation_completed_at,
    a.water_meter_installation_scheduled_at,
    a.water_meter_installed_at,
    a.document_submission_mode,
    (SELECT count(*) FROM inspections i WHERE i.application_id = a.id) as inspection_count,
    (SELECT count(*) FROM inspections i WHERE i.application_id = a.id AND i.status = 'approved') as approved_inspection_count,
    (SELECT count(*) FROM payments p WHERE p.application_id = a.id AND p.status = 'paid') as paid_payment_count,
    (SELECT count(*) FROM concessionaires c WHERE c.application_id = a.id) as concessionaire_count,
    CASE
        WHEN a.water_meter_installed_at IS NOT NULL AND (
            (SELECT count(*) FROM concessionaires c WHERE c.application_id = a.id) > 0 OR a.status = 'converted'
        ) THEN 'completed'
        WHEN a.inhouse_installation_completed = false THEN 'for-inhouse-plumbing'
        WHEN (SELECT count(*) FROM inspections i WHERE i.application_id = a.id) = 0 THEN 'for-inspection'
        WHEN (SELECT count(*) FROM inspections i WHERE i.application_id = a.id AND i.status = 'approved') = 0 THEN 'under-review'
        WHEN (
            a.document_submission_mode != 'office' AND 
            a.status NOT IN ('documents_verified', 'payment_scheduled', 'approved')
        ) THEN 'for-documents'
        WHEN (SELECT count(*) FROM payments p WHERE p.application_id = a.id AND p.status = 'paid') = 0 THEN 'for-payment'
        WHEN a.water_meter_installation_scheduled_at IS NULL THEN 'for-water-meter-schedule'
        WHEN a.water_meter_installed_at IS NULL THEN 'for-water-meter-complete'
        ELSE 'for-conversion'
    END as workflow_stage,
    CASE
        WHEN a.water_meter_installed_at IS NOT NULL AND (
            (SELECT count(*) FROM concessionaires c WHERE c.application_id = a.id) > 0 OR a.status = 'converted'
        ) THEN 90
        WHEN a.inhouse_installation_completed = false THEN 80
        WHEN (SELECT count(*) FROM inspections i WHERE i.application_id = a.id) = 0 THEN 10
        WHEN (SELECT count(*) FROM inspections i WHERE i.application_id = a.id AND i.status = 'approved') = 0 THEN 70
        WHEN (
            a.document_submission_mode != 'office' AND 
            a.status NOT IN ('documents_verified', 'payment_scheduled', 'approved')
        ) THEN 20
        WHEN (SELECT count(*) FROM payments p WHERE p.application_id = a.id AND p.status = 'paid') = 0 THEN 30
        WHEN a.water_meter_installation_scheduled_at IS NULL THEN 40
        WHEN a.water_meter_installed_at IS NULL THEN 50
        ELSE 60
    END as workflow_priority,
    a.cellphone_number
FROM applications a;
