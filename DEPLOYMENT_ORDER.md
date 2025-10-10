# 🚀 Complete Deployment Order

## Run SQL Files in This Exact Order

### 1. ADMIN_SETUP.sql ⭐ **RUN FIRST**
**Purpose**: Creates profiles table, admin system, sets thomas@freefoot.se as admin

**What it does**:
- Creates `profiles` table with `is_admin` column
- Syncs all existing users to profiles
- Creates `is_admin()` function
- Updates `is_premium_user()` to include admin check
- Sets thomas@freefoot.se as first admin

**Why first**: Other files depend on profiles table and admin functions

---

### 2. STRIPE_COLUMN_FIX.sql
**Purpose**: Fixes database column references and adds subscription restrictions

**What it does**:
- Fixes `owner_id` → `user_id` in wheel count function
- Fixes `owner_id` → `user_id` in team member function
- Adds `can_use_version_control()` function (premium + admin only)
- Adds `can_share_wheels()` function (premium + admin only)
- Adds `can_export_format()` function (checks format permissions)

**Depends on**: ADMIN_SETUP.sql (uses is_admin and is_premium_user functions)

---

### 3. Optional: ADMIN_MANAGEMENT.sql
**Purpose**: Quick reference for managing admins later

**What it contains**:
- Commands to add/remove admins
- List all admins
- Check specific user status

**Note**: This is a reference file, not meant to be run all at once. Copy specific commands as needed.

---

## Complete Deployment Checklist

### ✅ Step 1: Database Setup
```bash
# In Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

1. Run ADMIN_SETUP.sql
   - Copy entire file
   - Paste into SQL Editor
   - Click "Run"
   - ✓ Verify: Should see thomas@freefoot.se as admin in results

2. Run STRIPE_COLUMN_FIX.sql  
   - Copy entire file
   - Paste into SQL Editor
   - Click "Run"
   - ✓ Verify: Should see "Functions updated successfully!"
```

### ✅ Step 2: Edge Functions Deployment
```bash
# In your terminal:

cd /Users/thomasochman/Projects/year_wheel_poc

# Deploy all three Edge Functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
```

### ✅ Step 3: Set Stripe Secrets
```bash
# Set your Stripe test keys
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Later, for production:
# supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
```

### ✅ Step 4: Configure Stripe Webhook
```bash
# In Stripe Dashboard (https://dashboard.stripe.com/webhooks):

1. Click "Add endpoint"
2. Endpoint URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
3. Events to send:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
4. Copy webhook secret
5. Update in Supabase: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### ✅ Step 5: Test the System

#### Test as Admin (thomas@freefoot.se)
```bash
1. yarn dev
2. Sign in as thomas@freefoot.se
3. Expected:
   ✓ Red "Admin" badge shows in header
   ✓ No "Uppgradera" button
   ✓ Can create unlimited wheels
   ✓ No usage limits shown
```

#### Test as Free User (any other email)
```bash
1. Sign in as different user
2. Expected:
   ✓ Yellow "Uppgradera" button shows
   ✓ "X / 2 hjul" usage indicator
   ✓ Blocked at 3rd wheel creation
   ✓ Upgrade prompt appears
```

#### Test Subscription Flow
```bash
1. As free user, click "Uppgradera"
2. Click "Uppgradera nu" on yearly plan
3. Should redirect to Stripe Checkout
4. Use test card: 4242 4242 4242 4242
5. Complete payment
6. Expected:
   ✓ Redirected back to dashboard
   ✓ Blue "Premium" badge shows
   ✓ Can create unlimited wheels
   ✓ Usage limits gone
```

---

## Verification SQL Queries

### Check Admin Setup
```sql
-- 1. List all admins
SELECT email, is_admin, created_at 
FROM public.profiles 
WHERE is_admin = true;

-- 2. Verify thomas has premium access
SELECT 
  email,
  is_admin,
  public.is_admin(id) as admin_check,
  public.is_premium_user(id) as has_premium_access
FROM public.profiles
WHERE email = 'thomas@freefoot.se';

-- 3. Test permission functions
SELECT 
  email,
  public.can_create_wheel(id) as can_create,
  public.can_use_version_control(id) as can_use_versions,
  public.can_share_wheels(id) as can_share
FROM public.profiles
WHERE email = 'thomas@freefoot.se';
```

### Check Subscriptions Table
```sql
-- List all subscriptions
SELECT 
  u.email,
  s.plan_type,
  s.status,
  s.current_period_end,
  public.is_premium_user(s.user_id) as has_premium
FROM public.subscriptions s
JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at DESC;
```

---

## Environment Variables Summary

### ✅ In .env.local (Local Development)
```bash
VITE_SUPABASE_URL=https://mmysvuymzabstnobdfvo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_YEARLY_PRICE_ID=price_...
```

### ✅ In Supabase Secrets (Edge Functions)
```bash
# Set via: supabase secrets set KEY=value
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Auto-provided by Supabase (don't set these):
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## Troubleshooting

### Error: "column owner_id does not exist"
**Fix**: Run STRIPE_COLUMN_FIX.sql to update functions to use `user_id`

### Error: "function is_admin does not exist"
**Fix**: Run ADMIN_SETUP.sql first - it creates the is_admin function

### Error: "Cannot read properties of undefined (reading 'user')"
**Fix**: Already fixed in useSubscription.jsx - auth.getUser() is now properly awaited

### Admin badge not showing
**Check**:
1. ADMIN_SETUP.sql was run
2. thomas@freefoot.se is set as admin: `SELECT is_admin FROM profiles WHERE email = 'thomas@freefoot.se'`
3. Browser cache cleared / hard refresh

### Subscription not updating after payment
**Check**:
1. Stripe webhook is configured and pointing to correct URL
2. Webhook secret matches: `supabase secrets list`
3. Check Stripe webhook logs in dashboard for errors

---

## 🎉 Success Criteria

All of these should work:

- ✅ thomas@freefoot.se shows red "Admin" badge
- ✅ thomas@freefoot.se has unlimited wheels (no limit)
- ✅ New users show yellow "Uppgradera" button
- ✅ New users limited to 2 wheels
- ✅ Clicking "Uppgradera" shows subscription modal
- ✅ Yearly plan shows "Spara 19%" badge
- ✅ Can complete test payment with 4242 card
- ✅ After payment, premium badge shows
- ✅ Premium users have unlimited wheels
- ✅ Admins never see subscription UI (only admin badge)

---

## Files Reference

- `ADMIN_SETUP.sql` - Run 1st: Creates admin system
- `STRIPE_COLUMN_FIX.sql` - Run 2nd: Fixes functions + adds restrictions  
- `ADMIN_MANAGEMENT.sql` - Reference: Commands to manage admins
- `ADMIN_SYSTEM_COMPLETE.md` - Documentation: How admin system works
- `PREMIUM_FEATURES_RESTRICTION.md` - Documentation: Feature restrictions
- `SUBSCRIPTION_ERROR_FIX.md` - Documentation: Original error fixes
- `SUBSCRIPTION_UI_GUIDE.md` - Documentation: UI components guide
- `STRIPE_QUICKSTART.md` - Documentation: Complete setup guide

---

## Quick Commands

```bash
# Start dev server
yarn dev

# Deploy Edge Functions
supabase functions deploy stripe-webhook create-checkout-session create-portal-session

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...

# Check secrets
supabase secrets list

# Push to GitHub
git add .
git commit -m "Complete subscription and admin system"
git push origin main
```
