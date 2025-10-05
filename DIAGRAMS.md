# Architecture Diagrams

## Current Architecture (Before Supabase)

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                   React App                        │    │
│  │                                                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │    │
│  │  │ App.jsx  │─▶│YearWheel │─▶│YearWheelClass│    │    │
│  │  │          │  │   .jsx   │  │    .js       │    │    │
│  │  └────┬─────┘  └──────────┘  └──────────────┘    │    │
│  │       │                                            │    │
│  │       │ ┌──────────┐  ┌──────────┐               │    │
│  │       ├─│  Color   │  │  Ring    │               │    │
│  │       │ │ Picker   │  │ Manager  │               │    │
│  │       │ └──────────┘  └──────────┘               │    │
│  │       │                                            │    │
│  │       │ ┌──────────────────────────────┐         │    │
│  │       └▶│   Local Storage              │         │    │
│  │         │  - Single wheel              │         │    │
│  │         │  - Lost on clear             │         │    │
│  │         │  - No sync                   │         │    │
│  │         └──────────────────────────────┘         │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Limitations:
❌ No user accounts
❌ No persistence across devices
❌ Single wheel at a time
❌ No sharing capability
❌ Data lost on clear cache
```

## Future Architecture (With Supabase)

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Browser                                     │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                      React App                              │     │
│  │                                                              │     │
│  │  ┌─────────────┐     ┌─────────────┐    ┌─────────────┐   │     │
│  │  │  Dashboard  │────▶│   Editor    │───▶│   Canvas    │   │     │
│  │  │             │     │             │    │             │   │     │
│  │  │ - My Wheels │     │ - Controls  │    │ - YearWheel │   │     │
│  │  │ - Templates │     │ - Auto-save │    │   Class     │   │     │
│  │  └─────────────┘     └─────────────┘    └─────────────┘   │     │
│  │         │                    │                              │     │
│  │         │                    │                              │     │
│  │  ┌──────▼────────────────────▼──────────────────────┐     │     │
│  │  │         Custom Hooks & Services                   │     │     │
│  │  │                                                    │     │     │
│  │  │  useAuth()  useYearWheel()  useAutoSave()       │     │     │
│  │  │  wheelService   shareService                     │     │     │
│  │  └──────────────────────┬────────────────────────────┘     │     │
│  │                         │                                   │     │
│  └─────────────────────────┼───────────────────────────────────┘     │
│                            │                                          │
└────────────────────────────┼──────────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Supabase Cloud                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                  Authentication                             │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │    │
│  │  │  Email   │  │  Google  │  │  GitHub  │                 │    │
│  │  └──────────┘  └──────────┘  └──────────┘                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                  PostgreSQL Database                        │    │
│  │                                                              │    │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │    │
│  │  │ year_wheels  │◀─▶│ wheel_rings  │◀─▶│  ring_data   │   │    │
│  │  │              │   │              │   │              │   │    │
│  │  │ - id         │   │ - wheel_id   │   │ - ring_id    │   │    │
│  │  │ - user_id    │   │ - order      │   │ - month_idx  │   │    │
│  │  │ - title      │   │ - orientation│   │ - content[]  │   │    │
│  │  │ - year       │   └──────────────┘   └──────────────┘   │    │
│  │  │ - colors[]   │                                          │    │
│  │  │ - is_public  │                                          │    │
│  │  │ - share_token│                                          │    │
│  │  └──────────────┘                                          │    │
│  │                                                              │    │
│  │  Row Level Security (RLS) Enabled                          │    │
│  │  Users can only access their own data                      │    │
│  │                                                              │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                   Real-time (Optional)                      │    │
│  │  Live updates, collaborative editing                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

Benefits:
✅ User accounts & authentication
✅ Multiple wheels per user
✅ Persistent across devices
✅ Shareable links
✅ Auto-save
✅ Public/private wheels
✅ Secure with RLS
```

## Data Flow Diagram

### Creating a New Wheel

```
User clicks "Create New"
         │
         ▼
    Dashboard.jsx
         │
         ▼
  wheelService.createWheel()
         │
         ▼
    Supabase Client
         │
         ▼
  PostgreSQL INSERT
   (year_wheels table)
         │
         ▼
    Return wheel ID
         │
         ▼
  Navigate to Editor
         │
         ▼
   Load empty wheel
         │
         ▼
    User edits
         │
         ▼
    Auto-save (3s)
         │
         ▼
  wheelService.updateWheel()
         │
         ▼
    Database UPDATE
         │
         ▼
  Show "Saved" indicator
```

### Loading a Wheel

```
User clicks wheel card
         │
         ▼
    Dashboard.jsx
         │
         ▼
  wheelService.getWheel(id)
         │
         ▼
    Supabase RPC call
  (get_wheel_full_data)
         │
         ▼
  PostgreSQL JOIN query
  (wheels + rings + data)
         │
         ▼
    Return JSON object
         │
         ▼
  Populate editor state
  - title, year, colors
  - rings configuration
  - ring data for months
         │
         ▼
  Re-render YearWheel
         │
         ▼
    Display to user
```

### Sharing a Wheel

```
User clicks "Share"
         │
         ▼
    Editor toolbar
         │
         ▼
  wheelService.generateShareToken()
         │
         ▼
    Supabase function
  (generate_share_token)
         │
         ▼
  UPDATE year_wheels
  SET share_token = 'abc123'
      is_public = true
         │
         ▼
  Return share URL
  example.com/share/abc123
         │
         ▼
  Show in modal
  + Copy to clipboard
         │
         ▼
  Recipient opens link
         │
         ▼
  PublicView.jsx
         │
         ▼
  wheelService.getWheelByShareToken()
         │
         ▼
  Load wheel (read-only)
         │
         ▼
  Show wheel + "Create Your Own"
```

## Component Hierarchy

### Current Structure

```
App.jsx
├── GeneralInputs.jsx
├── ColorPicker.jsx
├── RingManager.jsx
│   ├── Ring.jsx
│   │   └── MonthTextarea.jsx
│   └── RingButton.jsx
├── ActionInputs.jsx
└── YearWheel.jsx
    └── YearWheelClass.js
```

### Proposed Structure

```
main.jsx
└── AuthProvider
    └── App.jsx
        ├── Route: /login
        │   ├── LoginForm.jsx
        │   └── SignupForm.jsx
        │
        ├── Route: /dashboard
        │   └── Dashboard.jsx
        │       ├── WheelCard.jsx (repeated)
        │       └── WheelList.jsx
        │
        └── Route: /editor/:id
            └── YearWheelEditor.jsx
                ├── Toolbar
                │   ├── SaveButton.jsx
                │   ├── ShareButton.jsx
                │   └── ExportButton.jsx
                │
                ├── Controls
                │   ├── GeneralInputs.jsx
                │   ├── ColorPicker.jsx
                │   ├── RingManager.jsx
                │   │   ├── Ring.jsx
                │   │   │   └── MonthTextarea.jsx
                │   │   └── RingButton.jsx
                │   └── ActionInputs.jsx
                │
                └── Canvas
                    └── YearWheel.jsx
                        └── YearWheelClass.js
```

## Authentication Flow

```
┌──────────────┐
│  Landing     │
│  Page        │
│              │
│ [Sign Up/In] │
└───────┬──────┘
        │
        ├─────────────┐
        ▼             ▼
┌──────────┐   ┌──────────┐
│  Email   │   │  OAuth   │
│  Sign Up │   │ (Google) │
└─────┬────┘   └─────┬────┘
      │              │
      │  Supabase    │
      │  Auth API    │
      │              │
      └──────┬───────┘
             ▼
      ┌──────────────┐
      │  JWT Token   │
      │  Generated   │
      └──────┬───────┘
             ▼
      ┌──────────────┐
      │  Redirect to │
      │  Dashboard   │
      └──────────────┘
```

## Database Relationships

```
┌─────────────────────────────────────────────────────────┐
│                    auth.users                           │
│                  (Supabase Auth)                        │
│                                                          │
│  id | email | created_at | ...                         │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 1:N (one user, many wheels)
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                    year_wheels                          │
│                                                          │
│  id | user_id | title | year | colors | is_public |    │
│     | share_token | created_at | updated_at             │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 1:N (one wheel, many rings)
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                    wheel_rings                          │
│                                                          │
│  id | wheel_id | ring_order | orientation               │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 1:N (one ring, many data entries)
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                    ring_data                            │
│                                                          │
│  id | ring_id | month_index | content[]                │
└─────────────────────────────────────────────────────────┘

Foreign Keys:
- year_wheels.user_id → auth.users.id (CASCADE DELETE)
- wheel_rings.wheel_id → year_wheels.id (CASCADE DELETE)
- ring_data.ring_id → wheel_rings.id (CASCADE DELETE)

Indexes:
- year_wheels: user_id, share_token
- wheel_rings: wheel_id, (wheel_id + ring_order)
- ring_data: ring_id
```

## Security Model (Row Level Security)

```
┌────────────────────────────────────────────────────┐
│                 Incoming Request                    │
└───────────────────┬────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│            Supabase API Gateway                     │
│         (Validates JWT Token)                       │
└───────────────────┬────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│         Row Level Security Check                    │
│                                                     │
│  SELECT * FROM year_wheels                         │
│  WHERE auth.uid() = user_id                        │
│     OR is_public = true                            │
│                                                     │
│  Policy enforced at database level                 │
└───────────────────┬────────────────────────────────┘
                    │
                    ├────────────┬────────────┐
                    ▼            ▼            ▼
            ┌────────────┐ ┌─────────┐ ┌──────────┐
            │   ALLOW    │ │  DENY   │ │  ERROR   │
            │  (Owner)   │ │ (Other) │ │(Invalid) │
            └────────────┘ └─────────┘ └──────────┘

Users can ONLY access:
✅ Their own wheels (user_id = auth.uid())
✅ Public wheels (is_public = true)
✅ Wheels shared via valid token

Users CANNOT access:
❌ Other users' private wheels
❌ Deleted wheels
❌ Invalid share tokens
```

## Performance Optimization

### Query Optimization

```
Before: Multiple Queries (N+1 Problem)
┌──────────────────────────┐
│ SELECT * FROM wheels     │ ← 1 query
└──────────────────────────┘
           │
           ├─────────────┬─────────────┬──────────────┐
           ▼             ▼             ▼              ▼
┌────────────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐
│ GET rings #1   │ │ GET #2    │ │ GET #3   │ │ GET #N    │
└────────────────┘ └───────────┘ └──────────┘ └───────────┘
           │             │             │              │
           ├─────────────┼─────────────┼──────────────┤
           ▼             ▼             ▼              ▼
┌────────────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐
│ GET data #1    │ │ GET #2    │ │ GET #3   │ │ GET #N    │
└────────────────┘ └───────────┘ └──────────┘ └───────────┘

Total: 1 + N + (N × 12) queries! 😱

After: Single Query with JOINs
┌──────────────────────────────────────────────┐
│ SELECT wheel.*, rings.*, data.*              │
│ FROM year_wheels wheel                       │
│ LEFT JOIN wheel_rings rings ON ...           │
│ LEFT JOIN ring_data data ON ...              │
│ WHERE wheel.id = $1                          │
└──────────────────────────────────────────────┘

Total: 1 query! 🚀

OR use Supabase RPC function:
┌──────────────────────────────────────────────┐
│ SELECT get_wheel_full_data($1)              │
└──────────────────────────────────────────────┘

Returns complete JSON object in single query
```

## Deployment Pipeline

```
Developer
    │
    │ git push
    ▼
GitHub
    │
    │ webhook
    ▼
Vercel/Netlify
    │
    ├─ Install dependencies
    ├─ Build (npm run build)
    ├─ Run tests
    └─ Deploy
    │
    ▼
CDN Edge Locations
    │
    ▼
End Users
    │
    │ API calls
    ▼
Supabase Cloud
```

---

**These diagrams should help visualize:**
- Current limitations vs future capabilities
- How data flows through the system
- Component relationships
- Security model
- Database structure

**Next Steps**: Review these diagrams with your team and start implementing Phase 1!
