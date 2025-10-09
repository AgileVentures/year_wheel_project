-- =============================================
-- COMPLETE PUBLIC SHARING MIGRATION
-- =============================================
-- Adds is_public column and all necessary policies

-- Step 1: Add is_public column
ALTER TABLE public.year_wheels 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Step 2: Add index
CREATE INDEX IF NOT EXISTS idx_year_wheels_is_public 
ON public.year_wheels (is_public) 
WHERE is_public = TRUE;

-- =============================================
-- SELECT POLICIES (for viewing)
-- =============================================

-- Year Wheels SELECT
DROP POLICY IF EXISTS "Users can view their wheels and team wheels and public wheels" ON public.year_wheels;
DROP POLICY IF EXISTS "Users can view their wheels and team wheels" ON public.year_wheels;

CREATE POLICY "Users can view their wheels and team wheels and public wheels"
  ON public.year_wheels FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_public = TRUE
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.team_id = year_wheels.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  );

-- Wheel Rings SELECT
DROP POLICY IF EXISTS "Users can view rings for accessible wheels" ON public.wheel_rings;
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

-- Ring Data SELECT
DROP POLICY IF EXISTS "Users can view ring data for accessible wheels" ON public.ring_data;
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

-- Activity Groups SELECT
DROP POLICY IF EXISTS "Users can view activity groups for accessible wheels" ON public.activity_groups;
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

-- Labels SELECT
DROP POLICY IF EXISTS "Users can view labels for accessible wheels" ON public.labels;
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

-- Items SELECT
DROP POLICY IF EXISTS "Users can view items for accessible wheels" ON public.items;
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
-- UPDATE POLICY (for toggling is_public)
-- =============================================

-- Drop existing UPDATE policy if any
DROP POLICY IF EXISTS "Users can update their own wheels and team wheels" ON public.year_wheels;
DROP POLICY IF EXISTS "Users can update their wheels and team wheels" ON public.year_wheels;

-- Create new UPDATE policy
CREATE POLICY "Users can update their wheels and team wheels"
  ON public.year_wheels FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.team_id = year_wheels.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.team_id = year_wheels.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  );

-- =============================================
-- VERIFICATION
-- =============================================

-- Check column
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'year_wheels'
AND column_name = 'is_public';

-- Check all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('year_wheels', 'wheel_rings', 'ring_data', 'activity_groups', 'labels', 'items')
ORDER BY tablename, cmd, policyname;

-- =============================================
-- DONE!
-- =============================================
-- Now you can:
-- 1. Toggle is_public in the UI
-- 2. View public wheels without authentication
