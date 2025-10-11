# Database Migrations - Year Wheel POC

## 🚨 CRITICAL ISSUE IDENTIFIED

**Problem**: The code references `wheel_pages` table extensively, but it's missing from some databases.

**Root Cause**: Migration `004_ADD_MULTI_PAGE_WHEELS.sql` may not have been applied to all environments.

## Migration Order & Dependencies

### 000_INITIAL_SCHEMA.sql ✅
**Status**: Foundational schema (RECREATED from SUPABASE_SETUP.md)
**Tables Created**:
- `year_wheels` - Main wheel configurations  
- `wheel_rings` - Ring definitions (inner/outer)
- `ring_data` - Month-specific ring content
- `activity_groups` - Activity categories with colors
- `labels` - Optional activity labels
- `items` - Activities/events (with `ring_id`, `activity_id`, `label_id` FKs)

**Critical Relationships**:
```
year_wheels (1) ──< (N) wheel_rings
wheel_rings (1) ──< (N) ring_data
year_wheels (1) ──< (N) activity_groups
year_wheels (1) ──< (N) labels
year_wheels (1) ──< (N) items
items (N) ──> (1) wheel_rings
items (N) ──> (1) activity_groups
items (N) ──> (1) labels
```

---

### 001_CREATE_PROFILES_TABLE.sql ✅
**Status**: Recovered from commit `a75436c`
**Purpose**: Add user profiles table

**Table Created**:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Policies allow users to view/update their own profile

---

### 002_enable_realtime.sql ✅
**Status**: Recovered from commit `95ec041`
**Purpose**: Add tables to Supabase realtime publication

**Tables Added to Realtime**:
- `year_wheels`
- `wheel_pages` (if exists)
- `items`
- `wheel_rings`
- `activity_groups`
- `labels`
- `teams`
- `team_members`

---

### 003_stripe_subscription_setup.sql ✅
**Status**: Recovered from commit `22dcc05`
**Purpose**: Add Stripe subscription support

**Tables Created**:
- `subscriptions` - User subscription records with Stripe integration
- `subscription_events` - Webhook event log

**Columns Added to `profiles`**:
- `stripe_customer_id` - Links profile to Stripe customer
- `subscription_status` - Current subscription state
- `subscription_tier` - free/premium/enterprise

**Functions**:
- `get_user_subscription_status()` - Returns current tier

---

### 004_team_collaboration_final.sql ✅
**Status**: Recovered from commit `59d0257`
**Purpose**: Add team/collaboration features

**Tables Created**:
- `teams` - Team definitions
- `team_members` - Team membership with roles (owner/admin/editor/viewer)
- `team_invitations` - Pending team invites with tokens

**Columns Added to `year_wheels`**:
- `team_id UUID` - Links wheel to team (nullable)

**RLS Updates**: All policies updated to check team membership for shared wheels

---

### 005_ADD_MULTI_PAGE_WHEELS.sql ✅ **CRITICAL**
**Status**: Recovered successfully  
**Purpose**: Enable multi-year pages per wheel (Canva-style)

**New Table**: `wheel_pages`
```sql
CREATE TABLE wheel_pages (
  id UUID PRIMARY KEY,
  wheel_id UUID REFERENCES year_wheels(id) ON DELETE CASCADE,
  page_order INTEGER NOT NULL,
  year INTEGER NOT NULL,
  title TEXT,
  organization_data JSONB NOT NULL DEFAULT '{
    "rings": [],
    "activityGroups": [],
    "labels": [],
    "items": []
  }',
  override_colors JSONB,
  override_show_week_ring BOOLEAN,
  override_show_month_ring BOOLEAN,
  override_show_ring_names BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  CONSTRAINT unique_wheel_page_order UNIQUE(wheel_id, page_order),
  CONSTRAINT positive_page_order CHECK (page_order > 0)
);
```

**Key Insight**: `wheel_pages.organization_data` stores rings, activityGroups, labels, and items as JSONB! This is DIFFERENT from the normalized tables in the initial schema.

**Migration Behavior**:
- Converts existing wheels to page format (page_order = 1)
- Copies data from normalized tables (`wheel_rings`, `activity_groups`, `labels`, `items`) into `organization_data` JSONB
- Creates helper functions: `get_next_page_order()`, `duplicate_wheel_page()`

**Indexes**:
- `idx_wheel_pages_wheel_id` - Lookup pages by wheel
- `idx_wheel_pages_year` - Filter by year

**RLS Policies**: Full CRUD access for wheel owners and team members

---

### 006_ADD_VERSION_CONTROL.sql ✅
**Status**: Recovered from commit `00078b3`
**Purpose**: Add version history/snapshots for wheels

**Table Created**:
```sql
CREATE TABLE wheel_versions (
  id UUID PRIMARY KEY,
  wheel_id UUID REFERENCES year_wheels(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_description TEXT,
  is_auto_save BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  CONSTRAINT unique_wheel_version UNIQUE(wheel_id, version_number)
);
```

**Functions**:
- `create_wheel_version()` - Snapshots current wheel state
- `restore_wheel_version()` - Restores from snapshot

**RLS**: Users can view/create versions for wheels they own or are team members of

---

### 007_ADD_PUBLIC_SHARING.sql ✅
**Status**: Recovered from commit `516e9e4`
**Purpose**: Enable public wheel sharing

**Columns Modified**:
- `year_wheels.is_public` - Already exists, enhanced policies
- `year_wheels.share_token` - Already exists, enhanced generation

**Policy Updates**: Public wheels accessible via share token or `is_public = true`

---

### 008_ADD_PAGE_ID_TO_ITEMS.sql ✅ **CRITICAL**
**Status**: Recovered successfully from commit `9eb6242`
**Purpose**: Add `page_id` FK to `items` table for proper isolation

**Changes**:
```sql
ALTER TABLE items ADD COLUMN page_id UUID;
ALTER TABLE items ADD CONSTRAINT items_page_id_fkey 
  FOREIGN KEY (page_id) REFERENCES wheel_pages(id) ON DELETE CASCADE;
CREATE INDEX items_page_id_idx ON items(page_id);

-- Backfill existing items
UPDATE items 
SET page_id = (
  SELECT wp.id FROM wheel_pages wp 
  WHERE wp.wheel_id = items.wheel_id 
  AND wp.year = EXTRACT(YEAR FROM items.start_date::date)
  LIMIT 1
)
WHERE page_id IS NULL;

ALTER TABLE items ALTER COLUMN page_id SET NOT NULL;
```

**Critical**: This makes `page_id` a REQUIRED foreign key on items. Items are now scoped to specific pages.

---

## 🔥 CURRENT DATABASE STATE ANALYSIS

### AI Assistant Edge Function Expectations

The `supabase/functions/ai-assistant/index.ts` code expects:

1. **`wheel_pages` table EXISTS** ✅ (from migration 004)
2. **`items.page_id` column EXISTS** ✅ (from migration 005)  
3. **`wheel_rings` table has rows** ❌ **PROBLEM HERE!**
4. **`activity_groups` table has rows** ✅ (auto-creates if missing)

### The Ring Query Problem

**Current Code** (line 138-147):
```typescript
const { data: defaultRing, error: ringQueryError } = await supabase
  .from('wheel_rings')
  .select('id')
  .eq('wheel_id', wheelId)
  .limit(1)
  .maybeSingle()

if (!defaultRing) {
  // Create default ring
}
```

**Error Seen**:
```
Cannot coerce the result to a single JSON object
The result contains 0 rows
```

### Why Are Rings Missing?

**Hypothesis**: After migration 004 (`ADD_MULTI_PAGE_WHEELS`), rings exist in TWO places:

1. **Normalized tables**: `wheel_rings`, `activity_groups`, `labels` (original schema)
2. **JSONB field**: `wheel_pages.organization_data.rings` (new page-based system)

**The migration copies data INTO `organization_data` but DOES NOT delete from normalized tables.**

However, **new wheels created after the migration might only store data in `organization_data` and NOT create rows in `wheel_rings`!**

### Dual Storage System

```
OLD SYSTEM (normalized):
year_wheels
  ├─ wheel_rings (table rows)
  ├─ activity_groups (table rows)
  ├─ labels (table rows)
  └─ items (table rows)

NEW SYSTEM (page-based JSONB):
year_wheels
  └─ wheel_pages
       └─ organization_data: {
            rings: [{id, name, type, visible, ...}],
            activityGroups: [{id, name, color, ...}],
            labels: [{id, name, color, ...}],
            items: [{id, name, startDate, endDate, ...}]
          }
```

## 🎯 THE FIX

### Option A: Make AI Assistant Use JSONB Data
**Pros**: Aligns with current page-based architecture  
**Cons**: Complex - need to parse JSONB, can't use foreign keys

### Option B: Ensure Normalized Tables Stay in Sync ⭐ **RECOMMENDED**
**Pros**: Simple, maintains data integrity with FKs  
**Cons**: Need to sync JSONB ↔ normalized tables

**Implementation**:
1. When AI creates item → Insert into both `items` table AND update `wheel_pages.organization_data`
2. When frontend saves → Sync both representations
3. When loading → Prefer normalized tables, fall back to JSONB

### Option C: Full Migration to Page-Based Only
**Pros**: Single source of truth  
**Cons**: Lose referential integrity, complex queries, large refactor

---

## 🔧 IMMEDIATE ACTION ITEMS

1. **Verify Current Database State**:
   ```sql
   -- Check if wheel_pages exists
   SELECT COUNT(*) FROM wheel_pages;
   
   -- Check if items.page_id exists
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'items' AND column_name = 'page_id';
   
   -- Check wheel_rings for your test wheel
   SELECT * FROM wheel_rings WHERE wheel_id = '<your-wheel-id>';
   
   -- Check organization_data structure
   SELECT wheel_id, year, 
          jsonb_array_length(organization_data->'rings') as ring_count,
          jsonb_array_length(organization_data->'activityGroups') as group_count
   FROM wheel_pages LIMIT 5;
   ```

2. **Deploy Fixed AI Assistant** (already implemented):
   - Auto-creates ring if `wheel_rings` query returns 0 rows
   - Uses `.maybeSingle()` instead of `.single()` to handle empty results

3. **Sync Mechanism**:
   - Add database trigger to sync `wheel_rings` ↔ `organization_data.rings`
   - OR: Update frontend save logic to write to both places

4. **Documentation**:
   - Update ARCHITECTURE.md with dual-storage explanation
   - Document the page-based vs normalized table relationship

---

## 📋 COMPLETE MIGRATION CHECKLIST FOR FRESH DATABASE

Run in **EXACT** order:

1. [ ] **000_INITIAL_SCHEMA.sql** - Core tables (year_wheels, wheel_rings, ring_data, activity_groups, labels, items)
2. [ ] **001_CREATE_PROFILES_TABLE.sql** - User profiles
3. [ ] **002_enable_realtime.sql** - Enable Supabase realtime
4. [ ] **003_stripe_subscription_setup.sql** - Subscription support (adds subscriptions, subscription_events tables)
5. [ ] **004_team_collaboration_final.sql** - Team features (adds teams, team_members, team_invitations, adds team_id to year_wheels)
6. [ ] **005_ADD_MULTI_PAGE_WHEELS.sql** ⚠️ **CRITICAL** - Multi-page system (adds wheel_pages, migrates data)
7. [ ] **006_ADD_VERSION_CONTROL.sql** - Version history (adds wheel_versions)
8. [ ] **007_ADD_PUBLIC_SHARING.sql** - Public sharing enhancements
9. [ ] **008_ADD_PAGE_ID_TO_ITEMS.sql** ⚠️ **CRITICAL** - Links items to pages (adds page_id FK to items)

**Post-Migration Validation**:
```sql
-- Should show all 14 tables
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as cols
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected tables:
-- activity_groups (6 cols)
-- items (12 cols - including page_id!)
-- labels (6 cols)
-- profiles (6 cols)
-- ring_data (4 cols)
-- subscription_events (6 cols)
-- subscriptions (12 cols)
-- team_invitations (8 cols)
-- team_members (6 cols)
-- teams (6 cols)
-- wheel_pages (12 cols)
-- wheel_rings (9 cols)
-- wheel_versions (9 cols)
-- year_wheels (13 cols - including team_id!)

-- Critical checks:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'items' AND column_name = 'page_id'; 
-- Must return 'page_id'

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'year_wheels' AND column_name = 'team_id';
-- Must return 'team_id'

SELECT COUNT(*) FROM wheel_pages;
-- Should have migrated existing wheels to page format
```

---

## 🐛 KNOWN ISSUES

1. **Ring/Activity Group "N/A" Display**:
   - **Cause**: Frontend uses temporary IDs ("ring-1"), database uses UUIDs
   - **Status**: Separate from AI assistant issue
   - **Fix**: Sync organizationData with database on load

2. **Cross-Year Activities Missing**:
   - **Cause**: Target year page doesn't exist
   - **Status**: Fixed with auto-page-creation in AI assistant
   - **Fix**: AI now creates missing year pages automatically

3. **Dual Storage Confusion**:
   - **Cause**: Data exists in BOTH normalized tables AND JSONB
   - **Status**: Ongoing - need sync mechanism
   - **Fix**: Option B above (keep both in sync)

---

## 📚 REFERENCES

- Initial Schema: `SUPABASE_SETUP.md`
- Architecture: `ARCHITECTURE.md`
- Multi-Page Migration: `ADD_MULTI_PAGE_WHEELS.sql`
- Page ID Migration: `ADD_PAGE_ID_TO_ITEMS.sql`
- Git History: Commits `23c495dd`, `9eb6242`, `b5bcf2e`, `95ec041`, `22dcc05`, `59d0257`
