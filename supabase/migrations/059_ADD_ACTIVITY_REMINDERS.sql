-- Migration: Add Activity Reminder System
-- Description: Email reminders for activities with status tracking and recurring support
-- Author: AI Assistant
-- Date: 2026-02-06

-- ============================================================================
-- 1. ADD STATUS FIELD TO ITEMS
-- ============================================================================

-- Add status column to track activity lifecycle
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned' 
CHECK (status IN ('planned', 'not_started', 'started', 'in_progress', 'done'));

CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);

COMMENT ON COLUMN items.status IS 'Activity lifecycle status: planned, not_started, started, in_progress, done';

-- ============================================================================
-- 2. CREATE ACTIVITY REMINDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign keys
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  wheel_id UUID NOT NULL REFERENCES year_wheels(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Reminder configuration
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('before_start', 'after_start', 'after_completion')),
  days_offset INTEGER NOT NULL CHECK (days_offset >= 0),
  
  -- Recipients
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('team', 'user')),
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL for team
  
  -- Email content
  custom_message TEXT, -- Optional custom message to include
  
  -- Execution tracking
  scheduled_date DATE NOT NULL, -- Calculated date when reminder should fire
  sent_at TIMESTAMPTZ, -- NULL = pending, set when sent
  email_id TEXT, -- Resend email ID
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  
  -- Recurring support
  applies_to_all_occurrences BOOLEAN DEFAULT false,
  parent_reminder_id UUID REFERENCES activity_reminders(id) ON DELETE SET NULL, -- Link to parent for recurring
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_activity_reminders_item_id ON activity_reminders(item_id);
CREATE INDEX idx_activity_reminders_wheel_id ON activity_reminders(wheel_id);
CREATE INDEX idx_activity_reminders_scheduled_date ON activity_reminders(scheduled_date) WHERE status = 'pending';
CREATE INDEX idx_activity_reminders_status ON activity_reminders(status);
CREATE INDEX idx_activity_reminders_recipient_user ON activity_reminders(recipient_user_id) WHERE recipient_user_id IS NOT NULL;

-- ============================================================================
-- 3. RLS POLICIES FOR ACTIVITY REMINDERS
-- ============================================================================

ALTER TABLE activity_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view reminders on wheels they have access to
CREATE POLICY "Users can view reminders on accessible wheels"
  ON activity_reminders FOR SELECT
  USING (
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
    OR
    -- Public wheel
    wheel_id IN (SELECT id FROM year_wheels WHERE is_public = true)
  );

-- Team members can create reminders
CREATE POLICY "Team members can create reminders"
  ON activity_reminders FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND (
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

-- Users can update their own reminders
CREATE POLICY "Users can update their own reminders"
  ON activity_reminders FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own reminders
CREATE POLICY "Users can delete their own reminders"
  ON activity_reminders FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate scheduled date for a reminder
CREATE OR REPLACE FUNCTION calculate_reminder_date(
  p_item_id UUID,
  p_reminder_type TEXT,
  p_days_offset INTEGER
) RETURNS DATE AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_scheduled_date DATE;
BEGIN
  -- Get item dates
  SELECT start_date::DATE, end_date::DATE
  INTO v_start_date, v_end_date
  FROM items
  WHERE id = p_item_id;

  -- Calculate scheduled date based on type
  IF p_reminder_type = 'before_start' THEN
    v_scheduled_date := v_start_date - p_days_offset;
  ELSIF p_reminder_type = 'after_start' THEN
    v_scheduled_date := v_start_date + p_days_offset;
  ELSIF p_reminder_type = 'after_completion' THEN
    v_scheduled_date := v_end_date + p_days_offset;
  END IF;

  RETURN v_scheduled_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending reminders for today
CREATE OR REPLACE FUNCTION get_pending_reminders_for_date(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  reminder_id UUID,
  item_id UUID,
  item_name TEXT,
  wheel_id UUID,
  wheel_title TEXT,
  reminder_type TEXT,
  days_offset INTEGER,
  recipient_type TEXT,
  recipient_user_id UUID,
  recipient_email TEXT,
  recipient_name TEXT,
  custom_message TEXT,
  item_start_date DATE,
  item_end_date DATE,
  item_description TEXT,
  item_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id,
    ar.item_id,
    i.name,
    ar.wheel_id,
    yw.title,
    ar.reminder_type,
    ar.days_offset,
    ar.recipient_type,
    ar.recipient_user_id,
    p.email,
    COALESCE(p.full_name, p.email),
    ar.custom_message,
    i.start_date::DATE,
    i.end_date::DATE,
    i.description,
    i.status
  FROM activity_reminders ar
  INNER JOIN items i ON ar.item_id = i.id
  INNER JOIN year_wheels yw ON ar.wheel_id = yw.id
  LEFT JOIN profiles p ON ar.recipient_user_id = p.id
  WHERE ar.scheduled_date = p_date
    AND ar.status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(
  p_reminder_id UUID,
  p_email_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE activity_reminders
  SET 
    status = 'sent',
    sent_at = NOW(),
    email_id = p_email_id,
    updated_at = NOW()
  WHERE id = p_reminder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark reminder as failed
CREATE OR REPLACE FUNCTION mark_reminder_failed(
  p_reminder_id UUID,
  p_error_message TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE activity_reminders
  SET 
    status = 'failed',
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_reminder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. TRIGGER TO AUTO-UPDATE scheduled_date
-- ============================================================================

-- Trigger function to calculate scheduled_date before insert
CREATE OR REPLACE FUNCTION set_reminder_scheduled_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.scheduled_date := calculate_reminder_date(
    NEW.item_id,
    NEW.reminder_type,
    NEW.days_offset
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_reminder_scheduled_date
  BEFORE INSERT ON activity_reminders
  FOR EACH ROW
  EXECUTE FUNCTION set_reminder_scheduled_date();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON activity_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_reminder_date TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_reminders_for_date TO authenticated;
GRANT EXECUTE ON FUNCTION mark_reminder_sent TO authenticated;
GRANT EXECUTE ON FUNCTION mark_reminder_failed TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
