# Supabase Setup Guide - Year Wheel POC

## Step 1: Create Supabase Project

### 1.1 Sign Up / Log In
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign in"
3. Sign up with GitHub (recommended) or email

### 1.2 Create New Project
1. Click "New Project"
2. Choose your organization (or create one)
3. Fill in project details:
   - **Project name**: `year-wheel-poc`
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to your users (e.g., `Europe (Stockholm)`)
   - **Pricing Plan**: Free (sufficient for development)
4. Click "Create new project"
5. Wait 2-3 minutes for project to be provisioned

### 1.3 Get Your API Keys
1. In your project dashboard, go to **Settings** → **API**
2. You'll need these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (this is safe to use in client-side code)
   - **service_role key**: `eyJhbGc...` (keep this SECRET - server-side only!)

---

## Step 2: Configure Authentication

### 2.1 Enable Email Authentication
1. Go to **Authentication** → **Providers**
2. Find **Email** provider
3. Toggle it **ON** (it should be enabled by default)
4. Configure settings:
   - **Enable email confirmations**: 
     - ⚠️ **For Development**: Turn **OFF** to skip email confirmation (faster testing)
     - ✅ **For Production**: Turn **ON** to require email verification
   - ✅ **Enable email OTP**: Optional
   - ✅ **Secure email change**: ON
   - ✅ **Enable phone confirmations**: OFF

> **Note**: If email confirmation is enabled, users must click the link in the confirmation email before they can log in. The email is sent from Supabase and may take a few minutes to arrive. Check your spam folder if you don't see it.

### 2.2 Configure Email Templates (Optional)
1. Go to **Authentication** → **Email Templates**
2. Customize templates for:
   - Confirm signup
   - Invite user
   - Magic link
   - Change email address
   - Reset password

### 2.3 Site URL Configuration
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:5173` (for development)
3. Add **Redirect URLs**:
   - `http://localhost:5173/**`
   - Add your production URL later

---

## Step 3: Run Database Migrations

### 3.1 Open SQL Editor
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**

### 3.2 Create Database Schema
Copy and paste the following SQL and click **Run**:

```sql
-- =============================================
-- YEAR WHEEL DATABASE SCHEMA
-- Version: 1.0
-- Date: October 8, 2025
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- TABLE: year_wheels
-- Main wheel configurations
-- =============================================
create table public.year_wheels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Organisation',
  year integer not null,
  colors jsonb not null default '["#334155", "#475569", "#64748B", "#94A3B8"]',
  show_week_ring boolean not null default true,
  show_month_ring boolean not null default true,
  show_ring_names boolean not null default true,
  is_public boolean not null default false,
  share_token text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint year_valid check (year >= 1900 and year <= 2100),
  constraint title_length check (char_length(title) > 0 and char_length(title) <= 200)
);

-- =============================================
-- TABLE: wheel_rings
-- Ring configurations (inner/outer)
-- =============================================
create table public.wheel_rings (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid references public.year_wheels(id) on delete cascade not null,
  name text not null default 'Ring',
  type text not null check (type in ('inner', 'outer')),
  color text,
  visible boolean not null default true,
  ring_order integer not null,
  orientation text check (orientation in ('vertical', 'horizontal')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint name_length check (char_length(name) > 0 and char_length(name) <= 100),
  constraint valid_color check (color is null or color ~ '^#[0-9A-Fa-f]{6}$')
);

-- =============================================
-- TABLE: ring_data
-- Month-specific data for inner rings
-- =============================================
create table public.ring_data (
  id uuid primary key default gen_random_uuid(),
  ring_id uuid references public.wheel_rings(id) on delete cascade not null,
  month_index integer not null,
  content text[] not null default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint month_index_valid check (month_index >= 0 and month_index < 12),
  constraint unique_ring_month unique(ring_id, month_index)
);

-- =============================================
-- TABLE: activity_groups
-- Activity categories with colors
-- =============================================
create table public.activity_groups (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid references public.year_wheels(id) on delete cascade not null,
  name text not null,
  color text not null,
  visible boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint name_length check (char_length(name) > 0 and char_length(name) <= 100),
  constraint valid_color check (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- =============================================
-- TABLE: labels
-- Optional labels for activities
-- =============================================
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid references public.year_wheels(id) on delete cascade not null,
  name text not null,
  color text not null,
  visible boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint name_length check (char_length(name) > 0 and char_length(name) <= 100),
  constraint valid_color check (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- =============================================
-- TABLE: items
-- Activities/events on the wheel
-- =============================================
create table public.items (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid references public.year_wheels(id) on delete cascade not null,
  ring_id uuid references public.wheel_rings(id) on delete cascade not null,
  activity_id uuid references public.activity_groups(id) on delete cascade not null,
  label_id uuid references public.labels(id) on delete set null,
  name text not null,
  start_date date not null,
  end_date date not null,
  time text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint name_length check (char_length(name) > 0 and char_length(name) <= 200),
  constraint date_order check (end_date >= start_date)
);

-- =============================================
-- INDEXES for performance
-- =============================================
create index idx_year_wheels_user_id on public.year_wheels(user_id);
create index idx_year_wheels_share_token on public.year_wheels(share_token) where share_token is not null;
create index idx_year_wheels_is_public on public.year_wheels(is_public) where is_public = true;

create index idx_wheel_rings_wheel_id on public.wheel_rings(wheel_id);
create index idx_ring_data_ring_id on public.ring_data(ring_id);
create index idx_activity_groups_wheel_id on public.activity_groups(wheel_id);
create index idx_labels_wheel_id on public.labels(wheel_id);
create index idx_items_wheel_id on public.items(wheel_id);
create index idx_items_ring_id on public.items(ring_id);
create index idx_items_activity_id on public.items(activity_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
alter table public.year_wheels enable row level security;
alter table public.wheel_rings enable row level security;
alter table public.ring_data enable row level security;
alter table public.activity_groups enable row level security;
alter table public.labels enable row level security;
alter table public.items enable row level security;

-- =============================================
-- RLS POLICIES: year_wheels
-- =============================================

-- Users can view their own wheels or public wheels
create policy "Users can view own or public wheels"
  on public.year_wheels for select
  using (
    auth.uid() = user_id 
    or is_public = true
  );

-- Users can create their own wheels
create policy "Users can create own wheels"
  on public.year_wheels for insert
  with check (auth.uid() = user_id);

-- Users can update their own wheels
create policy "Users can update own wheels"
  on public.year_wheels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own wheels
create policy "Users can delete own wheels"
  on public.year_wheels for delete
  using (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES: wheel_rings
-- =============================================

create policy "Users can view rings of accessible wheels"
  on public.wheel_rings for select
  using (
    exists (
      select 1 from public.year_wheels 
      where id = wheel_rings.wheel_id 
      and (user_id = auth.uid() or is_public = true)
    )
  );

create policy "Users can manage rings of own wheels"
  on public.wheel_rings for all
  using (
    exists (
      select 1 from public.year_wheels 
      where id = wheel_rings.wheel_id 
      and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.year_wheels 
      where id = wheel_rings.wheel_id 
      and user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: ring_data
-- =============================================

create policy "Users can view ring_data of accessible wheels"
  on public.ring_data for select
  using (
    exists (
      select 1 from public.wheel_rings wr
      join public.year_wheels yw on yw.id = wr.wheel_id
      where wr.id = ring_data.ring_id 
      and (yw.user_id = auth.uid() or yw.is_public = true)
    )
  );

create policy "Users can manage ring_data of own wheels"
  on public.ring_data for all
  using (
    exists (
      select 1 from public.wheel_rings wr
      join public.year_wheels yw on yw.id = wr.wheel_id
      where wr.id = ring_data.ring_id 
      and yw.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.wheel_rings wr
      join public.year_wheels yw on yw.id = wr.wheel_id
      where wr.id = ring_data.ring_id 
      and yw.user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: activity_groups
-- =============================================

create policy "Users can view activity_groups of accessible wheels"
  on public.activity_groups for select
  using (
    exists (
      select 1 from public.year_wheels 
      where id = activity_groups.wheel_id 
      and (user_id = auth.uid() or is_public = true)
    )
  );

create policy "Users can manage activity_groups of own wheels"
  on public.activity_groups for all
  using (
    exists (
      select 1 from public.year_wheels 
      where id = activity_groups.wheel_id 
      and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.year_wheels 
      where id = activity_groups.wheel_id 
      and user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: labels
-- =============================================

create policy "Users can view labels of accessible wheels"
  on public.labels for select
  using (
    exists (
      select 1 from public.year_wheels 
      where id = labels.wheel_id 
      and (user_id = auth.uid() or is_public = true)
    )
  );

create policy "Users can manage labels of own wheels"
  on public.labels for all
  using (
    exists (
      select 1 from public.year_wheels 
      where id = labels.wheel_id 
      and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.year_wheels 
      where id = labels.wheel_id 
      and user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: items
-- =============================================

create policy "Users can view items of accessible wheels"
  on public.items for select
  using (
    exists (
      select 1 from public.year_wheels 
      where id = items.wheel_id 
      and (user_id = auth.uid() or is_public = true)
    )
  );

create policy "Users can manage items of own wheels"
  on public.items for all
  using (
    exists (
      select 1 from public.year_wheels 
      where id = items.wheel_id 
      and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.year_wheels 
      where id = items.wheel_id 
      and user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS: Auto-update updated_at timestamp
-- =============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- Create triggers for updated_at
create trigger set_updated_at
  before update on public.year_wheels
  for each row
  execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.items
  for each row
  execute function public.handle_updated_at();

-- =============================================
-- FUNCTION: Generate share token
-- =============================================

create or replace function public.generate_share_token()
returns text as $$
begin
  return encode(gen_random_bytes(16), 'base64');
end;
$$ language plpgsql security definer;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Verify tables were created
select 
  table_name, 
  (select count(*) from information_schema.columns where table_name = t.table_name) as column_count
from information_schema.tables t
where table_schema = 'public'
and table_type = 'BASE TABLE'
order by table_name;
```

### 3.3 Verify Migration Success
After running the migration, you should see output showing:
- 6 tables created: `year_wheels`, `wheel_rings`, `ring_data`, `activity_groups`, `labels`, `items`
- Multiple indexes created
- RLS policies enabled
- Triggers created

---

## Step 4: Install Supabase Client in Your Project

### 4.1 Install Dependencies
```bash
cd /Users/thomasochman/Projects/year_wheel_poc
npm install @supabase/supabase-js
```

### 4.2 Create Environment Variables
Create a `.env` file in your project root:

```bash
# .env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace with your actual values from Supabase dashboard (Settings → API)

### 4.3 Add .env to .gitignore
```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## Step 5: Create Supabase Client Configuration

I'll create the necessary service files in the next step.

---

## Testing the Setup

### Test 1: Check if tables exist
1. Go to **Database** → **Tables** in Supabase dashboard
2. You should see 6 tables listed

### Test 2: Check RLS policies
1. Go to **Authentication** → **Policies**
2. Each table should show multiple policies

### Test 3: Try to query (should fail without auth)
1. Go to **SQL Editor**
2. Run: `select * from year_wheels;`
3. Should return empty result (no error = RLS working!)

---

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ Policies restrict access to user's own data
- ✅ Public wheels accessible via `is_public` flag
- ✅ Cascade deletes configured
- ✅ Input validation with CHECK constraints
- ✅ Indexes for performance
- ✅ Timestamps in UTC
- ✅ Share tokens are unique and random

---

## Next Steps

After completing this setup:
1. ✅ Supabase project created
2. ✅ Database schema migrated
3. ✅ Authentication configured
4. 📋 Create Supabase service files (next)
5. 📋 Implement authentication UI
6. 📋 Update App.jsx to use Supabase
7. 📋 Test end-to-end flow

---

## Troubleshooting

### Issue: "relation does not exist"
**Solution**: Make sure you ran the migration SQL in the SQL Editor

### Issue: "permission denied for table"
**Solution**: RLS policies might not be set up correctly. Re-run the RLS policy section.

### Issue: Can't connect from local app
**Solution**: Check that your `.env` file has correct URL and anon key

### Issue: CORS errors
**Solution**: Add your localhost URL to allowed origins in Supabase dashboard

---

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Setup Guide Version**: 1.0  
**Last Updated**: October 8, 2025  
**Database Schema Version**: 1.0
