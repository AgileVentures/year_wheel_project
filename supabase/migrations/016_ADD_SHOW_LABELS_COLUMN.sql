-- Migration: Add show_labels column to year_wheels table
-- Description: Adds a boolean column to persist the "show labels" UI setting per wheel
-- Date: 2025-10-13

-- Add show_labels column to year_wheels table with default false
ALTER TABLE year_wheels 
ADD COLUMN IF NOT EXISTS show_labels BOOLEAN DEFAULT false;

-- Update existing rows to have the default value
UPDATE year_wheels 
SET show_labels = false 
WHERE show_labels IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN year_wheels.show_labels IS 'Controls whether labels are always visible or shown only on hover. Default: false (hover-only mode)';
