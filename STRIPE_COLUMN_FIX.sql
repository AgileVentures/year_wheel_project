-- =====================================================
-- STRIPE SUBSCRIPTION FIX
-- Fix owner_id → user_id column reference
-- Run this in Supabase SQL Editor
-- =====================================================

-- Update the get_user_wheel_count function to use correct column name
CREATE OR REPLACE FUNCTION public.get_user_wheel_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.year_wheels
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the can_add_team_member function to use correct column name
CREATE OR REPLACE FUNCTION public.can_add_team_member(wheel_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_premium BOOLEAN;
  member_count INTEGER;
  is_owner BOOLEAN;
BEGIN
  -- Check if user is the owner of the wheel
  is_owner := EXISTS (
    SELECT 1 FROM public.year_wheels
    WHERE id = wheel_uuid AND user_id = user_uuid
  );
  
  -- Only owner can add members
  IF NOT is_owner THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is premium
  is_premium := public.is_premium_user(user_uuid);
  
  -- Premium users have unlimited team members
  IF is_premium THEN
    RETURN TRUE;
  END IF;
  
  -- Free users limited to 3 team members per wheel
  member_count := public.get_team_member_count(wheel_uuid);
  RETURN member_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use version control (PREMIUM ONLY)
CREATE OR REPLACE FUNCTION public.can_use_version_control(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Version control is premium-only feature
  RETURN public.is_premium_user(user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can share wheels (PREMIUM ONLY)
CREATE OR REPLACE FUNCTION public.can_share_wheels(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Sharing is premium-only feature
  RETURN public.is_premium_user(user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check export format permission
CREATE OR REPLACE FUNCTION public.can_export_format(user_uuid UUID, format TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_premium BOOLEAN;
BEGIN
  is_premium := public.is_premium_user(user_uuid);
  
  -- Premium users can export to all formats
  IF is_premium THEN
    RETURN TRUE;
  END IF;
  
  -- Free users can only export to PNG and SVG
  RETURN format IN ('png', 'svg');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix
SELECT 'Functions updated successfully!' as status;
