-- =============================================
-- ADD DESCRIPTION COLUMN TO ITEMS TABLE
-- Migration: 020
-- Date: October 15, 2025
-- =============================================
-- Adds an optional description field to activity items
-- allowing users to add additional details/notes

-- Add description column to items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.items.description IS 'Optional detailed description or notes for the activity item';

-- No index needed for description as it's not used for filtering/searching
-- (can be added later if full-text search is implemented)
