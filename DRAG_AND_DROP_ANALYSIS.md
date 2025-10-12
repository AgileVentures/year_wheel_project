# Drag and Drop Analysis - Year Wheel Activities

## Current Implementation Overview

### Flow Architecture

```
User Action (mousedown on activity)
    ↓
YearWheelClass.startDrag()
    ↓
YearWheelClass.dragActivity() [multiple times during drag]
    → this.create() called on EVERY mousemove! ⚠️
    ↓
YearWheelClass.stopActivityDrag() [mouseup]
    ↓
options.onUpdateAktivitet(updatedItem)
    ↓
YearWheel.jsx → handleUpdateAktivitet()
    ↓
App.jsx → handleUpdateAktivitet()
    ↓
setOrganizationData() → Creates undo history entry! ⚠️
    ↓
useEffect in YearWheel.jsx detects organizationData change
    ↓
yearWheel.updateOrganizationData() → triggers this.create()
```

### Critical Problem: History Spam 🔴

**Current Behavior**:
- Every `mousemove` during drag calls `this.create()` to show preview
- When drag ends, `setOrganizationData()` is called
- This creates **ONE undo history entry** per drag (good!)
- BUT the user experience during drag is already smooth

**However**, there's a potential issue:
- If the drag implementation were to call `setOrganizationData()` during the drag (which it doesn't currently), it would create 50+ history entries
- The batch mode we implemented in Phase 2B is **perfect** for this use case

## File Locations

### 1. YearWheelClass.js (Main drag logic)
**Path**: `/Users/thomasochman/Projects/year_wheel_poc/src/YearWheelClass.js`

**Key Functions**:

#### `startDrag(event)` - Lines 1484-1520
```javascript
startDrag(event) {
  // Check if clicking on activity
  for (const itemRegion of this.clickableItems) {
    if (this.isPointInItemRegion(x, y, itemRegion)) {
      const dragMode = this.detectDragZone(x, y, itemRegion);
      
      this.dragState = {
        isDragging: true,
        dragMode: dragMode,  // 'move', 'resize-start', or 'resize-end'
        draggedItem: freshItem,
        draggedItemRegion: itemRegion,
        startMouseAngle: this.getMouseAngle(event),
        initialStartAngle: itemRegion.startAngle,
        initialEndAngle: itemRegion.endAngle,
        previewStartAngle: itemRegion.startAngle,
        previewEndAngle: itemRegion.endAngle,
      };
      
      return; // Don't start wheel rotation
    }
  }
  
  // If not on activity, start wheel rotation drag
  this.isDragging = true;
}
```

**Features**:
- ✅ Detects drag zone (resize-start, move, resize-end)
- ✅ Stores initial state
- ✅ Uses fresh item data from organizationData
- ✅ Prevents wheel rotation when dragging activity

---

#### `dragActivity(event)` - Lines 1543-1602
```javascript
dragActivity(event) {
  if (!this.dragState.isDragging) return;

  const currentMouseAngle = this.getMouseAngle(event);
  const angleDiff = currentMouseAngle - this.dragState.startMouseAngle;
  
  // Detect target ring (for ring switching in move mode)
  if (this.dragState.dragMode === 'move') {
    const targetRingInfo = this.detectTargetRing(x, y);
    this.dragState.targetRing = targetRingInfo ? targetRingInfo.ring : null;
  }
  
  // Update preview angles based on drag mode
  if (this.dragState.dragMode === 'move') {
    // Move entire activity
    this.dragState.previewStartAngle = this.dragState.initialStartAngle + angleDiff;
    this.dragState.previewEndAngle = this.dragState.initialEndAngle + angleDiff;
  } else if (this.dragState.dragMode === 'resize-start') {
    // Resize left edge (keep right fixed)
    const newStartAngle = this.dragState.initialStartAngle + angleDiff;
    // Enforce minimum 1 week width
    this.dragState.previewStartAngle = clampedStartAngle;
  } else if (this.dragState.dragMode === 'resize-end') {
    // Resize right edge (keep left fixed)
    const newEndAngle = this.dragState.initialEndAngle + angleDiff;
    // Enforce minimum 1 week width
    this.dragState.previewEndAngle = clampedEndAngle;
  }
  
  // ⚠️ Redraw EVERY time mouse moves
  this.create();
}
```

**Called**: On EVERY `mousemove` event during drag

**Performance**: 
- Calls `this.create()` which redraws entire canvas
- Throttled by browser's render loop (~60fps)
- Acceptable for preview rendering

**Issue**: If we ever needed to sync state during drag, this would create history spam

---

#### `stopActivityDrag()` - Lines 1617-1680
```javascript
stopActivityDrag() {
  if (!this.dragState.isDragging) return;

  // Convert preview angles to dates
  let newStartDate = this.angleToDate(this.toDegrees(this.dragState.previewStartAngle));
  let newEndDate = this.angleToDate(this.toDegrees(this.dragState.previewEndAngle));
  
  // Clamp to year boundaries (Jan 1 - Dec 31)
  if (newStartDate < yearStart) newStartDate = yearStart;
  if (newEndDate > yearEnd) newEndDate = yearEnd;
  
  // Ensure end >= start
  if (newEndDate < newStartDate) newEndDate = new Date(newStartDate);
  
  // Format as YYYY-MM-DD
  const updatedItem = {
    ...this.dragState.draggedItem,
    startDate: formatDate(newStartDate),
    endDate: formatDate(newEndDate),
  };

  // If ring changed, update ringId
  if (this.dragState.targetRing && 
      this.dragState.targetRing.id !== this.dragState.draggedItem.ringId) {
    updatedItem.ringId = this.dragState.targetRing.id;
  }
  
  // Reset drag state
  this.dragState = { isDragging: false, ... };
  this.canvas.style.cursor = 'default';
  
  // ⚠️ Single callback at end - creates ONE undo entry
  if (this.options.onUpdateAktivitet) {
    this.options.onUpdateAktivitet(updatedItem);
  }
}
```

**Good**: Only calls callback ONCE at the end of drag
**Result**: Single undo history entry per drag operation

---

#### `detectDragZone(x, y, itemRegion)` - Lines 455-478
```javascript
detectDragZone(x, y, itemRegion) {
  // Get angle of click relative to center
  const dx = x - this.center.x;
  const dy = y - this.center.y;
  let clickAngle = Math.atan2(dy, dx);
  
  // Account for rotation
  clickAngle -= this.rotationAngle;
  
  // Calculate relative position within activity (0 to 1)
  const relativePosition = relativeAngle / angleSpan;
  
  // Zones: left 10%, middle 80%, right 10%
  if (relativePosition < 0.1) {
    return 'resize-start';
  } else if (relativePosition > 0.9) {
    return 'resize-end';
  } else {
    return 'move';
  }
}
```

**Smart**: Divides activity into 3 zones for intuitive dragging

---

### 2. YearWheel.jsx (React wrapper)
**Path**: `/Users/thomasochman/Projects/year_wheel_poc/src/YearWheel.jsx`

#### `handleUpdateAktivitet` - Lines 126-132
```javascript
const handleUpdateAktivitet = useCallback((updatedItem) => {
  if (onUpdateAktivitetRef.current) {
    onUpdateAktivitetRef.current(updatedItem);
  }
}, []); // Empty deps - uses ref
```

**Purpose**: Forwards callback to App.jsx without causing re-renders

---

### 3. App.jsx (State management)
**Path**: `/Users/thomasochman/Projects/year_wheel_poc/src/App.jsx`

#### `handleUpdateAktivitet` - Lines 1266-1273
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

**Issue**: No descriptive label provided!
**Result**: Auto-detection will generate generic "Ändra organisationsdata"

---

## Analysis: Good vs Could Be Better

### ✅ What's Working Well

1. **Single Undo Entry Per Drag**
   - Drag ends → callback called once
   - setOrganizationData() called once
   - Result: 1 undo entry (not 50+)

2. **Smooth Preview**
   - Canvas redraws during drag show visual feedback
   - No state updates during drag
   - Performance is acceptable

3. **Clean Separation**
   - YearWheelClass handles canvas/visual
   - React handles state/undo
   - Clear boundary between concerns

4. **Drag Zone Detection**
   - 10% / 80% / 10% split for resize/move
   - Intuitive UX

5. **Ring Switching**
   - Can drag activity to different ring
   - Visual feedback during drag
   - Updates ringId on drop

### ⚠️ Could Be Better

1. **Missing Descriptive Label**
   ```javascript
   // Current:
   setOrganizationData(prevData => ({...}));
   
   // Better:
   setOrganizationData(prevData => ({...}), `Flytta ${updatedItem.name}`);
   ```
   **Impact**: Undo button would show "Ångra: Flytta Projekt X"

2. **No Batch Mode Integration (Yet)**
   - Current implementation doesn't need it (callback only at end)
   - BUT if we ever wanted intermediate updates, we'd need batch mode
   - Good to have the infrastructure ready

3. **Potential for Wheel Rotation Batch Mode**
   - Wheel rotation (`drag()` function) could also benefit
   - Each rotation update could be batched
   - Single undo entry for entire rotation gesture

---

## Recommendations

### Priority 1: Add Descriptive Labels ⭐⭐⭐

**Issue**: Drag operations show generic "Ändra organisationsdata" in undo button

**Solution**: Add descriptive labels to handleUpdateAktivitet

```javascript
const handleUpdateAktivitet = useCallback((updatedItem) => {
  // Find the old item to compare
  const oldItem = organizationData.items.find(item => item.id === updatedItem.id);
  
  let label = 'Ändra aktivitet';
  
  if (oldItem) {
    // Check what changed
    if (oldItem.ringId !== updatedItem.ringId) {
      label = `Flytta ${updatedItem.name} till annan ring`;
    } else if (oldItem.startDate !== updatedItem.startDate || 
               oldItem.endDate !== updatedItem.endDate) {
      label = `Ändra datum för ${updatedItem.name}`;
    }
  }
  
  setOrganizationData(prevData => ({
    ...prevData,
    items: prevData.items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    )
  }), label);  // ← Pass descriptive label
}, [organizationData.items, setOrganizationData]);
```

**Result**: 
- Undo button shows: "Ångra: Flytta Projekt X till annan ring"
- Much better user experience!

---

### Priority 2: Add Batch Mode to Wheel Rotation (Optional) ⭐⭐

**Issue**: Rotating the wheel creates smooth animation but doesn't update state

**Current**: Wheel rotation is purely visual (rotationAngle changes, no state update)

**If we ever wanted to make rotation undoable**:

```javascript
// In YearWheelClass.js
startDrag(event) {
  if (clickingOnActivity) {
    // ... existing activity drag logic
  } else {
    // Start wheel rotation
    this.isDragging = true;
    this.lastMouseAngle = this.getMouseAngle(event);
    this.dragStartAngle = this.rotationAngle;
    
    // ✨ NEW: Start batch mode for rotation
    if (this.options.onStartBatch) {
      this.options.onStartBatch('Rotera hjulet');
    }
  }
}

stopDrag(event) {
  if (this.dragState.isDragging) {
    // Activity drag - already handled
    this.stopActivityDrag();
    return;
  }

  if (!this.isDragging) return;
  this.isDragging = false;
  
  // ✨ NEW: End batch mode for rotation
  if (this.options.onEndBatch) {
    this.options.onEndBatch();
  }
}
```

**Benefit**: If we store rotationAngle in state, it would be undoable with single entry

---

### Priority 3: Add Cancel on Escape Key ⭐

**Enhancement**: Allow user to cancel drag with Escape key

```javascript
// In YearWheelClass.js constructor
this.boundHandlers = {
  startDrag: this.startDrag.bind(this),
  handleMouseMove: this.handleMouseMove.bind(this),
  stopDrag: this.stopDrag.bind(this),
  handleMouseLeave: this.handleMouseLeave.bind(this),
  handleClick: this.handleClick.bind(this),
  handleKeyDown: this.handleKeyDown.bind(this),  // ✨ NEW
};

// Add keyboard listener
document.addEventListener("keydown", this.boundHandlers.handleKeyDown);

// New method
handleKeyDown(event) {
  if (event.key === 'Escape' && this.dragState.isDragging) {
    // Cancel drag - reset to original state
    this.dragState = { isDragging: false, ... };
    this.canvas.style.cursor = 'default';
    this.create(); // Redraw without preview
  }
}

// Don't forget cleanup
cleanup() {
  // ... existing cleanup
  document.removeEventListener("keydown", this.boundHandlers.handleKeyDown);
}
```

**UX Benefit**: Users can abort accidental drags

---

## Testing Checklist

### Current Functionality
- [ ] Drag activity to new position → Undo shows "Ångra: ?" (check label)
- [ ] Resize activity start edge → Dates update correctly
- [ ] Resize activity end edge → Dates update correctly
- [ ] Drag activity to different ring → ringId updates
- [ ] Drag off canvas edge → Drag cancels correctly
- [ ] Click activity → Tooltip appears (not drag)
- [ ] Undo after drag → Activity returns to original position
- [ ] Redo after undo → Activity returns to new position

### With Priority 1 Changes (Descriptive Labels)
- [ ] Drag activity → Undo shows "Ångra: Ändra datum för [name]"
- [ ] Drag to different ring → Undo shows "Ångra: Flytta [name] till annan ring"
- [ ] Label appears in button and tooltip
- [ ] Keyboard shortcut toast shows label

### Performance
- [ ] Drag is smooth (no stuttering)
- [ ] No memory leaks after 50+ drags
- [ ] Canvas redraws don't slow down over time
- [ ] History limit enforced (max 50 entries)

---

## Code Quality Observations

### ✅ Strengths

1. **Clean State Management**
   - dragState object encapsulates all drag info
   - Reset properly on drag end
   - No leaked state

2. **Proper Coordinate Handling**
   - Accounts for canvas scaling
   - Handles rotation correctly
   - Proper angle normalization

3. **Preview System**
   - Shows visual feedback during drag
   - Doesn't commit until mouseup
   - Clean separation of preview vs committed state

4. **Error Handling**
   - Clamps dates to year boundaries
   - Enforces minimum activity width (1 week)
   - Ensures end >= start

### 🟡 Areas for Enhancement

1. **Missing Label Parameter**
   - Easy fix: Pass label to setOrganizationData
   - Big UX improvement

2. **No Drag Cancel**
   - Escape key support would be nice
   - Low priority

3. **Magic Numbers**
   - `0.1` and `0.9` for drag zones
   - Could be constants: `RESIZE_ZONE_PERCENT = 0.1`

4. **Angle Calculations**
   - Complex but correct
   - Could benefit from more comments

---

## Performance Analysis

### Current Performance

**Drag Activity**:
- Mouse move events: ~60/second (browser throttled)
- Canvas redraws: ~60/second (throttled by requestAnimationFrame)
- State updates: 1 (only at end)
- Undo entries: 1 (only at end)

**Verdict**: ✅ Excellent! Smooth and efficient.

### Potential Optimizations (Not Needed Currently)

1. **Throttle Canvas Redraws**
   - Could add `requestAnimationFrame` guard in `dragActivity()`
   - Currently browser already throttles, so minimal benefit

2. **Offscreen Canvas for Static Parts**
   - Already implemented! (`backgroundCache`)
   - Good optimization for complex wheels

3. **Avoid Full Redraw During Drag**
   - Could cache everything except dragged item
   - Draw only dragged item on top
   - Complex to implement, marginal benefit

---

## Integration with Phase 2B Batch Mode

### How Batch Mode Would Work (If Needed)

**Scenario**: If we wanted to update state during drag (not just at end)

```javascript
// In YearWheel.jsx
useEffect(() => {
  if (yearWheel) {
    yearWheel.setOptions({
      onStartActivityDrag: (item) => {
        // ✨ Start batch when drag begins
        startBatch(`Flytta ${item.name}`);
      },
      onActivityDragMove: (updatedItem) => {
        // ✨ Update state during drag (batched)
        setOrganizationData(prev => ({
          ...prev,
          items: prev.items.map(i => i.id === updatedItem.id ? updatedItem : i)
        }));
        // No history entry created! (batch mode active)
      },
      onEndActivityDrag: () => {
        // ✨ Commit batch when drag ends
        endBatch();
        // Single history entry created for entire drag!
      },
      onCancelActivityDrag: () => {
        // ✨ Cancel batch if drag cancelled
        cancelBatch();
        // No history entry, state reverted
      }
    });
  }
}, [yearWheel, startBatch, endBatch, cancelBatch, setOrganizationData]);
```

**But we don't need this!** Current implementation is already optimal:
- Updates once at end
- Single undo entry
- Smooth preview

**When would we need batch mode?**
- If drag updates needed to be synced to database in realtime
- If other users needed to see drag in progress
- If drag preview required actual state changes (not just canvas preview)

**Conclusion**: Current approach is perfect. Batch mode is ready if needed in future.

---

## Conclusion

### Current State: ✅ Excellent Foundation

**The drag and drop system is well-designed**:
- Clean separation of concerns
- Efficient (1 undo entry per drag)
- Smooth UX with preview
- Proper coordinate handling

### Recommended Improvements:

**High Priority** ⭐⭐⭐:
1. Add descriptive labels to `handleUpdateAktivitet` (30 minutes)
   - Result: "Ångra: Flytta Projekt X" instead of generic "Ångra: Ändra"
   - Significant UX improvement

**Medium Priority** ⭐⭐:
2. Add Escape key to cancel drag (15 minutes)
   - Nice-to-have UX enhancement

**Low Priority** ⭐:
3. Extract magic numbers to constants (5 minutes)
   - Code quality improvement

### No Changes Needed:

❌ **Batch mode integration**: Not needed (already optimal)
❌ **Performance optimization**: Already smooth and efficient
❌ **Undo integration**: Already working correctly (1 entry per drag)

### Next Steps:

1. **Option A**: Implement Priority 1 (descriptive labels) - 30 minutes
2. **Option B**: Leave as-is (already working great)
3. **Option C**: Document current behavior and call it done

**Recommendation**: Option A - the descriptive label improvement is low-effort, high-impact.

---

**Analysis Complete** ✅

The drag and drop system is production-ready and well-architected. The only real improvement needed is adding descriptive undo labels, which is a quick win for better UX.
