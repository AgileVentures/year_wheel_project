-- Apply Team Invite Email Tracking Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/sql/new

-- Add email tracking columns to team_invitations table
ALTER TABLE team_invitations 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resend_email_id TEXT;

-- Add index for querying by email sent status
CREATE INDEX IF NOT EXISTS idx_team_invitations_email_sent 
ON team_invitations(email_sent_at) 
WHERE email_sent_at IS NOT NULL;

COMMENT ON COLUMN team_invitations.email_sent_at IS 'Timestamp when the invitation email was sent via Resend';
COMMENT ON COLUMN team_invitations.resend_email_id IS 'Resend API email ID for tracking delivery status';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'team_invitations' 
  AND column_name IN ('email_sent_at', 'resend_email_id')
ORDER BY column_name;
