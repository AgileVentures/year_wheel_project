-- Migration 033: Affiliate Activity Verification System
-- Adds activity tracking and commission verification based on user engagement

-- 1. Add activity tracking columns to affiliate_conversions
ALTER TABLE affiliate_conversions 
ADD COLUMN IF NOT EXISTS activity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS activity_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wheels_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS items_created INTEGER DEFAULT 0;

-- 2. Update affiliate_commissions status to include 'unverified'
-- First check if the constraint exists and drop it
DO $$ 
BEGIN
  ALTER TABLE affiliate_commissions 
    DROP CONSTRAINT IF EXISTS affiliate_commissions_status_check;
  
  ALTER TABLE affiliate_commissions 
    ADD CONSTRAINT affiliate_commissions_status_check 
    CHECK (status IN ('unverified', 'pending', 'approved', 'paid', 'cancelled'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Create activity metrics view for easy querying
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as signup_date,
  u.last_sign_in_at,
  COUNT(DISTINCT w.id) as wheels_count,
  COALESCE(SUM(item_counts.item_count), 0) as total_items,
  CASE 
    WHEN COUNT(DISTINCT w.id) >= 1 
      AND COALESCE(SUM(item_counts.item_count), 0) >= 3 
      AND u.last_sign_in_at > u.created_at + INTERVAL '1 day'
    THEN TRUE 
    ELSE FALSE 
  END as is_active
FROM auth.users u
LEFT JOIN year_wheels w ON w.user_id = u.id
LEFT JOIN (
  SELECT wheel_id, COUNT(*) as item_count 
  FROM items 
  GROUP BY wheel_id
) item_counts ON item_counts.wheel_id = w.id
GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at;

-- 4. Function to check if a user meets activity requirements
CREATE OR REPLACE FUNCTION check_user_activity(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_wheels_count INTEGER;
  v_items_count INTEGER;
  v_days_since_signup INTEGER;
  v_has_multiple_logins BOOLEAN;
  v_is_active BOOLEAN;
BEGIN
  -- Get user info
  SELECT * INTO v_user FROM auth.users WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;
  
  -- Count wheels
  SELECT COUNT(*) INTO v_wheels_count 
  FROM year_wheels WHERE user_id = p_user_id;
  
  -- Count items across all wheels
  SELECT COALESCE(SUM(item_count), 0) INTO v_items_count
  FROM (
    SELECT COUNT(*) as item_count 
    FROM items i
    JOIN year_wheels w ON i.wheel_id = w.id
    WHERE w.user_id = p_user_id
  ) counts;
  
  -- Calculate days since signup
  v_days_since_signup := EXTRACT(DAY FROM NOW() - v_user.created_at);
  
  -- Check for multiple logins (last_sign_in_at different from created_at by > 1 day)
  v_has_multiple_logins := v_user.last_sign_in_at IS NOT NULL 
    AND v_user.last_sign_in_at > v_user.created_at + INTERVAL '1 day';
  
  -- Determine if active: 1+ wheel, 3+ items, logged in again after signup
  v_is_active := v_wheels_count >= 1 
    AND v_items_count >= 3 
    AND v_has_multiple_logins;
  
  RETURN json_build_object(
    'user_id', p_user_id,
    'wheels_count', v_wheels_count,
    'items_count', v_items_count,
    'days_since_signup', v_days_since_signup,
    'has_multiple_logins', v_has_multiple_logins,
    'is_active', v_is_active,
    'signup_date', v_user.created_at,
    'last_login', v_user.last_sign_in_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to verify affiliate commission after 14 days
CREATE OR REPLACE FUNCTION verify_affiliate_commission(p_conversion_id UUID)
RETURNS JSON AS $$
DECLARE
  v_conversion affiliate_conversions%ROWTYPE;
  v_commission affiliate_commissions%ROWTYPE;
  v_activity JSON;
  v_days_since_signup INTEGER;
BEGIN
  -- Get conversion
  SELECT * INTO v_conversion 
  FROM affiliate_conversions WHERE id = p_conversion_id;
  
  IF v_conversion IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'Conversion not found');
  END IF;
  
  IF v_conversion.user_id IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'No user associated with conversion');
  END IF;
  
  -- Check days since signup
  v_days_since_signup := EXTRACT(DAY FROM NOW() - v_conversion.signed_up_at);
  
  IF v_days_since_signup < 14 THEN
    RETURN json_build_object(
      'success', FALSE, 
      'error', 'Must wait 14 days before verification',
      'days_remaining', 14 - v_days_since_signup
    );
  END IF;
  
  -- Check user activity
  v_activity := check_user_activity(v_conversion.user_id);
  
  IF NOT (v_activity->>'is_active')::BOOLEAN THEN
    RETURN json_build_object(
      'success', FALSE, 
      'error', 'User does not meet activity requirements',
      'activity', v_activity
    );
  END IF;
  
  -- Update conversion as verified
  UPDATE affiliate_conversions SET
    activity_verified = TRUE,
    activity_verified_at = NOW(),
    wheels_created = (v_activity->>'wheels_count')::INTEGER,
    items_created = (v_activity->>'items_count')::INTEGER,
    updated_at = NOW()
  WHERE id = p_conversion_id;
  
  -- Update commission status from unverified to pending
  UPDATE affiliate_commissions SET
    status = 'pending',
    updated_at = NOW()
  WHERE conversion_id = p_conversion_id 
    AND commission_type = 'free_signup'
    AND status = 'unverified';
  
  RETURN json_build_object(
    'success', TRUE,
    'message', 'Commission verified and ready for approval',
    'activity', v_activity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to batch verify eligible commissions (for cron job or manual run)
CREATE OR REPLACE FUNCTION verify_eligible_affiliate_commissions()
RETURNS JSON AS $$
DECLARE
  v_conversion RECORD;
  v_verified_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Find conversions that are 14+ days old and not yet verified
  FOR v_conversion IN 
    SELECT ac.id, ac.user_id, ac.signed_up_at
    FROM affiliate_conversions ac
    JOIN affiliate_commissions acm ON acm.conversion_id = ac.id
    WHERE ac.signed_up_at IS NOT NULL
      AND ac.activity_verified = FALSE
      AND ac.signed_up_at < NOW() - INTERVAL '14 days'
      AND acm.status = 'unverified'
      AND acm.commission_type = 'free_signup'
  LOOP
    v_result := verify_affiliate_commission(v_conversion.id);
    
    IF (v_result->>'success')::BOOLEAN THEN
      v_verified_count := v_verified_count + 1;
    ELSE
      v_failed_count := v_failed_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'verified', v_verified_count,
    'failed', v_failed_count,
    'checked_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update record_affiliate_signup to set commission as 'unverified' instead of 'pending'
CREATE OR REPLACE FUNCTION record_affiliate_signup(
  p_user_id UUID,
  p_conversion_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_conversion affiliate_conversions;
BEGIN
  -- Find the conversion
  SELECT * INTO v_conversion FROM affiliate_conversions WHERE id = p_conversion_id;
  
  IF v_conversion IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update conversion with signup info
  UPDATE affiliate_conversions SET
    user_id = p_user_id,
    signed_up_at = NOW(),
    conversion_type = 'free_signup',
    updated_at = NOW()
  WHERE id = p_conversion_id;
  
  -- Create commission for free signup with 'unverified' status
  -- Will be verified after 14 days of activity
  INSERT INTO affiliate_commissions (
    organization_id,
    conversion_id,
    commission_type,
    commission_amount,
    currency,
    status
  ) VALUES (
    v_conversion.organization_id,
    p_conversion_id,
    'free_signup',
    2.00, -- €2 for free signup (paid after verification)
    'EUR',
    'unverified' -- Changed from 'pending' to 'unverified'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION check_user_activity(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION verify_affiliate_commission(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION verify_eligible_affiliate_commissions() TO service_role;

-- Comments
COMMENT ON FUNCTION check_user_activity IS 'Check if a user meets activity requirements: 1+ wheel, 3+ items, multiple logins';
COMMENT ON FUNCTION verify_affiliate_commission IS 'Verify a specific affiliate commission after 14 days if user is active';
COMMENT ON FUNCTION verify_eligible_affiliate_commissions IS 'Batch verify all eligible commissions (14+ days old, user is active)';
