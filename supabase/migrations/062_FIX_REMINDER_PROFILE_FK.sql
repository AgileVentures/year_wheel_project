-- Migration: Fix Activity Reminders FK to Profiles
-- Description: Add proper FK from activity_reminders to profiles table
-- Author: AI Assistant
-- Date: 2026-02-06
-- Issue: PostgREST error - FK hint 'activity_reminders_recipient_user_id_fkey' not found

-- ============================================================================
-- PROBLEM
-- ============================================================================
-- activity_reminders.recipient_user_id and created_by reference auth.users(id)
-- But reminderService.js tries to join with profiles using FK hint
-- PostgREST can't find the FK relationship → PGRST200 error

-- ============================================================================
-- SOLUTION
-- ============================================================================

-- Step 1: Drop existing FKs to auth.users
ALTER TABLE activity_reminders
  DROP CONSTRAINT IF EXISTS activity_reminders_recipient_user_id_fkey;

ALTER TABLE activity_reminders
  DROP CONSTRAINT IF EXISTS activity_reminders_created_by_fkey;

-- Step 2: Add FKs to profiles instead (profiles.id = auth.users.id via trigger)
DO $$ 
BEGIN
  -- Add recipient_user_id FK if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'activity_reminders_recipient_user_id_fkey'
    AND conrelid = 'activity_reminders'::regclass
  ) THEN
    ALTER TABLE activity_reminders
      ADD CONSTRAINT activity_reminders_recipient_user_id_fkey
      FOREIGN KEY (recipient_user_id) 
      REFERENCES profiles(id) 
      ON DELETE CASCADE;
  END IF;
  
  -- Add created_by FK if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'activity_reminders_created_by_fkey'
    AND conrelid = 'activity_reminders'::regclass
  ) THEN
    ALTER TABLE activity_reminders
      ADD CONSTRAINT activity_reminders_created_by_fkey
      FOREIGN KEY (created_by) 
      REFERENCES profiles(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Verify the constraint exists
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'activity_reminders'
  AND kcu.column_name = 'recipient_user_id';
