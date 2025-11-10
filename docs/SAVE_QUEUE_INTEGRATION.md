# Save Queue Integration Guide

## Problem Overview

**Current Issue:**
1. User makes change (drag, resize, edit) → saves to database → syncs back
2. During save/sync, user makes another change
3. Database sync overwrites the second change (data loss!)

**Root Cause:**
- Saves happen asynchronously (takes ~500-2000ms)
- No queuing mechanism for rapid consecutive changes
- Database sync blindly overwrites local state

## Solution: Save Queue System

The `useSaveQueue` and `useWheelSaveQueue` hooks solve this by:
- Queuing all save operations (one at a time)
- Accumulating changes during active save
- Merging multiple rapid changes into single save
- Processing queue sequentially when safe

---

## Integration Steps

### Step 1: Import the Hook

```javascript
// In App.jsx (or your wheel editor component)
import { useWheelSaveQueue } from './hooks/useWheelSaveQueue';
```

### Step 2: Initialize the Save Queue

Replace direct `saveWheelSnapshot` calls with the queue:

```javascript
function App() {
  const wheelId = /* ... */;
  
  // Initialize save queue
  const { 
    enqueueSave, 
    isSaving, 
    pendingCount, 
    isIdle 
  } = useWheelSaveQueue(wheelId, {
    onSaveSuccess: (changes, metadata) => {
      console.log(`✅ Saved ${metadata.batchSize} changes`);
      
      // Mark undo history as saved
      if (historyRef.current) {
        const currentIndex = historyRef.current.wheelStructure.index;
        markSaved('wheelStructure', currentIndex);
      }
    },
    onSaveError: (error) => {
      console.error('Save failed:', error);
      showToast('Kunde inte spara ändringar', 'error');
    }
  });

  // Rest of your component...
}
```

### Step 3: Replace Save Calls

**BEFORE (direct save):**
```javascript
const handleSave = async (reason = 'manual') => {
  const snapshot = buildWheelSnapshot();
  await saveWheelSnapshot(wheelId, snapshot); // ❌ Can cause race condition
  showToast('Hjulet sparat', 'success');
};
```

**AFTER (queued save):**
```javascript
const handleSave = (reason = 'manual') => {
  const snapshot = buildWheelSnapshot();
  enqueueSave(snapshot, { label: reason }); // ✅ Queue-safe
  
  // Toast only on manual save
  if (reason === 'manual') {
    showToast('Hjulet sparat', 'success');
  }
};
```

### Step 4: Update Auto-Save Logic

**BEFORE:**
```javascript
const autoSave = useCallback(async (reason) => {
  if (!autoSaveEnabled) return;
  await handleSave(reason); // ❌ Blocks on async
}, [autoSaveEnabled, handleSave]);
```

**AFTER:**
```javascript
const autoSave = useCallback((reason) => {
  if (!autoSaveEnabled) return;
  handleSave(reason); // ✅ Non-blocking, queues immediately
}, [autoSaveEnabled, handleSave]);
```

### Step 5: Update Drag/Resize Handlers

**BEFORE:**
```javascript
const handleDragEnd = async (updatedItem) => {
  // Update local state
  setWheelStructure(prev => ({
    ...prev,
    items: prev.items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    )
  }));
  
  // Save immediately
  await handleSave('drag'); // ❌ Loses changes if user drags again during save
};
```

**AFTER:**
```javascript
const handleDragEnd = (updatedItem) => {
  // Update local state (optimistic)
  setWheelStructure(prev => ({
    ...prev,
    items: prev.items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    )
  }));
  
  // Queue save (non-blocking, safe for rapid changes)
  handleSave('drag'); // ✅ Queues save, doesn't lose changes
};
```

### Step 6: Show Save Status in UI

```javascript
// Add save status indicator
<div className="save-status">
  {isSaving && (
    <span>
      Sparar
      {pendingCount > 0 && ` (${pendingCount} väntande)`}
      ...
    </span>
  )}
  {isIdle && <span>✓ Allt sparat</span>}
</div>
```

---

## Key Benefits

1. **No Data Loss**: Changes during save are queued, not overwritten
2. **Better Performance**: Multiple rapid changes merge into single save
3. **Automatic Retry**: Failed saves retry up to 3 times
4. **User Feedback**: `isSaving` and `pendingCount` for UI indicators
5. **Non-Blocking**: Returns immediately, processes in background

---

## Testing the Fix

### Test Case 1: Rapid Drag Operations
```
1. Drag item A from Jan to Feb → release
2. Immediately drag item B from Mar to Apr → release (before step 1 saves)
3. Wait for saves to complete

Expected: Both items are at new positions ✅
Previous: Item B reverts to original position ❌
```

### Test Case 2: Drag During Save
```
1. Drag item A → release
2. During save animation, drag item A again
3. Wait for saves to complete

Expected: Item A at final position ✅
Previous: Item A at intermediate position ❌
```

### Test Case 3: Multiple Changes
```
1. Drag item A → release
2. Resize item B → release
3. Edit item C name → save (all within 1 second)

Expected: All 3 changes merged into 1 save operation ✅
Previous: 3 separate saves, potential race conditions ❌
```

---

## Advanced: Batch Mode Alternative

If you prefer explicit batching (useful for complex multi-step operations):

```javascript
import { useMultiStateUndoRedo } from './hooks/useUndoRedo';

// In your component:
const { startBatch, endBatch, markSaved } = useMultiStateUndoRedo(/* ... */);

const handleComplexOperation = async () => {
  // Start batch (accumulates all changes)
  startBatch('Complex operation');
  
  // Make multiple changes
  updateItem(item1);
  updateItem(item2);
  updateRing(ring1);
  
  // End batch (commits as single undo entry)
  const historyIndex = endBatch();
  
  // Save once with all changes
  const snapshot = buildWheelSnapshot();
  enqueueSave(snapshot, { label: 'Complex operation' });
};
```

---

## Migration Checklist

- [ ] Import `useWheelSaveQueue` in App.jsx
- [ ] Initialize queue with `wheelId` and callbacks
- [ ] Replace all `saveWheelSnapshot` calls with `enqueueSave`
- [ ] Remove `await` from auto-save calls (now non-blocking)
- [ ] Update drag/resize handlers to use queue
- [ ] Add save status UI indicator
- [ ] Test rapid drag operations
- [ ] Test drag during active save
- [ ] Test multi-change merging
- [ ] Verify no data loss scenarios

---

## Troubleshooting

### Save queue not working?
- Check console for `[useSaveQueue]` logs
- Verify `wheelId` is valid UUID
- Ensure snapshot structure is correct

### Changes still getting lost?
- Check if you're bypassing the queue somewhere
- Verify `buildWheelSnapshot()` returns latest state
- Look for direct database writes outside the queue

### Queue getting stuck?
- Check for errors in save function
- Verify network connectivity
- Clear queue manually: `clearQueue()` (use sparingly)

---

## Performance Notes

- Queue processes ~1-5 saves/second (limited by database)
- Multiple changes within 100ms typically merge into 1 save
- Network latency: ~200-500ms per save operation
- Exponential backoff on retries: 1s, 2s, 4s (max 5s)

---

## API Reference

### `useWheelSaveQueue(wheelId, options)`

**Parameters:**
- `wheelId` (string): UUID of wheel to save
- `options.onSaveSuccess` (function): Called after successful save
- `options.onSaveError` (function): Called on save failure
- `options.onMarkSaved` (function): Called to mark undo history

**Returns:**
```typescript
{
  enqueueSave: (snapshot, metadata?) => void;
  isSaving: boolean;
  pendingCount: number;
  clearQueue: () => void;
  isIdle: boolean;
}
```

### `enqueueSave(snapshot, metadata)`

**Parameters:**
- `snapshot` (object): Complete wheel snapshot from `buildWheelSnapshot()`
- `metadata` (object, optional):
  - `label` (string): Operation description
  - Custom fields for tracking

**Example:**
```javascript
enqueueSave(buildWheelSnapshot(), { 
  label: 'Flytta aktivitet',
  userId: currentUser.id 
});
```
