-- Add RLS policies for monday_users and monday_subscription_events tables
-- This fixes the admin panel access after RLS was enabled

-- Enable RLS on monday_users table if not already enabled
ALTER TABLE monday_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on monday_subscription_events table if not already enabled
ALTER TABLE monday_subscription_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on monday_user_activities table if not already enabled
ALTER TABLE monday_user_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read monday_users" ON monday_users;
DROP POLICY IF EXISTS "Admins can read monday_subscription_events" ON monday_subscription_events;
DROP POLICY IF EXISTS "Admins can read monday_user_activities" ON monday_user_activities;

-- Allow admins to read monday_users table
CREATE POLICY "Admins can read monday_users"
ON monday_users
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
);

-- Allow admins to read monday_subscription_events table
CREATE POLICY "Admins can read monday_subscription_events"
ON monday_subscription_events
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
);

-- Allow admins to read monday_user_activities table
CREATE POLICY "Admins can read monday_user_activities"
ON monday_user_activities
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
);

-- Comments for documentation
COMMENT ON POLICY "Admins can read monday_users" ON monday_users IS 'Allows admin users to view all Monday.com user data in the admin panel';
COMMENT ON POLICY "Admins can read monday_subscription_events" ON monday_subscription_events IS 'Allows admin users to view all Monday.com subscription events';
COMMENT ON POLICY "Admins can read monday_user_activities" ON monday_user_activities IS 'Allows admin users to view all Monday.com user activities';
