-- =====================================================
-- STRIPE SUBSCRIPTION SYSTEM
-- Add subscription management to Year Wheel
-- =====================================================

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Create subscription_events table (audit log)
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
DROP POLICY IF EXISTS "Service role full access to subscriptions" ON public.subscriptions;
CREATE POLICY "Service role full access to subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 5. RLS Policies for subscription_events
DROP POLICY IF EXISTS "Users can view own subscription events" ON public.subscription_events;
CREATE POLICY "Users can view own subscription events"
  ON public.subscription_events
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access to events" ON public.subscription_events;
CREATE POLICY "Service role full access to events"
  ON public.subscription_events
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 6. Create function to check subscription status
CREATE OR REPLACE FUNCTION public.is_premium_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND plan_type IN ('monthly', 'yearly')
    AND (current_period_end IS NULL OR current_period_end > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get user's wheel count
CREATE OR REPLACE FUNCTION public.get_user_wheel_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.year_wheels
    WHERE owner_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get user's team member count
CREATE OR REPLACE FUNCTION public.get_team_member_count(wheel_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id)
    FROM public.wheel_collaborators
    WHERE wheel_id = wheel_uuid
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to check if user can create wheel
CREATE OR REPLACE FUNCTION public.can_create_wheel(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_premium BOOLEAN;
  wheel_count INTEGER;
BEGIN
  -- Premium users can create unlimited wheels
  is_premium := public.is_premium_user(user_uuid);
  IF is_premium THEN
    RETURN true;
  END IF;
  
  -- Free users limited to 2 wheels
  wheel_count := public.get_user_wheel_count(user_uuid);
  RETURN wheel_count < 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to check if user can add team member
CREATE OR REPLACE FUNCTION public.can_add_team_member(wheel_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_premium BOOLEAN;
  member_count INTEGER;
  is_owner BOOLEAN;
BEGIN
  -- Check if user is owner
  is_owner := EXISTS (
    SELECT 1 FROM public.year_wheels
    WHERE id = wheel_uuid AND owner_id = user_uuid
  );
  
  IF NOT is_owner THEN
    RETURN false;
  END IF;
  
  -- Premium users can add unlimited members
  is_premium := public.is_premium_user(user_uuid);
  IF is_premium THEN
    RETURN true;
  END IF;
  
  -- Free users limited to 3 members (including owner)
  member_count := public.get_team_member_count(wheel_uuid);
  RETURN member_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Add updated_at trigger for subscriptions
CREATE OR REPLACE FUNCTION public.handle_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_subscription_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_updated_at();

-- 12. Create initial subscription record for all existing users
INSERT INTO public.subscriptions (user_id, plan_type, status)
SELECT id, 'free', 'active'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- 13. Create function to auto-create subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- 14. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_wheel_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_member_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_wheel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_team_member(UUID, UUID) TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check subscription table
-- SELECT * FROM public.subscriptions;

-- Check if user is premium
-- SELECT public.is_premium_user(auth.uid());

-- Check wheel count
-- SELECT public.get_user_wheel_count(auth.uid());

-- Check if can create wheel
-- SELECT public.can_create_wheel(auth.uid());

-- =====================================================
-- NOTES FOR IMPLEMENTATION
-- =====================================================
-- 
-- Stripe Price IDs (create these in Stripe Dashboard):
-- - Monthly: price_xxx (79 SEK/month)
-- - Yearly: price_yyy (768 SEK/year = 64 SEK/month)
-- 
-- Webhook events to handle:
-- - customer.subscription.created
-- - customer.subscription.updated
-- - customer.subscription.deleted
-- - invoice.payment_succeeded
-- - invoice.payment_failed
-- 
-- Environment variables needed:
-- - VITE_STRIPE_PUBLISHABLE_KEY
-- - STRIPE_SECRET_KEY (server-side only)
-- - STRIPE_WEBHOOK_SECRET
