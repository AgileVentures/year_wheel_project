-- =====================================================
-- ADD SHOW_ON_LANDING COLUMN TO YEAR_WHEELS
-- Allows admins to control which templates appear on landing page
-- =====================================================

-- 1. Add show_on_landing column to year_wheels table
ALTER TABLE public.year_wheels
ADD COLUMN IF NOT EXISTS show_on_landing BOOLEAN DEFAULT false;

-- 2. Add index for efficient landing page queries
CREATE INDEX IF NOT EXISTS idx_year_wheels_show_on_landing 
ON public.year_wheels (show_on_landing) 
WHERE show_on_landing = TRUE;

-- 3. Add comment for documentation
COMMENT ON COLUMN year_wheels.show_on_landing IS 'Controls whether template wheel is displayed on landing page. Only applies to templates (is_template = true).';

-- 4. Drop existing function before recreating with new signature
DROP FUNCTION IF EXISTS public.get_template_wheels();

-- Update get_template_wheels function to include show_on_landing
CREATE FUNCTION public.get_template_wheels()
RETURNS TABLE (
  id UUID,
  title TEXT,
  year INTEGER,
  colors JSONB,
  is_public BOOLEAN,
  is_template BOOLEAN,
  show_on_landing BOOLEAN,
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
    yw.show_on_landing,
    yw.created_at,
    yw.updated_at
  FROM public.year_wheels yw
  WHERE yw.is_template = TRUE
  ORDER BY yw.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to fetch landing page templates (for public display)
CREATE OR REPLACE FUNCTION public.get_landing_page_templates()
RETURNS TABLE (
  id UUID,
  title TEXT,
  year INTEGER,
  colors JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    yw.id,
    yw.title,
    yw.year,
    yw.colors,
    yw.created_at
  FROM public.year_wheels yw
  WHERE yw.is_template = TRUE 
    AND yw.show_on_landing = TRUE
  ORDER BY yw.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.get_template_wheels() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_landing_page_templates() TO authenticated, anon;

-- 7. Update check_template_permission to also check show_on_landing
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
  
  -- If not admin and trying to set show_on_landing, reject
  IF NEW.show_on_landing != COALESCE(OLD.show_on_landing, false) THEN
    RAISE EXCEPTION 'Only admins can control landing page visibility';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'year_wheels'
AND column_name = 'show_on_landing';

-- Verify index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'year_wheels'
AND indexname = 'idx_year_wheels_show_on_landing';

SELECT '✓ Show on landing page feature added successfully!' as status;
