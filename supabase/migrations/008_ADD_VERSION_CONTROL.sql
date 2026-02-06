-- =============================================
-- ADD VERSION CONTROL FEATURE
-- =============================================
-- This migration adds version history/snapshots for wheels

-- Step 1: Create wheel_versions table
CREATE TABLE IF NOT EXISTS public.wheel_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wheel_id UUID NOT NULL REFERENCES public.year_wheels(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_description TEXT,
  is_auto_save BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT unique_wheel_version UNIQUE(wheel_id, version_number),
  CONSTRAINT positive_version CHECK (version_number > 0)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wheel_versions_wheel_id 
  ON public.wheel_versions(wheel_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_wheel_versions_created_at 
  ON public.wheel_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wheel_versions_created_by 
  ON public.wheel_versions(created_by);

-- Step 3: Enable realtime for version updates (optional but nice for collaboration)
ALTER PUBLICATION supabase_realtime ADD TABLE public.wheel_versions;

-- Step 4: RLS Policies for wheel_versions

-- Enable RLS
ALTER TABLE public.wheel_versions ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view versions of wheels they have access to
CREATE POLICY "Users can view versions of accessible wheels"
  ON public.wheel_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_versions.wheel_id
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

-- INSERT: Users can create versions for wheels they own or are team members of
CREATE POLICY "Users can create versions for their wheels"
  ON public.wheel_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_versions.wheel_id
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

-- DELETE: Users can delete versions of their own wheels
CREATE POLICY "Users can delete versions of their wheels"
  ON public.wheel_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = wheel_versions.wheel_id
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

-- Step 5: Create function to auto-increment version numbers
CREATE OR REPLACE FUNCTION public.get_next_version_number(p_wheel_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.wheel_versions
  WHERE wheel_id = p_wheel_id;
  
  RETURN v_next_version;
END;
$$;

-- Step 6: Create function to cleanup old versions (keep last 100)
CREATE OR REPLACE FUNCTION public.cleanup_old_versions(p_wheel_id UUID, p_keep_count INTEGER DEFAULT 100)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH versions_to_delete AS (
    SELECT id
    FROM public.wheel_versions
    WHERE wheel_id = p_wheel_id
    ORDER BY version_number DESC
    OFFSET p_keep_count
  )
  DELETE FROM public.wheel_versions
  WHERE id IN (SELECT id FROM versions_to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN COALESCE(v_deleted_count, 0);
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
AND table_name = 'wheel_versions'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'wheel_versions';

-- Check policies
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'wheel_versions'
ORDER BY cmd, policyname;

-- Check functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%version%';

-- =============================================
-- SUCCESS!
-- =============================================
-- ✅ wheel_versions table created
-- ✅ Indexes added for performance
-- ✅ RLS policies configured
-- ✅ Helper functions created
-- ✅ Ready to track version history!
