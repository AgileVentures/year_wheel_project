# Critical Architecture Problems - AI Multi-Year Activities

## The Root Issues

You've identified **THREE FUNDAMENTAL ARCHITECTURE PROBLEMS**:

### 1. ❌ AI Doesn't Need UI Navigation (Currently Forced)

**Current Flow:**
```javascript
// AI Tool: navigateToPage
execute: async ({ year }) => {
  // Calls UI callback
  if (onPageChange) {
    onPageChange(targetPage.id); // ← Changes UI
  }
  
  // Reloads context from NEW page
  await loadWheelContext(); // ← Gets data from UI state
}
```

**Problem:** 
- AI must wait for UI to change
- Dependent on React state updates
- Async timing issues
- Unnecessary complexity

**What You're Saying:**
> "since the ai knows the id of the pages, we should be able to use that id when we create activities"

**You're 100% RIGHT!** AI should do:
```javascript
// No UI navigation needed
aiCreateItem(wheelId, pageId, { ... }); // ← Direct page ID
```

### 2. ❌ fetchWheel Loads ALL Pages' Data (Not Single Page)

**Current Code (wheelService.js line 97):**
```javascript
export const fetchWheel = async (wheelId) => {
  // Fetches items from ALL pages for this wheel
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('wheel_id', wheelId); // ← Gets EVERYTHING
    
  return {
    organizationData: {
      items: items.map(...) // ← All years mixed together
    }
  };
};
```

**Problem:**
- Returns items from 2025, 2026, 2027... ALL mixed together
- No page filtering
- UI shows wrong data

**Why "Spara" Shows Old Data:**
```
1. You delete activities on 2025 page → Saves to database ✅
2. AI creates activity on 2026 page → Saves to database ✅
3. UI reloads with fetchWheel(wheelId) → Gets ALL pages' items ❌
4. Shows 2025 deleted items + 2026 new items = BOTH visible ❌
```

### 3. ❌ Database Schema Has Multi-Page BUT Code Doesn't Use It

**Database (Correct):**
```sql
-- wheel_pages table
id          | wheel_id | year | organization_data (JSON)
------------|----------|------|----------------------
page-2025   | wheel-1  | 2025 | { rings: [...], items: [...] }
page-2026   | wheel-1  | 2026 | { rings: [...], items: [...] }

-- items table  
id       | wheel_id | page_id   | name        | start_date
---------|----------|-----------|-------------|------------
item-1   | wheel-1  | page-2025 | "Campaign"  | 2025-01-01
item-2   | wheel-1  | page-2026 | "Launch"    | 2026-03-15
```

**Code (Wrong):**
```javascript
// Ignores page_id completely!
const { data: items } = await supabase
  .from('items')
  .eq('wheel_id', wheelId); // ← Should use page_id!
```

---

## The Solution Architecture

### NEW AI Flow (No UI Navigation)

```javascript
// AI Tool: createItem with explicit pageId
createItem: tool({
  inputSchema: z.object({
    pageId: z.string().describe('Page ID to create on'),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    // ...
  }),
  execute: async ({ pageId, name, startDate, endDate, ... }) => {
    // Direct database operation - no UI involved
    const result = await aiCreateItem(wheelId, pageId, { ... });
    return result;
  }
})

// Cross-year workflow becomes simple:
// 1. getAvailablePages() → { pages: [{ id: "page-2025", year: 2025 }, ...] }
// 2. createItem(pageId: "page-2025", "Campaign (del 1)", "2025-12-01", "2025-12-31")
// 3. createItem(pageId: "page-2026", "Campaign (del 2)", "2026-01-01", "2026-02-26")
// DONE! No navigation, no UI changes, no waiting.
```

### NEW fetchWheel (Page-Aware)

**Option 1: Fetch Single Page**
```javascript
export const fetchWheel = async (wheelId, pageId) => {
  // Fetch rings/groups/labels from wheel (shared across pages)
  const { data: rings } = await supabase
    .from('wheel_rings')
    .eq('wheel_id', wheelId);
    
  // Fetch items ONLY for this page
  const { data: items } = await supabase
    .from('items')
    .eq('page_id', pageId); // ← CRITICAL FIX
    
  return {
    organizationData: {
      rings: [...],
      activityGroups: [...],
      items: items // ← Only this page's items
    }
  };
};
```

**Option 2: Use wheel_pages.organization_data (Current Backup)**
```javascript
export const fetchWheelPage = async (pageId) => {
  const { data: page } = await supabase
    .from('wheel_pages')
    .select('*')
    .eq('id', pageId)
    .single();
    
  return page.organization_data; // Already filtered!
};
```

---

## Implementation Plan

### Phase 1: Fix AI Tools (Remove UI Navigation)

**1. Update createItem Tool**
```javascript
// AIAssistant.jsx
createItem: tool({
  description: 'Skapa aktivitet. Kräver explicit pageId.',
  inputSchema: z.object({
    pageId: z.string().describe('Page ID från getAvailablePages()'),
    name: z.string(),
    startDate: z.string().describe('YYYY-MM-DD'),
    endDate: z.string().describe('YYYY-MM-DD'),
    ringId: z.string(),
    activityGroupId: z.string().optional()
  }),
  execute: async ({ pageId, name, startDate, endDate, ringId, activityGroupId }) => {
    // NO validation against current page year
    // pageId explicitly specifies target page
    const result = await aiCreateItem(wheelId, pageId, { ... });
    
    if (result.success) {
      // Only reload if affecting current visible page
      if (pageId === currentPageId) {
        await loadWheelContext();
        onWheelUpdate && onWheelUpdate();
      }
    }
    
    return result;
  }
})
```

**2. Remove navigateToPage Dependency**
```javascript
// System Prompt - Update cross-year workflow
2. **Över årsskifte:**
   - getAvailablePages() → få page IDs
   - createItem(pageId: "2025-page-id", "Namn (del 1)", ..., "YYYY-12-31")
   - createItem(pageId: "2026-page-id", "Namn (del 2)", "YYYY-01-01", ...)
```

**3. Update aiCreateItem Validation**
```javascript
// aiWheelService.js
export const aiCreateItem = async (wheelId, pageId, { ... }) => {
  // Get page year
  const { data: pageData } = await supabase
    .from('wheel_pages')
    .select('year')
    .eq('id', pageId)
    .single();
    
  const pageYear = pageData.year;
  const startYear = parseInt(startDate.split('-')[0]);
  
  // Validate dates match page
  if (startYear !== pageYear) {
    return {
      success: false,
      error: `Datum ${startDate} passar inte år ${pageYear}. Använd rätt pageId från getAvailablePages().`
    };
  }
  
  // Create item with explicit page_id
  const { data: item, error } = await supabase
    .from('items')
    .insert({
      wheel_id: wheelId,
      page_id: pageId, // ← CRITICAL
      name,
      start_date: startDate,
      end_date: endDate,
      ring_id: ringId,
      activity_id: activityGroupId
    })
    .select()
    .single();
    
  return { success: true, item };
};
```

### Phase 2: Fix fetchWheel (Page Filtering)

**Option A: Add pageId Parameter**
```javascript
// wheelService.js
export const fetchWheel = async (wheelId, pageId) => {
  // ... fetch rings, groups, labels (wheel-level)
  
  // Fetch items for specific page only
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('wheel_id', wheelId)
    .eq('page_id', pageId); // ← FIX
    
  return { organizationData: { items: items.map(...) } };
};
```

**Update All Callers:**
```javascript
// App.jsx, AIAssistant.jsx, etc.
const wheelData = await fetchWheel(wheelId, currentPageId);
```

**Option B: Separate Functions**
```javascript
// Keep fetchWheel for wheel-level data (rings, groups)
export const fetchWheel = async (wheelId) => { ... };

// New function for page data
export const fetchPageData = async (pageId) => {
  const { data: items } = await supabase
    .from('items')
    .eq('page_id', pageId);
  return items;
};

// Use both in UI
const wheelData = await fetchWheel(wheelId);
const pageItems = await fetchPageData(currentPageId);
```

### Phase 3: Test Cross-Year Creation

```javascript
// Test command: "skapa vinterkampanj 2025-12-01 till 2026-02-26"

// Expected AI execution:
1. getAvailablePages()
   → Returns: [{ id: "page-2025", year: 2025 }, { id: "page-2026", year: 2026 }]

2. createItem({
     pageId: "page-2025",
     name: "vinterkampanj (del 1)",
     startDate: "2025-12-01",
     endDate: "2025-12-31",
     ringId: "...",
     activityGroupId: "..."
   })
   → Direct insert to items table with page_id = "page-2025"

3. createItem({
     pageId: "page-2026", 
     name: "vinterkampanj (del 2)",
     startDate: "2026-01-01",
     endDate: "2026-02-26",
     ringId: "...",
     activityGroupId: "..."
   })
   → Direct insert to items table with page_id = "page-2026"

4. Return: "Klart! vinterkampanj skapad över årsskifte"
```

---

## Why Current System Fails

### Issue: "When I delete and save, AI creates, old ones reappear"

**Timeline:**
```
1. UI shows 2025 page
   fetchWheel(wheelId) → items: [A, B, C] (from ALL pages)
   UI filters to show: [A, B] (2025 only)

2. You delete A, B via UI → Spara
   DELETE FROM items WHERE id IN ('A', 'B') ✅
   Database now has: [C (2026 item)]

3. AI creates D on 2026
   INSERT INTO items VALUES ('D', page_id: '2026') ✅
   Database now has: [C (2026), D (2026)]

4. UI reloads after AI action
   fetchWheel(wheelId) → items: [C, D] (from ALL pages)
   
5. BUT WAIT... saveWheelData was called
   saveWheelData() does:
   - Deletes ALL items for wheelId
   - Inserts from organizationData
   - organizationData had old data cached!
   
   Result: A, B reappear from stale cache ❌
```

### The Real Problem: Dual Write Pattern

```javascript
// aiCreateItem does BOTH:
1. const updatedOrgData = { items: [...orgData.items, newItem] };
2. await saveWheelData(wheelId, updatedOrgData); // ← Writes to items table
3. await supabase
     .from('wheel_pages')
     .update({ organization_data: updatedOrgData }) // ← Writes to JSON
     .eq('id', pageId);
```

**saveWheelData (wheelService.js):**
```javascript
// Deletes ALL wheel items
await supabase.from('items').delete().eq('wheel_id', wheelId);

// Inserts from orgData
await supabase.from('items').insert(itemsToInsert);
```

**Problem:** orgData is stale! It came from fetchWheel(wheelId) which:
1. Loaded ALL pages' items
2. User deleted some
3. AI action reloads context from fetchWheel
4. But fetchWheel doesn't know about deletions on other pages
5. Resurrection of deleted items

---

## Recommended Solution

### Approach: Page-Scoped Operations

**1. AI Never Touches Other Pages**
```javascript
export const aiCreateItem = async (wheelId, pageId, { ... }) => {
  // Direct insert - no fetchWheel
  const { data: item } = await supabase
    .from('items')
    .insert({
      wheel_id: wheelId,
      page_id: pageId,
      name, start_date, end_date, ring_id, activity_id
    })
    .select()
    .single();
    
  // Update ONLY this page's JSON cache
  const { data: currentItems } = await supabase
    .from('items')
    .select('*')
    .eq('page_id', pageId);
    
  await supabase
    .from('wheel_pages')
    .update({ 
      organization_data: { 
        ...existingOrgData,
        items: currentItems 
      } 
    })
    .eq('id', pageId);
    
  return { success: true, item };
};
```

**2. fetchWheel Filtered by Page**
```javascript
export const fetchWheel = async (wheelId, currentPageId) => {
  // Fetch wheel-level (rings, groups, labels)
  // ...
  
  // Fetch ONLY current page items
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('page_id', currentPageId); // ← CRITICAL
    
  return {
    organizationData: {
      rings: [...],
      activityGroups: [...],
      items: items.map(...)
    }
  };
};
```

**3. AI Context Scoped to Page**
```javascript
// AIAssistant.jsx
const loadWheelContext = async () => {
  const context = await getWheelContext(wheelId, currentPageId); // ← Add pageId
  setWheelContext(context);
};
```

---

## Benefits of This Approach

### 1. ✅ No UI Navigation Needed
- AI works directly with page IDs
- No async timing issues
- No dependency on React state

### 2. ✅ Correct Data Isolation
- Each page's data is separate
- Deleting on 2025 doesn't affect 2026
- No item resurrection

### 3. ✅ Simple Cross-Year
```javascript
// Single AI workflow:
pages = getAvailablePages()
createItem(pages[0].id, "del 1", "2025-12-01", "2025-12-31")
createItem(pages[1].id, "del 2", "2026-01-01", "2026-02-26")
// DONE!
```

### 4. ✅ Database Matches Code
- `items.page_id` column is used
- Each page has isolated items
- Matches Supabase schema design

---

## Next Steps

1. **Decide on approach:**
   - Option A: Update fetchWheel with pageId parameter (simpler)
   - Option B: Create separate fetchPageData function (cleaner)

2. **Update AI tools:**
   - Add pageId to createItem schema
   - Remove navigateToPage from cross-year workflow
   - Update system prompt

3. **Fix data loading:**
   - Filter items by page_id
   - Remove stale data resurrection

4. **Test thoroughly:**
   - Create items on different pages
   - Delete and verify they stay deleted
   - Cross-year activities

Would you like me to implement Option A or Option B?
