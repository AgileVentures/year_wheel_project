# Save Queue Implementation - Progress Tracker

## 📦 Files Created
- [x] `src/hooks/useSaveQueue.js` - Core queue implementation
- [x] `src/hooks/useWheelSaveQueue.js` - Wheel-specific wrapper
- [x] `docs/SAVE_QUEUE_INTEGRATION.md` - Complete integration guide
- [x] `docs/SAVE_QUEUE_IMPLEMENTATION_EXAMPLE.js` - Code examples
- [x] `docs/SAVE_QUEUE_SUMMARY.md` - Implementation summary
- [x] `docs/SAVE_QUEUE_QUICK_REFERENCE.md` - Quick reference card
- [x] `docs/SAVE_QUEUE_VISUAL_FLOW.md` - Architecture diagrams

## 🔧 Code Changes Required

### In `src/App.jsx`

#### 1. Imports
- [ ] Add import for `useWheelSaveQueue`
```javascript
import { useWheelSaveQueue } from './hooks/useWheelSaveQueue';
```

#### 2. Initialize Hook (after `wheelId` state)
- [ ] Add `useWheelSaveQueue` hook initialization
```javascript
const { 
  enqueueSave, 
  isSaving: isSavingToQueue, 
  pendingCount, 
  isIdle 
} = useWheelSaveQueue(wheelId, {
  onSaveSuccess: (changes, metadata) => {
    console.log(`✅ Saved batch of ${metadata.batchSize} changes`);
    if (historyRef.current?.wheelStructure) {
      markSaved('wheelStructure', historyRef.current.wheelStructure.index);
    }
  },
  onSaveError: (error) => {
    console.error('Save failed:', error);
    showToast('Kunde inte spara ändringar', 'error');
  }
});
```

#### 3. Update `enqueueFullSave` Function
- [ ] Remove `async` keyword
- [ ] Remove `await` from `saveWheelSnapshot` call
- [ ] Replace with `enqueueSave(snapshot, { label: reason })`
- [ ] Change return to immediate validation result

**Location**: Around line 1650-1900 (search for `const enqueueFullSave = useCallback`)

**Before**:
```javascript
const enqueueFullSave = useCallback(async (reason = 'manual') => {
  // ... validation ...
  const result = await saveWheelSnapshot(wheelId, snapshot);
  // ... processing ...
  return result;
}, [/* deps */]);
```

**After**:
```javascript
const enqueueFullSave = useCallback((reason = 'manual') => {
  // ... validation ...
  enqueueSave(snapshot, { label: reason });
  return { validation: validateSnapshotPages(snapshot, latestValuesRef.current) };
}, [enqueueSave, /* other deps without saveWheelSnapshot */]);
```

#### 4. Update `handleSave` Function
- [ ] Remove `async` keyword
- [ ] Remove `await` from `enqueueFullSave` call
- [ ] Update toast messages for queued saves

**Location**: Around line 2123 (search for `const handleSave = useCallback`)

**Before**:
```javascript
const handleSave = useCallback(async (options = {}) => {
  const { silent = false, reason = 'manual' } = options;
  if (wheelId) {
    try {
      const saveResult = await enqueueFullSave(reason);
      if (!silent) showToast('Data har sparats!', 'success');
    } catch (error) {
      // ...
    }
  }
  // ...
}, [/* deps */]);
```

**After**:
```javascript
const handleSave = useCallback((options = {}) => {
  const { silent = false, reason = 'manual' } = options;
  if (wheelId) {
    try {
      const saveResult = enqueueFullSave(reason);
      if (!silent && reason === 'manual') {
        showToast('Sparar ändringar...', 'info');
      }
    } catch (error) {
      // ...
    }
  }
  // ...
}, [/* deps */]);
```

#### 5. Update `autoSave` Function (if it exists)
- [ ] Remove `async` keyword
- [ ] Remove `await` from `handleSave` call

**Search for**: `const autoSave = useCallback`

**Before**:
```javascript
const autoSave = useCallback(async (reason) => {
  if (!autoSaveEnabled || !wheelId) return;
  await handleSave({ silent: true, reason });
}, [/* deps */]);
```

**After**:
```javascript
const autoSave = useCallback((reason) => {
  if (!autoSaveEnabled || !wheelId) return;
  handleSave({ silent: true, reason });
}, [/* deps */]);
```

#### 6. Add Save Status UI Component
- [ ] Create `SaveStatusIndicator` component
- [ ] Add to JSX (e.g., in toolbar or header)

```javascript
// Component definition (add before main App component or in separate file)
function SaveStatusIndicator({ isSaving, pendingCount, isIdle }) {
  if (isIdle) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Allt sparat</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Sparar{pendingCount > 0 && ` (${pendingCount})`}...</span>
      </div>
    );
  }

  return null;
}

// Usage in JSX (add near other toolbar items)
<SaveStatusIndicator 
  isSaving={isSavingToQueue} 
  pendingCount={pendingCount} 
  isIdle={isIdle} 
/>
```

### In Other Files (Optional)

#### `src/YearWheel.jsx` or Drag Handlers
- [ ] Verify drag handlers call `handleSave` (not direct database calls)
- [ ] Remove any `await` from drag end handlers
- [ ] Ensure optimistic UI updates happen immediately

## 🧪 Testing Checklist

### Unit Tests
- [ ] Queue accumulates changes correctly
- [ ] Queue merges rapid changes
- [ ] Queue processes sequentially
- [ ] Retry logic works (mock network errors)
- [ ] Status indicators update correctly

### Integration Tests
- [ ] Rapid drag test (2+ items within 1 second)
  - [ ] Both items at correct final positions
  - [ ] Console shows "Saved batch of X changes"
- [ ] Drag during save test
  - [ ] Second drag queues while first saves
  - [ ] Final position is correct
- [ ] Multi-change merge test
  - [ ] Drag + resize + edit within 1 second
  - [ ] Single save with all changes
- [ ] Network error test
  - [ ] Go offline, make change
  - [ ] Error toast appears
  - [ ] Go online, save retries and succeeds
- [ ] Page switch during save test
  - [ ] Make change on page 1
  - [ ] Switch to page 2 before save completes
  - [ ] Switch back to page 1
  - [ ] Change is persisted

### Performance Tests
- [ ] 5 rapid changes merge into 1 save
- [ ] No UI lag during saves
- [ ] Console shows reasonable save times (<500ms per batch)

### User Acceptance Tests
- [ ] Save status indicator updates correctly
- [ ] Toast notifications are helpful
- [ ] No data loss in any scenario
- [ ] Undo/redo works with queued saves

## 📊 Validation Criteria

### Console Logs (Success)
```
✅ Expected logs:
[useSaveQueue] Saving batch of 2 changes to wheel abc123...
[saveWheelSnapshot] Received snapshot structure: {...}
[useSaveQueue] ✅ Saved successfully in 342ms

✅ Batch merging (good):
[useSaveQueue] Saving batch of 5 changes to wheel abc123...

✅ Retry behavior:
[useSaveQueue] Save failed: Network error
[useSaveQueue] Retrying (attempt 2/3) in 1s...
[useSaveQueue] ✅ Saved successfully in 1234ms (after retry)
```

### Console Logs (Problems)
```
❌ Issues to fix:
[saveWheelSnapshot] called directly (should go through queue)
[useSaveQueue] Save failed after 3 retries, giving up
Uncaught Error: Cannot read property 'enqueueSave' of undefined
```

### UI Behavior
- [ ] "Sparar..." appears during save
- [ ] "Allt sparat" appears when idle
- [ ] Pending count shows correctly
- [ ] No "data loss" user reports

## 🚀 Deployment Plan

### Pre-Deployment
- [ ] All code changes committed
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Documentation updated

### Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Monitor console logs
- [ ] Test with real user workflows
- [ ] Deploy to production
- [ ] Monitor error logs for 24 hours

### Post-Deployment
- [ ] Verify no error spikes
- [ ] Check save success rate (should be >99%)
- [ ] Monitor user feedback
- [ ] Update runbook if needed

## 📈 Success Metrics

### Before vs After
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Data loss incidents | 0 | ? | ⏳ |
| DB calls (5 rapid changes) | 1 | 5 | ⏳ |
| Save time (5 changes) | <500ms | ~2.5s | ⏳ |
| User-reported save issues | <1/month | ? | ⏳ |

## ⏱️ Time Tracking

- **Estimated time**: 1-2 hours
- **Actual time**: ___ hours
- **Blockers encountered**: ___
- **Solutions found**: ___

## 📝 Notes

### Issues Encountered
_Document any problems you run into during implementation_

### Solutions Applied
_Document how you solved those problems_

### Future Improvements
_Ideas for further optimization_

## ✅ Final Sign-Off

- [ ] All code changes complete
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Deployed to production
- [ ] No errors in production logs (24h)
- [ ] User feedback positive

**Completed by**: _______________
**Date**: _______________
**Approved by**: _______________
