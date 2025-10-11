# COMPLETE DATABASE MIGRATION MANIFEST
## Year Wheel POC - All Schema Changes

This document lists **ALL** schema changes needed for a complete database deployment.

---

## ✅ CORE MIGRATIONS (In Order)

### 000_INITIAL_SCHEMA.sql
- **Tables**: year_wheels, wheel_rings, ring_data, activity_groups, labels, items
- **Functions**: handle_updated_at(), generate_share_token()
- **Status**: ✅ Recovered

### 001_CREATE_PROFILES_TABLE.sql  
- **Table**: profiles (id, full_name, email, avatar_url, created_at, updated_at)
- **RLS**: Basic policies for viewing/updating own profile
- **Status**: ✅ Recovered

### 002_enable_realtime.sql
- **Purpose**: Add tables to supabase_realtime publication
- **Tables**: year_wheels, wheel_pages, items, wheel_rings, activity_groups, labels, teams, team_members
- **Status**: ✅ Recovered

### 003_stripe_subscription_setup.sql
- **Tables**: subscriptions, subscription_events
- **Columns Added to profiles**: stripe_customer_id, subscription_status, subscription_tier
- **Functions**:
  - `is_premium_user(user_uuid)` → BOOLEAN
  - `get_user_wheel_count(user_uuid)` → INTEGER
  - `get_team_member_count(wheel_uuid)` → INTEGER
  - `can_create_wheel(user_uuid)` → BOOLEAN
  - `can_add_team_member(wheel_uuid, user_uuid)` → BOOLEAN
  - `handle_subscription_updated_at()` → TRIGGER
  - `handle_new_user_subscription()` → TRIGGER
- **Status**: ✅ Recovered

### 004_team_collaboration_final.sql
- **Tables**: teams, team_members, team_invitations
- **Columns Added to year_wheels**: team_id UUID
- **RLS Updates**: All tables updated to check team membership
- **Status**: ✅ Recovered

### 005_ADD_MULTI_PAGE_WHEELS.sql ⚠️ **CRITICAL**
- **Table**: wheel_pages (id, wheel_id, page_order, year, title, organization_data, overrides, timestamps)
- **Functions**:
  - `get_next_page_order(wheel_id)` → INTEGER
  - `duplicate_wheel_page(page_id)` → UUID
- **Data Migration**: Copies existing wheel data into wheel_pages.organization_data JSONB
- **Status**: ✅ Recovered

### 006_ADD_VERSION_CONTROL.sql
- **Table**: wheel_versions (id, wheel_id, version_number, snapshot_data, created_by, created_at, change_description, is_auto_save, metadata)
- **Functions**:
  - `create_wheel_version(...)` → UUID
  - `restore_wheel_version(...)` → VOID
- **Status**: ✅ Recovered

### 007_ADD_PUBLIC_SHARING.sql
- **Purpose**: Enhanced public sharing features
- **Changes**: RLS policy updates for public wheels
- **Status**: ✅ Recovered

### 008_ADD_PAGE_ID_TO_ITEMS.sql ⚠️ **CRITICAL**
- **Column Added to items**: page_id UUID NOT NULL REFERENCES wheel_pages(id)
- **Index**: items_page_id_idx
- **Data Migration**: Backfills page_id based on year
- **Status**: ✅ Recovered

---

## 🔧 CRITICAL FIX MIGRATIONS (Must Include!)

### 009_STRIPE_COLUMN_FIX.sql
**Why Critical**: Functions reference wrong column names (owner_id vs user_id)

**Functions Fixed**:
```sql
CREATE OR REPLACE FUNCTION public.get_user_wheel_count(user_uuid UUID)
-- Changed: owner_id → user_id

CREATE OR REPLACE FUNCTION public.can_add_team_member(wheel_uuid UUID, user_uuid UUID)
-- Changed: owner_id → user_id
```

**Status**: ✅ Recovered as `recovered_STRIPE_COLUMN_FIX.sql`

---

### 010_ADMIN_SETUP.sql
**Why Critical**: Adds admin user support

**Changes**:
- Adds `is_admin BOOLEAN` column to profiles table
- Creates admin-specific policies
- Function to check admin status
- Admins get premium features without subscription

**New Functions**:
```sql
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid UUID) RETURNS BOOLEAN
```

**Status**: ✅ Recovered as `recovered_ADMIN_SETUP.sql`

---

### 011_TEAM_MEMBERS_EMAIL_LOOKUP.sql
**Why Critical**: Frontend needs to display team member emails

**New Function**:
```sql
CREATE OR REPLACE FUNCTION get_team_members_with_emails(p_team_id uuid)
RETURNS TABLE (id uuid, team_id uuid, user_id uuid, role text, joined_at timestamptz, email text)
-- Joins team_members with auth.users to get emails
```

**Status**: ✅ Recovered as `recovered_TEAM_MEMBERS_EMAIL_LOOKUP.sql`

---

### 012_TEAM_INVITATION_AUTO_ACCEPT.sql
**Why Critical**: Auto-accepts team invitations when invited user signs up

**New Function + Trigger**:
```sql
CREATE OR REPLACE FUNCTION handle_new_user_team_invitations() RETURNS TRIGGER
-- Automatically adds new users to teams they were invited to

CREATE TRIGGER on_auth_user_created_team_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_team_invitations();
```

**Status**: ✅ Recovered as `recovered_TEAM_INVITATION_AUTO_ACCEPT.sql`

---

## 📊 COMPLETE DATABASE STRUCTURE

### Tables (14 total)
1. **year_wheels** - Main wheel config (13 columns including team_id)
2. **wheel_pages** - Multi-page support (12 columns)
3. **wheel_rings** - Ring definitions (9 columns)
4. **ring_data** - Month-specific ring content (4 columns)
5. **activity_groups** - Activity categories (6 columns)
6. **labels** - Optional labels (6 columns)
7. **items** - Activities/events (12 columns including page_id!)
8. **profiles** - User profiles (7 columns including is_admin, stripe_customer_id, subscription_status, subscription_tier)
9. **subscriptions** - Stripe subscriptions (12 columns)
10. **subscription_events** - Webhook log (6 columns)
11. **teams** - Team definitions (6 columns)
12. **team_members** - Team membership (6 columns)
13. **team_invitations** - Pending invites (8 columns)
14. **wheel_versions** - Version history (9 columns)

### Functions (20+ total)

**Core Functions**:
- `handle_updated_at()` - Auto-update timestamps
- `generate_share_token()` - Generate share URLs

**Subscription Functions**:
- `is_premium_user(uuid)` → BOOLEAN
- `get_user_wheel_count(uuid)` → INTEGER
- `get_team_member_count(uuid)` → INTEGER
- `can_create_wheel(uuid)` → BOOLEAN
- `can_add_team_member(uuid, uuid)` → BOOLEAN
- `handle_subscription_updated_at()` - Trigger
- `handle_new_user_subscription()` - Trigger

**Admin Functions**:
- `is_admin_user(uuid)` → BOOLEAN

**Page Functions**:
- `get_next_page_order(uuid)` → INTEGER
- `duplicate_wheel_page(uuid)` → UUID

**Version Functions**:
- `create_wheel_version(...)` → UUID
- `restore_wheel_version(...)` → VOID

**Team Functions**:
- `get_team_members_with_emails(uuid)` → TABLE
- `handle_new_user_team_invitations()` - Trigger

**Export Functions** (seen in DB screenshot):
- `can_export_format(uuid, uuid)` → BOOLEAN
- `can_manage_team(uuid, uuid)` → BOOLEAN
- `can_share_wheels(uuid, uuid)` → BOOLEAN
- `can_use_version_control(uuid, uuid)` → BOOLEAN

### Triggers (5+)
1. `set_updated_at` on year_wheels → handle_updated_at()
2. `set_updated_at` on items → handle_updated_at()
3. `handle_subscription_updated_at` on subscriptions
4. `handle_new_user_subscription` on profiles
5. `on_auth_user_created_team_invite` on auth.users

### Database Publications (Realtime)
- `supabase_realtime` - Includes 7+ tables for live updates

---

## ⚠️ KNOWN ISSUES IN CURRENT DATABASE

### Issue 1: Dual Storage System
- **Problem**: Rings/activities exist in BOTH normalized tables AND wheel_pages.organization_data JSONB
- **Impact**: AI assistant queries wheel_rings table but new wheels may only have data in JSONB
- **Solution**: Migration 005 should have created sync mechanism or dropped old tables

### Issue 2: Missing Functions in Screenshots
Database screenshot shows functions we don't have migrations for:
- `add_owner_to_team` - Trigger
- `can_create_wheels` - Boolean check
- `can_export_format` - Feature gate
- `can_manage_team` - Permission check
- `can_share_wheels` - Feature gate
- `can_use_version_control` - Feature gate
- `cleanup_old_versions` - Maintenance
- `get_next_version_number` - Helper
- `get_team_member_count_for_wheel` - Renamed version?
- `get_user_wheel_count_premium` - Premium variant?
- `handle_new_user_profile` - Profile creation trigger

**Action**: Need to search for these in git history or reconstruct from business logic

---

## 🎯 DEPLOYMENT CHECKLIST

### For Fresh Database:
```bash
# Run migrations in order
psql $DATABASE_URL -f supabase/migrations/000_INITIAL_SCHEMA.sql
psql $DATABASE_URL -f supabase/migrations/001_CREATE_PROFILES_TABLE.sql
psql $DATABASE_URL -f supabase/migrations/002_enable_realtime.sql
psql $DATABASE_URL -f supabase/migrations/003_stripe_subscription_setup.sql
psql $DATABASE_URL -f supabase/migrations/004_team_collaboration_final.sql
psql $DATABASE_URL -f supabase/migrations/005_ADD_MULTI_PAGE_WHEELS.sql
psql $DATABASE_URL -f supabase/migrations/006_ADD_VERSION_CONTROL.sql
psql $DATABASE_URL -f supabase/migrations/007_ADD_PUBLIC_SHARING.sql
psql $DATABASE_URL -f supabase/migrations/008_ADD_PAGE_ID_TO_ITEMS.sql
psql $DATABASE_URL -f supabase/migrations/recovered_STRIPE_COLUMN_FIX.sql
psql $DATABASE_URL -f supabase/migrations/recovered_ADMIN_SETUP.sql
psql $DATABASE_URL -f supabase/migrations/recovered_TEAM_MEMBERS_EMAIL_LOOKUP.sql
psql $DATABASE_URL -f supabase/migrations/recovered_TEAM_INVITATION_AUTO_ACCEPT.sql
```

### Validation Queries:
```sql
-- 1. Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Expect: 14 tables

-- 2. Check critical columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'items' AND column_name IN ('page_id', 'wheel_id', 'ring_id');
-- Must return all 3

-- 3. Check critical functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
AND routine_name IN (
  'is_premium_user', 
  'get_team_members_with_emails', 
  'handle_new_user_team_invitations',
  'is_admin_user'
);
-- Must return all 4

-- 4. Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
-- Expect: 5+ triggers

-- 5. Check realtime is enabled
SELECT schemaname, tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
-- Expect: 7+ tables
```

---

## 🔍 NEXT STEPS: MISSING MIGRATIONS TO FIND

Search git history for:
1. Functions for feature gating (can_export_format, can_share_wheels, etc.)
2. Profile creation trigger (handle_new_user_profile)
3. Team owner auto-add trigger (add_owner_to_team)
4. Version cleanup function (cleanup_old_versions)
5. Any other triggers visible in DB screenshot

**Command**:
```bash
git log --all --full-history -S "can_export_format" -- "*.sql"
git log --all --full-history -S "handle_new_user_profile" -- "*.sql"
```
