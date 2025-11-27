-- Apply Pending Team Invitations Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/sql/new

-- Support pending team invitations (name without email)
-- Allows Smart Import to create team members that can be completed later

-- Make email nullable and add pending_name column
ALTER TABLE team_invitations 
ALTER COLUMN email DROP NOT NULL,
ADD COLUMN IF NOT EXISTS pending_name TEXT,
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false;

-- Add constraint: either email OR pending_name must be present (only if doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'email_or_pending_name_required'
  ) THEN
    ALTER TABLE team_invitations
    ADD CONSTRAINT email_or_pending_name_required 
    CHECK (
      (email IS NOT NULL) OR (pending_name IS NOT NULL)
    );
  END IF;
END $$;

-- Add index for pending invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_pending 
ON team_invitations(team_id, is_pending) 
WHERE is_pending = true;

-- Comments
COMMENT ON COLUMN team_invitations.pending_name IS 'Name of person when email is not yet known (from Smart Import)';
COMMENT ON COLUMN team_invitations.is_pending IS 'True if invitation is awaiting email address to be added';

-- Update existing records to have is_pending = false
UPDATE team_invitations SET is_pending = false WHERE is_pending IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'team_invitations' 
  AND column_name IN ('email', 'pending_name', 'is_pending')
ORDER BY column_name;
