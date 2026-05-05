-- ==============================================================
-- BWD Online: Database Cleanup + Seed Script
-- Run this in the Supabase SQL Editor
-- WARNING: This permanently deletes test/dummy data.
-- ==============================================================


-- ──────────────────────────────────────────────────────────────
-- SECTION 1: Clean applicant data (cascade deletes applications,
-- inspections, payments, documents, seminar progress, etc.)
-- Admin and inspector profiles are preserved.
-- ──────────────────────────────────────────────────────────────

-- Delete all applicant records (cascades to applications and all related data)
DELETE FROM public.applicants;

-- Delete auth users who have the 'applicant' role profile
-- (removes their login accounts for a true clean slate)
DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM public.profiles WHERE role = 'applicant'
);

-- Note: Deleting from auth.users cascades to profiles via ON DELETE CASCADE


-- ──────────────────────────────────────────────────────────────
-- SECTION 2: Replace dummy plumbers with real accredited plumbers
-- ──────────────────────────────────────────────────────────────

DELETE FROM public.accredited_plumbers
WHERE organization_id = (SELECT id FROM public.organizations LIMIT 1);

INSERT INTO public.accredited_plumbers (organization_id, full_name, phone, notes, is_active)
VALUES
  ((SELECT id FROM public.organizations LIMIT 1), 'Elmer T. Manalili',     '09074865848',               'Brgy. 1',   true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Vic Luzano',            '09388590301',               'Brgy. 1',   true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Jose D. Pongautan Jr.', '09475944897',               'Brgy. 4',   true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Juancho G. Quilacio',   '09267397243',               'Brgy. 5',   true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Teofilo M. Bual, Jr.',  '09306548705',               'Brgy. 6',   true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Ernesto M. Gonzaga',    '09124994828',               'Brgy. 7',   true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Arnold J. Cabaltera',   '09128094006',               'Brgy. 8',   true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Ryan B. Edradan',       '09385778390 / 09553555021', 'Brgy. 8',   true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Eric N. Jipos',         '09306124256',               'Brgy. 8',   true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Antonio B. Macauba Jr.','09489894635',               'Jr. Sacol', true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Eric R. Trillo',        '09284947229 / 09154180462', 'Rizal',     true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Adonis D. Mateo',       '09197740977',               'Manapa',    true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Jackie T. Lapaza',      '09565632677 / 09482869738', 'Manapa',    true),
  ((SELECT id FROM public.organizations LIMIT 1), 'Carlos L. Villacorte',  '09656430613',               'Guinabsan', true);


-- ──────────────────────────────────────────────────────────────
-- VERIFY
-- ──────────────────────────────────────────────────────────────
SELECT 'Applicants remaining:' AS check, COUNT(*) AS count FROM public.applicants
UNION ALL
SELECT 'Applications remaining:', COUNT(*) FROM public.applications
UNION ALL
SELECT 'Payments remaining:', COUNT(*) FROM public.payments
UNION ALL
SELECT 'Plumbers inserted:', COUNT(*) FROM public.accredited_plumbers
UNION ALL
SELECT 'Admin/Inspector profiles preserved:', COUNT(*) FROM public.profiles WHERE role IN ('admin', 'inspector');
