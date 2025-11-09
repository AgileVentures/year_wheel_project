# YearWheel Data Flow Analysis - Nov 2025

## KRITISKA PROBLEM IDENTIFIERADE

### 1. DUBBEL SOURCE OF TRUTH FÖR ITEMS

**Problem:** Items existerar på FLERA ställen:
- `pages[].structure.items` - Ska vara primary source
- `pageItemsById[pageId]` - Computed från pages (KORREKT)
- `allItems` - Separat state, synkas inte automatiskt
- `undoableStates.pageItemsById` - För undo/redo

**Konsekvens:**
- När `handleUpdateAktivitet` uppdaterar `pages`, uppdateras INTE `allItems`
- `allItems` används i `computePageItems` och save-funktioner
- Detta skapar inkonsistens mellan vad som renderas och vad som sparas

### 2. ALLITEMS ÄR INTE SYNKAD

**Aktuell kod:**
```javascript
const [allItems, setAllItems] = useState([]); // ← Separat state!
```

**Problem:**
- `allItems` sätts bara vid initial load (rad 975 i loadWheelData)
- När items uppdateras via `handleUpdateAktivitet` → uppdateras `pages`
- Men `allItems` uppdateras INTE!
- `executeFullSave` använder items från `pages.structure` (korrekt)
- Men `computePageItems` använder `allItems` (fel!)

**Lösning:**
`allItems` borde vara computed från `pages`:
```javascript
const allItems = useMemo(() => {
  const items = [];
  pages.forEach(page => {
    const structure = normalizePageStructure(page);
    items.push(...(structure.items || []));
  });
  return items;
}, [pages]);
```

### 3. SETALLITEMS ANVÄNDS FORTFARANDE

**Alla platser där `setAllItems` anropas:**
- `loadWheelData` (rad 975) - Initial load
- `setWheelStructure` (rad 560+) - Försöker synka items
- `handleExtendActivityBeyondYear` - ANVÄNDS INTE MEN BORDE!

**Problem:**
Dessa updates når INTE `pages` state, så `pageItemsById` blir ur synk.

### 4. SETWHEELSTRUCTURE HANTERAR ITEMS FELAKTIGT

**Aktuell kod (rad 453-640):**
```javascript
const setWheelStructure = useCallback((value, historyLabel) => {
  // ...
  const currentItems = currentPageId && Array.isArray(pageItemsRef.current?.[currentPageId])
    ? pageItemsRef.current[currentPageId]
    : [];
  
  const nextItems = Array.isArray(nextRaw?.items) ? nextRaw.items : currentItems;
  
  // Uppdaterar undoableStates.pageItemsById
  setUndoableStates((prevStates) => ({
    ...prevStates,
    structure: nextStructure,
    pageItemsById: {
      ...prevStates.pageItemsById,
      [currentPageId]: nextItems
    }
  }), finalLabel);
  
  // Uppdaterar allItems
  setAllItems((prevAll) => { ... });
  
  // Men uppdaterar INTE pages!!!
```

**Problem:**
- `setWheelStructure` uppdaterar `allItems` och `undoableStates.pageItemsById`
- Men den uppdaterar INTE `pages[].structure.items`!
- Detta betyder att items i undo state finns, men försvinner från pages

### 5. HANDLEUPDATEAKTIVITET UPPDATERAR BARA PAGES

**Aktuell kod (rad 3450+):**
```javascript
const handleUpdateAktivitet = useCallback((updatedItem) => {
  // Uppdaterar pages
  setPages((prevPages) => {
    return prevPages.map((page) => {
      if (page.id !== updatedItem.pageId) return page;
      // ... uppdatera items i page.structure
    });
  });
  
  // Men uppdaterar INTE allItems!
  // Och uppdaterar INTE undoableStates!
});
```

**Problem:**
- Items uppdateras i `pages` men INTE i `allItems`
- Undo state får aldrig uppdateringen
- Vid undo försvinner ändringen

### 6. UNDO STATE HAR GAMLA STRUKTUREN

**Aktuell undo state:**
```javascript
undoableStates = {
  title: string,
  year: string,
  colors: array,
  structure: { rings, activityGroups, labels }, // ← UTAN items!
  pageItemsById: { [pageId]: items[] }          // ← Items här
}
```

**Problem:**
- Items är separata från structure
- Men `pages[].structure` innehåller items
- Vid restore från undo måste vi synka tillbaka till pages

### 7. HANDLEEXTENDACTIVITYBEYONDYEAR UPPDATERAR INTE ORIGINAL

**Aktuell kod (rad 3237+):**
```javascript
const handleExtendActivityBeyondYear = useCallback(async ({ item, overflowEndDate, currentYearEnd }) => {
  // Skapar continuation items för framtida år
  setPages((prevPages) => {
    return prevPages.map((page) => {
      if (page.id !== pageId) return page;
      // Lägger till newItem för 2027, 2028 etc
    });
  });
  
  // Men uppdaterar ALDRIG originalitemen (2026) med clamped endDate!
});
```

**Anropas från InteractionHandler:**
```javascript
// 1. Calls onExtendActivityBeyondYear (skapar 2027 item)
await this.wheel.options.onExtendActivityBeyondYear({ ... });

// 2. Clamps date
newEndDate = yearEnd;

// 3. Uppdaterar originalitem
const updatedItem = { ...originalItem, endDate: yearEnd };
this.wheel.options.onUpdateAktivitet(updatedItem);
```

**Problem:**
- `onExtendActivityBeyondYear` skapar 2027-item i pages
- `onUpdateAktivitet` uppdaterar 2026-item i pages (korrekt!)
- Men `allItems` får INGEN av dessa uppdateringar!
- Vid save används items från pages (korrekt), men validation failar

## DATAFLÖDE - NUVARANDE TILLSTÅND

### Load Flow (DB → State)
```
loadWheelData()
├→ Fetch items från DB
├→ setAllItems(normalizedItems)              ← Sätter allItems
├→ itemsByPage = computePageItems(...)       ← Använder allItems
├→ enrichedPages = pages med items           ← Items från itemsByPage
├→ setPages(enrichedPages)                   ← Sätter pages.structure.items
└→ pageItemsById computed från pages         ← Auto-sync (KORREKT)
```

**Problem:** `allItems` och `pages.structure.items` är nu separata!

### Update Flow (Drag/Edit)
```
handleUpdateAktivitet(updatedItem)
├→ setPages(updatedPages)                    ← Uppdaterar pages.structure.items
├→ pageItemsById re-computed                 ← Auto-sync (KORREKT)
└→ ❌ allItems INTE uppdaterad!              ← PROBLEM!
```

### Save Flow (State → DB)
```
executeFullSave()
├→ buildWheelSnapshot()
│  ├→ Läser pages[].structure.items          ← Korrekt!
│  └→ validateSnapshotPages()
│     └→ Jämför med allItems                 ← FEL! allItems är gammal!
└→ Save till DB
```

### Undo/Redo Flow
```
handleUndoRedoStateRestored(restoredState)
├→ // setPageItemsById(restoredState.pageItemsById) ← Kommenterad bort!
├→ setAllItems(...)                                  ← Försöker sätta från undo
└→ ❌ pages INTE uppdaterade!                        ← PROBLEM!
```

## LÖSNING - SINGLE SOURCE OF TRUTH

### Föreslagna ändringar:

#### 1. GÖR ALLITEMS COMPUTED
```javascript
const allItems = useMemo(() => {
  const items = [];
  pages.forEach(page => {
    const structure = normalizePageStructure(page);
    items.push(...(structure.items || []));
  });
  return items;
}, [pages]);
```

#### 2. TA BORT SETALLITEMS
- Remove all `setAllItems()` calls
- Items uppdateras BARA via `setPages()`

#### 3. FIXA SETWHEELSTRUCTURE
```javascript
const setWheelStructure = useCallback((value, historyLabel) => {
  // Hanterar BARA structure (rings/groups/labels)
  // Items ska INTE gå genom denna funktion!
  // Om caller försöker uppdatera items → ERROR!
  
  if (nextRaw?.items) {
    console.error('setWheelStructure should NOT handle items! Use setPages() instead.');
  }
});
```

#### 4. FIXA UNDO STATE
```javascript
// Undo state ska innehålla pages, inte pageItemsById
undoableStates = {
  title: string,
  year: string,
  colors: array,
  structure: { rings, activityGroups, labels },
  pages: Page[]  // ← Full pages state för varje history entry
}
```

#### 5. FIXA HANDLEEXTENDACTIVITYBEYONDYEAR
```javascript
// Efter att continuation items skapats, uppdatera original:
setPages((prevPages) => {
  return prevPages.map((page) => {
    if (page.id === item.pageId) {
      // Update original item with clamped endDate
      const structure = normalizePageStructure(page);
      const updatedItems = structure.items.map(existingItem =>
        existingItem.id === item.id
          ? { ...existingItem, endDate: currentYearEnd }
          : existingItem
      );
      return {
        ...page,
        structure: { ...structure, items: updatedItems }
      };
    }
    // Add continuation items to future pages
    if (page.year === futureYear) {
      // ... add continuation
    }
    return page;
  });
});
```

## PRIORITY ORDER

1. **Gör `allItems` computed** (enklast, löser många problem)
2. **Ta bort alla `setAllItems()` calls**
3. **Fixa `handleExtendActivityBeyondYear`** (year-crossing resize)
4. **Fixa undo/redo** (pages i undo state)
5. **Refactor `setWheelStructure`** (ta bort items-handling)

## TEST SCENARIOS

Efter fix ska dessa fungera:
- [ ] Load wheel → Items visas
- [ ] Drag item → Save → Reload → Item på ny plats
- [ ] Edit item → Undo → Redo → Save → Reload
- [ ] Resize över årsskifte → 2026 clamped + 2027 created
- [ ] Navigate 2026 → 2027 → 2026 → Items finns på båda
- [ ] Undo efter year-crossing → Båda items borta
- [ ] Multiple edits → Undo x3 → Redo x2 → Korrekt state
