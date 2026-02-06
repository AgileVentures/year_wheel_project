-- =====================================================
-- ADMIN USER SETUP
-- Add is_admin column and set thomas@freefoot.se as admin
-- Admins get all premium features without subscription
-- =====================================================

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(id)
);

-- Add is_admin column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (so we can recreate them)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do everything
CREATE POLICY "Service role full access to profiles"
  ON public.profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 2. Create function to sync profiles with auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (NEW.id, NEW.email, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- 3. Sync existing users to profiles table
INSERT INTO public.profiles (id, email, is_admin)
SELECT id, email, false
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 4. Set thomas@freefoot.se as admin
UPDATE public.profiles
SET is_admin = true
WHERE email = 'thomas@freefoot.se';

-- Verify admin was set
SELECT id, email, is_admin, created_at
FROM public.profiles
WHERE is_admin = true;

-- 5. Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = user_uuid),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update is_premium_user to include admins
CREATE OR REPLACE FUNCTION public.is_premium_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins get all premium features without subscription
  IF public.is_admin(user_uuid) THEN
    RETURN TRUE;
  END IF;

  -- Check for active subscription
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND plan_type IN ('monthly', 'yearly')
    AND (current_period_end IS NULL OR current_period_end > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if thomas@freefoot.se is admin
SELECT 
  email,
  is_admin,
  public.is_admin(id) as admin_check,
  public.is_premium_user(id) as has_premium_access
FROM public.profiles
WHERE email = 'thomas@freefoot.se';

-- List all admins
SELECT email, is_admin, created_at
FROM public.profiles
WHERE is_admin = true;

SELECT '✓ Admin setup complete!' as status;
