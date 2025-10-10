# 👑 Admin User System - Complete Guide

## Overview
Admins get **all premium features without needing a subscription**. Thomas@freefoot.se is set as the first admin.

---

## 🎯 What Admins Get

### Full Access (No Subscription Required)
- ✅ **Unlimited wheels** (no 2-wheel limit)
- ✅ **Unlimited team members** (no 3-member limit)
- ✅ **All export formats** (PNG, SVG, PDF, JPG)
- ✅ **Version control** - full history access
- ✅ **Sharing** - can share wheels with anyone
- ✅ **Priority support**
- ✅ **Special admin badge** in dashboard

### Admin vs Premium User
| Feature | Admin | Premium (Paid) | Free |
|---------|-------|----------------|------|
| Subscription | ❌ Not needed | ✅ Required | N/A |
| All Features | ✅ Yes | ✅ Yes | ❌ Limited |
| Dashboard Badge | 🛡️ Admin (Red) | 👑 Premium (Blue) | ⭐ Upgrade (Yellow) |
| Can manage billing | ❌ No | ✅ Yes | N/A |

---

## 📋 Files Created/Updated

### 1. SQL Files

#### `ADMIN_SETUP.sql` ⭐ **Run this first**
Creates the admin system:
- Creates `profiles` table with `is_admin` column
- Syncs existing users to profiles
- Sets thomas@freefoot.se as admin
- Creates `is_admin()` function
- Updates `is_premium_user()` to include admin check
- All verification queries included

**Usage**: Copy entire file into Supabase SQL Editor and run.

#### `ADMIN_MANAGEMENT.sql`
Quick commands for managing admins:
```sql
-- Add admin
UPDATE public.profiles SET is_admin = true 
WHERE email = 'newadmin@example.com';

-- Remove admin
UPDATE public.profiles SET is_admin = false 
WHERE email = 'oldadmin@example.com';

-- List all admins
SELECT email, is_admin FROM public.profiles WHERE is_admin = true;
```

#### `STRIPE_COLUMN_FIX.sql` (Updated)
Now includes admin checks - all permission functions automatically respect admin status through `is_premium_user()`.

---

### 2. JavaScript Files

#### `src/services/subscriptionService.js`
Added:
```javascript
// New function
export async function isAdmin()

// Updated function
export async function isPremiumUser()  
// Now returns true for both premium subscribers AND admins

// Updated function
export function getUsageLimits(isPremium, isAdminUser)
// Now includes isAdmin flag in returned limits object
```

#### `src/hooks/useSubscription.jsx`
Added:
```javascript
const { isAdmin } = useSubscription();
// Returns true if user is admin
```

#### `src/components/dashboard/Dashboard.jsx`
Added red admin badge that shows instead of Premium/Upgrade button:
```jsx
{isAdminUser && (
  <div className="...bg-gradient-to-r from-red-600 to-orange-600...">
    <Shield size={18} />
    <span>Admin</span>
  </div>
)}
```

---

## 🚀 Deployment Steps

### Step 1: Run ADMIN_SETUP.sql
```bash
# In Supabase SQL Editor:
1. Copy entire contents of ADMIN_SETUP.sql
2. Paste into SQL Editor
3. Click "Run"
4. Verify thomas@freefoot.se is shown as admin in results
```

### Step 2: Restart Your App
```bash
yarn dev
# or if deployed:
# Netlify/Vercel will auto-deploy when you push
```

### Step 3: Test Admin Access
1. Sign in as thomas@freefoot.se
2. You should see:
   - 🛡️ **Red "Admin" badge** in header (instead of yellow "Uppgradera")
   - No wheel limits
   - All premium features available

---

## 🔍 How It Works

### Database Level
```sql
-- is_premium_user() checks admin first:
CREATE OR REPLACE FUNCTION public.is_premium_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins get premium access automatically
  IF public.is_admin(user_uuid) THEN
    RETURN TRUE;
  END IF;
  
  -- Check for active paid subscription
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND plan_type IN ('monthly', 'yearly')
    ...
  );
END;
$$;
```

### All Permission Functions Use This
```sql
can_create_wheel()        → uses is_premium_user() → includes admin check
can_add_team_member()     → uses is_premium_user() → includes admin check
can_use_version_control() → uses is_premium_user() → includes admin check
can_share_wheels()        → uses is_premium_user() → includes admin check
can_export_format()       → uses is_premium_user() → includes admin check
```

**Result**: Admins automatically pass ALL permission checks without any subscription!

---

## 📱 UI Behavior

### Admin User Dashboard
```
┌──────────────────────────────────────────────────────────┐
│  [Logo] [Hjul] [Team] [Inbjudningar]    [🛡️ Admin]      │
│                                      (Red gradient)       │
└──────────────────────────────────────────────────────────┘
```

### Premium User Dashboard
```
┌──────────────────────────────────────────────────────────┐
│  [Logo] [Hjul] [Team] [Inbjudningar]    [👑 Premium]    │
│                                  (Blue-purple gradient)   │
└──────────────────────────────────────────────────────────┘
```

### Free User Dashboard
```
┌──────────────────────────────────────────────────────────┐
│  [Logo] [Hjul] [Team] [Inbjudningar]    [⭐ Uppgradera] │
│                                          (Yellow)         │
└──────────────────────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

After running ADMIN_SETUP.sql:

### Database Checks
```sql
-- 1. Profiles table exists
SELECT * FROM public.profiles LIMIT 5;

-- 2. Thomas is admin
SELECT email, is_admin FROM public.profiles 
WHERE email = 'thomas@freefoot.se';

-- 3. is_admin function works
SELECT public.is_admin(id) FROM public.profiles 
WHERE email = 'thomas@freefoot.se';

-- 4. is_premium_user returns true for admin
SELECT public.is_premium_user(id) FROM public.profiles 
WHERE email = 'thomas@freefoot.se';
```

### App Checks (as thomas@freefoot.se)
- [x] Dashboard shows red "Admin" badge
- [x] No "Uppgradera" button visible
- [x] Can create more than 2 wheels
- [x] No wheel count limit shown
- [x] Can add more than 3 team members
- [x] Can export to PDF/JPG (when implemented)
- [x] Version control accessible (when implemented)
- [x] Can share wheels (when implemented)

---

## 🔧 Adding More Admins

### Via Supabase Dashboard
1. Go to Table Editor
2. Open `profiles` table
3. Find user by email
4. Set `is_admin` = `true`

### Via SQL
```sql
-- Single user
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'newadmin@example.com';

-- Multiple users
UPDATE public.profiles 
SET is_admin = true 
WHERE email IN (
  'admin1@example.com',
  'admin2@example.com'
);
```

### Remove Admin
```sql
UPDATE public.profiles 
SET is_admin = false 
WHERE email = 'oldadmin@example.com';
```

---

## 🛡️ Security Notes

### Admin Rights Are Permanent
- Admins keep access even if:
  - They cancel a subscription
  - Their subscription expires
  - They never had a subscription

### Removing Admin
To revoke admin access:
```sql
UPDATE public.profiles 
SET is_admin = false 
WHERE email = 'user@example.com';
```
User immediately loses admin privileges on next page load.

### Database Protection
- RLS policies protect `profiles` table
- Users can only view their own profile
- Only service role can modify `is_admin`
- Manual SQL required to change admin status (can't be done via app UI)

---

## 📊 Monitoring Admins

### List All Admins with Subscription Status
```sql
SELECT 
  p.email,
  p.is_admin,
  p.created_at as admin_since,
  s.plan_type,
  s.status as subscription_status,
  public.is_premium_user(p.id) as has_premium_access
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id
WHERE p.is_admin = true
ORDER BY p.created_at DESC;
```

Expected output:
```
email                 | is_admin | admin_since | plan_type | subscription_status | has_premium_access
----------------------|----------|-------------|-----------|---------------------|-------------------
thomas@freefoot.se    | true     | 2025-10-10  | free      | active              | true
```

Note: `has_premium_access = true` even though `plan_type = free`! That's the admin magic. ✨

---

## 🎯 Summary

✅ **What was added:**
1. `profiles` table with `is_admin` column
2. `is_admin()` database function
3. Updated `is_premium_user()` to check admin status first
4. `isAdmin()` JavaScript helper
5. Admin badge in dashboard UI
6. thomas@freefoot.se set as first admin

✅ **What it does:**
- Admins bypass all subscription checks
- Admins get unlimited everything
- Admins see special red "Admin" badge
- No subscription needed

✅ **How to use:**
1. Run `ADMIN_SETUP.sql` in Supabase
2. Sign in as thomas@freefoot.se
3. Enjoy full admin access!

✅ **To add more admins:**
Use `ADMIN_MANAGEMENT.sql` commands
