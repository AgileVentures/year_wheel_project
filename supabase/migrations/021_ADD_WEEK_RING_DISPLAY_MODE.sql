-- Migration: Add week_ring_display_mode column to year_wheels table
-- Description: Allows users to choose between displaying week numbers or date ranges in the week ring
-- Date: 2025-10-13

-- Add week_ring_display_mode column with constraint
ALTER TABLE year_wheels 
ADD COLUMN IF NOT EXISTS week_ring_display_mode TEXT DEFAULT 'week-numbers' 
CHECK (week_ring_display_mode IN ('week-numbers', 'dates'));

-- Update existing rows to have the default value
UPDATE year_wheels 
SET week_ring_display_mode = 'week-numbers' 
WHERE week_ring_display_mode IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN year_wheels.week_ring_display_mode IS 'Display mode for week ring: "week-numbers" shows ISO week numbers (1-53), "dates" shows date ranges (DD-DD format). Default: week-numbers';
