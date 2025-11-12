# Year Wheel POC - AI Coding Agent Instructions

## Project Overview
YearWheel Planner annual planning SaaS application built with React, Supabase, and OpenAI. Users can visualize entire years in an interactive circular calendar with team collaboration, The application supports multi-year projects, real-time collaboration, version control, and premium subscription features via Stripe.

## wheel structure

{
  metadata: { wheelId, title, year, colors, showWeekRing, etc },
  structure: { rings, activityGroups, labels },
  pages: [
    { id, year, pageOrder, title, items: [...] }
  ]
}

## Documentation
We do NOT need summary documents. We do NOT need partial implementation guides. We do NOT need debugging checklists. We do NOT need quick reference guides. 

## Version control
The project uses Git with feature branches. 
Use one or two-line messages for commits

## Core Architecture

### Tech Stack
- **Frontend**: React 18.2, Vite 5.0, TailwindCSS 3, React Router 7.9
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **AI**: OpenAI GPT-4.1 via Vercel AI SDK for natural language planning
- **Payments**: Stripe for subscription management
- **Integrations**: Google Calendar API, Google Sheets API
- **State Management**: Custom undo/redo system with `useMultiStateUndoRedo` hook
- **Canvas**: HTML5 Canvas API with `canvas2svg` (v1.0.16) for SVG export

### Canvas Rendering Engine
- **Active implementation**: `YearWheelClass.js` (~5272 lines) - handles ALL rendering logic
- **Do NOT modify**: `archive/YearWheelClassRedefined.js` - unused refactoring attempt
- Drawing flow: `create()` → `drawRotatingElements()` (months, rings, items) → `drawStaticElements()` (center year/title)
- Export formats: PNG, SVG, PDF, JPG with high-resolution support

### Data Model (Critical)

**Frontend organizationData Structure** (used in canvas rendering):
```javascript
organizationData = {
  rings: [{ id, name, type: 'inner'|'outer', visible, orientation }],
  activityGroups: [{ id, name, color, visible }], // ⚠️ Legacy: was 'activities'
  labels: [{ id, name, color, visible }],
  items: [{ id, name, startDate, endDate, ringId, activityId, labelId }]
}
```
**Key constraint**: Items MUST link to visible activityGroups to be rendered. Labels are optional.

**Supabase Database Schema** (PostgreSQL):

Core Tables:
- `year_wheels` - Main wheel configurations
  - Columns: id, user_id, team_id, title, year, colors (JSONB), show_week_ring, show_month_ring, show_ring_names, week_ring_display_mode ('week-numbers'|'dates'), show_labels, is_public, is_template, show_on_landing, share_token, created_at, updated_at
  - Settings: Week/month ring visibility, label display mode, public sharing
  
- `wheel_pages` - Multi-year pages (1 page = 1 year wheel)
  - Columns: id, wheel_id (FK), page_order, year, title, organization_data (JSONB), override_colors, override_show_week_ring, override_show_month_ring, override_show_ring_names, created_at, updated_at
  - CRITICAL: organization_data JSONB contains complete state: {rings, activityGroups, labels, items}
  
- `wheel_rings` - Ring definitions (inner/outer bands)
  - Columns: id, wheel_id (FK NOT NULL), name, type ('inner'|'outer'), color, visible, ring_order, orientation ('vertical'|'horizontal'), created_at
  - **WHEEL-SCOPED** (Migration 015): Shared across all pages in the wheel
  
- `activity_groups` - Activity categories with colors
  - Columns: id, wheel_id (FK NOT NULL), name, color, visible, created_at
  - **WHEEL-SCOPED** (Migration 015): Shared across all pages in the wheel
  
- `labels` - Optional item labels
  - Columns: id, wheel_id (FK NOT NULL), name, color, visible, created_at
  - **WHEEL-SCOPED** (Migration 015): Shared across all pages in the wheel
  
- `items` - Activities/events placed on the wheel
  - Columns: id, wheel_id (FK), page_id (FK), ring_id (FK), activity_id (FK), label_id (FK nullable), name, start_date, end_date, time, description, source ('manual'|'google_calendar'|'google_sheets'), external_id, sync_metadata (JSONB), created_at, updated_at
  - **PAGE-SCOPED** (Migration 015): Distributed to pages by start_date year
  - MUST reference page_id, ring_id, and activity_id (label_id optional)
  
- `ring_data` - Month-specific content for inner rings (text arrays)
  - Columns: id, ring_id (FK), month_index (0-11), content (TEXT[]), created_at

Collaboration Tables:
- `teams` - Team definitions
  - Columns: id, name, description, owner_id (FK auth.users), created_at, updated_at
  
- `team_members` - Team membership
  - Columns: id, team_id (FK), user_id (FK auth.users), role ('owner'|'admin'|'member'), joined_at
  - Unique constraint: (team_id, user_id)
  
- `team_invitations` - Email-based team invitations
  - Columns: id, team_id (FK), email, invited_by (FK auth.users), token (unique), status ('pending'|'accepted'|'declined'|'expired'), expires_at, created_at

Version Control:
- `wheel_versions` - Complete version history snapshots
  - Columns: id, wheel_id (FK), version_number, snapshot_data (JSONB), created_by (FK auth.users), created_at, change_description, is_auto_save, metadata (JSONB)
  - Unique constraint: (wheel_id, version_number)

User Management:
- `profiles` - Extended user data
  - Columns: id (FK auth.users), email, full_name, avatar_url, is_admin, created_at, updated_at
  - Auto-created on user signup via trigger
  
- `subscriptions` - Stripe subscription management
  - Columns: id, user_id (FK auth.users), stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_type ('free'|'monthly'|'yearly'), status ('active'|'inactive'|'canceled'|'past_due'|'trialing'), current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
  - Unique constraint: user_id
  
- `subscription_events` - Stripe webhook audit log
  - Columns: id, subscription_id (FK), event_type, stripe_event_id (unique), event_data (JSONB), created_at

Google Integrations:
- `user_integrations` - OAuth tokens for external services
  - Columns: id, user_id (FK auth.users), provider ('google_calendar'|'google_sheets'|'google'), access_token, refresh_token, token_expires_at, scope (TEXT[]), provider_user_id, provider_user_email, created_at, updated_at
  - Unique constraint: (user_id, provider)
  
- `ring_integrations` - Maps rings to external data sources
  - Columns: id, ring_id (FK), user_integration_id (FK), integration_type ('calendar'|'sheet'), config (JSONB: calendar_id, spreadsheet_id, sheet_name), mapping_config (JSONB), sync_enabled, sync_frequency ('manual'|'hourly'|'daily'), last_synced_at, last_sync_status ('success'|'error'|'pending'), last_sync_error, created_at, updated_at
  - Unique constraint: (ring_id, integration_type)

**Key Relationships:**
- Wheels → Pages (1:many) - Multi-year support
- Wheels → Teams (many:1) - Team collaboration
- Wheels → Versions (1:many) - Version control
- **Rings/ActivityGroups/Labels → Wheel (many:1) - WHEEL-SCOPED** (Migration 015)
- **Items → Page (many:1) - PAGE-SCOPED** (Migration 015)
- Items reference page_id, ring_id, activity_id (required), label_id (optional)
- Pages contain complete organizationData as JSONB cache (rings, activityGroups, labels, items)

**Critical Database Functions:**
- `is_premium_user(user_id)` - Checks active subscription OR is_admin flag
- `is_admin(user_id)` - Checks profiles.is_admin (currently: thomas@freefoot.se)
- `can_create_wheel(user_id)` - Free: 2 wheels, Premium: unlimited
- `can_add_team_member(wheel_id, user_id)` - Free: 3 members, Premium: unlimited
- `get_next_page_order(wheel_id)` - Returns next sequential page_order for new pages
- `duplicate_wheel_page(page_id)` - Clones page with incremented year
- `get_template_wheels()` - Fetches all template wheels (admin panel)
- `get_landing_page_templates()` - Fetches public templates (show_on_landing = true)

**Data Flow:**
1. Frontend loads wheel + selected page from Supabase
2. Page's `organization_data` JSONB populates organizationData state
3. YearWheelClass renders from organizationData structure
4. Changes update page.organization_data via wheelService.updatePage()
5. Real-time updates via `useRealtimeWheel` hook (Supabase Realtime)

**Migration Notes:**
- **Migration 015 (CRITICAL)**: Rings/activityGroups/labels are WHEEL-SCOPED (shared across all pages)
- Only ITEMS are page-scoped (distributed by start_date year)
- This enables cross-year activities (same ring/group UUID, different page_ids)
- Items require page_id (backfilled based on start_date year)
- Google integrations add source, external_id, sync_metadata to items table
- Premium features enforced via RLS policies + helper functions


```

## Critical Patterns

### Drag and Drop System (Restored Oct 2025)
**Complete pixel-based drag/drop implementation with screen coordinate system**

Key Functions:
- `detectDragZone(x, y, itemRegion)` - Pixel-based (15px) resize zone detection with angle wraparound handling
- `startDrag(event)` - Calculates screen angles (includes rotation), sets up drag state, provides immediate visual feedback
- `dragActivity(event)` - Screen-space calculations, handles move/resize-start/resize-end modes
- `stopActivityDrag()` - Converts screen angles back to logical angles, updates data
- `drawDragPreviewInRotatedContext()` - Draws preview in rotated canvas context with dashed border (called from drawRotatingElements)

**Critical Implementation Details:**
- Screen angles = logical angles + rotationAngle
- Preview drawn inside rotated context to avoid misalignment
- `renderedRingPositions` Map tracks actual ring positions during rendering
- Dragged items are SKIPPED in main render loops (only preview is shown)
- Minimum 1-week width enforced: ~5.75° (~7 days)
- Resize zones: 15 pixels from edges (arc length calculated at average radius)
- Angle wraparound safety: validates angleSpan to prevent detection errors

**Coordinate System Architecture:**
```javascript
// Logical coordinates (data storage):
item.startAngle, item.endAngle // Rotation-agnostic

// Screen coordinates (visual rendering):
screenAngle = logicalAngle + this.rotationAngle

// During drag:
this.dragState = {
  screenStartAngle,  // Includes rotation
  screenEndAngle,    // Includes rotation
  targetRingId,
  mode: 'move' | 'resize-start' | 'resize-end'
}

// On drag end:
logicalAngle = screenAngle - this.rotationAngle
```

### ISO Week Numbers
Week generation uses proper ISO 8601 standard (fixed Oct 2025). When modifying date logic:
```javascript
// Correct approach in generateWeeks():
const getISOWeek = (date) => { /* see YearWheelClass.js:44-82 */ }
```
**Never** use simple counters for week numbers.

### Date-to-Angle Conversion
Activities are positioned using proportional month-day angles (360°/12 months):
```javascript
const dateToAngle = (date) => {
  const month = date.getMonth(); // 0-11
  const dayOfMonth = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
  return month * 30 + ((dayOfMonth - 1) / daysInMonth) * 30;
};
```
Located in `drawRotatingElements()` around line 1100. Maintains alignment with month ring.

### Ring Types and Spacing
- **Inner rings**: Between center and month/week rings (fill available space proportionally)
- **Outer rings**: Outside month/week rings (fixed width: `this.size / 23`)
- **Standard gap**: `this.size / 150` used consistently between all ring elements
- Ring name bands: `this.size / 70` width, drawn AFTER items (visible on top)

### Minimum Item Width Enforcement
ALL items get minimum 1-week width (~5.75°) even if shorter duration:
```javascript
const minWeekAngle = (7 / 365) * 360;
if (Math.abs(endAngle - startAngle) < minWeekAngle) {
  const center = (startAngle + endAngle) / 2;
  startAngle = center - minWeekAngle / 2;
  endAngle = center + minWeekAngle / 2;
}
```
See lines ~1183 and ~1364 in YearWheelClass.js.

## Development Workflows

### Running the Project
```bash
yarn dev          # Start dev server (Vite)
yarn build        # Production build
yarn preview      # Preview production build
```
No test runner configured. Manual testing via browser.

### State Persistence
- **Supabase Database**: Primary storage for wheels, pages, team data, versions
- **Real-time Collaboration**: `useRealtimeWheel` and `useWheelPresence` hooks for live updates
- **Undo/Redo System**: `useMultiStateUndoRedo` with 10-step history, keyboard shortcuts (Cmd/Ctrl+Z/Y)
- **File export**: `.yrw` files (JSON format) with versioning for backup/sharing
- **Data migration**: Handles legacy `activities` → `activityGroups` rename (see App.jsx:66-70)

### Adding New Activity Items
1. Ensure activityGroup exists and is visible
2. Create item with `startDate`/`endDate` (ISO format strings)
3. Link to ring (`ringId`), activityGroup (`activityId`), optional label (`labelId`)
4. YearWheelClass filters by visibility in `drawRotatingElements()` (lines ~1132-1142, ~1304-1314)

### Canvas Redraw Optimization
Hover interactions are throttled using `requestAnimationFrame` flag:
```javascript
if (!this.hoverRedrawPending) {
  this.hoverRedrawPending = true;
  requestAnimationFrame(() => { this.create(); this.hoverRedrawPending = false; });
}
```
See lines 980-987. **Critical**: Don't add frequent redraw calls without throttling.

## Common Pitfalls

### ❌ Gaps Between Ring Sections
Problem: Setting `spacingAngle` > 0 in `addRegularCircleSections()`
Solution: Always use `spacingAngle: 0` for seamless rings (lines 688, 1441, 1458)

### ❌ Items Not Appearing
Checklist:
1. Is parent ring `visible: true`?
2. Is linked activityGroup `visible: true`?
3. Does item's date range overlap with selected year?
4. Check filtering logic at lines 1304-1314 (inner) or 1132-1142 (outer)

### ❌ Text Rendering Issues
- Month names: Use `setCircleSectionTitle()` with character-by-character arc layout (lines 454-531)
- Activity names: Use `setCircleSectionAktivitetTitle()` for vertical perpendicular text (lines 533-604)
- Contrast: Always use `getContrastColor(backgroundColor)` for text (lines 244-256)

### ❌ Clickable Region Misalignment
Store regions during drawing, account for rotation in hit detection:
```javascript
// Store during render (lines ~1238, ~1405):
this.clickableItems.push({ item, startRadius, endRadius, startAngle, endAngle });

// Check clicks with rotation offset (lines 1031-1066):
let angle = Math.atan2(dy, dx) - this.rotationAngle;
```

## File Organization Rules

### Active vs Archived Code
- `src/components/*.jsx`, `src/YearWheelClass.js`, `src/hooks/*`, `src/services/*` → ACTIVE
- `archive/*` → Do NOT import or modify
- **Cleaned up Oct 2025**: Removed unused legacy components (MonthTextarea, RingButton, GeneralInputs, ColorPicker, ActionInputs, RingManager, Ring)

### Swedish/English Language Convention
UI text uses Swedish (e.g., "Aktivitetsgrupp", "Spara", "Återställ") but the application is being internationalized. Maintain this consistency when adding features. Comments and code can be in English. i18n implementation in progress (see `src/i18n/`).

## Future Features & Migration Context
Comprehensive documentation exists in project root:
- `README.md` - Full feature list, tech stack, getting started guide
- `SUPABASE_GUIDE.md` - Database setup (if exists)
- `ARCHITECTURE.md` - Schema and migration plan (if exists)
- `I18N_PROGRESS.md` - Internationalization status

When implementing new features, reference these documents for PostgreSQL schema, RLS policies, React hooks architecture, and planned features.

## Color Philosophy
- Month ring: Dark grays (`#334155`, `#3B4252`) for readability
- Week ring: Lighter gray (`#94A3B8`) for subtlety
- Activities: Use activityGroup colors, darken 20% on hover (light colors) or lighten 30% (dark colors) via `getHoverColor()` (lines 258-278)
- Ring name bands: White background (`#FFFFFF`) with very dark text (`#0F172A`) for maximum contrast

## Quick References
- Canvas size calculation: `this.size` from props (typically 2000-3000px)
- Center position: `{ x: size/2, y: size/2 }`
- Rotation offset: `this.initAngle = -105°` aligns January to top
- Month indices: 0=January, 11=December (JavaScript Date convention)



