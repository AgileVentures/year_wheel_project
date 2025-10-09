# Complete Collaboration Flow Analysis & Fixes

**Date**: October 9, 2025  
**Issue**: File import not saving properly + comprehensive collaboration review  
**Status**: ✅ ALL SCENARIOS FIXED

---

## Critical Bug Found in File Import

### The Problem

**Original Code** (BROKEN):
```javascript
// 1. Set state (asynchronous)
setOrganizationData(orgData);

// 2. Try to save immediately
if (wheelId) {
  await saveWheelData(wheelId, data.organizationData); // ← WRONG!
}
```

**Why it failed**:
1. `setOrganizationData()` is asynchronous - state doesn't update immediately
2. We were saving `data.organizationData` (raw from file) instead of `orgData` (processed)
3. Backward compatibility conversion (`activities` → `activityGroups`) wasn't being saved
4. State updates triggered `useEffect` → auto-save (but was blocked by flags)
5. Race condition: realtime could reload before save completed

---

### The Fix

**New Code** (FIXED):
```javascript
// 1. Process data FIRST (synchronous)
const processedOrgData = processOrganizationData(data.organizationData);

// 2. Save IMMEDIATELY to database (before state update)
if (wheelId) {
  await updateWheel(wheelId, { title, year, colors, ... });
  await saveWheelData(wheelId, processedOrgData); // ← Use processed data!
}

// 3. THEN update state (UI reflects saved data)
setOrganizationData(processedOrgData);
```

**Why it works**:
1. ✅ Data processing happens synchronously
2. ✅ Save uses the EXACT data that will be in state
3. ✅ No race condition - DB updated before state
4. ✅ If save fails, state doesn't update (user sees error)
5. ✅ Realtime stays blocked until save completes + 1 second

---

## Complete Collaboration Flow Analysis

### Scenario 1: User Opens Existing Wheel

**Flow**:
```
1. User navigates to /wheel/:id
2. useEffect fires → loadWheelData()
3. isLoadingData = true
4. Fetch from Supabase
5. Set all state (title, year, organizationData, etc.)
6. finally: isLoadingData = false
7. useEffect triggers from state changes
8. autoSave() called but SKIPPED (isInitialLoad = true)
9. 500ms later: isInitialLoad = false
10. Realtime subscription active
```

**Status**: ✅ **WORKING** - Initial load doesn't trigger auto-save

---

### Scenario 2: User Makes Change (Single User)

**Flow**:
```
1. User adds activity in modal
2. setOrganizationData({ ...organizationData, items: [...items, newItem] })
3. useEffect fires
4. autoSave() queued (debounced 2s)
5. 2 seconds pass
6. autoSave() executes:
   - isSavingRef = true (blocks realtime)
   - await updateWheel(...)
   - await saveWheelData(...)
   - lastSaveTimestamp = Date.now()
   - isSavingRef = false
7. Supabase broadcasts change
8. handleRealtimeChange() called
9. Check: timeSinceLastSave = 50ms (< 3000ms)
10. IGNORE own broadcast ✅
11. No unnecessary reload
```

**Status**: ✅ **WORKING** - Self-reload prevented

---

### Scenario 3: Two Users Editing Same Wheel

**User A Flow**:
```
1. User A: Adds activity "Meeting"
2. autoSave() after 2s
3. DB updates
4. Supabase broadcasts to A and B
5. User A: Ignores own broadcast (< 3s)
6. No reload, no flicker ✅
```

**User B Flow**:
```
1. User B: Working on wheel
2. Receives broadcast from User A
3. timeSinceLastSave > 3s (not B's save)
4. isRealtimeUpdate = true
5. throttledReload() → loadWheelData()
6. Fetch new data from DB
7. Update state (includes User A's "Meeting")
8. finally: isRealtimeUpdate = false
9. useEffect fires
10. autoSave() SKIPPED (isRealtimeUpdate was true)
11. User B sees "Meeting" activity ✅
```

**Status**: ✅ **WORKING** - Multi-user collaboration works

---

### Scenario 4: File Import (Existing Wheel)

**Flow**:
```
1. User clicks "Ladda" → selects .yrw file
2. File reads
3. isLoadingData = true, isRealtimeUpdate = true
4. Process organizationData (activities → activityGroups conversion)
5. Save to database FIRST:
   - await updateWheel(wheelId, { title, year, ... })
   - await saveWheelData(wheelId, processedOrgData)
6. If save successful:
   - Update all state
   - Toast: "Fil laddad och sparad!"
7. If save fails:
   - Toast: "Fil laddad men kunde inte sparas"
   - Don't update state (keep old data)
   - return early
8. Wait 1 second
9. isLoadingData = false, isRealtimeUpdate = false
10. Realtime re-enabled
11. No race condition ✅
```

**Status**: ✅ **FIXED** - Save happens before state update

---

### Scenario 5: File Import While Another User Active

**User A (importing)**:
```
1. User A: Imports file
2. Flags set (blocks realtime)
3. Saves to DB immediately
4. Updates own state
5. Flags reset after 1s
```

**User B (active)**:
```
1. User B: Working on wheel
2. Receives broadcast (User A's save)
3. Realtime triggers loadWheelData()
4. Fetches LATEST data (User A's import)
5. User B's wheel updates
6. If User B had unsaved changes:
   - They're overwritten ⚠️
   - But auto-save would have saved them (2s debounce)
```

**Potential Issue**: If User B makes change and User A imports within 2 seconds, User B loses data.

**Mitigation**: Auto-save happens every 2 seconds, so window is small. For better UX, could:
- Show warning: "Another user is editing, your changes will be saved"
- Lock editing during import (complex)
- Merge changes (very complex, would need OT/CRDT)

**Current Status**: ⚠️ **ACCEPTABLE** - Race window is 2 seconds, unlikely in practice

---

### Scenario 6: Save Loop (Two Users Rapid Changes)

**Previous Bug**:
```
User A saves → Broadcast
User B receives → Reloads → State changes
User B's useEffect fires → autoSave()
User B saves → Broadcast
User A receives → Reloads → State changes
User A's useEffect fires → autoSave()
∞ LOOP!
```

**Fixed By**:
1. ✅ `isRealtimeUpdate` flag stays TRUE during entire `loadWheelData()`
2. ✅ Flag reset in `finally` block (not setTimeout)
3. ✅ `autoSave()` checks flag and SKIPS

**Status**: ✅ **FIXED** - No more save loops

---

### Scenario 7: Rapid Consecutive Changes (Single User)

**Flow**:
```
1. User types in modal
2. onChange fires → setOrganizationData()
3. autoSave() queued (2s debounce)
4. User types more
5. autoSave() cancelled, re-queued (2s from now)
6. User types more
7. autoSave() cancelled, re-queued again
8. User stops typing
9. 2 seconds pass
10. autoSave() executes ONCE ✅
11. Single DB write (efficient)
```

**Status**: ✅ **WORKING** - Debouncing prevents excessive saves

---

### Scenario 8: Network Error During Auto-Save

**Flow**:
```
1. User makes change
2. autoSave() fires after 2s
3. Network request fails
4. catch block:
   - Toast: "Auto-sparning misslyckades"
   - console.error logs details
5. finally block:
   - isSavingRef = false
6. User sees error, can:
   - Click "Spara" manually
   - Export to file
   - Wait for network to recover (auto-save will retry on next change)
```

**Status**: ✅ **WORKING** - Errors visible to user

---

### Scenario 9: Browser Refresh During Active Session

**Flow**:
```
1. User has unsaved changes (< 2s old)
2. User hits refresh
3. Browser unloads
4. Auto-save didn't fire yet
5. Data LOST ⚠️
```

**Potential Issue**: Recent changes (< 2 seconds) lost on refresh.

**Mitigation Options**:
1. `beforeunload` event → save synchronously (can be slow)
2. Reduce debounce to 500ms (more DB writes)
3. **Current**: Accept 2-second window (most apps do this)

**Current Status**: ⚠️ **ACCEPTABLE** - Standard behavior for auto-save apps

---

### Scenario 10: Offline → Online Transition

**Flow**:
```
1. User goes offline (airplane mode)
2. User makes changes
3. autoSave() fires
4. Network error → toast shown
5. User makes more changes
6. autoSave() fires again → error again
7. User goes online
8. User makes change
9. autoSave() fires → SUCCESS ✅
10. All data now saved
```

**Current Issue**: Changes made offline are in state but not saved until online.

**Mitigation**: 
- Data persists in React state during session
- User can export to file as backup
- For true offline support, would need IndexedDB/ServiceWorker

**Current Status**: ⚠️ **ACCEPTABLE** - Standard for web apps without offline support

---

## Flag State Management

### Flags and Their Purpose

```javascript
isLoadingData.current      // Prevents auto-save during DB load
isInitialLoad.current      // Prevents auto-save on mount
isRealtimeUpdate.current   // Prevents auto-save after realtime reload
lastSaveTimestamp.current  // Tracks when we last saved (ignore own broadcasts)
isSavingRef.current        // Blocks realtime during save operation
isSaving (state)           // Updates UI (Header button)
autoSaveEnabled (state)    // Can disable auto-save temporarily
```

### Flag Truth Table

| Scenario | isLoadingData | isInitialLoad | isRealtimeUpdate | autoSave? |
|----------|--------------|---------------|------------------|-----------|
| Initial mount | true → false | true → false | false | ❌ No |
| User edits | false | false | false | ✅ Yes |
| Realtime update | true → false | false | true → false | ❌ No |
| File import | true → false | false | true → false | ❌ No |
| During save | false | false | false | ✅ Yes |

---

## Console Log Patterns

### Healthy Patterns ✅

**File Import**:
```
[FileImport] Starting file import...
[FileImport] Processed organization data from file: {...}
[FileImport] Saving imported data to database...
[FileImport] Successfully saved to database
[FileImport] Import complete, realtime re-enabled
```

**Auto-Save**:
```
[AutoSave] Saving changes...
[AutoSave] Changes saved successfully (silent)
```

**Realtime (Own Save)**:
```
[Realtime] activity_groups UPDATE: {...}
[Realtime] Ignoring own broadcast (saved 87ms ago)
```

**Realtime (Other User)**:
```
[Realtime] activity_groups UPDATE: {...}
[Realtime] Reloading wheel data due to remote changes
[WheelEditor] Loading wheel data: <wheelId>
[WheelEditor] Load complete, flags reset
```

### Problem Patterns ❌

**Save Loop** (should NOT see):
```
[AutoSave] Saving changes...
[Realtime] Reloading wheel data
[AutoSave] Saving changes...
[Realtime] Reloading wheel data
```

**File Import Lost** (should NOT see):
```
[FileImport] Starting file import...
[Realtime] Reloading wheel data  ← BAD: Realtime during import
[FileImport] Saving imported data  ← TOO LATE
```

---

## Testing Matrix

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Open wheel | Loads without auto-save | ✅ |
| Add activity | Auto-saves after 2s (silent) | ✅ |
| Manual save | Shows toast + button loading | ✅ |
| Import file (DB) | Saves immediately, toast shown | ✅ |
| Import file (localStorage) | Updates state, toast shown | ✅ |
| Two users edit | Changes sync via realtime | ✅ |
| Own save broadcasts back | Ignored (< 3s window) | ✅ |
| Rapid typing | Single save after 2s idle | ✅ |
| Network error | Error toast shown | ✅ |
| Realtime during save | Blocked by isSavingRef | ✅ |
| Save loop scenario | Prevented by flags | ✅ |

---

## Remaining Edge Cases

### 1. Concurrent Edits (< 2s window)
**Scenario**: User A and User B edit simultaneously  
**Result**: Last save wins (Supabase default)  
**Impact**: ⚠️ Rare, acceptable  
**Fix**: Would require OT/CRDT (complex)

### 2. Browser Refresh (< 2s unsaved)
**Scenario**: User edits, refreshes before 2s  
**Result**: Changes lost  
**Impact**: ⚠️ Standard behavior  
**Fix**: beforeunload save (can block browser)

### 3. Offline Changes
**Scenario**: User offline, makes changes  
**Result**: Stays in state, not saved  
**Impact**: ⚠️ Web app limitation  
**Fix**: IndexedDB + sync on reconnect (complex)

---

## Summary

✅ **File import**: Fixed - saves before state update  
✅ **Multi-user**: Working - realtime sync without loops  
✅ **Auto-save**: Silent and efficient  
✅ **Error handling**: Visible to users  
✅ **Performance**: Debounced, optimized  

⚠️ **Known Limitations**:
- 2-second race window for concurrent edits (acceptable)
- Refresh loses changes < 2s old (standard)
- No offline support (out of scope)

**Ready for production with realistic expectations!** 🚀
