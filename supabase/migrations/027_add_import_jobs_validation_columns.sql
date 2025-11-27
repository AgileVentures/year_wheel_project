-- Add validation columns to import_jobs table
-- These store dropped activities and warnings from the import process

ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS dropped_activities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS validation_warnings JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN import_jobs.dropped_activities IS 'Array of activities that could not be imported with reasons';
COMMENT ON COLUMN import_jobs.validation_warnings IS 'Array of validation warnings from the import process';
