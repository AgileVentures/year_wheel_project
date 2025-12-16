-- Monday.com Users Table
-- Stores user data from Monday.com app installations
CREATE TABLE IF NOT EXISTS monday_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to main user_profile (if they also have a YearWheel account)
    user_profile_id UUID REFERENCES user_profile(id) ON DELETE SET NULL,
    
    -- Monday.com identifiers
    monday_user_id BIGINT UNIQUE NOT NULL,
    monday_account_id BIGINT NOT NULL,
    monday_account_name TEXT,
    monday_account_slug TEXT,
    
    -- User data from Monday.com
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    country_code TEXT,
    user_cluster TEXT, -- e.g., "us1", "eu1"
    account_tier TEXT, -- e.g., "free", "basic", "standard", "pro", "enterprise"
    
    -- Subscription info
    current_plan TEXT DEFAULT 'free', -- 'free', 'pro-monthly', 'pro-annual'
    subscription_status TEXT, -- 'active', 'trial', 'cancelling', 'cancelled', 'trial_ended', 'payment_failed', 'payment_retry', 'uninstalled'
    is_trial BOOLEAN DEFAULT false,
    trial_ends_at TIMESTAMPTZ,
    renewal_date TIMESTAMPTZ,
    billing_period TEXT, -- 'monthly', 'annual'
    
    -- Usage tracking
    boards_used INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    uninstalled_at TIMESTAMPTZ
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_monday_users_monday_user_id ON monday_users(monday_user_id);
CREATE INDEX IF NOT EXISTS idx_monday_users_email ON monday_users(email);
CREATE INDEX IF NOT EXISTS idx_monday_users_account_id ON monday_users(monday_account_id);
CREATE INDEX IF NOT EXISTS idx_monday_users_subscription_status ON monday_users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_monday_users_current_plan ON monday_users(current_plan);

-- Monday.com Subscription Events Table
-- Tracks all webhook events for analytics and debugging
CREATE TABLE IF NOT EXISTS monday_subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monday_user_id UUID REFERENCES monday_users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'install', 'subscription_created', 'subscription_cancelled', etc.
    plan_id TEXT,
    event_data JSONB, -- Store full webhook payload
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for event lookups
CREATE INDEX IF NOT EXISTS idx_monday_events_user_id ON monday_subscription_events(monday_user_id);
CREATE INDEX IF NOT EXISTS idx_monday_events_type ON monday_subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_monday_events_created_at ON monday_subscription_events(created_at);

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monday_users_updated_at
    BEFORE UPDATE ON monday_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE monday_users IS 'Users who have installed the YearWheel Monday.com app';
COMMENT ON TABLE monday_subscription_events IS 'Webhook events from Monday.com for subscription tracking';

COMMENT ON COLUMN monday_users.monday_user_id IS 'Unique user ID from Monday.com';
COMMENT ON COLUMN monday_users.subscription_status IS 'Current subscription status: active, trial, cancelling, cancelled, trial_ended, payment_failed, payment_retry, uninstalled';
COMMENT ON COLUMN monday_users.current_plan IS 'Current pricing plan: free, pro-monthly, pro-annual';
COMMENT ON COLUMN monday_users.is_trial IS 'Whether user is currently in trial period';
COMMENT ON COLUMN monday_subscription_events.event_data IS 'Full webhook payload from Monday.com';
