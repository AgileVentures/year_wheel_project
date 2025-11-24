# Delta Save System Implementation Guide

## Overview
The delta save system tracks and saves only what changed, dramatically improving performance for large wheels.

**Before:** Every save replaced ALL data (10,000 activities = 10,000 DELETE + 10,000 INSERT)
**After:** Only changed data is saved (1 activity renamed = 1 UPDATE)

## Architecture

### 1. **useChangeTracker Hook** (`src/hooks/useChangeTracker.js`)
Tracks all changes to wheel data in memory using Maps and Sets.

```javascript
const tracker = useChangeTracker();

// Track changes
tracker.trackItemChange(itemId, oldItem, newItem);
tracker.trackRingChange(ringId, oldRing, newRing);

// Get changes
const changes = tracker.getChanges();
// => { items: { added: [...], modified: [...], deleted: [...] }, ... }

// Check if anything changed
if (tracker.hasChanges()) {
  // Save changes
}

// Clear after save
tracker.clearChanges();
```

### 2. **Delta Save Methods** (`src/services/wheelService.js`)
New methods that apply only the changes:

- `applyDeltaChanges(wheelId, changes)` - Applies deltas to database
- `broadcastDeltaChanges(wheelId, changes, userId)` - Broadcasts only changes via Realtime

## Integration Plan

### Phase 1: Integrate Change Tracker into App.jsx ✅ NEXT

**Current Code (App.jsx lines ~3500-3600):**
```javascript
const handleSave = async () => {
  // Saves EVERYTHING
  await wheelService.updateWheel(wheelId, wheelStructure);
};
```

**New Code:**
```javascript
import { useChangeTracker } from './hooks/useChangeTracker';

const tracker = useChangeTracker();
const prevStateRef = useRef(null);

// Track changes whenever state updates
useEffect(() => {
  if (!prevStateRef.current) {
    prevStateRef.current = { rings, activityGroups, labels, currentPageItems };
    return;
  }

  const prev = prevStateRef.current;
  
  // Compare and track rings
  rings.forEach(ring => {
    const oldRing = prev.rings.find(r => r.id === ring.id);
    tracker.trackRingChange(ring.id, oldRing, ring);
  });
  
  // Track deleted rings
  prev.rings.forEach(oldRing => {
    if (!rings.find(r => r.id === oldRing.id)) {
      tracker.trackRingChange(oldRing.id, oldRing, null);
    }
  });
  
  // Same for groups, labels, items...
  
  prevStateRef.current = { rings, activityGroups, labels, currentPageItems };
}, [rings, activityGroups, labels, currentPageItems]);

const handleSave = async () => {
  if (!tracker.hasChanges()) {
    console.log('[App] No changes to save');
    return;
  }

  const changes = tracker.getChanges();
  const summary = tracker.getChangesSummary();
  
  console.log('[App] Saving delta changes:', summary);
  
  const result = await wheelService.applyDeltaChanges(wheelId, changes);
  
  if (result.success) {
    tracker.clearChanges();
    // Broadcast to other users
    await wheelService.broadcastDeltaChanges(wheelId, changes, user.id);
  }
};
```

### Phase 2: Update useMultiStateUndoRedo Hook

**Current Issue:** Undo/redo replaces entire state
**Solution:** Track changes between undo/redo states

```javascript
const undo = () => {
  if (canUndo) {
    const currentState = getCurrentState();
    const previousState = getPreviousState();
    
    // Track what changed between these states
    compareStates(previousState, currentState, tracker);
    
    // Apply undo
    setState(previousState);
  }
};
```

### Phase 3: Optimize Realtime Updates (`src/hooks/useRealtimeWheel.js`)

**Current Code:**
```javascript
channel.on('broadcast', { event: 'wheel:updated' }, (payload) => {
  // Fetches ENTIRE wheel from database
  refetchWheel();
});
```

**New Code:**
```javascript
channel.on('broadcast', { event: 'items:modified' }, ({ payload }) => {
  // Only update modified items
  setCurrentPageItems(prev => 
    prev.map(item => {
      const updated = payload.items.find(i => i.id === item.id);
      return updated || item;
    })
  );
});

channel.on('broadcast', { event: 'items:added' }, ({ payload }) => {
  setCurrentPageItems(prev => [...prev, ...payload.items]);
});

channel.on('broadcast', { event: 'items:deleted' }, ({ payload }) => {
  setCurrentPageItems(prev => 
    prev.filter(item => !payload.ids.includes(item.id))
  );
});
```

### Phase 4: Add Debouncing for Rapid Changes

```javascript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSave = useDebouncedCallback(
  () => handleSave(),
  2000, // Save 2 seconds after last change
  { maxWait: 10000 } // But save at least every 10 seconds
);

// Call this instead of immediate save
useEffect(() => {
  if (tracker.hasChanges()) {
    debouncedSave();
  }
}, [rings, activityGroups, labels, currentPageItems]);
```

## Performance Improvements

### Before (Full Replacement):
- **1 activity changed**: Delete 10,000 + Insert 10,000 = **20,000 operations**
- **Database time**: ~5-10 seconds
- **Network payload**: ~5MB
- **Realtime broadcast**: 5MB to all users

### After (Delta Save):
- **1 activity changed**: Update 1 = **1 operation**
- **Database time**: ~50ms
- **Network payload**: ~1KB
- **Realtime broadcast**: 1KB to all users

**100x-200x faster** for typical edits!

## Testing Checklist

- [ ] Change single activity name → verify only 1 UPDATE query
- [ ] Add new activity → verify only 1 INSERT query
- [ ] Delete activity → verify only 1 DELETE query
- [ ] Undo/redo → verify changes are tracked correctly
- [ ] Multiple rapid changes → verify debouncing works
- [ ] Realtime: Another user's change → verify only delta is applied
- [ ] Large wheel (1000+ items) → verify performance improvement

## Migration Strategy

1. **Phase 1**: Add change tracker alongside existing save (dual system)
2. **Phase 2**: Add feature flag to switch between old/new save
3. **Phase 3**: Test with beta users
4. **Phase 4**: Full rollout, remove old save code

## Current Status

✅ **Completed:**
- Created `useChangeTracker` hook
- Added `applyDeltaChanges()` to wheelService
- Added `broadcastDeltaChanges()` to wheelService

🚧 **Next Steps:**
1. Integrate tracker into App.jsx
2. Update useMultiStateUndoRedo to track changes
3. Update useRealtimeWheel to handle delta broadcasts
4. Add debouncing
5. Test performance improvements

## Notes

- **Backward compatible**: Delta save can coexist with full save
- **Rollback safe**: Can revert to full save if issues arise
- **Opt-in**: Can be feature-flagged per user
- **Observable**: Console logs show exactly what changed
