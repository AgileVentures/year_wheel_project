# Undo/Redo Testing Checklist

## Quick Test Suite

Run these tests after deploying to verify undo/redo works correctly:

### Test 1: Basic Toggle ✅
1. Open any wheel
2. Toggle ring visibility ON → OFF → ON
3. Press Ctrl+Z three times
4. **Expected**: Ring should go back through OFF → ON → original state
5. Press Ctrl+Shift+Z three times
6. **Expected**: Ring should go forward to final state

### Test 2: Rapid Changes ✅
1. Click "Visa alla ringar" button
2. Immediately click "Dölj alla ringar"  
3. Immediately click "Visa alla ringar"
4. Press Ctrl+Z
5. **Expected**: Should undo to "Dölj alla" state (no lag/lost actions)

### Test 3: Page Switch Clears History ✅
1. Make changes on Page 2025 (add/edit items)
2. Press Ctrl+Z → Should undo changes
3. Switch to Page 2024
4. Press Ctrl+Z
5. **Expected**: Undo button disabled, nothing happens

### Test 4: Realtime Update Clears History ✅
1. Open wheel in two browser windows (different users)
2. Window A: Make 3 changes, press Ctrl+Z to undo one
3. Window B: Make any change
4. Window A: Wait for realtime update (2-3 seconds)
5. Window A: Press Ctrl+Z
6. **Expected**: Undo button disabled (history cleared)

### Test 5: File Import Clears History ✅
1. Make several changes
2. Press Ctrl+Z → Should undo
3. Click "Importera (.yrw)" and load any file
4. Press Ctrl+Z
5. **Expected**: Undo button disabled, can't undo import

### Test 6: Keyboard Shortcuts ✅
Test all keyboard combinations:
- `Ctrl+Z` (Windows/Linux) - Undo
- `Cmd+Z` (Mac) - Undo
- `Ctrl+Shift+Z` (Windows/Linux) - Redo
- `Cmd+Shift+Z` (Mac) - Redo
- `Ctrl+Y` (Windows/Linux) - Alternative redo
- `Cmd+Y` (Mac) - Alternative redo

### Test 7: UI Feedback ✅
1. Open fresh wheel (no history)
2. **Expected**: Undo/Redo buttons disabled (grayed out)
3. Make any change
4. **Expected**: Undo button enabled, Redo button still disabled
5. Press Ctrl+Z
6. **Expected**: Redo button enabled
7. Hover over buttons
8. **Expected**: Tooltips show "Ångra (Ctrl+Z)" and "Gör om (Ctrl+Shift+Z)"

### Test 8: Toast Notifications ✅
1. Make a change
2. Press Ctrl+Z
3. **Expected**: Toast appears: "Ångrat" (blue/info)
4. Press Ctrl+Shift+Z
5. **Expected**: Toast appears: "Ångrade åtgärd" (blue/info)

### Test 9: Memory Limits ✅
1. Make 60 changes (more than limit of 50)
2. Press Ctrl+Z repeatedly (try to undo all 60)
3. **Expected**: Can only undo 50 most recent changes
4. Oldest 10 changes should be forgotten

### Test 10: Concurrent Auto-Save ✅
1. Make a change
2. Immediately press Ctrl+Z (before 10-second auto-save)
3. **Expected**: Undo works immediately, doesn't wait for auto-save
4. Wait 10 seconds
5. **Expected**: Auto-save happens (check "Sparad" indicator)
6. Press Ctrl+Z
7. **Expected**: Undoes to pre-auto-save state

## Performance Tests

### Load Test
1. Create wheel with 100+ items across 5 rings
2. Make 50 changes
3. Press Ctrl+Z 25 times rapidly
4. **Expected**: Each undo completes in <50ms, UI stays responsive

### Memory Test
1. Make 50 changes (fill history)
2. Open browser DevTools → Memory tab
3. Take heap snapshot
4. Make 50 more changes (replace all history)
5. Take another heap snapshot
6. **Expected**: Memory usage should not double (old entries garbage collected)

## Edge Cases

### Edge 1: Undo During Drag
1. Start dragging an activity
2. Press Ctrl+Z mid-drag
3. **Expected**: Drag cancels, previous action undone

### Edge 2: Redo After New Change
1. Make change A
2. Undo (go back)
3. Make change B (create new branch)
4. Press Ctrl+Shift+Z
5. **Expected**: Redo disabled (future timeline discarded)

### Edge 3: Multiple Rapid Undos
1. Make 10 changes rapidly (within 1 second)
2. Press Ctrl+Z 10 times rapidly
3. **Expected**: All 10 changes undone in reverse order

### Edge 4: Undo While Saving
1. Make change
2. Click "Spara" button
3. Immediately press Ctrl+Z (during save)
4. **Expected**: Undo works, save completes with final state

## Browser Compatibility

Test in:
- ✅ Chrome/Edge (Windows)
- ✅ Chrome/Edge (Mac)
- ✅ Firefox (Windows)
- ✅ Firefox (Mac)
- ✅ Safari (Mac)

## Regression Tests

Ensure existing functionality still works:
- ✅ Manual save button
- ✅ Auto-save (10-second delay)
- ✅ Realtime collaboration
- ✅ Version history
- ✅ File import/export
- ✅ Page navigation
- ✅ Drag-and-drop items

## Known Issues (Acceptable)

These are NOT bugs, they are design decisions:

1. **Can't undo to mid-drag position** - Only final drop position is tracked
   - Why: Tracking every pixel would create thousands of entries
   - Impact: User can only undo entire drag operation

2. **History cleared on realtime update** - Can't undo after someone else makes change
   - Why: Local history becomes invalid with remote changes
   - Impact: User loses undo ability temporarily (expected behavior)

3. **History cleared on page switch** - Can't undo actions from previous page
   - Why: Each page has different items
   - Impact: User can't accidentally corrupt data across pages

## Bug Reporting Template

If undo/redo doesn't work as expected, report with:

```
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Browser:** Chrome 120 / Firefox 121 / Safari 17
**OS:** Windows 11 / macOS 14 / Linux
**Wheel ID:** (if available)
**Console Errors:** (check DevTools Console tab)
**Network Tab:** (check for failed requests)
```

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No TypeErrors or null reference errors
- ✅ Undo/redo completes in <50ms
- ✅ UI stays responsive
- ✅ Toast notifications appear
- ✅ Buttons enable/disable correctly
- ✅ Keyboard shortcuts work

## Post-Deployment Monitoring

Monitor for 1-2 weeks:
- Error rate (should be 0%)
- Undo usage frequency
- Redo usage frequency
- User feedback about "undo not working"

If all metrics look good → Proceed to Phase 2 enhancements.
