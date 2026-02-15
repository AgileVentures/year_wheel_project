# NPS System Flow Diagram

## User Journey Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER LOADS DASHBOARD                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Wait 5 seconds (non-intrusive)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Call shouldShowNPS() service function                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Query: should_show_nps(user_id) in database             │
│                                                                 │
│  Check:                                                         │
│  ✓ Has user created ≥1 wheel? (active user)                   │
│  ✓ Account age >1 day? (not brand new)                        │
│  ✓ Last submission >30 days ago? (or never)                   │
│  ✓ Last dismissal >7 days ago? (or never)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                   YES                 NO
                    │                   │
                    ▼                   ▼
        ┌────────────────────┐    [Don't show modal]
        │   SHOW NPS MODAL   │    [End journey]
        └────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│ MAYBE LATER  │      │ SELECT SCORE 0-10│
│              │      │ + Optional Comment│
└──────────────┘      └──────────────────┘
        │                       │
        ▼                       ▼
recordNPSShown()      submitNPSResponse()
        │                       │
        │                       ▼
        │              Update profiles:
        │              last_nps_submitted_at
        │                       │
        │                       ▼
        │              Insert into nps_responses:
        │              - user_id
        │              - score (0-10)
        │              - comment
        │              - context
        │                       │
        ▼                       ▼
[Won't show for     [Won't show for
 7 days]             30 days]
```

## Admin Dashboard Flow

```
┌─────────────────────────────────────────────────────────────────┐
│            ADMIN LOGS IN → ADMIN PANEL → NPS TAB                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Load NPS Data (Parallel)                     │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐ │
│  │  getNPSStats()          │  │  getNPSResponses()          │ │
│  │  - Total count          │  │  - Paginated list           │ │
│  │  - Average score        │  │  - With user profiles       │ │
│  │  - Promoter %           │  │  - Sorted by date           │ │
│  │  - Detractor %          │  │  - With comments            │ │
│  │  - Calculate NPS        │  │                             │ │
│  └─────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DISPLAY DASHBOARD                           │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐│
│  │  NPS Score   │ │    Total     │ │  Promoters   │ │Detract.││
│  │     67       │ │  Responses   │ │     80%      │ │  10%   ││
│  │  (Excellent) │ │      10      │ │   8 users    │ │ 1 user ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           RESPONSES TABLE                               │   │
│  ├──────┬────────────────┬───────┬──────────┬──────────────┤   │
│  │ Date │ User           │ Score │ Category │ Comment      │   │
│  ├──────┼────────────────┼───────┼──────────┼──────────────┤   │
│  │ 2/15 │ user@email.com │  [9]  │Promoter  │Love it!      │   │
│  │ 2/14 │ test@email.com │  [10] │Promoter  │Great UI      │   │
│  │ 2/13 │ user3@test.com │  [7]  │Passive   │Good, but... │   │
│  └──────┴────────────────┴───────┴──────────┴──────────────┘   │
│                                                                 │
│  [← Prev]  Page 1 of 1  [Next →]                               │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        auth.users (Supabase)                    │
│  ┌────────────────────────────────────────────────────┐         │
│  │ id (UUID)                                          │         │
│  │ email                                              │         │
│  │ created_at                                         │         │
│  └────────────────────────────────────────────────────┘         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ FK: user_id
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│   profiles      │  │ nps_responses    │  │   year_wheels       │
├─────────────────┤  ├──────────────────┤  ├─────────────────────┤
│ id (FK)         │  │ id (PK)          │  │ id (PK)             │
│ email           │  │ user_id (FK) ────┼──┤ user_id (FK)        │
│ full_name       │  │ score (0-10)     │  │ title               │
│ last_nps_shown  │  │ comment (TEXT)   │  │ created_at          │
│ last_nps_submit │  │ context (JSONB)  │  └─────────────────────┘
│ is_admin        │  │ created_at       │           │
└─────────────────┘  │ updated_at       │           │
                     └──────────────────┘           │
                                                    │
                           ┌────────────────────────┘
                           │ Used to determine
                           │ "active user" status
                           ▼
                    should_show_nps()
                    function checks
                    wheel count > 0
```

## Component Architecture

```
App.jsx
 │
 └─── Dashboard.jsx
       ├─── useEffect() → shouldShowNPS()
       │                   │
       │                   └─── npsService.js
       │                         │
       │                         └─── supabase.rpc('should_show_nps')
       │                               │
       │                               └─── Database Function
       │
       ├─── NPSModal (conditional)
       │     │
       │     ├─── Score buttons (0-10)
       │     ├─── Comment textarea
       │     ├─── Submit → submitNPSResponse()
       │     └─── Maybe Later → recordNPSShown()
       │
       └─── Other dashboard content


AdminPanel.jsx
 │
 ├─── Overview Tab
 ├─── Users Tab
 ├─── Wheels Tab
 ├─── Affiliates Tab
 ├─── Monday Tab
 │
 └─── NPS Tab ★ NEW
       │
       └─── AdminNPSPage.jsx
             │
             ├─── useEffect() → Load Data
             │     │
             │     ├─── getNPSStats()
             │     └─── getNPSResponses()
             │
             ├─── Stats Cards
             │     ├─── NPS Score
             │     ├─── Total Responses
             │     ├─── Promoters %
             │     └─── Detractors %
             │
             └─── Responses Table
                   ├─── Date
                   ├─── User Email
                   ├─── Score Badge
                   ├─── Category
                   └─── Comment
```

## Security & Permissions

```
┌─────────────────────────────────────────────────────────────────┐
│                    Row Level Security (RLS)                     │
└─────────────────────────────────────────────────────────────────┘

USER ACCESS:
  nps_responses
  ├─── SELECT: WHERE user_id = auth.uid()  ✓
  ├─── INSERT: WHERE user_id = auth.uid()  ✓
  ├─── UPDATE: Denied                      ✗
  └─── DELETE: Denied                      ✗

ADMIN ACCESS:
  nps_responses
  ├─── SELECT: WHERE is_admin = true       ✓
  ├─── INSERT: WHERE is_admin = true       ✓
  ├─── UPDATE: WHERE is_admin = true       ✓
  └─── DELETE: WHERE is_admin = true       ✓

┌─────────────────────────────────────────────────────────────────┐
│                         API Security                            │
└─────────────────────────────────────────────────────────────────┘

  Client (Browser)
       │
       │ JWT Token (auth.uid())
       ▼
  Supabase API
       │
       │ Validates JWT
       ▼
  PostgreSQL + RLS
       │
       │ Checks policies
       ▼
  Return authorized data only
```

## Timing Logic Visual

```
User Activity Timeline:

Day 0    Day 1         Day 7          Day 30         Day 37
  │        │            │               │              │
  │        │            │               │              │
  ▼        ▼            ▼               ▼              ▼
  
  Sign     First        Dismissed      Submitted      Modal
  Up       wheel        modal          feedback       shows
           created      │              │              again
           │            │              │              (30 days
           │            ▼              │              since
           │      [7-day cooldown]    │              submission)
           │            │              │
           ▼            ▼              ▼
           
         Modal       Won't show    Won't show
         shown       for 7 days    for 30 days
         (5 sec
         delay)

Legend:
  ▼ = Event occurs
  │ = Timeline continues
  [ ] = Cooldown period
```

## Data Flow Sequence

```
USER SUBMITS NPS FEEDBACK:

1. User clicks score button (e.g., 9)
2. User types comment (optional)
3. User clicks "Submit Feedback"
   │
   ▼
4. submitNPSResponse(9, "Great product!", {})
   │
   ├─ Step A: Insert into nps_responses
   │   INSERT INTO nps_responses (user_id, score, comment, context)
   │   VALUES (auth.uid(), 9, 'Great product!', '{}')
   │
   └─ Step B: Update profiles
       UPDATE profiles 
       SET last_nps_submitted_at = NOW()
       WHERE id = auth.uid()
   │
   ▼
5. Success response returned
   │
   ▼
6. Modal closes
   │
   ▼
7. Toast: "Thank you for your feedback!"
   │
   ▼
8. Won't show again for 30 days


ADMIN VIEWS DASHBOARD:

1. Admin clicks "NPS" tab
   │
   ▼
2. AdminNPSPage.jsx loads
   │
   ├─ Parallel Request 1: getNPSStats()
   │   SELECT score FROM nps_responses
   │   → Calculate NPS = (promoters% - detractors%)
   │
   └─ Parallel Request 2: getNPSResponses({ page: 1 })
       SELECT r.*, p.email, p.full_name
       FROM nps_responses r
       JOIN profiles p ON r.user_id = p.id
       ORDER BY r.created_at DESC
       LIMIT 50
   │
   ▼
3. Display dashboard with stats and table
   │
   ▼
4. Admin can paginate, read comments, analyze trends
```

This visual documentation shows the complete flow of the NPS system from user interaction to admin analysis!
