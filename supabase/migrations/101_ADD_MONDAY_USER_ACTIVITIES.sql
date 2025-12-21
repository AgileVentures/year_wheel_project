-- Migration 101: Monday.com User Activity Tracking
-- Adds granular activity logging for Monday.com users within YearWheel

-- Create monday_user_activities table
CREATE TABLE IF NOT EXISTS monday_user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to monday_users table
    monday_user_id UUID NOT NULL REFERENCES monday_users(id) ON DELETE CASCADE,
    
    -- Activity information
    activity_type TEXT NOT NULL,
    board_id TEXT,
    item_id TEXT,
    wheel_id UUID,
    metadata JSONB,
    
    -- Request tracking for security/analytics
    ip_address TEXT,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monday_activities_user_id ON monday_user_activities(monday_user_id);
CREATE INDEX IF NOT EXISTS idx_monday_activities_type ON monday_user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_monday_activities_created_at ON monday_user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_monday_activities_wheel_id ON monday_user_activities(wheel_id);

-- Add table and column comments for documentation
COMMENT ON TABLE monday_user_activities IS 'Granular activity log for Monday.com users within YearWheel';
COMMENT ON COLUMN monday_user_activities.activity_type IS 'Type of activity: board_viewed, wheel_created, wheel_updated, wheel_deleted, export_pdf, export_png, export_svg, share_wheel, etc.';
COMMENT ON COLUMN monday_user_activities.metadata IS 'Additional context stored as JSONB: export format, share recipients, filter criteria, etc.';
