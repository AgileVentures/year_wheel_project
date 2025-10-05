# Year Wheel Architecture & Planning Document

## Current State Analysis

### Active Code Files
- ✅ **YearWheelClass.js** - Currently active implementation
- ❌ **YearWheelClassRedefined.js** - NOT in use (can be removed or archived)

### Project Structure
```
year_wheel_poc/
├── src/
│   ├── App.jsx (Main app component)
│   ├── YearWheel.jsx (Canvas wrapper component)
│   ├── YearWheelClass.js (Active wheel drawing class) ✓
│   ├── YearWheelClassRedefined.js (Unused - refactoring attempt) ✗
│   ├── RingManager.jsx (Manages inner rings)
│   ├── GeneralInputs.jsx (Title, year inputs)
│   ├── ColorPicker.jsx (Color selection)
│   └── ActionInputs.jsx (Save/Reset)
```

## Recent Improvements

### Week Number Generation Fix
- **Issue**: Week numbers were simple incrementing counters (1, 2, 3...)
- **Solution**: Implemented ISO 8601 week date system
- **Benefits**:
  - Proper alignment with calendar standards
  - Weeks correctly span year boundaries
  - Consistent with international date standards
  - Week numbers display as "W1", "W2", etc.

## Supabase Database Schema

### Recommended Tables

#### 1. **users** (Handled by Supabase Auth)
```sql
-- Managed by Supabase Auth
-- email, id, created_at, etc.
```

#### 2. **year_wheels**
```sql
create table year_wheels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  year integer not null,
  colors jsonb not null, -- Array of hex colors
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_public boolean default false,
  share_token text unique, -- For sharing functionality
  
  constraint year_wheels_user_id_fkey foreign key (user_id) 
    references auth.users(id) on delete cascade
);

-- Enable RLS
alter table year_wheels enable row level security;

-- Policies
create policy "Users can view their own wheels"
  on year_wheels for select
  using (auth.uid() = user_id or is_public = true);

create policy "Users can create their own wheels"
  on year_wheels for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own wheels"
  on year_wheels for update
  using (auth.uid() = user_id);

create policy "Users can delete their own wheels"
  on year_wheels for delete
  using (auth.uid() = user_id);

-- Index for performance
create index idx_year_wheels_user_id on year_wheels(user_id);
create index idx_year_wheels_share_token on year_wheels(share_token);
```

#### 3. **wheel_rings**
```sql
create table wheel_rings (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid references year_wheels(id) on delete cascade not null,
  ring_order integer not null, -- 0 = innermost ring
  orientation text check (orientation in ('vertical', 'horizontal')) not null,
  created_at timestamp with time zone default now(),
  
  constraint wheel_rings_wheel_id_fkey foreign key (wheel_id)
    references year_wheels(id) on delete cascade
);

-- Enable RLS
alter table wheel_rings enable row level security;

-- Policies (inherit from parent wheel)
create policy "Users can view rings of their wheels"
  on wheel_rings for select
  using (
    exists (
      select 1 from year_wheels 
      where id = wheel_rings.wheel_id 
      and (user_id = auth.uid() or is_public = true)
    )
  );

create policy "Users can manage rings of their wheels"
  on wheel_rings for all
  using (
    exists (
      select 1 from year_wheels 
      where id = wheel_rings.wheel_id 
      and user_id = auth.uid()
    )
  );

-- Index
create index idx_wheel_rings_wheel_id on wheel_rings(wheel_id);
```

#### 4. **ring_data**
```sql
create table ring_data (
  id uuid primary key default gen_random_uuid(),
  ring_id uuid references wheel_rings(id) on delete cascade not null,
  month_index integer check (month_index >= 0 and month_index < 12) not null,
  content text[] not null, -- Array of text lines for that month
  created_at timestamp with time zone default now(),
  
  constraint ring_data_ring_id_fkey foreign key (ring_id)
    references wheel_rings(id) on delete cascade,
  
  unique(ring_id, month_index)
);

-- Enable RLS
alter table ring_data enable row level security;

-- Policies (inherit from parent wheel)
create policy "Users can view data of their wheels"
  on ring_data for select
  using (
    exists (
      select 1 from wheel_rings wr
      join year_wheels yw on yw.id = wr.wheel_id
      where wr.id = ring_data.ring_id 
      and (yw.user_id = auth.uid() or yw.is_public = true)
    )
  );

create policy "Users can manage data of their wheels"
  on ring_data for all
  using (
    exists (
      select 1 from wheel_rings wr
      join year_wheels yw on yw.id = wr.wheel_id
      where wr.id = ring_data.ring_id 
      and yw.user_id = auth.uid()
    )
  );

-- Index
create index idx_ring_data_ring_id on ring_data(ring_id);
```

#### 5. **shared_wheels** (Optional - for tracking shares)
```sql
create table shared_wheels (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid references year_wheels(id) on delete cascade not null,
  shared_by uuid references auth.users(id) on delete cascade not null,
  shared_with_email text,
  viewed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  
  constraint shared_wheels_wheel_id_fkey foreign key (wheel_id)
    references year_wheels(id) on delete cascade
);

-- Enable RLS
alter table shared_wheels enable row level security;

-- Policies
create policy "Users can view their shared wheels"
  on shared_wheels for select
  using (auth.uid() = shared_by);

create policy "Users can create shares"
  on shared_wheels for insert
  with check (auth.uid() = shared_by);
```

## UI/UX Recommendations

### 1. **Navigation & Layout**
- **Dashboard**: Grid/list view of saved year wheels
- **Side Panel**: Keep current controls (inputs, colors, rings)
- **Main Canvas**: Year wheel visualization
- **Top Bar**: User menu, save/load, share buttons

### 2. **User Authentication Flow**
```
┌─────────────────┐
│  Landing Page   │
│  - Demo wheel   │
│  - Sign up/in   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Dashboard     │
│  - My Wheels    │
│  - + New Wheel  │
│  - Templates    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Wheel Editor   │
│  - Live preview │
│  - Auto-save    │
└─────────────────┘
```

### 3. **Key Features to Implement**

#### Phase 1: Authentication & Basic CRUD
- [ ] Supabase Auth integration (Email + OAuth providers)
- [ ] User dashboard with wheel listing
- [ ] Create new wheel
- [ ] Auto-save (debounced, every 3 seconds)
- [ ] Manual save button
- [ ] Delete wheel (with confirmation)

#### Phase 2: Enhanced Features
- [ ] Duplicate wheel
- [ ] Wheel templates (pre-configured rings)
- [ ] Search/filter wheels by year or title
- [ ] Export functionality (PNG, SVG, PDF)
- [ ] Undo/redo functionality

#### Phase 3: Sharing & Collaboration
- [ ] Generate shareable link (public view)
- [ ] Share via email
- [ ] View-only mode for shared wheels
- [ ] Copy/fork shared wheel to own account
- [ ] Privacy settings (private, public, link-only)

### 4. **Component Structure Refactoring**

```jsx
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   ├── SignupForm.jsx
│   │   └── AuthProvider.jsx
│   ├── dashboard/
│   │   ├── Dashboard.jsx
│   │   ├── WheelCard.jsx
│   │   └── WheelList.jsx
│   ├── editor/
│   │   ├── YearWheelEditor.jsx
│   │   ├── Canvas/
│   │   │   ├── YearWheel.jsx
│   │   │   └── YearWheelClass.js
│   │   ├── Controls/
│   │   │   ├── GeneralInputs.jsx
│   │   │   ├── ColorPicker.jsx
│   │   │   ├── RingManager.jsx
│   │   │   └── ActionInputs.jsx
│   │   └── Toolbar/
│   │       ├── SaveButton.jsx
│   │       ├── ShareButton.jsx
│   │       └── ExportButton.jsx
│   └── shared/
│       ├── Button.jsx
│       ├── Modal.jsx
│       └── Toast.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useYearWheel.js
│   ├── useAutoSave.js
│   └── useSupabase.js
├── services/
│   ├── supabase.js (Supabase client)
│   ├── wheelService.js (CRUD operations)
│   └── shareService.js (Sharing logic)
└── utils/
    ├── wheelHelpers.js
    └── dateHelpers.js
```

### 5. **UX Improvements**

#### Current Issues to Address:
1. **No persistence** - Users lose work on refresh
2. **No user accounts** - Can't save multiple wheels
3. **Limited discoverability** - No templates or examples
4. **Manual save only** - Risk of data loss

#### Recommended Solutions:
1. **Auto-save**: Implement debounced auto-save (3-5 seconds after last change)
2. **Loading states**: Show spinners during save/load operations
3. **Toast notifications**: Confirm saves, errors, shares
4. **Optimistic updates**: Update UI immediately, sync to DB in background
5. **Keyboard shortcuts**: 
   - `Ctrl/Cmd + S` - Save
   - `Ctrl/Cmd + Z` - Undo
   - `Ctrl/Cmd + Shift + Z` - Redo
6. **Responsive design**: Mobile-friendly interface
7. **Onboarding**: Tutorial for first-time users
8. **Templates**: Pre-configured wheels for common use cases

### 6. **Data Flow Architecture**

```
User Action
    ↓
React Component
    ↓
Custom Hook (useYearWheel)
    ↓
Service Layer (wheelService)
    ↓
Supabase Client
    ↓
PostgreSQL Database
    ↓
Real-time Subscription (optional)
    ↓
Update UI
```

### 7. **Security Considerations**

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ User can only access their own wheels
- ✅ Public wheels accessible via `is_public` flag
- ✅ Shared wheels use unique tokens
- ✅ Cascade deletes on user deletion
- ⚠️ Validate year range (e.g., 1900-2100)
- ⚠️ Sanitize user input (title, ring data)
- ⚠️ Rate limiting on wheel creation
- ⚠️ File size limits on exports

## Migration Plan

### Step 1: Setup Supabase
1. Create Supabase project
2. Run SQL migrations (create tables)
3. Configure authentication providers
4. Set up environment variables

### Step 2: Install Dependencies
```bash
npm install @supabase/supabase-js
npm install @supabase/auth-ui-react (optional, for pre-built auth UI)
```

### Step 3: Implement Authentication
1. Create Supabase client
2. Build login/signup forms
3. Add AuthProvider context
4. Protect routes

### Step 4: Implement Data Layer
1. Create wheelService for CRUD operations
2. Update App.jsx to load/save from Supabase
3. Add auto-save functionality
4. Implement dashboard view

### Step 5: Add Sharing Features
1. Generate share tokens
2. Create public view page
3. Add share modal/dialog

## Performance Optimization

### Current State
- Canvas re-renders on every state change
- No memoization of expensive calculations
- Local storage only (no cloud sync)

### Recommendations
1. **React.memo()** - Memoize YearWheel component
2. **useMemo()** - Memoize wheel generation calculations
3. **useCallback()** - Memoize event handlers
4. **Debouncing** - Debounce text inputs and auto-save
5. **Lazy loading** - Load wheels on demand in dashboard
6. **Image caching** - Cache exported images
7. **Virtual scrolling** - For large lists of wheels

## Testing Strategy

### Unit Tests
- Supabase service functions
- Date/week calculation helpers
- Color picker logic

### Integration Tests
- Auth flow (signup, login, logout)
- Wheel CRUD operations
- Share functionality

### E2E Tests
- Complete user journey
- Save and load wheel
- Share and view shared wheel

## Accessibility Considerations

- ✅ Keyboard navigation
- ✅ ARIA labels on buttons and inputs
- ✅ Focus management in modals
- ✅ Color contrast (WCAG AA)
- ✅ Screen reader support
- ⚠️ Canvas accessibility (provide text alternative)

## Future Enhancements

### v2.0
- [ ] Collaborative editing (real-time)
- [ ] Comments/annotations on wheel sections
- [ ] AI-powered suggestions for activities
- [ ] Calendar integration (Google Calendar, iCal)
- [ ] Mobile app (React Native)
- [ ] Print optimization

### v3.0
- [ ] Teams/organizations
- [ ] Admin dashboard
- [ ] Analytics (most popular activities)
- [ ] API for third-party integrations

## Cost Estimation (Supabase)

### Free Tier Limits
- 500MB database
- 1GB file storage
- 2GB bandwidth
- 50,000 monthly active users

This should be **more than sufficient** for initial launch and testing.

### Paid Tier ($25/month)
- 8GB database
- 100GB file storage
- 250GB bandwidth
- 100,000 monthly active users

## Next Steps

1. ✅ Fix week number alignment (COMPLETED)
2. 🔄 Review and approve database schema
3. 📋 Create Supabase project
4. 📋 Implement authentication layer
5. 📋 Build dashboard UI
6. 📋 Implement CRUD operations
7. 📋 Add sharing functionality
8. 📋 Deploy to production

---

## Questions to Consider

1. **Authentication**: Which providers? (Email, Google, GitHub, etc.)
2. **Pricing**: Will this be free, freemium, or paid?
3. **Storage**: Any limits on number of wheels per user?
4. **Export**: Should we support PDF export? (requires additional library)
5. **Localization**: Multi-language support needed?
6. **Branding**: Custom domains for shared wheels?

---

**Document Version**: 1.0  
**Last Updated**: October 5, 2025  
**Author**: GitHub Copilot  
