# State Refactoring Plan - Single Source of Truth

## Problem
Current state management has multiple sources of truth causing disappearing items:
- `pages` (useState) - contains items
- `pageItemsById` (useState) - synced via useEffect (race conditions)
- `allItems` (useState) - synced separately
- `undoableStates` - separate undo state (title, year, colors, structure, pageItemsById)
- Multiple useState for metadata (title, year, colors, showWeekRing, etc)

## Solution: Single wheelState Object

### New State Shape
```javascript
const [wheelState, setWheelState] = useState({
  metadata: {
    wheelId: null,
    title: "Nytt hjul",
    year: "2026",
    colors: ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"],
    showWeekRing: true,
    showMonthRing: true,
    showRingNames: true,
    showLabels: false,
    weekRingDisplayMode: "week-numbers"
  },
  structure: {
    rings: [
      { id, name, type, visible, orientation, color, data }
    ],
    activityGroups: [
      { id, name, color, visible }
    ],
    labels: [
      { id, name, color, visible }
    ]
  },
  pages: [
    {
      id: "page-uuid",
      year: 2026,
      pageOrder: 1,
      title: "2026",
      items: [
        { id, ringId, activityId, labelId, name, startDate, endDate, ... }
      ],
      isActive: true
    }
  ],
  currentPageId: "page-uuid"
});
```

### Computed Values (useMemo)
```javascript
const currentPage = useMemo(() => 
  wheelState.pages.find(p => p.id === wheelState.currentPageId),
  [wheelState.pages, wheelState.currentPageId]
);

const currentPageItems = useMemo(() => 
  currentPage?.items || [],
  [currentPage]
);

const wheelStructure = useMemo(() => ({
  ...wheelState.structure,
  items: currentPageItems
}), [wheelState.structure, currentPageItems]);

// For undo system
const undoableState = useMemo(() => ({
  metadata: wheelState.metadata,
  structure: wheelState.structure,
  pages: wheelState.pages
}), [wheelState]);
```

## Update Patterns

### 1. Add Item
```javascript
const handleAddItems = useCallback((newItems) => {
  setWheelState(prev => ({
    ...prev,
    pages: prev.pages.map(page =>
      page.id === prev.currentPageId
        ? { ...page, items: [...page.items, ...newItems] }
        : page
    )
  }));
}, []);
```

### 2. Update Item
```javascript
const handleUpdateItem = useCallback((updatedItem) => {
  setWheelState(prev => ({
    ...prev,
    pages: prev.pages.map(page =>
      page.id === updatedItem.pageId
        ? {
            ...page,
            items: page.items.map(item =>
              item.id === updatedItem.id ? updatedItem : item
            )
          }
        : page
    )
  }));
}, []);
```

### 3. Delete Item
```javascript
const handleDeleteItem = useCallback((itemId, pageId) => {
  setWheelState(prev => ({
    ...prev,
    pages: prev.pages.map(page =>
      page.id === pageId
        ? { ...page, items: page.items.filter(i => i.id !== itemId) }
        : page
    )
  }));
}, []);
```

### 4. Change Title
```javascript
const setTitle = useCallback((value) => {
  setWheelState(prev => ({
    ...prev,
    metadata: { ...prev.metadata, title: value }
  }));
}, []);
```

### 5. Add/Update Ring
```javascript
const handleAddRing = useCallback((newRing) => {
  setWheelState(prev => ({
    ...prev,
    structure: {
      ...prev.structure,
      rings: [...prev.structure.rings, newRing]
    }
  }));
}, []);
```

## Undo/Redo Integration

Change `useMultiStateUndoRedo` to track entire `wheelState`:

```javascript
const {
  state: wheelState,
  setState: setWheelState,
  undo,
  redo,
  canUndo,
  canRedo,
  // ...
} = useMultiStateUndoRedo({
  metadata: { /* initial metadata */ },
  structure: { /* initial structure */ },
  pages: [],
  currentPageId: null
}, {
  limit: 10,
  enableKeyboard: true,
  shouldSkipHistory: isLoadingData
});
```

## Loading from Database

```javascript
const loadWheelData = async (wheelId) => {
  const data = await wheelService.getWheel(wheelId);
  
  setWheelState({
    metadata: {
      wheelId: data.id,
      title: data.title,
      year: data.year,
      colors: data.colors,
      showWeekRing: data.show_week_ring,
      showMonthRing: data.show_month_ring,
      showRingNames: data.show_ring_names,
      showLabels: data.show_labels,
      weekRingDisplayMode: data.week_ring_display_mode
    },
    structure: {
      rings: data.rings,
      activityGroups: data.activity_groups,
      labels: data.labels
    },
    pages: data.pages, // Already has items
    currentPageId: data.pages[0]?.id || null
  });
};
```

## Saving to Database

```javascript
const handleSave = async () => {
  const snapshot = {
    metadata: wheelState.metadata,
    structure: wheelState.structure,
    pages: wheelState.pages
  };
  
  await wheelService.saveWheelSnapshot(snapshot);
  // No state updates needed - wheelState already has latest data
};
```

## Migration Checklist

- [ ] Add wheelState with initial structure
- [ ] Remove old state declarations (pages, pageItemsById, allItems, etc)
- [ ] Update useMultiStateUndoRedo to use wheelState
- [ ] Add computed selectors (currentPage, currentPageItems, wheelStructure)
- [ ] Refactor all handlers (add/update/delete items, rings, activities)
- [ ] Update loadWheelData
- [ ] Update handleSave - remove all setPageItemsById/setAllItems
- [ ] Update prop passing to components
- [ ] Test all CRUD operations
- [ ] Test undo/redo
- [ ] Test year-crossing
- [ ] Remove unused code (pageItemsById useEffect, etc)

## Benefits

1. **Single source of truth** - No state sync issues
2. **Predictable updates** - All changes go through setWheelState
3. **Easier debugging** - One state object to inspect
4. **Simpler save logic** - Just serialize wheelState
5. **No race conditions** - No useEffect syncing
6. **Better undo/redo** - Track complete state atomically
7. **Matches API shape** - Direct mapping to DB structure
