-- Migration: Add Wheel Comments Table
-- Description: Adds support for general wheel-level comments (not tied to specific items)
-- Author: AI Assistant
-- Date: 2025-10-26

-- ============================================================================
-- 1. CREATE WHEEL COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wheel_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wheel_id UUID NOT NULL REFERENCES year_wheels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES wheel_comments(id) ON DELETE CASCADE, -- for threading
  
  -- Mention tracking (stores UUIDs of mentioned users)
  mentioned_users UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- Indexes for performance
CREATE INDEX idx_wheel_comments_wheel_id ON wheel_comments(wheel_id);
CREATE INDEX idx_wheel_comments_user_id ON wheel_comments(user_id);
CREATE INDEX idx_wheel_comments_parent_comment_id ON wheel_comments(parent_comment_id);
CREATE INDEX idx_wheel_comments_mentioned_users ON wheel_comments USING GIN(mentioned_users);
CREATE INDEX idx_wheel_comments_created_at ON wheel_comments(created_at DESC);
CREATE INDEX idx_wheel_comments_deleted_at ON wheel_comments(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE wheel_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

-- Users can view comments on wheels they have access to
CREATE POLICY "Users can view comments on accessible wheels"
  ON wheel_comments FOR SELECT
  USING (
    deleted_at IS NULL AND (
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
      -- Public wheel
      wheel_id IN (SELECT id FROM year_wheels WHERE is_public = true)
    )
  );

-- Team members can create comments
CREATE POLICY "Team members can create wheel comments"
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
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own wheel comments"
  ON wheel_comments FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Users can soft-delete their own comments
CREATE POLICY "Users can soft-delete their own wheel comments"
  ON wheel_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 3. TRIGGER FOR MENTION NOTIFICATIONS (WHEEL COMMENTS)
-- ============================================================================

-- Trigger function to create notifications when users are mentioned in wheel comments
CREATE OR REPLACE FUNCTION notify_mentioned_users_wheel_comments()
RETURNS TRIGGER AS $$
DECLARE
  v_mentioned_user UUID;
  v_wheel_title TEXT;
  v_commenter_name TEXT;
BEGIN
  -- Get wheel title
  SELECT title INTO v_wheel_title
  FROM year_wheels
  WHERE id = NEW.wheel_id;
  
  -- Get commenter name
  SELECT COALESCE(p.full_name, p.email) INTO v_commenter_name
  FROM profiles p
  WHERE p.id = NEW.user_id;
  
  -- Create notification for each mentioned user
  FOREACH v_mentioned_user IN ARRAY NEW.mentioned_users
  LOOP
    -- Don't notify the commenter themselves
    IF v_mentioned_user != NEW.user_id THEN
      PERFORM create_notification(
        v_mentioned_user,
        'mention',
        v_commenter_name || ' mentioned you in "' || v_wheel_title || '"',
        LEFT(NEW.content, 200),
        NEW.wheel_id,
        NULL, -- no item_id for wheel comments
        NEW.id, -- comment_id
        NEW.user_id,
        '/wheel/' || NEW.wheel_id::TEXT || '?tab=comments'
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to wheel_comments table
CREATE TRIGGER trigger_notify_mentioned_users_wheel_comments
  AFTER INSERT ON wheel_comments
  FOR EACH ROW
  WHEN (NEW.mentioned_users IS NOT NULL AND array_length(NEW.mentioned_users, 1) > 0)
  EXECUTE FUNCTION notify_mentioned_users_wheel_comments();

-- ============================================================================
-- 4. HELPER FUNCTION FOR SOFT-DELETING WHEEL COMMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION soft_delete_wheel_comment(p_comment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE wheel_comments
  SET deleted_at = NOW()
  WHERE id = p_comment_id AND user_id = auth.uid() AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE wheel_comments;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON wheel_comments TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_wheel_comment TO authenticated;
GRANT EXECUTE ON FUNCTION notify_mentioned_users_wheel_comments TO authenticated;
