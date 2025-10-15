-- =============================================
-- ROLLBACK: REMOVE DESCRIPTION COLUMN FROM ITEMS TABLE
-- Rollback for Migration: 020
-- Date: October 15, 2025
-- =============================================
-- Removes the description column if needed

-- Remove description column from items table
ALTER TABLE public.items 
DROP COLUMN IF EXISTS description;
