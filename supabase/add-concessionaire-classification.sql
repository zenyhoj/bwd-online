-- Migration: Add concessionaire_classification to applications table
-- Run this in the Supabase SQL Editor (or via supabase db push)

CREATE TYPE public.concessionaire_classification AS ENUM (
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

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS concessionaire_classification public.concessionaire_classification;
