-- =============================================
-- COMPLETE FIX: All Team Collaboration Issues
-- =============================================
-- This script does EVERYTHING needed to fix team collaboration
-- Run the entire script at once in Supabase SQL Editor
-- 
-- What this fixes:
-- 1. Adds RLS policies for all tables
-- 2. Checks and displays team membership status
-- 3. Provides commands to add yourself if needed

-- =============================================
-- PART 1: APPLY ALL RLS POLICIES
-- =============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can update their wheels and team wheels" ON public.year_wheels;
DROP POLICY IF EXISTS "Team members can update their team wheels" ON public.year_wheels;
DROP POLICY IF EXISTS "Users can update their own wheels" ON public.year_wheels;
DROP POLICY IF EXISTS "Users can view their wheels and team wheels" ON public.year_wheels;
DROP POLICY IF EXISTS "Users can view their own wheels" ON public.year_wheels;
DROP POLICY IF EXISTS "Users can create wheels" ON public.year_wheels;
DROP POLICY IF EXISTS "Users can delete their wheels" ON public.year_wheels;
DROP POLICY IF EXISTS "Owners can delete their wheels" ON public.year_wheels;

-- Year Wheels Policies
CREATE POLICY "Users can view their wheels and team wheels"
  ON public.year_wheels FOR SELECT
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
  );

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
  );

CREATE POLICY "Users can create wheels"
  ON public.year_wheels FOR INSERT
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

CREATE POLICY "Owners can delete their wheels"
  ON public.year_wheels FOR DELETE
  USING (user_id = auth.uid());

-- Enable RLS on related tables
ALTER TABLE public.wheel_rings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ring_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Wheel Rings Policies
DROP POLICY IF EXISTS "Users can view rings for their wheels and team wheels" ON public.wheel_rings;
DROP POLICY IF EXISTS "Users can insert rings for their wheels and team wheels" ON public.wheel_rings;
DROP POLICY IF EXISTS "Users can update rings for their wheels and team wheels" ON public.wheel_rings;
DROP POLICY IF EXISTS "Users can delete rings for their wheels and team wheels" ON public.wheel_rings;

CREATE POLICY "Users can view rings for their wheels and team wheels"
  ON public.wheel_rings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_rings.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can insert rings for their wheels and team wheels"
  ON public.wheel_rings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_rings.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can update rings for their wheels and team wheels"
  ON public.wheel_rings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_rings.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can delete rings for their wheels and team wheels"
  ON public.wheel_rings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_rings.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

-- Ring Data Policies
DROP POLICY IF EXISTS "Users can view ring data for their wheels and team wheels" ON public.ring_data;
DROP POLICY IF EXISTS "Users can insert ring data for their wheels and team wheels" ON public.ring_data;
DROP POLICY IF EXISTS "Users can update ring data for their wheels and team wheels" ON public.ring_data;
DROP POLICY IF EXISTS "Users can delete ring data for their wheels and team wheels" ON public.ring_data;

CREATE POLICY "Users can view ring data for their wheels and team wheels"
  ON public.ring_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_rings
      JOIN public.year_wheels ON year_wheels.id = wheel_rings.wheel_id
      WHERE wheel_rings.id = ring_data.ring_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can insert ring data for their wheels and team wheels"
  ON public.ring_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wheel_rings
      JOIN public.year_wheels ON year_wheels.id = wheel_rings.wheel_id
      WHERE wheel_rings.id = ring_data.ring_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can update ring data for their wheels and team wheels"
  ON public.ring_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_rings
      JOIN public.year_wheels ON year_wheels.id = wheel_rings.wheel_id
      WHERE wheel_rings.id = ring_data.ring_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can delete ring data for their wheels and team wheels"
  ON public.ring_data FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_rings
      JOIN public.year_wheels ON year_wheels.id = wheel_rings.wheel_id
      WHERE wheel_rings.id = ring_data.ring_id
      AND (
        year_wheels.user_id = auth.uid()
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

-- Activity Groups Policies
DROP POLICY IF EXISTS "Users can view activity groups for their wheels and team wheels" ON public.activity_groups;
DROP POLICY IF EXISTS "Users can insert activity groups for their wheels and team wheels" ON public.activity_groups;
DROP POLICY IF EXISTS "Users can update activity groups for their wheels and team wheels" ON public.activity_groups;
DROP POLICY IF EXISTS "Users can delete activity groups for their wheels and team wheels" ON public.activity_groups;

CREATE POLICY "Users can view activity groups for their wheels and team wheels"
  ON public.activity_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = activity_groups.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can insert activity groups for their wheels and team wheels"
  ON public.activity_groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = activity_groups.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can update activity groups for their wheels and team wheels"
  ON public.activity_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = activity_groups.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can delete activity groups for their wheels and team wheels"
  ON public.activity_groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = activity_groups.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

-- Labels Policies
DROP POLICY IF EXISTS "Users can view labels for their wheels and team wheels" ON public.labels;
DROP POLICY IF EXISTS "Users can insert labels for their wheels and team wheels" ON public.labels;
DROP POLICY IF EXISTS "Users can update labels for their wheels and team wheels" ON public.labels;
DROP POLICY IF EXISTS "Users can delete labels for their wheels and team wheels" ON public.labels;

CREATE POLICY "Users can view labels for their wheels and team wheels"
  ON public.labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = labels.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can insert labels for their wheels and team wheels"
  ON public.labels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = labels.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can update labels for their wheels and team wheels"
  ON public.labels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = labels.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can delete labels for their wheels and team wheels"
  ON public.labels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = labels.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

-- Items Policies
DROP POLICY IF EXISTS "Users can view items for their wheels and team wheels" ON public.items;
DROP POLICY IF EXISTS "Users can insert items for their wheels and team wheels" ON public.items;
DROP POLICY IF EXISTS "Users can update items for their wheels and team wheels" ON public.items;
DROP POLICY IF EXISTS "Users can delete items for their wheels and team wheels" ON public.items;

CREATE POLICY "Users can view items for their wheels and team wheels"
  ON public.items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can insert items for their wheels and team wheels"
  ON public.items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can update items for their wheels and team wheels"
  ON public.items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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

CREATE POLICY "Users can delete items for their wheels and team wheels"
  ON public.items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
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
-- PART 2: CHECK YOUR ACCESS STATUS
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICIES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Now checking your team membership...';
END $$;

-- Show which wheels you have access to
SELECT 
  yw.id as wheel_id,
  yw.title,
  yw.team_id,
  yw.user_id as owner_id,
  tm.user_id as your_membership_id,
  tm.role,
  CASE 
    WHEN yw.user_id = auth.uid() THEN '✅ YOU OWN THIS'
    WHEN tm.user_id IS NOT NULL THEN '✅ TEAM MEMBER'
    ELSE '❌ NO ACCESS - SEE BELOW'
  END as status
FROM year_wheels yw
LEFT JOIN team_members tm ON tm.team_id = yw.team_id AND tm.user_id = auth.uid()
WHERE yw.user_id = auth.uid() OR yw.team_id IS NOT NULL
ORDER BY 
  CASE 
    WHEN yw.user_id = auth.uid() THEN 1
    WHEN tm.user_id IS NOT NULL THEN 2
    ELSE 3
  END,
  yw.updated_at DESC;

-- =============================================
-- PART 3: FIX MISSING TEAM MEMBERSHIPS
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IF YOU SEE ❌ NO ACCESS ABOVE:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Copy the team_id from that row';
  RAISE NOTICE 'Then run this command (replace TEAM_ID):';
  RAISE NOTICE '';
  RAISE NOTICE 'INSERT INTO team_members (team_id, user_id, role)';
  RAISE NOTICE 'VALUES (''PASTE_TEAM_ID_HERE'', auth.uid(), ''owner'')';
  RAISE NOTICE 'ON CONFLICT (team_id, user_id) DO NOTHING;';
  RAISE NOTICE '';
  RAISE NOTICE 'Then refresh your browser and try again!';
  RAISE NOTICE '========================================';
END $$;
