# KRITISKA BUGGAR ATT FIXA NU

## Status efter f3413bd commit

### VadSOM ÄR FIXAT:
✅ `handleUpdateAktivitet` uppdaterar `pages` direkt  
✅ `handleDeleteAktivitet` uppdaterar `pages` direkt  
✅ `pageItemsById` computed från `pages` automatiskt  

### VAD SOM ÄR TRASIGT:

#### 1. Year-crossing resize försvinner originalitem
**Problem:** När man resizear över årsskiftet:
- `handleExtendActivityBeyondYear` skapar 2027 item ✓
- `handleUpdateAktivitet` uppdaterar 2026 item med clamped date ✓
- Men validation failar: `snapshotCount: 0` för 2026

**Trolig orsak:** 
- `actuallyChanged` variabel beräknas i `setPages` callback
- Men används UTANFÖR callback för `endBatch()` och `persistItemToDatabase()`
- Variabeln är alltid `false` utanför callback!

**Fix:** Se rad 3450-3529 i App.jsx. `actuallyChanged` måste lyftas ut.

#### 2. Undo/Redo fungerar inte för items
**Problem:** 
- Undo state har `pageItemsById`
- Men när vi gör undo återställs INTE `pages` state
- `handleUndoRedoStateRestored` (rad 220) försöker sätta `allItems` och `pageItemsById` (kommenterat bort)
- Men `pages` är source of truth nu!

**Fix:**
```javascript
const handleUndoRedoStateRestored = useCallback((restoredState) => {
  // Restore pages from undo state
  if (restoredState?.pageItemsById && currentPageId) {
    setPages((prevPages) => {
      return prevPages.map(page => {
        if (!restoredState.pageItemsById[page.id]) return page;
        
        const structure = normalizePageStructure(page);
        return {
          ...page,
          structure: {
            ...structure,
            items: restoredState.pageItemsById[page.id]
          }
        };
      });
    });
  }
}, [currentPageId]);
```

#### 3. setWheelStructure uppdaterar inte pages
**Problem:**
- `setWheelStructure` (rad 453) försöker hantera både structure OCH items
- Den uppdaterar `undoableStates.pageItemsById`
- Men uppdaterar INTE `pages`!

**Varför det är problem:**
- AI Assistant använder `setWheelStructure` för att lägga till items
- Realtime sync använder `setWheelStructure`
- Items hamnar i undo state men INTE i pages → försvinner vid render

**Fix:** 
Antingen:
A) Gör `setWheelStructure` uppdatera pages också
B) Gör `setWheelStructure` endast hantera structure (rings/groups/labels), inte items

Rekommendation: B - separera concerns helt.

## TEST-SCENARION (prioriterade)

### Scenario 1: Basic CRUD ✅ (Borde fungera nu)
1. Load wheel
2. Drag item
3. Save
4. Reload
5. ✓ Item på ny plats

### Scenario 2: Year-crossing ❌ (Trasigt)
1. Drag item över årsskifte
2. ✓ Dialog visas
3. ✓ 2027 item skapas
4. ❌ 2026 item försvinner (actuallyChanged = false)
5. ❌ Kan inte spara (validation error)

### Scenario 3: Undo/Redo ❌ (Trasigt)
1. Drag item
2. Undo
3. ❌ Item återställs inte (pages inte uppdaterad)
4. Redo
5. ❌ Item kommer inte tillbaka

### Scenario 4: AI Assistant ❌ (Troligen trasigt)
1. Använd AI för att lägga till items
2. AI anropar `setWheelStructure` med items
3. ❌ Items hamnar i undo state men inte pages
4. ❌ Items syns inte på canvas

## AKUT FIX-ORDNING

1. **Fixa `actuallyChanged` i `handleUpdateAktivitet`** (10 min)
   - Gör variabeln tillgänglig utanför setPages callback
   
2. **Fixa `handleUndoRedoStateRestored`** (15 min)
   - Restore pages från undo state
   
3. **Test scenarios 1-3** (20 min)

4. **Fixa `setWheelStructure` + AI Assistant** (30 min)
   - Gör setWheelStructure uppdatera pages för items
   
5. **Test scenario 4** (10 min)

**TOTAL TID: ~90 min**

## LÅNGSIKTIG REFACTORING (gör EFTER att det fungerar)

- Gör `allItems` computed från `pages`
- Ta bort `setAllItems` helt
- Förenkla undo state (bara pages behövs)
- Separera `setWheelStructure` från items helt
