-- Migration: Fix Comment RLS Policies for Administrators
-- Description: Allows administrators to create comments on any wheel (item and wheel comments)
-- Author: AI Assistant
-- Date: 2026-02-06
-- Issue: Admins viewing team wheels couldn't comment due to RLS policy restrictions

-- ============================================================================
-- 1. FIX ITEM_COMMENTS INSERT POLICY
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Team members can create comments" ON item_comments;

-- Recreate with admin check
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

-- ============================================================================
-- 2. FIX WHEEL_COMMENTS INSERT POLICY
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Team members can create wheel comments" ON wheel_comments;

-- Recreate with admin check
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

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('item_comments', 'wheel_comments')
ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add migration record
INSERT INTO _migrations (name, executed_at)
VALUES ('027_FIX_COMMENT_RLS_FOR_ADMINS', NOW())
ON CONFLICT (name) DO NOTHING;
