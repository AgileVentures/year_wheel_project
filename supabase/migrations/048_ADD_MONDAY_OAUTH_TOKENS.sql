-- Add OAuth token storage to monday_users table
ALTER TABLE monday_users ADD COLUMN IF NOT EXISTS monday_access_token TEXT;
ALTER TABLE monday_users ADD COLUMN IF NOT EXISTS monday_refresh_token TEXT;
ALTER TABLE monday_users ADD COLUMN IF NOT EXISTS monday_token_expires_at TIMESTAMPTZ;

-- Add index for profile_id lookups
CREATE INDEX IF NOT EXISTS idx_monday_users_profile_id ON monday_users(profile_id);
