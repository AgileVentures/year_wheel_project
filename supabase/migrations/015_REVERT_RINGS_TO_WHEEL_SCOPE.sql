-- =============================================
-- MIGRATION 015: REVERT Rings to Wheel Scope
-- =============================================
-- CRITICAL FIX: Rings, activity_groups, and labels MUST be per-wheel, not per-page
-- Migration 013 was architecturally flawed - cross-year activities are impossible with per-page rings
--
-- PROBLEM: Activity spanning 2025-2026 references ring from page 2025, but page 2026 doesn't have that ring
-- SOLUTION: Rings are shared across ALL pages in a wheel. Only ITEMS are per-page (distributed by year).

-- =============================================
-- PART 1: Make wheel_id NOT NULL and PRIMARY FK
-- =============================================

-- Step 1: Ensure all rings have wheel_id (should already be populated)
UPDATE public.wheel_rings
SET wheel_id = (
  SELECT wheel_id 
  FROM public.wheel_pages 
  WHERE id = wheel_rings.page_id
)
WHERE wheel_id IS NULL AND page_id IS NOT NULL;

UPDATE public.activity_groups
SET wheel_id = (
  SELECT wheel_id 
  FROM public.wheel_pages 
  WHERE id = activity_groups.page_id
)
WHERE wheel_id IS NULL AND page_id IS NOT NULL;

UPDATE public.labels
SET wheel_id = (
  SELECT wheel_id 
  FROM public.wheel_pages 
  WHERE id = labels.page_id
)
WHERE wheel_id IS NULL AND page_id IS NOT NULL;

-- Step 2: Make wheel_id NOT NULL (primary FK)
ALTER TABLE public.wheel_rings
ALTER COLUMN wheel_id SET NOT NULL;

ALTER TABLE public.activity_groups
ALTER COLUMN wheel_id SET NOT NULL;

ALTER TABLE public.labels
ALTER COLUMN wheel_id SET NOT NULL;

-- =============================================
-- PART 2: Drop RLS Policies FIRST (they depend on page_id)
-- =============================================

-- Drop page-based policies (MUST be done before dropping page_id column!)
DROP POLICY IF EXISTS "Users can view rings of accessible pages" ON public.wheel_rings;
DROP POLICY IF EXISTS "Users can manage rings of own pages" ON public.wheel_rings;
DROP POLICY IF EXISTS "Users can view activity_groups of accessible pages" ON public.activity_groups;
DROP POLICY IF EXISTS "Users can manage activity_groups of own pages" ON public.activity_groups;
DROP POLICY IF EXISTS "Users can view labels of accessible pages" ON public.labels;
DROP POLICY IF EXISTS "Users can manage labels of own pages" ON public.labels;

-- =============================================
-- PART 3: Remove page_id foreign keys
-- =============================================

-- Drop foreign key constraints
ALTER TABLE public.wheel_rings
DROP CONSTRAINT IF EXISTS wheel_rings_page_id_fkey;

ALTER TABLE public.activity_groups
DROP CONSTRAINT IF EXISTS activity_groups_page_id_fkey;

ALTER TABLE public.labels
DROP CONSTRAINT IF EXISTS labels_page_id_fkey;

-- =============================================
-- PART 4: Drop page_id columns
-- =============================================

ALTER TABLE public.wheel_rings
DROP COLUMN IF EXISTS page_id;

ALTER TABLE public.activity_groups
DROP COLUMN IF EXISTS page_id;

ALTER TABLE public.labels
DROP COLUMN IF EXISTS page_id;

-- =============================================
-- PART 5: Drop page_id indexes
-- =============================================

DROP INDEX IF EXISTS idx_wheel_rings_page_id;
DROP INDEX IF EXISTS idx_activity_groups_page_id;
DROP INDEX IF EXISTS idx_labels_page_id;

-- =============================================
-- PART 6: Create wheel-based RLS Policies
-- =============================================

-- Create wheel-based policies for wheel_rings
CREATE POLICY "Users can view rings of accessible wheels"
  ON public.wheel_rings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels yw
      WHERE yw.id = wheel_rings.wheel_id
      AND (
        yw.user_id = auth.uid() 
        OR yw.is_public = TRUE
        OR (
          yw.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = yw.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Users can manage rings of own wheels"
  ON public.wheel_rings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels yw
      WHERE yw.id = wheel_rings.wheel_id
      AND (
        yw.user_id = auth.uid()
        OR (
          yw.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = yw.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels yw
      WHERE yw.id = wheel_rings.wheel_id
      AND (
        yw.user_id = auth.uid()
        OR (
          yw.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = yw.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Create wheel-based policies for activity_groups
CREATE POLICY "Users can view activity_groups of accessible wheels"
  ON public.activity_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels yw
      WHERE yw.id = activity_groups.wheel_id
      AND (
        yw.user_id = auth.uid() 
        OR yw.is_public = TRUE
        OR (
          yw.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = yw.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Users can manage activity_groups of own wheels"
  ON public.activity_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels yw
      WHERE yw.id = activity_groups.wheel_id
      AND (
        yw.user_id = auth.uid()
        OR (
          yw.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = yw.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels yw
      WHERE yw.id = activity_groups.wheel_id
      AND (
        yw.user_id = auth.uid()
        OR (
          yw.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = yw.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Create wheel-based policies for labels
CREATE POLICY "Users can view labels of accessible wheels"
  ON public.labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels yw
      WHERE yw.id = labels.wheel_id
      AND (
        yw.user_id = auth.uid() 
        OR yw.is_public = TRUE
        OR (
          yw.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = yw.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Users can manage labels of own wheels"
  ON public.labels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels yw
      WHERE yw.id = labels.wheel_id
      AND (
        yw.user_id = auth.uid()
        OR (
          yw.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = yw.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels yw
      WHERE yw.id = labels.wheel_id
      AND (
        yw.user_id = auth.uid()
        OR (
          yw.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = yw.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- =============================================
-- VERIFICATION
-- =============================================

-- Check that page_id is gone
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('wheel_rings', 'activity_groups', 'labels')
AND column_name IN ('wheel_id', 'page_id')
ORDER BY table_name, column_name;

-- Should show:
-- wheel_rings    | wheel_id | uuid (NOT NULL)
-- activity_groups| wheel_id | uuid (NOT NULL)
-- labels         | wheel_id | uuid (NOT NULL)
-- (NO page_id columns)

-- =============================================
-- NOTES
-- =============================================
-- After this migration:
-- 1. Rings, groups, labels are SHARED across all pages in a wheel
-- 2. Items still have page_id (determines which page displays them)
-- 3. Cross-year activities work correctly (same ring UUID, different page_ids)
-- 4. User creates rings once, they appear on all pages
-- 5. Integrations and AI can create cross-year activities successfully

COMMENT ON TABLE public.wheel_rings IS 'Rings are shared across all pages in a wheel. Items reference rings and are distributed to pages by date.';
COMMENT ON TABLE public.activity_groups IS 'Activity groups are shared across all pages in a wheel. Items reference groups and are distributed to pages by date.';
COMMENT ON TABLE public.labels IS 'Labels are shared across all pages in a wheel. Items reference labels and are distributed to pages by date.';

