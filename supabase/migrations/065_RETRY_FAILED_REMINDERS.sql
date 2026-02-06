-- Migration: Enable Retry for Failed Reminders
-- Description: Include failed reminders in get_pending_reminders_for_date for automatic retry
-- Author: AI Assistant
-- Date: 2026-02-06
-- Issue: Failed reminders (e.g., due to rate limits) are never retried

-- ============================================================================
-- UPDATE FUNCTION TO INCLUDE FAILED REMINDERS FOR RETRY
-- ============================================================================

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
  WHERE ar.scheduled_date <= p_date
    AND ar.status IN ('pending', 'failed') -- Include failed for retry
  ORDER BY ar.scheduled_date ASC; -- Send oldest first
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pending_reminders_for_date IS 'Fetches pending and failed reminders up to specified date for sending/retry. Failed reminders are automatically retried.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
