-- Newsletter aggregate columns are a cache of webhook events. Keep the cache
-- correct even when Resend retries a webhook or two deliveries arrive together.

WITH duplicate_events AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY email_id, event_type
      ORDER BY created_at, id
    ) AS row_number
  FROM newsletter_events
  WHERE event_type IN ('sent', 'delivered', 'opened', 'bounced', 'complained')
)
DELETE FROM newsletter_events
WHERE id IN (
  SELECT id
  FROM duplicate_events
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_events_one_per_email_and_type_idx
  ON newsletter_events (email_id, event_type)
  WHERE event_type IN ('sent', 'delivered', 'opened', 'bounced', 'complained');

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
      SELECT COUNT(*)
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

CREATE OR REPLACE FUNCTION increment_newsletter_delivered(send_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM refresh_newsletter_counts(send_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_newsletter_opened(send_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM refresh_newsletter_counts(send_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_newsletter_clicked(send_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM refresh_newsletter_counts(send_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_newsletter_failed(send_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM refresh_newsletter_counts(send_id);
END;
$$ LANGUAGE plpgsql;

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