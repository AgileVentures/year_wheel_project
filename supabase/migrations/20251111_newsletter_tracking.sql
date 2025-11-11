-- Add tracking columns to newsletter_sends
ALTER TABLE newsletter_sends 
ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;

-- Create newsletter_events table for detailed tracking
CREATE TABLE IF NOT EXISTS newsletter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_send_id UUID NOT NULL REFERENCES newsletter_sends(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'delivery_delayed', 'complained', 'bounced', 'opened', 'clicked')),
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_events_send_id ON newsletter_events(newsletter_send_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_email_id ON newsletter_events(email_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_type ON newsletter_events(event_type);

-- Functions to increment counts atomically
CREATE OR REPLACE FUNCTION increment_newsletter_delivered(send_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE newsletter_sends 
  SET delivered_count = delivered_count + 1
  WHERE id = send_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_newsletter_opened(send_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE newsletter_sends 
  SET opened_count = opened_count + 1
  WHERE id = send_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_newsletter_clicked(send_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE newsletter_sends 
  SET clicked_count = clicked_count + 1
  WHERE id = send_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_newsletter_failed(send_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE newsletter_sends 
  SET failed_count = failed_count + 1
  WHERE id = send_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE newsletter_events IS 'Individual email delivery events from Resend webhooks';
COMMENT ON COLUMN newsletter_sends.delivered_count IS 'Count of successfully delivered emails';
COMMENT ON COLUMN newsletter_sends.opened_count IS 'Count of email opens (requires tracking pixel)';
COMMENT ON COLUMN newsletter_sends.clicked_count IS 'Count of link clicks in emails';
COMMENT ON COLUMN newsletter_sends.failed_count IS 'Count of bounces and complaints';
