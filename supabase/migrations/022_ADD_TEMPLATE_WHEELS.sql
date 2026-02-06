-- =====================================================
-- TEMPLATE WHEELS FEATURE
-- Add is_template column to year_wheels table
-- Templates can be marked by admins and displayed on landing page
-- =====================================================

-- 1. Add is_template column to year_wheels table
ALTER TABLE public.year_wheels
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- 2. Add index for efficient template queries
CREATE INDEX IF NOT EXISTS idx_year_wheels_is_template 
ON public.year_wheels (is_template) 
WHERE is_template = TRUE;

-- 3. Add comment for documentation
COMMENT ON COLUMN year_wheels.is_template IS 'Marks wheel as a template that can be displayed on landing page. Only admins can set this flag.';

-- 4. Update RLS policies to allow public read access to templates
-- Drop and recreate the SELECT policy to include templates
DROP POLICY IF EXISTS "Users can read their own wheels and public/team wheels" ON public.year_wheels;

CREATE POLICY "Users can read their own wheels and public/team wheels"
  ON public.year_wheels
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_public = TRUE
    OR is_template = TRUE
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = year_wheels.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- 5. Create function to check if user can set template status (admin only)
CREATE OR REPLACE FUNCTION public.can_set_template(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_admin(user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to fetch all template wheels (for landing page)
CREATE OR REPLACE FUNCTION public.get_template_wheels()
RETURNS TABLE (
  id UUID,
  title TEXT,
  year INTEGER,
  colors JSONB,
  is_public BOOLEAN,
  is_template BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    yw.id,
    yw.title,
    yw.year,
    yw.colors,
    yw.is_public,
    yw.is_template,
    yw.created_at,
    yw.updated_at
  FROM public.year_wheels yw
  WHERE yw.is_template = TRUE
  ORDER BY yw.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permission on new functions
GRANT EXECUTE ON FUNCTION public.can_set_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_template_wheels() TO authenticated, anon;

-- 8. Create trigger to ensure only admins can set is_template
CREATE OR REPLACE FUNCTION public.check_template_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if user is admin
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- If not admin and trying to set is_template = true, reject
  IF NEW.is_template = TRUE AND (OLD.is_template IS NULL OR OLD.is_template = FALSE) THEN
    RAISE EXCEPTION 'Only admins can mark wheels as templates';
  END IF;
  
  -- If not admin and trying to change is_template from true to false, reject
  IF OLD.is_template = TRUE AND NEW.is_template = FALSE THEN
    RAISE EXCEPTION 'Only admins can unmark template wheels';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_template_permission_trigger ON public.year_wheels;
CREATE TRIGGER check_template_permission_trigger
  BEFORE UPDATE ON public.year_wheels
  FOR EACH ROW
  EXECUTE FUNCTION public.check_template_permission();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'year_wheels'
AND column_name = 'is_template';

-- Verify index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'year_wheels'
AND indexname = 'idx_year_wheels_is_template';

SELECT '✓ Template wheels feature added successfully!' as status;
