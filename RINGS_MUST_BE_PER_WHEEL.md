# CRITICAL ARCHITECTURE DECISION: Rings Per-Wheel vs Per-Page

## The Fundamental Problem

**Current (BROKEN) Model**: Rings are per-page
- Ring "Kampanjer" on page 2025 has UUID `abc-123`
- Ring "Kampanjer" on page 2026 has UUID `def-456`
- Activity spanning 2025-2026 references ring `abc-123`
- **Page 2026 can't display it** - wrong ring UUID!

## Why This Matters

### Use Case 1: Cross-Year Integration Sync
```
Google Sheet:
Name           | Start      | End        | Ring
"Jul REA"      | 2025-12-20 | 2026-01-10 | Kampanjer
```

Integration creates:
- Item segment 1: 2025-12-20 to 2025-12-31, ring_id = `abc-123`, page_id = 2025
- Item segment 2: 2026-01-01 to 2026-01-10, ring_id = `abc-123`, page_id = 2026

**Problem**: Page 2026 doesn't have ring `abc-123`, it has ring `def-456`!

### Use Case 2: AI Assistant
User: "Skapa en aktivitet 'Årsskifte-kampanj' från 2025-12-15 till 2026-01-15 på ringen Kampanjer"

AI needs to:
1. Find ring "Kampanjer" → But which one? Page 2025 or 2026?
2. Create items on both pages → But they reference different rings!

## The Correct Architecture

### Rings MUST be Per-Wheel (Shared)

```
year_wheels (wheel_id)
  ├─ wheel_rings (wheel_id FK) ← SHARED across all pages
  ├─ activity_groups (wheel_id FK) ← SHARED
  ├─ labels (wheel_id FK) ← SHARED
  └─ wheel_pages (page_id, year)
       └─ items (page_id FK, ring_id FK) ← Distributed by year
```

**Why this works**:
- Ring "Kampanjer" has ONE UUID across all pages
- Cross-year activity references ONE ring
- Items are distributed to pages based on their year
- Each page displays items where `page_id = this_page AND ring_id = any_ring_in_wheel`

## Required Changes

### 1. Revert Migration 013
**Remove `page_id` from**:
- `wheel_rings`
- `activity_groups`  
- `labels`

**Keep `page_id` ONLY in**:
- `items` (this determines which page displays them)

### 2. Update Queries
**Before**:
```javascript
.from('wheel_rings')
.select('*')
.eq('page_id', currentPageId) // ❌ WRONG
```

**After**:
```javascript
.from('wheel_rings')
.select('*')
.eq('wheel_id', wheelId) // ✅ CORRECT - shared across pages
```

### 3. Update Realtime
**Before**:
```javascript
filter: `page_id=eq.${pageId}` // ❌ WRONG - rings are per-page
```

**After**:
```javascript
// Rings: Filter by wheel_id (shared)
filter: `wheel_id=eq.${wheelId}`

// Items: Filter by page_id (distributed)
filter: `page_id=eq.${pageId}`
```

## Benefits of Per-Wheel Rings

### ✅ User Experience
- Create rings once, use everywhere
- Consistent ring structure across all years
- No confusion about "which Kampanjer ring?"

### ✅ Cross-Year Activities
- Integrations work correctly
- AI assistant can span years
- Single ring UUID, multiple page segments

### ✅ Simpler Code
- No per-page ring duplication
- Fewer database queries
- Clearer data model

## What About Year-Specific Customization?

If later we need year-specific rings, we can add:
- `ring_visibility` table: (ring_id, page_id, visible)
- Rings exist at wheel level, but can be hidden per-page
- **But base structure must be per-wheel**

## Migration Strategy

### Step 1: Create Revert Migration
```sql
-- 015_REVERT_RINGS_TO_WHEEL_SCOPE.sql
-- Remove page_id from rings, groups, labels
-- Keep wheel_id as primary FK
```

### Step 2: Update Code
- `src/App.jsx` - Query by wheel_id
- `src/hooks/useRealtimeWheel.js` - Filter rings/groups by wheel_id
- `src/services/wheelService.js` - Remove page_id from sync logic

### Step 3: Test Cross-Year
- Create ring on page 2025
- Add activity 2025-12-20 to 2026-01-10
- Verify appears on BOTH pages

## Conclusion

**Decision**: Rings, activity groups, and labels MUST be per-wheel (shared).

Only items are per-page (distributed by year). This is the ONLY way cross-year activities can work correctly.

Migration 013 was a mistake. We need to revert it.
