-- Migration: Diagnose Comment RLS Policies
-- Description: Check for duplicate or conflicting policies on comment tables
-- Author: AI Assistant
-- Date: 2026-02-06

-- ============================================================================
-- 1. CHECK ALL ITEM_COMMENTS POLICIES
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 100) AS qual_preview,
  LEFT(with_check::text, 100) AS with_check_preview
FROM pg_policies
WHERE tablename = 'item_comments'
ORDER BY cmd, policyname;

-- ============================================================================
-- 2. CHECK ALL WHEEL_COMMENTS POLICIES
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 100) AS qual_preview,
  LEFT(with_check::text, 100) AS with_check_preview
FROM pg_policies
WHERE tablename = 'wheel_comments'
ORDER BY cmd, policyname;

-- ============================================================================
-- 3. FIX: DROP ALL INSERT POLICIES AND RECREATE
-- ============================================================================

-- Drop ALL existing INSERT policies (in case there are duplicates)
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop all INSERT policies on item_comments
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'item_comments' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON item_comments', pol.policyname);
    RAISE NOTICE 'Dropped policy: % on item_comments', pol.policyname;
  END LOOP;
  
  -- Drop all INSERT policies on wheel_comments
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'wheel_comments' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON wheel_comments', pol.policyname);
    RAISE NOTICE 'Dropped policy: % on wheel_comments', pol.policyname;
  END LOOP;
END $$;

-- Recreate with admin check for ITEM_COMMENTS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'item_comments' 
    AND policyname = 'Team members and admins can create comments'
  ) THEN
    CREATE POLICY "Team members and admins can create comments"
      ON item_comments FOR INSERT
      WITH CHECK (
        user_id = auth.uid() AND (
          -- Wheel owner
          wheel_id IN (SELECT id FROM year_wheels WHERE user_id = auth.uid())
          OR
          -- Team member
          wheel_id IN (
            SELECT yw.id FROM year_wheels yw
            INNER JOIN team_members tm ON yw.team_id = tm.team_id
            WHERE tm.user_id = auth.uid()
          )
          OR
          -- Administrator
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
          )
        )
      );
  END IF;
END $$;

-- Recreate with admin check for WHEEL_COMMENTS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wheel_comments' 
    AND policyname = 'Team members and admins can create wheel comments'
  ) THEN
    CREATE POLICY "Team members and admins can create wheel comments"
      ON wheel_comments FOR INSERT
      WITH CHECK (
        user_id = auth.uid() AND (
          -- Wheel owner
          wheel_id IN (SELECT id FROM year_wheels WHERE user_id = auth.uid())
          OR
          -- Team member
          wheel_id IN (
            SELECT yw.id FROM year_wheels yw
            INNER JOIN team_members tm ON yw.team_id = tm.team_id
            WHERE tm.user_id = auth.uid()
          )
          OR
          -- Administrator
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
          )
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFY FINAL STATE
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('item_comments', 'wheel_comments')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;
