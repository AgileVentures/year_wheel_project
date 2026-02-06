-- Migration: Fix Notification Comment FK Constraint
-- Description: Remove strict FK constraint that breaks wheel comment notifications
-- Author: AI Assistant
-- Date: 2026-02-06
-- Issue: 409 error when creating comments - notifications.comment_id FK only references item_comments, not wheel_comments

-- ============================================================================
-- PROBLEM ANALYSIS
-- ============================================================================
-- Current state:
-- - notifications.comment_id has FK to item_comments(id)
-- - notify_mentioned_users_wheel_comments() tries to insert wheel_comments.id
-- - This violates FK constraint → 409 Conflict error
--
-- Solution:
-- - Drop the strict FK constraint
-- - Keep comment_id as nullable UUID (polymorphic reference)
-- - Cleanup will happen via ON DELETE CASCADE on comment tables themselves
-- ============================================================================

-- Drop the problematic FK constraint
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_comment_id_fkey;

-- Add CHECK constraint to ensure comment_id is only set for 'mention' or 'comment' types
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_comment_id_check'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_comment_id_check
      CHECK (
        (comment_id IS NULL) OR 
        (type IN ('mention', 'comment'))
      );
  END IF;
END $$;

-- Verify the fix
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND conname LIKE '%comment%';
