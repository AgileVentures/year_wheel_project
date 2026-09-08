-- Count newsletter clickers once per recipient, matching the delivered/opened metrics.
CREATE OR REPLACE FUNCTION refresh_newsletter_counts(target_send_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE newsletter_sends
  SET
    delivered_count = (
      SELECT COUNT(DISTINCT email_id)
      FROM newsletter_events
      WHERE newsletter_send_id = target_send_id
        AND event_type = 'delivered'
    ),
    opened_count = (
      SELECT COUNT(DISTINCT email_id)
      FROM newsletter_events
      WHERE newsletter_send_id = target_send_id
        AND event_type = 'opened'
    ),
    clicked_count = (
      SELECT COUNT(DISTINCT email_id)
      FROM newsletter_events
      WHERE newsletter_send_id = target_send_id
        AND event_type = 'clicked'
    ),
    failed_count = (
      SELECT COUNT(DISTINCT email_id)
      FROM newsletter_events
      WHERE newsletter_send_id = target_send_id
        AND event_type IN ('bounced', 'complained')
    )
  WHERE id = target_send_id;
END;
$$ LANGUAGE plpgsql;

-- Recalculate existing sends using the corrected unique-recipient definition.
DO $$
DECLARE
  newsletter_send_id UUID;
BEGIN
  FOR newsletter_send_id IN
    SELECT id FROM newsletter_sends WHERE is_draft = false
  LOOP
    PERFORM refresh_newsletter_counts(newsletter_send_id);
  END LOOP;
END;
$$;