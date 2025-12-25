# Version History Analysis & Improvements

## Current State

### How It Works
1. **Version Creation**: Versions are ONLY created when `reason === 'manual'` in `executeFullSave()`
2. **Manual Saves**: Triggered when user clicks "Spara" button in Header
3. **Auto-saves**: Use delta saves which do NOT create versions
4. **Storage**: `wheel_versions` table with 100-version retention policy

### The Problem
**Users rarely get versions created** because:
- All item drag/drop operations use delta saves (no version)
- All edits use delta saves (no version)  
- Only explicit "Spara" button clicks create versions
- Users expect auto-save to create versions too

### Current Code Flow
```javascript
// executeFullSave() - line 2020
if (reason === 'manual') {
  await createVersion(wheelId, snapshot, null, false);
}
```

## Proposed Improvements

### 1. Auto-Version on Significant Changes
Create versions automatically for:
- **Every 5-10 changes** (accumulated delta saves)
- **Time-based**: Every 5-10 minutes if changes occurred
- **Before major operations**: Before bulk delete, before import, etc.

### 2. Smart Version Throttling
```javascript
const VERSION_POLICIES = {
  minChangeCount: 5,        // Min changes before auto-version
  minTimeBetween: 5 * 60,   // Min 5 min between auto-versions
  maxTimeBetween: 10 * 60,  // Max 10 min without version if changes
  beforeCriticalOps: true   // Always version before delete/import
};
```

### 3. Improved Version Metadata
```javascript
{
  change_description: "Auto-save: 12 changes (8 items, 2 rings, 2 groups)",
  is_auto_save: true,
  metadata: {
    change_count: 12,
    change_types: ['item_update', 'ring_add', 'group_modify'],
    time_span_minutes: 8,
    user_agent: "...",
    trigger: "auto" | "manual" | "before_delete" | "scheduled"
  }
}
```

### 4. Better UX in Version History Dialog
Current issues:
- Shows only version number and timestamp
- No indication of what changed
- No preview/diff view
- No search/filter

Improvements:
- **Change summary**: "8 items moved, 2 groups added"
- **Time grouping**: Group by day/week
- **Search**: Filter by date, user, change type
- **Quick preview**: Hover to see snapshot thumbnail
- **Restore confirmation**: Show diff before restoring

### 5. Version Cleanup Strategy
Current: Keep last 100 versions (can span many months)

Better approach:
- **Recent**: All versions from last 7 days
- **Weekly**: 1 version per week for last 3 months  
- **Monthly**: 1 version per month for last year
- **Long-term**: Quarterly snapshots indefinitely

## Implementation Plan

### Phase 1: Auto-Versioning (Priority: HIGH)
1. Add version counter to changeTracker
2. Create version every N changes in delta save
3. Add time-based versioning (max 10 min without version)
4. Update version creation to include change summary

### Phase 2: Better Metadata (Priority: MEDIUM)
1. Track change types in changeTracker
2. Generate descriptive change summaries
3. Store metadata with each version

### Phase 3: Improved UI (Priority: MEDIUM)
1. Show change summaries in version list
2. Add time grouping
3. Add search/filter functionality
4. Show preview on hover

### Phase 4: Smart Cleanup (Priority: LOW)
1. Implement tiered retention policy
2. Add manual "pin important version" feature
3. Export/import versions

## Quick Win: Immediate Fix

Add auto-versioning to delta saves:

```javascript
// In handleSave() after delta save success
if (result.success) {
  // Check if we should create a version
  const shouldCreateVersion = 
    changeTracker.changeCount >= 5 || 
    (Date.now() - lastVersionTime) > 5 * 60 * 1000;
  
  if (shouldCreateVersion) {
    await createVersion(
      wheelId,
      await buildWheelSnapshot(),
      `Auto-save: ${changeTracker.changeCount} changes`,
      true // is_auto_save
    );
    changeTracker.resetVersionCounter();
    lastVersionTime = Date.now();
  }
}
```

## Testing Scenarios
1. Make 10 small changes → Should create 2 versions (at 5 changes each)
2. Wait 10 minutes with changes → Should create 1 version
3. Click manual save → Should always create version
4. Delete multiple items → Should create version before delete
5. Import CSV → Should create version before import

## Database Impact
- Versions are already JSONB (efficient storage)
- 100-version limit already prevents unbounded growth
- Auto-versioning will increase DB writes by ~20-40%
- Can be mitigated with smart throttling
