-- =============================================
-- ADD MULTI-PAGE WHEEL SYSTEM
-- =============================================
-- This migration adds support for multiple pages per wheel
-- Think: Canva-style pages where each page is a year wheel

-- Step 1: Create wheel_pages table
CREATE TABLE IF NOT EXISTS public.wheel_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wheel_id UUID NOT NULL REFERENCES public.year_wheels(id) ON DELETE CASCADE,
  page_order INTEGER NOT NULL,
  year INTEGER NOT NULL,
  title TEXT,
  
  -- Each page has its own organization data
  organization_data JSONB NOT NULL DEFAULT '{
    "rings": [],
    "activityGroups": [],
    "labels": [],
    "items": []
  }'::jsonb,
  
  -- Optional: Pages can override parent wheel settings
  override_colors JSONB,
  override_show_week_ring BOOLEAN,
  override_show_month_ring BOOLEAN,
  override_show_ring_names BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique ordering per wheel
  CONSTRAINT unique_wheel_page_order UNIQUE(wheel_id, page_order),
  CONSTRAINT positive_page_order CHECK (page_order > 0)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wheel_pages_wheel_id 
  ON public.wheel_pages(wheel_id, page_order);

CREATE INDEX IF NOT EXISTS idx_wheel_pages_year 
  ON public.wheel_pages(year);

-- Step 3: Enable realtime for page updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.wheel_pages;

-- Step 4: RLS Policies for wheel_pages

-- Enable RLS
ALTER TABLE public.wheel_pages ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view pages of wheels they have access to
CREATE POLICY "Users can view pages of accessible wheels"
  ON public.wheel_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_pages.wheel_id
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

-- INSERT: Users can create pages for wheels they own or are team members of
CREATE POLICY "Users can create pages for their wheels"
  ON public.wheel_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_pages.wheel_id
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

-- UPDATE: Users can update pages of their wheels
CREATE POLICY "Users can update pages of their wheels"
  ON public.wheel_pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_pages.wheel_id
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

-- DELETE: Users can delete pages of their wheels
CREATE POLICY "Users can delete pages of their wheels"
  ON public.wheel_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_pages.wheel_id
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

-- Step 5: Helper function to get next page order
CREATE OR REPLACE FUNCTION public.get_next_page_order(p_wheel_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(page_order), 0) + 1
  INTO v_next_order
  FROM public.wheel_pages
  WHERE wheel_id = p_wheel_id;
  
  RETURN v_next_order;
END;
$$;

-- Step 6: Migrate existing wheels to page format
-- Each existing wheel becomes page 1 of itself
DO $$
DECLARE
  wheel_record RECORD;
  v_organization_data JSONB;
  v_rings JSONB;
  v_activity_groups JSONB;
  v_labels JSONB;
  v_items JSONB;
  v_ring_data JSONB;
BEGIN
  -- For each wheel that doesn't have pages yet
  FOR wheel_record IN 
    SELECT id, year, title
    FROM public.year_wheels
    WHERE id NOT IN (SELECT DISTINCT wheel_id FROM public.wheel_pages)
  LOOP
    -- Build organization_data from related tables
    
    -- Fetch rings with their data
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'type', r.type,
        'color', r.color,
        'visible', r.visible,
        'orientation', COALESCE(r.orientation, 'vertical'),
        'data', COALESCE((
          SELECT jsonb_agg(rd.content ORDER BY rd.month_index)
          FROM public.ring_data rd
          WHERE rd.ring_id = r.id
        ), '[]'::jsonb)
      ) ORDER BY r.ring_order
    ), '[]'::jsonb)
    INTO v_rings
    FROM public.wheel_rings r
    WHERE r.wheel_id = wheel_record.id;
    
    -- Fetch activity groups
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ag.id,
        'name', ag.name,
        'color', ag.color,
        'visible', ag.visible
      )
    ), '[]'::jsonb)
    INTO v_activity_groups
    FROM public.activity_groups ag
    WHERE ag.wheel_id = wheel_record.id;
    
    -- Fetch labels
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'name', l.name,
        'color', l.color,
        'visible', l.visible
      )
    ), '[]'::jsonb)
    INTO v_labels
    FROM public.labels l
    WHERE l.wheel_id = wheel_record.id;
    
    -- Fetch items
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'ringId', i.ring_id,
        'activityId', i.activity_id,
        'labelId', i.label_id,
        'name', i.name,
        'startDate', i.start_date,
        'endDate', i.end_date,
        'time', i.time
      )
    ), '[]'::jsonb)
    INTO v_items
    FROM public.items i
    WHERE i.wheel_id = wheel_record.id;
    
    -- Build complete organization_data object
    v_organization_data := jsonb_build_object(
      'rings', v_rings,
      'activityGroups', v_activity_groups,
      'labels', v_labels,
      'items', v_items
    );
    
    -- Create first page with existing data
    INSERT INTO public.wheel_pages (
      wheel_id,
      page_order,
      year,
      title,
      organization_data
    ) VALUES (
      wheel_record.id,
      1,
      wheel_record.year,
      wheel_record.title,
      v_organization_data
    );
    
    RAISE NOTICE 'Migrated wheel % (%) to page format', wheel_record.title, wheel_record.id;
  END LOOP;
  
  RAISE NOTICE 'Migration complete!';
END $$;

-- Step 7: Function to duplicate a page
CREATE OR REPLACE FUNCTION public.duplicate_wheel_page(p_page_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_page_id UUID;
  v_source_page RECORD;
  v_next_order INTEGER;
BEGIN
  -- Get source page data
  SELECT * INTO v_source_page
  FROM public.wheel_pages
  WHERE id = p_page_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found: %', p_page_id;
  END IF;
  
  -- Get next order for this wheel
  SELECT get_next_page_order(v_source_page.wheel_id) INTO v_next_order;
  
  -- Create duplicate
  INSERT INTO public.wheel_pages (
    wheel_id,
    page_order,
    year,
    title,
    organization_data,
    override_colors,
    override_show_week_ring,
    override_show_month_ring,
    override_show_ring_names
  ) VALUES (
    v_source_page.wheel_id,
    v_next_order,
    v_source_page.year + 1, -- Auto-increment year
    v_source_page.title || ' (kopia)',
    v_source_page.organization_data,
    v_source_page.override_colors,
    v_source_page.override_show_week_ring,
    v_source_page.override_show_month_ring,
    v_source_page.override_show_ring_names
  )
  RETURNING id INTO v_new_page_id;
  
  RETURN v_new_page_id;
END;
$$;

-- =============================================
-- VERIFICATION
-- =============================================

-- Check table exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'wheel_pages'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'wheel_pages';

-- Check policies
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'wheel_pages'
ORDER BY cmd, policyname;

-- Check how many wheels were migrated
SELECT 
  COUNT(DISTINCT wheel_id) as wheels_with_pages,
  COUNT(*) as total_pages
FROM public.wheel_pages;

-- Show sample pages
SELECT 
  wp.id,
  wp.wheel_id,
  wp.page_order,
  wp.year,
  wp.title,
  yw.title as wheel_title
FROM public.wheel_pages wp
JOIN public.year_wheels yw ON yw.id = wp.wheel_id
ORDER BY wp.wheel_id, wp.page_order
LIMIT 10;

-- =============================================
-- SUCCESS!
-- =============================================
-- ✅ wheel_pages table created
-- ✅ Indexes added for performance
-- ✅ RLS policies configured
-- ✅ Helper functions created
-- ✅ Existing wheels migrated to page format
-- ✅ Ready for multi-page wheels!
