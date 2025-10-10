# AI Assistant Data Flow Analysis

## Current Flow (Working ✅)

### 1. User sends message to AI
```
User types: "Skapa en aktivitet i mars"
  ↓
AIAssistant.jsx handleSubmit()
  ↓
streamText() with tools
  ↓
AI decides to call createItem tool
```

### 2. AI calls createItem tool
```javascript
// AIAssistant.jsx lines 160-177
execute: async ({ name, startDate, endDate, ringId, activityGroupId, time }) => {
  const result = await aiCreateItem(wheelId, { ... });
  if (result.success) {
    await loadWheelContext(); // ✅ Refreshes AI's context
    onWheelUpdate && onWheelUpdate(); // ✅ Calls App.jsx loadWheelData()
  }
  return result;
}
```

### 3. aiCreateItem() saves to database
```javascript
// aiWheelService.js lines 162-208
export const aiCreateItem = async (wheelId, { ... }) => {
  // 1. Fetch current wheel data
  const wheelData = await fetchWheel(wheelId);
  
  // 2. Add new item to organizationData
  const updatedOrgData = {
    ...orgData,
    items: [...orgData.items, newItem]
  };
  
  // 3. Save to database
  await saveWheelData(wheelId, updatedOrgData);
  
  return { success: true, item: newItem, message: ... };
}
```

### 4. saveWheelData() syncs to Supabase
```javascript
// wheelService.js lines 239-254
export const saveWheelData = async (wheelId, organizationData) => {
  // 1. Sync rings and get ID mappings (old ID -> new UUID)
  const ringIdMap = await syncRings(wheelId, organizationData.rings || []);
  
  // 2. Sync activity groups and get ID mappings
  const activityIdMap = await syncActivityGroups(wheelId, organizationData.activityGroups || []);
  
  // 3. Sync labels and get ID mappings
  const labelIdMap = await syncLabels(wheelId, organizationData.labels || []);
  
  // 4. Sync items with ID mappings ✅ SAVES TO DATABASE
  await syncItems(wheelId, organizationData.items || [], ringIdMap, activityIdMap, labelIdMap);
};
```

### 5. App.jsx reloads wheel data
```javascript
// App.jsx line 1436
<AIAssistant
  wheelId={wheelId}
  onWheelUpdate={loadWheelData} // ✅ Callback is properly wired
  ...
/>

// App.jsx lines 148-293
const loadWheelData = useCallback(async () => {
  // 1. Fetch wheel from database
  const wheelData = await fetchWheel(wheelId);
  
  // 2. Update React state
  setOrganizationData(wheelData.organizationData);
  setTitle(wheelData.title);
  setYear(wheelData.year);
  // ... etc
  
  // 3. Trigger wheel re-render
  setRerenderKey(prev => prev + 1);
});
```

## ✅ What's WORKING

1. **AI Tool Execution**: ✅ Tools execute successfully
2. **Database Persistence**: ✅ `saveWheelData()` saves to Supabase
3. **Callback Wiring**: ✅ `onWheelUpdate()` calls `loadWheelData()`
4. **State Refresh**: ✅ `loadWheelData()` fetches fresh data and updates state
5. **Render Trigger**: ✅ `setRerenderKey()` forces canvas redraw

## 🔍 Potential Issues

### Issue 1: Temporary IDs in aiCreateItem
```javascript
// aiWheelService.js line 195
const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

**Problem**: When AI creates an item with a temporary ID like `item-1234567890-abc`, 
`saveWheelData()` treats it as new and inserts it. Then `loadWheelData()` fetches 
it back with a **database UUID**, causing ID mismatch.

**Solution**: ✅ Already handled by `syncItems()` in wheelService.js

### Issue 2: Ring ID References
```javascript
// AI provides ringId from context (e.g., "ring-123-abc")
// But after saveWheelData(), ring gets NEW UUID from database
// Item still references old temporary ID
```

**Fix**: The `ringIdMap` in `saveWheelData()` handles this mapping:
```javascript
const ringIdMap = await syncRings(...); // Maps old ID → new UUID
await syncItems(wheelId, items, ringIdMap, ...); // Remaps item.ringId
```

### Issue 3: AI Context Stale After Creation
```javascript
// AIAssistant.jsx line 138
await loadWheelContext(); // Refreshes AI's wheelContext state
```

**This is correct** - after creating item, AI needs fresh context with new IDs.

## 🐛 Debug Steps

### 1. Check if item was saved to database
```sql
SELECT * FROM items WHERE wheel_id = '...' ORDER BY created_at DESC LIMIT 5;
```

### 2. Check console logs
```javascript
// Add to aiCreateItem in aiWheelService.js line 206
console.log('[aiCreateItem] Created item:', newItem);
console.log('[aiCreateItem] Updated orgData items count:', updatedOrgData.items.length);
```

### 3. Check if loadWheelData is called
```javascript
// Add to App.jsx loadWheelData() line 149
console.log('[App] loadWheelData called, wheelId:', wheelId);
```

### 4. Check if wheel re-renders
```javascript
// Add to App.jsx after loadWheelData line 290
console.log('[App] Wheel data loaded, items count:', wheelData.organizationData.items.length);
```

### 5. Check YearWheelClass rendering
```javascript
// Add to YearWheelClass.js in drawRotatingElements()
console.log('[YearWheel] Rendering items:', this.organizationData.items.length);
```

## 🎯 Expected Behavior

1. User: "Skapa en aktivitet i mars"
2. AI extracts: name, startDate (2025-03-01), endDate (2025-03-31), ringId, activityGroupId
3. aiCreateItem() saves to DB ✅
4. loadWheelContext() refreshes AI context ✅
5. onWheelUpdate() → loadWheelData() ✅
6. State updates ✅
7. setRerenderKey() triggers canvas redraw ✅
8. **Item should appear on wheel** ✅

## 🔧 Quick Fixes to Try

### Fix 1: Add console logging
```javascript
// aiWheelService.js line 206 (after saveWheelData)
console.log('✅ [AI] Item created and saved:', newItem);

// AIAssistant.jsx line 173 (after onWheelUpdate)
console.log('✅ [AI] Triggered wheel reload');

// App.jsx line 290 (after loadWheelData)
console.log('✅ [App] Reloaded wheel, items:', organizationData.items.length);
```

### Fix 2: Force immediate re-render
```javascript
// AIAssistant.jsx line 173
if (result.success) {
  await loadWheelContext();
  if (onWheelUpdate) {
    await onWheelUpdate(); // Make it await
  }
}
```

### Fix 3: Check date format
The AI might provide dates in wrong format. Check:
```javascript
// aiWheelService.js line 201
console.log('[aiCreateItem] Dates:', { startDate, endDate });
// Should be: { startDate: "2025-03-01", endDate: "2025-03-31" }
```

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ 1. User Input                                           │
│    "Skapa en aktivitet i mars"                          │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. AI Processing (OpenAI GPT-4o)                        │
│    - Extracts parameters (name, dates, ringId, etc)     │
│    - Calls createItem tool                              │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. aiCreateItem() [aiWheelService.js]                   │
│    - Validates ring and activityGroup exist             │
│    - Creates new item with temp ID                      │
│    - Calls saveWheelData()                              │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 4. saveWheelData() [wheelService.js]                    │
│    - syncRings() → ringIdMap (temp ID → DB UUID)        │
│    - syncActivityGroups() → activityIdMap               │
│    - syncLabels() → labelIdMap                          │
│    - syncItems() → Maps IDs and INSERTs to Supabase     │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Database (Supabase PostgreSQL)                       │
│    INSERT INTO items (id, wheel_id, name, start_date,   │
│                       end_date, ring_id, activity_id...) │
│    VALUES (uuid, ..., '2025-03-01', '2025-03-31', ...)   │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Tool Execute Callback [AIAssistant.jsx]              │
│    - await loadWheelContext() // Refresh AI context     │
│    - onWheelUpdate() // Trigger App reload              │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 7. loadWheelData() [App.jsx]                            │
│    - fetchWheel(wheelId) → Gets fresh data from DB      │
│    - setOrganizationData(wheelData.organizationData)    │
│    - setRerenderKey(prev => prev + 1) // Force redraw   │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 8. YearWheel Component Re-renders [YearWheel.jsx]       │
│    - Receives updated organizationData prop             │
│    - Passes to YearWheelClass                           │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Canvas Redraw [YearWheelClass.js]                    │
│    - drawRotatingElements() loops through items         │
│    - Calculates date-to-angle for startDate/endDate     │
│    - Draws arc segment on canvas                        │
│    - Item visible on wheel! ✅                          │
└─────────────────────────────────────────────────────────┘
```

## 🎓 Summary

**The flow is CORRECT and should work!** 

All the pieces are in place:
1. ✅ AI tool calls aiCreateItem()
2. ✅ aiCreateItem() saves to database via saveWheelData()
3. ✅ AIAssistant calls onWheelUpdate()
4. ✅ App.jsx reloads data with loadWheelData()
5. ✅ State updates trigger canvas redraw

**If item not appearing, most likely causes:**
1. Date format issue (AI providing wrong date format)
2. Ring/ActivityGroup ID mismatch (AI using wrong ID from context)
3. Item visibility setting (item.visible or activityGroup.visible)
4. Year mismatch (item created for different year than currently displayed)

**Next Steps:**
1. Add console.log statements to trace the flow
2. Check browser console for errors
3. Verify dates are in YYYY-MM-DD format
4. Verify ringId and activityGroupId match what's in wheelContext
