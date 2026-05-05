-- Migration: Add concessionaire_classification to applications table
-- Run this in the Supabase SQL Editor (or via supabase db push)

CREATE TYPE public.concessionaire_classification AS ENUM (
  'residential_commercial_c',
  'commercial_a_b',
  'commercial_industrial_bulk'
);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS concessionaire_classification public.concessionaire_classification;
