-- Apply newsletter tracking migration manually
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/sql/new

-- Newsletter tracking table (create if not exists)
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'premium', 'free', 'admins', 'custom')),
  subject TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns for template reuse (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_sends' 
    AND column_name = 'template_type'
  ) THEN
    ALTER TABLE newsletter_sends 
    ADD COLUMN template_type TEXT CHECK (template_type IN ('newsletter', 'feature', 'tips', 'announcement'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_sends' 
    AND column_name = 'template_data'
  ) THEN
    ALTER TABLE newsletter_sends 
    ADD COLUMN template_data JSONB;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_sent_by ON newsletter_sends(sent_by);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_sent_at ON newsletter_sends(sent_at DESC);

-- RLS Policies
ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read newsletter history" ON newsletter_sends;
CREATE POLICY "Admin can read newsletter history"
  ON newsletter_sends
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admin can insert newsletter records" ON newsletter_sends;
CREATE POLICY "Admin can insert newsletter records"
  ON newsletter_sends
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admin can delete newsletter records" ON newsletter_sends;
CREATE POLICY "Admin can delete newsletter records"
  ON newsletter_sends
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

COMMENT ON TABLE newsletter_sends IS 'Tracks newsletter sends for admin dashboard analytics';
COMMENT ON COLUMN newsletter_sends.template_data IS 'JSONB storage of template form data for reuse';
