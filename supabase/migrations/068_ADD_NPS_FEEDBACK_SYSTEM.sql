-- Migration 068: NPS Feedback System
-- Adds Net Promoter Score (NPS) feedback collection for active users

-- Create nps_responses table
CREATE TABLE IF NOT EXISTS public.nps_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score >= 0 AND score <= 10),
    comment TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add tracking columns to profiles table for NPS modal display logic
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_nps_shown_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_nps_submitted_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nps_responses_user_id ON public.nps_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_created_at ON public.nps_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nps_responses_score ON public.nps_responses(score);
CREATE INDEX IF NOT EXISTS idx_profiles_last_nps_shown ON public.profiles(last_nps_shown_at);
CREATE INDEX IF NOT EXISTS idx_profiles_last_nps_submitted ON public.profiles(last_nps_submitted_at);

-- Enable RLS
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own NPS responses" ON public.nps_responses;
DROP POLICY IF EXISTS "Users can insert own NPS responses" ON public.nps_responses;
DROP POLICY IF EXISTS "Admins can view all NPS responses" ON public.nps_responses;

-- Allow users to view their own responses
CREATE POLICY "Users can view own NPS responses"
    ON public.nps_responses FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own responses
CREATE POLICY "Users can insert own NPS responses"
    ON public.nps_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all responses
CREATE POLICY "Admins can view all NPS responses"
    ON public.nps_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Add table and column comments for documentation
COMMENT ON TABLE public.nps_responses IS 'Net Promoter Score (NPS) feedback from active users';
COMMENT ON COLUMN public.nps_responses.score IS 'NPS score from 0-10 (0=detractor, 7-8=passive, 9-10=promoter)';
COMMENT ON COLUMN public.nps_responses.comment IS 'Optional user feedback comment';
COMMENT ON COLUMN public.nps_responses.context IS 'Additional context: wheel_id, feature used, etc.';
COMMENT ON COLUMN public.profiles.last_nps_shown_at IS 'Last time NPS modal was shown to user (regardless of submission)';
COMMENT ON COLUMN public.profiles.last_nps_submitted_at IS 'Last time user submitted an NPS response';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_nps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_nps_responses_updated_at ON public.nps_responses;
CREATE TRIGGER update_nps_responses_updated_at
    BEFORE UPDATE ON public.nps_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_nps_updated_at();

-- Function to check if user should be shown NPS modal
CREATE OR REPLACE FUNCTION public.should_show_nps(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_last_shown TIMESTAMPTZ;
    v_last_submitted TIMESTAMPTZ;
    v_created_at TIMESTAMPTZ;
    v_wheel_count INT;
BEGIN
    -- Get user profile data
    SELECT 
        last_nps_shown_at,
        last_nps_submitted_at,
        created_at
    INTO 
        v_last_shown,
        v_last_submitted,
        v_created_at
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Check if user has created at least one wheel (active user)
    SELECT COUNT(*) INTO v_wheel_count
    FROM public.year_wheels
    WHERE user_id = p_user_id;
    
    -- Don't show if user hasn't created any wheels (not active)
    IF v_wheel_count = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Don't show if user is brand new (less than 1 day old)
    IF v_created_at IS NOT NULL AND v_created_at > NOW() - INTERVAL '1 day' THEN
        RETURN FALSE;
    END IF;
    
    -- Don't show if submitted within last 30 days
    IF v_last_submitted IS NOT NULL AND v_last_submitted > NOW() - INTERVAL '30 days' THEN
        RETURN FALSE;
    END IF;
    
    -- Don't show if dismissed within last 7 days (shown but not submitted)
    IF v_last_shown IS NOT NULL 
       AND v_last_shown > NOW() - INTERVAL '7 days'
       AND (v_last_submitted IS NULL OR v_last_shown > v_last_submitted) THEN
        RETURN FALSE;
    END IF;
    
    -- All checks passed, show NPS modal
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.should_show_nps IS 'Determines if NPS modal should be shown to a user based on activity and timing rules';

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.nps_responses TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
