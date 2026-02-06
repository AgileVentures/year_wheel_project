-- =====================================================
-- ADD GIFT PLAN TYPE TO SUBSCRIPTIONS
-- Allows admins to grant complimentary premium access
-- =====================================================

-- Update the plan_type check constraint to include 'gift'
ALTER TABLE public.subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_plan_type_check 
  CHECK (plan_type IN ('free', 'monthly', 'yearly', 'gift'));

-- Update is_premium_user function to recognize gift subscriptions
CREATE OR REPLACE FUNCTION public.is_premium_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND status = 'active'
      AND plan_type IN ('monthly', 'yearly', 'gift')
      AND (current_period_end IS NULL OR current_period_end > NOW())
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid
      AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
