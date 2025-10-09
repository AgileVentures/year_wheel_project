# Auto-Save Implementation

> **⚠️ IMPORTANT**: If you're experiencing save loops with multiple users, see [SAVE_LOOP_FIX.md](./SAVE_LOOP_FIX.md)

## Problem Fixed

**Original Issue**: Team member imports file → sees changes briefly → data reverts to DB state → can't save

**Root Causes**:
1. File import only updated React state (not DB)
2. Realtime sync detected "no DB changes" → triggered `loadWheelData()`
3. DB data overwrote imported changes
4. Missing RLS policy prevented manual save (now fixed in `FIX_TEAM_WHEEL_UPDATE.sql`)

## Solution: Auto-Save

Changes are now **automatically saved** after:
- ✅ File import (immediate save after 500ms)
- ✅ Adding/editing activities
- ✅ Adding/editing rings
- ✅ Adding/editing items  
- ✅ Adding/editing labels
- ✅ Changing wheel settings (title, year, colors)
- ✅ Any `organizationData` change

## How It Works

### 1. Debounced Auto-Save
```javascript
const autoSave = useDebouncedCallback(async () => {
  // Saves after 2 seconds of inactivity
  await updateWheel(wheelId, { title, year, colors, ... });
  await saveWheelData(wheelId, organizationData);
}, 2000);
```

**Why 2 seconds?**
- Prevents save on every keystroke
- Allows user to make multiple quick changes
- Still feels "instant" to user

### 2. Smart Save Prevention

Auto-save is **disabled** during:
- ✅ Initial page load (prevents save on mount)
- ✅ Data loading from DB (prevents overwrite)
- ✅ Realtime updates from other users (prevents save loop)
- ✅ Manual save operation (prevents double-save)

```javascript
if (!wheelId || 
    isLoadingData.current || 
    isInitialLoad.current || 
    isRealtimeUpdate.current || 
    !autoSaveEnabled) {
  return; // Skip auto-save
}
```

### 3. File Import Flow

**Before** (broken):
```
1. Import file → State updates
2. Realtime sees "no DB change" → loadWheelData()
3. DB overwrites imported data ❌
```

**After** (fixed):
```
1. Import file → State updates
2. Auto-save triggered after 500ms → Saves to DB
3. Realtime sees "DB changed" → Other users get updates ✅
```

### 4. User Experience

**Visual Feedback**:
- Manual save: "Data har sparats!" (blue/green)
- Auto-save: "Automatiskt sparat" (subtle green)
- File import: "Fil laddad! Sparar automatiskt..." (blue)

**Timing**:
- File import → 500ms → Auto-save
- Data change → 2 seconds idle → Auto-save
- Manual save → Immediate

## Implementation Details

### State Management

```javascript
// Track save state
const [isSaving, setIsSaving] = useState(false);
const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

// Prevent auto-save during operations
const isLoadingData = useRef(false);      // Loading from DB
const isInitialLoad = useRef(true);       // First mount
const isRealtimeUpdate = useRef(false);   // From WebSocket
```

### Auto-Save Triggers

**organizationData changes**:
```javascript
useEffect(() => {
  autoSave(); // Any change to rings/activities/items/labels
}, [organizationData, autoSave]);
```

**Wheel settings changes**:
```javascript
useEffect(() => {
  if (!isInitialLoad.current) {
    autoSave(); // Title, year, colors, ring visibility
  }
}, [title, year, colors, showWeekRing, showMonthRing, showRingNames, autoSave]);
```

**File import**:
```javascript
setTimeout(() => {
  autoSave(); // Immediate save after import
}, 500);
```

### Preventing Save Loops

**Problem**: Auto-save → DB update → Realtime → loadWheelData() → State change → Auto-save...

**Solution**: See [SAVE_LOOP_FIX.md](./SAVE_LOOP_FIX.md) for complete documentation.

**Summary**:
```javascript
const handleRealtimeChange = useCallback((eventType, tableName, payload) => {
  isRealtimeUpdate.current = true;  // Disable auto-save
  throttledReload();                // Load new data
  // Flag reset in loadWheelData()'s finally block (not setTimeout!)
}, [throttledReload]);

const loadWheelData = useCallback(async () => {
  // ...
  } finally {
    isLoadingData.current = false;
    isRealtimeUpdate.current = false; // ← Reset here
  }
}, [wheelId]);
```

## Testing

### Test 1: File Import
1. Create a `.yrw` file with activities
2. Open wheel in browser
3. Import file
4. **Expected**: 
   - Toast: "Fil laddad! Sparar automatiskt..."
   - Toast: "Automatiskt sparat" (2-3 seconds later)
   - Refresh page → changes persist ✅

### Test 2: Add Activity
1. Open wheel
2. Add new activity
3. Wait 2 seconds
4. **Expected**:
   - Toast: "Automatiskt sparat"
   - Refresh page → activity persists ✅

### Test 3: Realtime Sync
1. User A: Open wheel
2. User B: Open same wheel
3. User A: Add activity
4. **Expected**:
   - User A: Auto-save after 2s
   - User B: Sees update via realtime (no auto-save triggered) ✅

### Test 4: Manual Save Still Works
1. Make changes
2. Click "Spara" before auto-save
3. **Expected**:
   - Immediate save
   - Auto-save disabled during manual save
   - No double-save ✅

## Configuration

### Change Auto-Save Delay

```javascript
// In App.jsx
const autoSave = useDebouncedCallback(async () => {
  // Save logic
}, 2000); // Change this (in milliseconds)
```

**Recommendations**:
- **Fast typing**: 3000ms (3 seconds)
- **Default**: 2000ms (2 seconds)
- **Instant**: 1000ms (1 second) - might be too aggressive

### Disable Auto-Save

```javascript
// In App.jsx
const [autoSaveEnabled, setAutoSaveEnabled] = useState(false); // Changed to false
```

Or add a toggle button:
```javascript
<button onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}>
  {autoSaveEnabled ? 'Inaktivera auto-spara' : 'Aktivera auto-spara'}
</button>
```

## Performance Impact

**Network Requests**:
- Before: Manual save only (on-demand)
- After: Auto-save every 2 seconds of editing (minimal)

**Database Load**:
- Typical: 1 save per 2-5 seconds during active editing
- Idle: 0 saves (no unnecessary writes)

**User Experience**:
- ✅ No more lost work
- ✅ Seamless collaboration
- ✅ Less "remember to save" anxiety
- ✅ File imports work correctly

## Troubleshooting

### "Changes not saving"
1. Check browser console for errors
2. Verify RLS policies are applied (`FIX_TEAM_WHEEL_UPDATE.sql`)
3. Check if user is team member (for team wheels)

### "Too many saves"
Increase debounce delay:
```javascript
const autoSave = useDebouncedCallback(async () => {
  // ...
}, 3000); // 3 seconds instead of 2
```

### "Save loop detected"
See [SAVE_LOOP_FIX.md](./SAVE_LOOP_FIX.md) for complete troubleshooting.

Quick check - healthy console pattern:
```javascript
[Realtime] wheel_rings UPDATE: {...}
[AutoSave] Skipped - realtime: true
[WheelEditor] Load complete, flags reset
```

**Broken pattern** (loop):
```javascript
[Realtime] ...
[AutoSave] Saving changes...
[Realtime] ...
[AutoSave] Saving changes...
...infinite repetition...
```

## Future Enhancements

### 1. Optimistic UI Updates
Save locally first, sync to DB in background:
```javascript
// Update UI immediately
setOrganizationData(newData);
// Queue save for later
queueSave(newData);
```

### 2. Offline Support
Cache changes locally, sync when online:
```javascript
if (navigator.onLine) {
  saveToDatabase();
} else {
  saveToLocalStorage();
  // Sync later when online
}
```

### 3. Conflict Resolution
Detect when two users edit same item:
```javascript
if (lastSavedTimestamp < lastModifiedTimestamp) {
  showConflictDialog();
}
```

### 4. Save History / Undo
Track all auto-saves for undo functionality:
```javascript
const saveHistory = useRef([]);
const undo = () => {
  const previousState = saveHistory.current.pop();
  setOrganizationData(previousState);
};
```

## Related Files

- ✅ `src/App.jsx` - Auto-save implementation
- ✅ `src/hooks/useCallbackUtils.js` - `useDebouncedCallback` utility
- ✅ `src/services/wheelService.js` - `saveWheelData()`, `updateWheel()`
- ✅ `FIX_TEAM_WHEEL_UPDATE.sql` - RLS policies (must be applied!)

---

**Status**: ✅ Implemented and tested  
**Breaking Changes**: None  
**Performance Impact**: Minimal (1 save per 2s during editing)  
**User Impact**: ⭐ Major improvement - no more lost work!
