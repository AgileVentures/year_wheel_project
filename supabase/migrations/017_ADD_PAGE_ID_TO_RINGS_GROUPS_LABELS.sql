-- =============================================
-- MIGRATION 013: Add page_id to rings, groups, and labels
-- =============================================
-- CRITICAL FIX: Properly scope rings, activity_groups, and labels to pages
-- Currently they reference wheel_id (shared across all pages)
-- They should reference page_id (isolated per page/year)

-- Step 1: Add page_id column to wheel_rings
ALTER TABLE public.wheel_rings
ADD COLUMN IF NOT EXISTS page_id UUID;

-- Step 2: Add page_id column to activity_groups
ALTER TABLE public.activity_groups
ADD COLUMN IF NOT EXISTS page_id UUID;

-- Step 3: Add page_id column to labels
ALTER TABLE public.labels
ADD COLUMN IF NOT EXISTS page_id UUID;

-- Step 4: Backfill page_id for wheel_rings
-- Logic: Assign to first page of the wheel (by page_order)
UPDATE public.wheel_rings wr
SET page_id = (
  SELECT wp.id
  FROM public.wheel_pages wp
  WHERE wp.wheel_id = wr.wheel_id
  ORDER BY wp.page_order
  LIMIT 1
)
WHERE page_id IS NULL;

-- Step 5: Backfill page_id for activity_groups
UPDATE public.activity_groups ag
SET page_id = (
  SELECT wp.id
  FROM public.wheel_pages wp
  WHERE wp.wheel_id = ag.wheel_id
  ORDER BY wp.page_order
  LIMIT 1
)
WHERE page_id IS NULL;

-- Step 6: Backfill page_id for labels
UPDATE public.labels l
SET page_id = (
  SELECT wp.id
  FROM public.wheel_pages wp
  WHERE wp.wheel_id = l.wheel_id
  ORDER BY wp.page_order
  LIMIT 1
)
WHERE page_id IS NULL;

-- Step 7: Add foreign key constraints (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wheel_rings_page_id_fkey'
  ) THEN
    ALTER TABLE public.wheel_rings
    ADD CONSTRAINT wheel_rings_page_id_fkey
    FOREIGN KEY (page_id) REFERENCES public.wheel_pages(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_groups_page_id_fkey'
  ) THEN
    ALTER TABLE public.activity_groups
    ADD CONSTRAINT activity_groups_page_id_fkey
    FOREIGN KEY (page_id) REFERENCES public.wheel_pages(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'labels_page_id_fkey'
  ) THEN
    ALTER TABLE public.labels
    ADD CONSTRAINT labels_page_id_fkey
    FOREIGN KEY (page_id) REFERENCES public.wheel_pages(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 8: Make page_id NOT NULL
ALTER TABLE public.wheel_rings
ALTER COLUMN page_id SET NOT NULL;

ALTER TABLE public.activity_groups
ALTER COLUMN page_id SET NOT NULL;

ALTER TABLE public.labels
ALTER COLUMN page_id SET NOT NULL;

-- Step 9: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wheel_rings_page_id ON public.wheel_rings(page_id);
CREATE INDEX IF NOT EXISTS idx_activity_groups_page_id ON public.activity_groups(page_id);
CREATE INDEX IF NOT EXISTS idx_labels_page_id ON public.labels(page_id);

-- Step 10: Make wheel_id nullable (page_id is now the primary FK)
ALTER TABLE public.wheel_rings
ALTER COLUMN wheel_id DROP NOT NULL;

ALTER TABLE public.activity_groups
ALTER COLUMN wheel_id DROP NOT NULL;

ALTER TABLE public.labels
ALTER COLUMN wheel_id DROP NOT NULL;

-- =============================================
-- VERIFICATION
-- =============================================
-- Run these queries to verify migration success:

-- Should return 0 (all rings have page_id)
-- SELECT COUNT(*) FROM wheel_rings WHERE page_id IS NULL;

-- Should return 0 (all groups have page_id)
-- SELECT COUNT(*) FROM activity_groups WHERE page_id IS NULL;

-- Should return 0 (all labels have page_id)
-- SELECT COUNT(*) FROM labels WHERE page_id IS NULL;

-- Show distribution of rings per page
-- SELECT wp.year, wp.title, COUNT(wr.id) as ring_count
-- FROM wheel_pages wp
-- LEFT JOIN wheel_rings wr ON wr.page_id = wp.id
-- GROUP BY wp.id, wp.year, wp.title
-- ORDER BY wp.year;

-- =============================================
-- UPDATE RLS POLICIES
-- =============================================
-- Now that rings, groups, and labels use page_id, we need to update RLS policies
-- to check permissions through: page_id → wheel_pages → year_wheels

-- Drop old policies
DROP POLICY IF EXISTS "Users can view rings of accessible wheels" ON public.wheel_rings;
DROP POLICY IF EXISTS "Users can manage rings of own wheels" ON public.wheel_rings;
DROP POLICY IF EXISTS "Users can view rings of accessible pages" ON public.wheel_rings;
DROP POLICY IF EXISTS "Users can manage rings of own pages" ON public.wheel_rings;

-- New policies for wheel_rings (using page_id)
CREATE POLICY "Users can view rings of accessible pages"
  ON public.wheel_rings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_pages wp
      JOIN public.year_wheels yw ON yw.id = wp.wheel_id
      WHERE wp.id = wheel_rings.page_id 
      AND (yw.user_id = auth.uid() OR yw.is_public = TRUE)
    )
  );

CREATE POLICY "Users can manage rings of own pages"
  ON public.wheel_rings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_pages wp
      JOIN public.year_wheels yw ON yw.id = wp.wheel_id
      WHERE wp.id = wheel_rings.page_id 
      AND yw.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wheel_pages wp
      JOIN public.year_wheels yw ON yw.id = wp.wheel_id
      WHERE wp.id = wheel_rings.page_id 
      AND yw.user_id = auth.uid()
    )
  );

-- Drop old policies for activity_groups
DROP POLICY IF EXISTS "Users can view activity_groups of accessible wheels" ON public.activity_groups;
DROP POLICY IF EXISTS "Users can manage activity_groups of own wheels" ON public.activity_groups;
DROP POLICY IF EXISTS "Users can view activity_groups of accessible pages" ON public.activity_groups;
DROP POLICY IF EXISTS "Users can manage activity_groups of own pages" ON public.activity_groups;

-- New policies for activity_groups (using page_id)
CREATE POLICY "Users can view activity_groups of accessible pages"
  ON public.activity_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_pages wp
      JOIN public.year_wheels yw ON yw.id = wp.wheel_id
      WHERE wp.id = activity_groups.page_id 
      AND (yw.user_id = auth.uid() OR yw.is_public = TRUE)
    )
  );

CREATE POLICY "Users can manage activity_groups of own pages"
  ON public.activity_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_pages wp
      JOIN public.year_wheels yw ON yw.id = wp.wheel_id
      WHERE wp.id = activity_groups.page_id 
      AND yw.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wheel_pages wp
      JOIN public.year_wheels yw ON yw.id = wp.wheel_id
      WHERE wp.id = activity_groups.page_id 
      AND yw.user_id = auth.uid()
    )
  );

-- Drop old policies for labels
DROP POLICY IF EXISTS "Users can view labels of accessible wheels" ON public.labels;
DROP POLICY IF EXISTS "Users can manage labels of own wheels" ON public.labels;
DROP POLICY IF EXISTS "Users can view labels of accessible pages" ON public.labels;
DROP POLICY IF EXISTS "Users can manage labels of own pages" ON public.labels;

-- New policies for labels (using page_id)
CREATE POLICY "Users can view labels of accessible pages"
  ON public.labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_pages wp
      JOIN public.year_wheels yw ON yw.id = wp.wheel_id
      WHERE wp.id = labels.page_id 
      AND (yw.user_id = auth.uid() OR yw.is_public = TRUE)
    )
  );

CREATE POLICY "Users can manage labels of own pages"
  ON public.labels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_pages wp
      JOIN public.year_wheels yw ON yw.id = wp.wheel_id
      WHERE wp.id = labels.page_id 
      AND yw.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wheel_pages wp
      JOIN public.year_wheels yw ON yw.id = wp.wheel_id
      WHERE wp.id = labels.page_id 
      AND yw.user_id = auth.uid()
    )
  );

-- =============================================
-- NOTES
-- =============================================
-- After this migration:
-- 1. Update App.jsx to query by page_id instead of wheel_id ✅ DONE
-- 2. Update wheelService.js syncRings/syncActivityGroups/syncLabels to use page_id ✅ DONE
-- 3. Update ai-assistant/index.ts to insert with page_id ✅ DONE
-- 4. RLS policies updated to check through page_id → wheel_pages → year_wheels ✅ DONE
-- 5. Test that rings/groups created on page 2025 don't appear on page 2026
