# URGENT FIX: Realtime Page Scoping

## Problem
Rings and items were "jumping" between pages, coming back after deletion, and causing massive confusion.

## Root Cause
**Realtime subscriptions filtered by `wheel_id`, but data is scoped to `page_id`!**

This caused:
- Deleting ring on page 2025 → Ring from page 2026 appears on 2025
- Creating item → Item appears on wrong page
- Excessive API requests → Every change triggers reload across ALL pages

## The Fix

### Changed Files
1. `src/hooks/useRealtimeWheel.js` - Changed realtime filters
2. `src/App.jsx` - Pass `currentPageId` to hook

### What Changed

**Before (BROKEN)**:
```javascript
// Filter by wheel_id → gets data from ALL pages
filter: `wheel_id=eq.${wheelId}`

// Usage
useRealtimeWheel(wheelId, handleRealtimeChange);
```

**After (FIXED)**:
```javascript
// Filter by page_id → gets data from CURRENT page only
filter: `page_id=eq.${pageId}`

// Usage
useRealtimeWheel(wheelId, currentPageId, handleRealtimeChange);
```

### Why This Matters

**Database Schema** (from migration 013):
- Rings, activity groups, and labels are scoped to `page_id`
- Each page is isolated (different years can have different configurations)
- `wheel_id` is kept nullable "for convenience" but causes problems

**Load Queries** filter by `page_id`:
```javascript
.from('wheel_rings')
.select('*')
.eq('page_id', pageToLoad.id) // ✅ Correct
```

**Realtime** was filtering by `wheel_id`:
```javascript
filter: `wheel_id=eq.${wheelId}` // ❌ Wrong - gets ALL pages
```

This mismatch caused rings to "teleport" between pages!

## Expected Behavior Now

### Creating a Ring
1. User creates ring on page 2025
2. Database INSERT with `page_id = 2025_page_id`
3. Realtime fires (filtered by `page_id = 2025_page_id`)
4. Only page 2025 gets updated
5. Page 2026 unaffected ✅

### Deleting a Ring
1. User deletes ring on page 2025
2. Ring + items removed from local state
3. Auto-save deletes from database
4. Realtime fires DELETE event (filtered by `page_id = 2025_page_id`)
5. Reload confirms deletion
6. Ring stays deleted ✅

### Switching Pages
1. User switches from page 2025 to 2026
2. Realtime channel closes for page 2025
3. New channel opens for page 2026
4. Each page has independent realtime subscription ✅

## Testing Checklist

- [ ] Create ring on page 2025 → Only appears on 2025
- [ ] Create ring on page 2026 → Only appears on 2026
- [ ] Delete ring on page 2025 → Stays deleted after reload
- [ ] Switch between pages → Rings don't cross-contaminate
- [ ] Create item → Appears on correct page based on year
- [ ] Network tab → Reduced realtime chatter

## Related Issues Fixed

1. **Ring resurrection** - Rings coming back after deletion
2. **Item disappearing** - Race conditions with cross-page reloads
3. **Excessive API calls** - 3x requests for 3-page wheel
4. **Cross-page contamination** - Rings from 2026 on 2025 page

## Next Steps

1. **Test the fix** - Verify ring deletion works
2. **Monitor logs** - Watch realtime subscription messages
3. **Consider**: Should rings be per-wheel or per-page? (Design decision needed)
4. **Clean up**: Remove `wheel_id` from rings table if truly per-page

## Design Question for Later

**Current**: Rings are per-page (each year has its own rings)
**Alternative**: Rings could be per-wheel (shared across all years, items distributed by date)

The per-wheel model might be more user-friendly (create rings once, use everywhere), but per-page allows year-specific customization. Need to decide which model we want long-term.
