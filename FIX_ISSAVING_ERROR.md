# Quick Fix: isSaving Reference Error

**Error**: `ReferenceError: isSaving is not defined`  
**Location**: Line 674 in App.jsx (Header component prop)  
**Status**: ✅ FIXED

## Problem

When refactoring to use `isSavingRef` for logic, we forgot that the `Header` component still needs the `isSaving` prop for UI feedback (showing a loading spinner or disabled save button).

## Solution

**Keep both**:
1. **`isSavingRef`** (useRef) - For logic (prevent realtime during save)
2. **`isSaving`** (useState) - For UI (Header component visual feedback)

## Changes Made

### `App.jsx` - Line 66
```javascript
// Added back for UI feedback
const [isSaving, setIsSaving] = useState(false);
```

### `autoSave()` function
```javascript
try {
  isSavingRef.current = true;
  setIsSaving(true); // ← Update UI
  
  await updateWheel(...);
  await saveWheelData(...);
  
} finally {
  isSavingRef.current = false;
  setIsSaving(false); // ← Update UI
}
```

### `handleSave()` function
```javascript
try {
  isSavingRef.current = true;
  setIsSaving(true); // ← Update UI
  
  await updateWheel(...);
  await saveWheelData(...);
  
} finally {
  isSavingRef.current = false;
  setIsSaving(false); // ← Update UI
}
```

## Why Both?

**`isSavingRef`** (useRef):
- Fast synchronous access
- Doesn't trigger re-renders
- Used in `handleRealtimeChange()` to check if save is active
- Perfect for logic checks

**`isSaving`** (useState):
- Triggers re-renders
- Updates UI components
- Used by `Header` component to show loading state
- Perfect for visual feedback

## Testing

1. Open app
2. Make a change
3. Wait 2 seconds
4. ✅ Should see "Automatiskt sparat" toast
5. ✅ Should NOT see console error
6. ✅ Header should show saving indicator (if implemented)

## Related Files

- `src/App.jsx` - Main fix
- `src/components/Header.jsx` - Uses `isSaving` prop
- `FILE_IMPORT_REALTIME_FIX.md` - Context for the refactoring
