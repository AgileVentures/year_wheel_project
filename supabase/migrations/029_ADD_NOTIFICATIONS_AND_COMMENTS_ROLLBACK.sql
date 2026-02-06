-- Rollback Migration: Remove Notifications and Comments System
-- Description: Reverts the notifications and comments tables and related functions
-- Author: AI Assistant
-- Date: 2025-10-26

-- ============================================================================
-- 1. DISABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS item_comments;

-- ============================================================================
-- 2. DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_notify_mentioned_users ON item_comments;

-- ============================================================================
-- 3. DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS notify_mentioned_users();
DROP FUNCTION IF EXISTS soft_delete_comment(UUID);
DROP FUNCTION IF EXISTS get_unread_notification_count();
DROP FUNCTION IF EXISTS mark_all_notifications_read();
DROP FUNCTION IF EXISTS mark_notification_read(UUID);
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT);

-- ============================================================================
-- 4. DROP FOREIGN KEY CONSTRAINT
-- ============================================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_comment_id_fkey;

-- ============================================================================
-- 5. DROP TABLES
-- ============================================================================

DROP TABLE IF EXISTS item_comments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- ============================================================================
-- 6. REMOVE MIGRATION RECORD
-- ============================================================================

DELETE FROM _migrations WHERE name = '023_ADD_NOTIFICATIONS_AND_COMMENTS';
