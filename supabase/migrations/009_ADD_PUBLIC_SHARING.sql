-- =============================================
-- ADD PUBLIC SHARING FEATURE
-- =============================================
-- This migration adds the ability to make wheels publicly viewable

-- Step 1: Add is_public column to year_wheels
ALTER TABLE public.year_wheels 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Step 2: Add index for faster public wheel lookups
CREATE INDEX IF NOT EXISTS idx_year_wheels_is_public 
ON public.year_wheels (is_public) 
WHERE is_public = TRUE;

-- Step 3: Update RLS policies to allow public access
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their wheels and team wheels" ON public.year_wheels;

-- Create new SELECT policy that includes public wheels
CREATE POLICY "Users can view their wheels and team wheels and public wheels"
  ON public.year_wheels FOR SELECT
  USING (
    -- Own wheels
    user_id = auth.uid()
    OR
    -- Team wheels
    (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.team_id = year_wheels.team_id
        AND team_members.user_id = auth.uid()
      )
    )
    OR
    -- Public wheels (anyone can view, even unauthenticated)
    is_public = TRUE
  );

-- Step 4: Allow public access to related data for public wheels
-- Wheel Rings
DROP POLICY IF EXISTS "Users can view rings for their wheels and team wheels" ON public.wheel_rings;
CREATE POLICY "Users can view rings for accessible wheels"
  ON public.wheel_rings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_rings.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
        OR year_wheels.is_public = TRUE
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Ring Data
DROP POLICY IF EXISTS "Users can view ring data for their wheels and team wheels" ON public.ring_data;
CREATE POLICY "Users can view ring data for accessible wheels"
  ON public.ring_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_rings
      JOIN public.year_wheels ON year_wheels.id = wheel_rings.wheel_id
      WHERE wheel_rings.id = ring_data.ring_id
      AND (
        year_wheels.user_id = auth.uid()
        OR year_wheels.is_public = TRUE
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Activity Groups
DROP POLICY IF EXISTS "Users can view activity groups for their wheels and team wheels" ON public.activity_groups;
CREATE POLICY "Users can view activity groups for accessible wheels"
  ON public.activity_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = activity_groups.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
        OR year_wheels.is_public = TRUE
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Labels
DROP POLICY IF EXISTS "Users can view labels for their wheels and team wheels" ON public.labels;
CREATE POLICY "Users can view labels for accessible wheels"
  ON public.labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = labels.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
        OR year_wheels.is_public = TRUE
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Items
DROP POLICY IF EXISTS "Users can view items for their wheels and team wheels" ON public.items;
CREATE POLICY "Users can view items for accessible wheels"
  ON public.items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
        OR year_wheels.is_public = TRUE
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- =============================================
-- VERIFICATION
-- =============================================

-- Check the new column exists
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'year_wheels'
AND column_name = 'is_public';

-- Check updated policies
SELECT 
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE '%accessible%'
ORDER BY tablename;

-- =============================================
-- SUCCESS!
-- =============================================
-- After running this migration:
-- ✅ year_wheels.is_public column added
-- ✅ RLS policies updated to allow public access
-- ✅ Anyone can view public wheels (even without login)
-- ✅ Only owners can edit is_public status
