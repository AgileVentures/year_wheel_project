-- Fix historic newsletter delivered counts based on actual webhook events
-- This recalculates delivered_count from newsletter_events table

-- First, let's see what we're working with
COMMENT ON MIGRATION IS 'Recalculate delivered_count from actual newsletter_events for historic newsletters';

-- Update delivered_count to actual count from events
UPDATE newsletter_sends ns
SET delivered_count = (
  SELECT COUNT(*)
  FROM newsletter_events ne
  WHERE ne.newsletter_send_id = ns.id
    AND ne.event_type = 'delivered'
)
WHERE ns.is_draft = false;

-- Also update opened_count to be accurate
UPDATE newsletter_sends ns
SET opened_count = (
  SELECT COUNT(*)
  FROM newsletter_events ne
  WHERE ne.newsletter_send_id = ns.id
    AND ne.event_type = 'opened'
)
WHERE ns.is_draft = false;

-- Update clicked_count to be accurate
UPDATE newsletter_sends ns
SET clicked_count = (
  SELECT COUNT(*)
  FROM newsletter_events ne
  WHERE ne.newsletter_send_id = ns.id
    AND ne.event_type = 'clicked'
)
WHERE ns.is_draft = false;

-- Update failed_count to be accurate (bounced + complained)
UPDATE newsletter_sends ns
SET failed_count = (
  SELECT COUNT(*)
  FROM newsletter_events ne
  WHERE ne.newsletter_send_id = ns.id
    AND ne.event_type IN ('bounced', 'complained')
)
WHERE ns.is_draft = false;

-- Add a comment showing what was fixed
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM newsletter_sends
  WHERE is_draft = false;
  
  RAISE NOTICE 'Recalculated delivery stats for % newsletter sends', fixed_count;
END $$;
