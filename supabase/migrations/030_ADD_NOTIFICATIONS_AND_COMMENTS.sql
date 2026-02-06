-- Migration: Add Notifications and Comments System
-- Description: Implements @mention functionality with notifications and threaded comments
-- Author: AI Assistant
-- Date: 2025-10-26

-- ============================================================================
-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL CHECK (type IN ('mention', 'assignment', 'comment', 'wheel_share', 'team_invite', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  
  -- Context linking (optional - depends on notification type)
  wheel_id UUID REFERENCES year_wheels(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  comment_id UUID, -- Forward reference, will add FK constraint after table creation
  
  -- Metadata
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Action link for deep navigation
  action_url TEXT
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_wheel_id ON notifications(wheel_id);
CREATE INDEX idx_notifications_item_id ON notifications(item_id);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Will be created by backend services

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. CREATE ITEM COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS item_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  wheel_id UUID NOT NULL REFERENCES year_wheels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES item_comments(id) ON DELETE CASCADE, -- for threading
  
  -- Mention tracking (stores UUIDs of mentioned users)
  mentioned_users UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- Indexes for performance
CREATE INDEX idx_item_comments_item_id ON item_comments(item_id);
CREATE INDEX idx_item_comments_wheel_id ON item_comments(wheel_id);
CREATE INDEX idx_item_comments_user_id ON item_comments(user_id);
CREATE INDEX idx_item_comments_parent_comment_id ON item_comments(parent_comment_id);
CREATE INDEX idx_item_comments_mentioned_users ON item_comments USING GIN(mentioned_users);
CREATE INDEX idx_item_comments_created_at ON item_comments(created_at DESC);
CREATE INDEX idx_item_comments_deleted_at ON item_comments(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE item_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Users can view comments on wheels they have access to"
  ON item_comments FOR SELECT
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

CREATE POLICY "Team members can create comments"
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
    )
  );

CREATE POLICY "Users can update their own comments"
  ON item_comments FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can soft-delete their own comments"
  ON item_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add foreign key constraint for notifications.comment_id now that item_comments exists
ALTER TABLE notifications
  ADD CONSTRAINT notifications_comment_id_fkey 
  FOREIGN KEY (comment_id) REFERENCES item_comments(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_wheel_id UUID DEFAULT NULL,
  p_item_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_triggered_by UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    wheel_id,
    item_id,
    comment_id,
    triggered_by,
    action_url
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_wheel_id,
    p_item_id,
    p_comment_id,
    p_triggered_by,
    p_action_url
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = auth.uid() AND read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft-delete a comment
CREATE OR REPLACE FUNCTION soft_delete_comment(p_comment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE item_comments
  SET deleted_at = NOW()
  WHERE id = p_comment_id AND user_id = auth.uid() AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CREATE TRIGGER FOR MENTION NOTIFICATIONS
-- ============================================================================

-- Trigger function to create notifications when users are mentioned in comments
CREATE OR REPLACE FUNCTION notify_mentioned_users()
RETURNS TRIGGER AS $$
DECLARE
  v_mentioned_user UUID;
  v_item_name TEXT;
  v_wheel_id UUID;
  v_commenter_name TEXT;
BEGIN
  -- Get item and wheel info
  SELECT i.name, i.wheel_id INTO v_item_name, v_wheel_id
  FROM items i
  WHERE i.id = NEW.item_id;
  
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
        v_commenter_name || ' mentioned you in "' || v_item_name || '"',
        LEFT(NEW.content, 200),
        v_wheel_id,
        NEW.item_id,
        NEW.id,
        NEW.user_id,
        '/wheels/' || v_wheel_id::TEXT || '?item=' || NEW.item_id::TEXT
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to item_comments table
CREATE TRIGGER trigger_notify_mentioned_users
  AFTER INSERT ON item_comments
  FOR EACH ROW
  WHEN (NEW.mentioned_users IS NOT NULL AND array_length(NEW.mentioned_users, 1) > 0)
  EXECUTE FUNCTION notify_mentioned_users();

-- ============================================================================
-- 5. ENABLE REALTIME FOR NOTIFICATIONS
-- ============================================================================

-- Enable realtime publication for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE item_comments;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON item_comments TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_comment TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add migration record
INSERT INTO _migrations (name, executed_at)
VALUES ('023_ADD_NOTIFICATIONS_AND_COMMENTS', NOW())
ON CONFLICT (name) DO NOTHING;
