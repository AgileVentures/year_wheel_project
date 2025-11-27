-- Apply Import Jobs Validation Columns Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/sql/new

-- Add validation columns to import_jobs table
-- These store dropped activities and warnings from the import process

ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS dropped_activities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS validation_warnings JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN import_jobs.dropped_activities IS 'Array of activities that could not be imported with reasons';
COMMENT ON COLUMN import_jobs.validation_warnings IS 'Array of validation warnings from the import process';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'import_jobs' 
  AND column_name IN ('dropped_activities', 'validation_warnings')
ORDER BY column_name;
