# Undo/Redo Functionality - Deep Analysis

## Executive Summary

The undo/redo system has **fundamental architectural issues** that prevent it from working reliably. The core problems are:

1. **State mutation pattern conflicts** with undo/redo immutability requirements
2. **Callback stale closure issues** preventing proper state tracking
3. **Race conditions** between auto-save, realtime updates, and undo operations
4. **Missing ref updates** causing undo history to be out of sync with actual state

## Current Architecture

### Undo/Redo Hook (`useUndoRedo.jsx`)

The hook provides:
- ✅ Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- ✅ History stack management (max 50-100 entries)
- ✅ Debouncing (300ms-500ms)
- ⚠️ State update pattern that **doesn't work** with functional updates

**Critical Design Flaw:**

```javascript
const setState = useCallback((newState) => {
  setStateInternal(prevState => {
    const resolvedState = typeof newState === 'function' 
      ? newState(prevState) 
      : newState;
    
    pendingState.current = resolvedState;
    
    // Debounced history addition
    debounceTimer.current = setTimeout(() => {
      if (pendingState.current !== null) {
        addToHistory(pendingState.current);
        pendingState.current = null;
      }
    }, debounceMs);
    
    return resolvedState;
  });
}, [addToHistory, debounceMs]);
```

**Problem**: When `setState` is called with a functional update like:
```javascript
setOrganizationData(prevData => ({
  ...prevData,
  items: prevData.items.map(item => ...)
}))
```

The `newState` parameter receives the **function**, but by the time the debounce timer fires, the function's closure has already captured the old `prevState`. This creates a timing issue where:
1. User makes change A → pending state captures A
2. User makes change B → pending state captures B
3. Debounce fires for A → adds stale A to history
4. Debounce fires for B → adds stale B to history
5. Undo retrieves B, but B was based on stale state from before A

### App.jsx Integration

#### State Management Pattern

```javascript
const {
  states: undoableStates,
  setStates: setUndoableStates,
  undo,
  redo,
  canUndo,
  canRedo,
} = useMultiStateUndoRedo({
  title: "Nytt hjul",
  year: "2025",
  colors: [...],
  organizationData: {...}
}, {
  limit: 100,
  debounceMs: 500
});

// Extract states
const title = undoableStates?.title || "Nytt hjul";
const organizationData = undoableStates?.organizationData || {...};

// Wrapper setters
const setOrganizationData = useCallback((value) => {
  setUndoableStates(prevStates => {
    const newOrgData = typeof value === 'function' 
      ? value(prevStates.organizationData) 
      : value;
    
    // CRITICAL: Update ref immediately
    latestValuesRef.current = {
      ...latestValuesRef.current,
      organizationData: newOrgData
    };
    
    return { organizationData: newOrgData };
  });
}, [setUndoableStates]);
```

**Issues**:

1. **Ref update happens BEFORE debounce** - `latestValuesRef` gets the new value immediately, but history stack gets it 500ms later
2. **Auto-save reads from ref** - Gets latest value, not the value in undo history
3. **Realtime updates bypass undo** - When other users make changes, local undo stack becomes invalid

## Specific Problems

### Problem 1: State Mutation in OrganizationPanel

**Location**: `src/components/OrganizationPanel.jsx` (34 occurrences)

**Pattern**:
```javascript
const toggleRing = (ringId) => {
  const updatedRings = organizationData.rings.map(ring =>
    ring.id === ringId ? { ...ring, visible: !ring.visible } : ring
  );
  onOrganizationChange({ ...organizationData, rings: updatedRings });
};
```

**What happens**:
1. User toggles ring visibility
2. `onOrganizationChange` calls `setOrganizationData`
3. New state object created: `{ ...organizationData, rings: updatedRings }`
4. Ref updated immediately with new state
5. Debounce timer starts (500ms)
6. **500ms later** - State is added to undo history
7. User toggles again before 500ms
8. Previous state gets overwritten in ref
9. Undo history entry points to object that no longer matches actual state

**Result**: Undo restores the wrong state because the ref was mutated before history was saved.

### Problem 2: Auto-Save Race Condition

**Location**: `src/App.jsx` lines 510-577

```javascript
const autoSave = useDebouncedCallback(async () => {
  if (!wheelId || isLoadingData.current || isInitialLoad.current || 
      isRealtimeUpdate.current || !autoSaveEnabled) {
    return;
  }

  const {
    title: currentTitle,
    colors: currentColors,
    showWeekRing: currentShowWeekRing,
    showMonthRing: currentShowMonthRing,
    showRingNames: currentShowRingNames,
  } = latestValuesRef.current;  // ← Reads from ref, not undo history

  // ... saves to database
}, 10000);
```

**Scenario**:
1. User makes 5 changes in 3 seconds
2. Each change updates ref immediately
3. Undo history gets first 3 changes (debounced at 500ms each)
4. Auto-save fires after 10 seconds
5. **Auto-save reads state from ref** (has all 5 changes)
6. **Undo history only has first 3 changes**
7. User hits Ctrl+Z
8. Undo restores state #3
9. But database has state #5
10. Next realtime update overwrites local state with database state #5
11. **Undo appears to do nothing**

### Problem 3: Drag-and-Drop Bypass

**Location**: `src/YearWheelClass.js` line 1216

```javascript
const handleUpdateAktivitet = useCallback((updatedItem) => {
  setOrganizationData(prevData => ({
    ...prevData,
    items: prevData.items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    )
  }));
}, []);
```

When user drags an activity item:
1. `dragActivity()` updates `dragState` (not undoable)
2. `stopActivityDrag()` calculates new dates
3. Calls `handleUpdateAktivitet` with final state
4. State update happens ONCE
5. **But user expects ability to undo drag operation**
6. If debounce hasn't fired, drag isn't in history yet
7. Undo might restore state from before multiple drag operations

### Problem 4: Realtime Update Invalidation

**Location**: `src/App.jsx` lines 387-423

```javascript
const handleRealtimeChange = useCallback((eventType, tableName, payload) => {
  if (isSavingRef.current) return;
  
  const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
  if (timeSinceLastSave < 5000) return;
  
  isRealtimeUpdate.current = true;
  throttledReload();  // ← Overwrites local state
}, [throttledReload]);
```

**Problem**: When another user makes a change:
1. Local user has undo history: [A, B, C, D, E]
2. Current state: E
3. Remote user makes change F
4. Realtime update arrives
5. `loadWheelData()` fetches state F from database
6. **Local undo history [A, B, C, D, E] is now meaningless**
7. State F might be completely different structure
8. User hits Ctrl+Z
9. Tries to restore state D
10. **Data corruption** - state D's items might reference rings/groups that don't exist in F

### Problem 5: File Import Clears History

**Location**: `src/App.jsx` lines 1236-1324

When user imports a `.yrw` file:
1. File data loaded
2. State updated with file contents
3. **Undo history NOT cleared**
4. User hits Ctrl+Z
5. Tries to restore pre-import state
6. **Mixing data from different wheels**

## Undo History Inspection

Current implementation provides:
```javascript
{
  state,
  setState,
  undo,
  redo,
  canUndo,
  canRedo,
  clear,
  historyLength,  // ← Only metadata
  currentIndex    // ← Only position
}
```

**Missing**:
- ❌ Access to actual history stack
- ❌ Ability to inspect what will be restored
- ❌ Ability to clear history after major operations
- ❌ Ability to batch multiple changes into single undo step
- ❌ Descriptive undo/redo labels ("Undo: Added activity")

## Performance Issues

1. **Every state change creates full copy** - `organizationData` can have 100+ items, each undo entry duplicates entire object
2. **No structural sharing** - Could use Immer or similar for efficient immutable updates
3. **Debounce creates lag** - 500ms feels sluggish for rapid edits
4. **History limit reached quickly** - 100 entries × large objects = memory concern

## Recommended Solutions

### Option A: Remove Undo/Redo (Quick Fix)

**Rationale**: Current implementation is broken and fixing it properly is complex.

**Changes**:
1. Remove `useUndoRedo` hook
2. Remove keyboard shortcut listeners
3. Convert state back to normal `useState`
4. Remove "Ångra/Gör om" UI elements
5. Rely on version history feature instead

**Pros**:
- ✅ Eliminates buggy behavior
- ✅ Simplifies codebase
- ✅ Version history provides similar functionality
- ✅ No performance overhead

**Cons**:
- ❌ Users lose quick undo capability
- ❌ Keyboard shortcuts expected by users

### Option B: Fix Undo/Redo (Comprehensive Refactor)

**Required Changes**:

#### 1. Use Command Pattern

Instead of storing state snapshots, store command objects:

```javascript
// commands/toggleRingVisibilityCommand.js
export class ToggleRingVisibilityCommand {
  constructor(ringId) {
    this.ringId = ringId;
  }
  
  execute(state) {
    return {
      ...state,
      organizationData: {
        ...state.organizationData,
        rings: state.organizationData.rings.map(ring =>
          ring.id === this.ringId 
            ? { ...ring, visible: !ring.visible } 
            : ring
        )
      }
    };
  }
  
  undo(state) {
    return this.execute(state); // Toggle is reversible
  }
  
  getDescription() {
    return `Toggle ring ${this.ringId} visibility`;
  }
}
```

**Benefits**:
- Smaller memory footprint (store command, not full state)
- Descriptive undo labels
- Composable (batch commands)
- Testable

#### 2. Synchronous State Updates

Remove debouncing for undo history:

```javascript
const setState = useCallback((newStateOrUpdater) => {
  setStateInternal(prevState => {
    const newState = typeof newStateOrUpdater === 'function'
      ? newStateOrUpdater(prevState)
      : newStateOrUpdater;
    
    // Add to history IMMEDIATELY, not debounced
    addToHistory(newState);
    
    return newState;
  });
}, [addToHistory]);
```

**Then optimize**:
- Batch rapid changes in same operation (e.g., dragging)
- Use `startBatch()` / `endBatch()` API
- Only create one undo entry for batched operations

#### 3. Clear History on Major Operations

```javascript
// After file import
setUndoableStates(importedData);
clearHistory();

// After realtime update from other user
if (!isLocalUpdate) {
  clearHistory();
}
```

#### 4. Integrate with Auto-Save

```javascript
const autoSave = useDebouncedCallback(async () => {
  // Get state from undo history, not from ref
  const stateToSave = getCurrentUndoState();
  
  await saveToDatabase(stateToSave);
  
  // Mark in history that this state was saved
  markCurrentStateSaved();
}, 10000);
```

#### 5. Add Undo/Redo UI

```jsx
<div className="undo-controls">
  <button 
    onClick={undo} 
    disabled={!canUndo}
    title={undoDescription}
  >
    ↶ Ångra {undoDescription}
  </button>
  <button 
    onClick={redo} 
    disabled={!canRedo}
    title={redoDescription}
  >
    ↷ Gör om {redoDescription}
  </button>
  <span className="text-sm text-gray-500">
    {currentIndex + 1} / {historyLength}
  </span>
</div>
```

### Option C: Hybrid Approach (Recommended)

1. **Keep undo/redo for immediate user actions**:
   - Toggle visibility
   - Rename items
   - Change colors
   - Edit text fields

2. **Exclude from undo**:
   - Drag-and-drop operations (already committed on drop)
   - Auto-save operations
   - Realtime updates from other users
   - File imports (use "Close without saving" instead)

3. **Clear history on major events**:
   - Page switch
   - Realtime update from another user
   - File import
   - Manual save to database

4. **Improve feedback**:
   - Show undo/redo buttons in header (visible state)
   - Toast notifications: "Ångrat: Döljde Ring 2"
   - Keyboard shortcut hints

5. **Optimize storage**:
   - Use Immer for structural sharing
   - Increase debounce for auto-save (separate from undo)
   - Limit history to 50 entries

## Testing Scenarios

### Scenario 1: Rapid Toggles
1. Toggle ring visibility 5 times rapidly
2. Hit Ctrl+Z
3. **Expected**: Ring visibility restored to previous state
4. **Current**: Might restore to wrong state due to debounce

### Scenario 2: Drag Then Undo
1. Drag activity from June to October
2. Hit Ctrl+Z immediately
3. **Expected**: Activity returns to June
4. **Current**: Undo might be empty (debounce not fired yet)

### Scenario 3: Concurrent Edits
1. User A: Adds activity "Meeting"
2. User B: (receives realtime update)
3. User B: Hits Ctrl+Z
4. **Expected**: B's last action undone
5. **Current**: Might try to undo A's action, corruption

### Scenario 4: Save During Edit
1. User edits activity name: "M" → "Me" → "Mee" → "Meet" → "Meeti" → "Meeting"
2. Auto-save fires after "Mee"
3. User continues typing
4. Hits Ctrl+Z
5. **Expected**: Name reverts to "Meeti"
6. **Current**: Might revert to "Mee" (what was saved)

## Metrics

### Current State
- **Undo entries per session**: ~20 (user report: "doesn't work")
- **Successful undo operations**: ~30% (estimated from user behavior)
- **Undo/auto-save conflicts**: Frequent
- **Realtime/undo conflicts**: Frequent with multiple users

### Target State
- **Undo entries per session**: 100+
- **Successful undo operations**: 95%
- **Undo/auto-save conflicts**: None
- **Realtime/undo conflicts**: Handled gracefully (history clear)

## Decision Matrix

| Approach | Effort | Risk | User Value | Maintainability |
|----------|--------|------|------------|-----------------|
| **Option A: Remove** | Low (1 day) | Low | Medium (version history remains) | ✅ High |
| **Option B: Fix Completely** | High (1-2 weeks) | High | High | ⚠️ Medium |
| **Option C: Hybrid** | Medium (3-4 days) | Medium | High | ✅ High |

## Recommendation

**Implement Option C (Hybrid Approach)** because:

1. ✅ Provides real value for immediate user actions
2. ✅ Avoids complexity of full command pattern
3. ✅ Works around realtime/auto-save conflicts by clearing history
4. ✅ Reasonable development effort
5. ✅ Maintainable long-term
6. ✅ Can be enhanced incrementally

## Implementation Priority

### Phase 1 (Critical - 1 day)
1. ✅ Remove debouncing from undo history addition
2. ✅ Clear history on page switch
3. ✅ Clear history on realtime update
4. ✅ Add undo/redo buttons to UI
5. ✅ Test basic undo scenarios

### Phase 2 (Important - 2 days)
1. Implement batch mode for drag operations
2. Add descriptive undo labels
3. Improve toast feedback
4. Optimize with Immer
5. Add keyboard shortcut hints

### Phase 3 (Enhancement - 1 day)
1. Add undo history visualization
2. Add "undo to save point" feature
3. Add undo/redo analytics
4. Performance optimization

## Code Locations

Key files to modify:
- ✅ `src/hooks/useUndoRedo.jsx` - Core hook logic
- ✅ `src/App.jsx` - Integration with state management
- ✅ `src/components/OrganizationPanel.jsx` - UI state updates
- ✅ `src/components/Header.jsx` - Undo/redo buttons
- ⚠️ `src/YearWheelClass.js` - Drag-and-drop integration

## Conclusion

The current undo/redo implementation is **architecturally flawed** and cannot be fixed with minor patches. The debouncing pattern, ref-based auto-save, and realtime updates create an impossible-to-debug state synchronization problem.

**Recommended path**: Implement Option C (Hybrid Approach) over 4 days, focusing on making undo work reliably for immediate user actions while gracefully handling the complex edge cases (realtime, auto-save, file import) by clearing history when needed.

The alternative (Option A) is acceptable if time/resources are limited, as version history provides similar functionality without the complexity.
