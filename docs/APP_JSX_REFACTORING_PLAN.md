# CRITICAL: App.jsx Refactoring Plan - Nov 2025

## Executive Summary
**Current State:** 2,300+ line god component with 38 state variables, multiple save mechanisms fighting each other, arbitrary timeouts to prevent race conditions, and prop drilling through 26+ props.

**Impact:** This is causing bugs, making features impossible to add, and will lead to data loss incidents.

**Priority:** HIGHEST - This is architectural debt that's blocking all other development.

## Problem Analysis

### 1. God Component Anti-Pattern ⚠️ CRITICAL
**Location:** `src/App.jsx` - WheelEditor function
**Lines:** 2,300+
**Responsibilities:** EVERYTHING
- State management (38 useState/useRef calls)
- Data fetching and caching
- Real-time sync with conflict resolution
- Auto-save with 3 different mechanisms
- File import/export
- Undo/redo system
- Page management (multi-year navigation)
- Version control
- Template handling
- Team collaboration UI
- Keyboard shortcuts
- Window resize handling

**Why This is Critical:**
- Impossible to understand without 30 minutes of reading
- Any change risks breaking 5 other features
- Testing is nearly impossible
- Onboarding new developers takes weeks
- Performance issues (unnecessary re-renders everywhere)

### 2. State Management Chaos ⚠️ CRITICAL

#### Count of State Variables: 38
```javascript
// From useMultiStateUndoRedo (9 states in undo/redo):
- title
- year  
- colors
- organizationData (MASSIVE - contains ALL wheel data)
- showWeekRing
- showMonthRing
- showRingNames
- showLabels
- weekRingDisplayMode

// Additional useState calls (29 more):
- zoomedMonth
- zoomedQuarter
- ringsData
- showYearEvents
- showSeasonRing
- yearEventsCollection
- isSidebarOpen
- downloadFormat
- yearWheelRef
- isLoading
- isSaving
- autoSaveEnabled
- isPublic
- isTemplate
- isAdmin
- showVersionHistory
- showAddPageModal
- showExportModal
- showAIAssistant
- showOnboarding
- showAIAssistantOnboarding
- pages (multi-year)
- currentPageId
- currentPageData
- teamMembers
- isOwner
- shareToken
- embedCode
- lastSavedState
- ... (more discovered during analysis)

// useRef variables (9+):
- isLoadingData
- isInitialLoad
- isRealtimeUpdate
- isSavingRef
- isRestoringVersion
- organizationDataRef
- wheelIdRef
- pageIdRef
- lastModifiedByRef
```

**Problems:**
1. **Impossible to track dependencies** - Which state affects which?
2. **Race conditions everywhere** - Hence all the refs to prevent loops
3. **Re-render hell** - Every state change triggers multiple effects
4. **Synchronization nightmare** - State, refs, database all out of sync

### 3. The Save Mechanism Disaster ⚠️ CRITICAL

#### Three Different Save Systems Fighting Each Other:

**1. Auto-save Metadata (10 second debounce)**
```javascript
const autoSave = useDebouncedCallback(async () => {
  if (!autoSaveEnabled || isSavingRef.current || isLoadingData.current) return;
  // Saves: title, colors, show* flags to wheel_pages table
}, 10000);
```

**2. Auto-save Organization Data (3 second debounce)**
```javascript
const autoSaveOrganizationData = useDebouncedCallback(async () => {
  if (!autoSaveEnabled || isSavingRef.current || isLoadingData.current) return;
  // Saves: organizationData JSONB to wheel_pages.organization_data
}, 3000);
```

**3. Manual Save (Button click)**
```javascript
const handleSave = useCallback(async () => {
  setIsSaving(true);
  // Saves everything + creates version snapshot
  // Filters items by year (CRITICAL for multi-year)
}, [/* 15 dependencies */]);
```

#### Five Flags to Prevent Save Loops:
```javascript
isLoadingData.current      // "Don't save while loading"
isInitialLoad.current      // "Don't save on first render"
isRealtimeUpdate.current   // "Don't save if change came from realtime"
isSavingRef.current        // "Don't save while already saving"
isRestoringVersion.current // "Don't save while restoring version"
```

#### The Comment That Proves It's Broken:
```javascript
// COMPLETELY IGNORE all events if we're in the middle of saving
// This prevents cascading updates that cause save loops
if (isSavingRef.current || isLoadingData.current) {
  console.log('[Realtime] Ignoring event - saving or loading');
  return;
}
```

**Why This is a Time Bomb:**
- Flags checked in different orders in different places
- No atomic transactions - save can partially succeed
- Auto-save can overwrite manual save
- Realtime can overwrite auto-save
- Version restore can trigger both auto-saves
- Data loss is INEVITABLE

### 4. Effect Dependency Hell ⚠️ HIGH

#### Arbitrary Timeouts Used Because Dependency Flow is Lost:
```javascript
// From loadWheelData:
setTimeout(() => {
  isLoadingData.current = false;
  isRealtimeUpdate.current = false;
  markSaved();
}, 550); // COMMENT: "Slightly longer than isInitialLoad (500ms)"
```

**Why This is Dangerous:**
- Race condition if user acts within 550ms
- No guarantee effects have "settled"
- Different timeouts in different places (500ms, 550ms, 1000ms)
- Will break on slower devices

#### Effect Hell Example:
```javascript
useEffect(() => {
  if (!isLoadingData.current && !isInitialLoad.current) {
    autoSaveOrganizationData();
  }
}, [organizationData]); // Triggers on EVERY data change

useEffect(() => {
  if (autoSaveEnabled && !isInitialLoad.current) {
    autoSave();
  }
}, [title, colors, /* 10 more dependencies */]); // Triggers on EVERY metadata change

useEffect(() => {
  // Load data
}, [wheelId, currentPageId, reloadTrigger]); // Triggers on EVERY navigation
```

**Result:** Chain reactions of effects triggering effects triggering saves triggering effects...

### 5. Prop Drilling Nightmare ⚠️ HIGH

#### YearWheel Component (26 props):
```javascript
<YearWheel
  ref={yearWheelRef}
  year={year}
  size={2000}
  colors={colors}
  organizationData={organizationData}
  setOrganizationData={setOrganizationData}
  showWeekRing={showWeekRing}
  showMonthRing={showMonthRing}
  showRingNames={showRingNames}
  showLabels={showLabels}
  weekRingDisplayMode={weekRingDisplayMode}
  zoomedMonth={zoomedMonth}
  zoomedQuarter={zoomedQuarter}
  onMonthClick={handleMonthClick}
  onQuarterClick={handleQuarterClick}
  ringsData={ringsData}
  showYearEvents={showYearEvents}
  showSeasonRing={showSeasonRing}
  yearEventsCollection={yearEventsCollection}
  isTemplate={isTemplate}
  wheelId={wheelId}
  currentPageId={currentPageId}
  onItemUpdate={handleItemUpdate}
  onDragComplete={handleDragComplete}
  activityGroups={organizationData.activityGroups}
  labels={organizationData.labels}
/>
```

#### OrganizationPanel Component (25 props):
```javascript
<OrganizationPanel
  organizationData={organizationData}
  setOrganizationData={setOrganizationData}
  year={year}
  colors={colors}
  showWeekRing={showWeekRing}
  setShowWeekRing={setShowWeekRing}
  showMonthRing={showMonthRing}
  setShowMonthRing={setShowMonthRing}
  showRingNames={showRingNames}
  setShowRingNames={setShowRingNames}
  showLabels={showLabels}
  setShowLabels={setShowLabels}
  weekRingDisplayMode={weekRingDisplayMode}
  setWeekRingDisplayMode={setWeekRingDisplayMode}
  onSave={handleSave}
  isSaving={isSaving}
  hasUnsavedChanges={hasUnsavedChanges}
  unsavedChangesCount={unsavedChangesCount}
  autoSaveEnabled={autoSaveEnabled}
  setAutoSaveEnabled={setAutoSaveEnabled}
  isTemplate={isTemplate}
  wheelId={wheelId}
  currentPageId={currentPageId}
  onWheelUpdate={loadWheelData}
  isOpen={isSidebarOpen}
/>
```

**This Violates Every React Best Practice:**
- Components should have 3-5 props max
- Shared state should use Context
- Deep prop drilling makes refactoring impossible

## Recommended Architecture

### Phase 1: Extract Contexts (Week 1) ✅ START HERE

#### 1.1 Create Context Structure
```
src/
  contexts/
    WheelContext.tsx         - Wheel metadata (title, year, colors, public, template)
    OrganizationContext.tsx  - Organization data (rings, groups, labels, items)
    ViewContext.tsx          - UI state (zoom, sidebar, modals, visibility toggles)
    SyncContext.tsx          - Save/load state (saving, loading, autosave, conflicts)
    PageContext.tsx          - Multi-year navigation (pages, currentPage, navigation)
    CollaborationContext.tsx - Team features (members, presence, realtime)
```

#### 1.2 WheelContext - Wheel Metadata
```typescript
// src/contexts/WheelContext.tsx
export interface WheelContextValue {
  // Wheel identity
  wheelId: string;
  
  // Metadata (from wheel_pages table)
  title: string;
  year: string;
  colors: string[];
  
  // Public/template flags
  isPublic: boolean;
  isTemplate: boolean;
  shareToken: string | null;
  
  // Admin status
  isAdmin: boolean;
  
  // Actions
  setTitle: (title: string) => void;
  setColors: (colors: string[]) => void;
  togglePublic: () => void;
  toggleTemplate: () => void;
}

export function WheelProvider({ wheelId, children }: Props) {
  const [wheel, setWheel] = useState<Wheel | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load wheel metadata on mount
  useEffect(() => {
    loadWheel(wheelId);
  }, [wheelId]);
  
  return (
    <WheelContext.Provider value={...}>
      {children}
    </WheelContext.Provider>
  );
}
```

#### 1.3 OrganizationContext - Organization Data
```typescript
// src/contexts/OrganizationContext.tsx
export interface OrganizationContextValue {
  // Data (from wheel_pages.organization_data JSONB)
  rings: Ring[];
  activityGroups: ActivityGroup[];
  labels: Label[];
  items: Item[];
  
  // Actions
  updateItem: (id: string, data: Partial<Item>) => void;
  createItem: (data: CreateItemInput) => void;
  deleteItem: (id: string) => void;
  
  updateRing: (id: string, data: Partial<Ring>) => void;
  // ... etc for groups and labels
  
  // Bulk operations
  batchUpdateItems: (updates: ItemUpdate[]) => void;
}

export function OrganizationProvider({ children }: Props) {
  const { currentPageId } = usePage();
  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    rings: [],
    activityGroups: [],
    labels: [],
    items: []
  });
  
  // Load organization data when page changes
  useEffect(() => {
    if (currentPageId) {
      loadOrganizationData(currentPageId);
    }
  }, [currentPageId]);
  
  // Optimistic updates
  const updateItem = useCallback((id: string, data: Partial<Item>) => {
    setOrganizationData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, ...data } : item
      )
    }));
    
    // Enqueue save
    const { enqueueSave } = useSync();
    enqueueSave({ type: 'update_item', id, data });
  }, []);
  
  return (
    <OrganizationContext.Provider value={...}>
      {children}
    </OrganizationContext.Provider>
  );
}
```

#### 1.4 ViewContext - UI State
```typescript
// src/contexts/ViewContext.tsx
export interface ViewContextValue {
  // Zoom state
  zoomedMonth: number | null;
  zoomedQuarter: number | null;
  setZoomedMonth: (month: number | null) => void;
  setZoomedQuarter: (quarter: number | null) => void;
  
  // Visibility toggles
  showWeekRing: boolean;
  showMonthRing: boolean;
  showRingNames: boolean;
  showLabels: boolean;
  weekRingDisplayMode: 'week-numbers' | 'dates';
  
  // UI state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Modals
  showVersionHistory: boolean;
  setShowVersionHistory: (show: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  // ... etc
}

export function ViewProvider({ children }: Props) {
  // All UI state here (NOT in undo/redo!)
  const [zoomedMonth, setZoomedMonth] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => 
    window.innerWidth >= 768
  );
  
  // Persist view preferences to localStorage
  useEffect(() => {
    localStorage.setItem('yearwheel:view', JSON.stringify({
      showWeekRing,
      showMonthRing,
      // ... etc
    }));
  }, [showWeekRing, showMonthRing, /* ... */]);
  
  return (
    <ViewContext.Provider value={...}>
      {children}
    </ViewContext.Provider>
  );
}
```

#### 1.5 SyncContext - Save/Load State
```typescript
// src/contexts/SyncContext.tsx
export interface SyncContextValue {
  // State
  syncState: 'idle' | 'loading' | 'saving' | 'restoring' | 'error';
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  
  // Actions
  save: () => Promise<void>;
  load: () => Promise<void>;
  
  // Auto-save
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  
  // Undo/redo (integrate with save state)
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function SyncProvider({ children }: Props) {
  const { wheelId } = useWheel();
  const { currentPageId } = usePage();
  const { organizationData } = useOrganization();
  
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const saveQueue = useRef<SaveOperation[]>([]);
  
  // Single unified save function
  const save = useCallback(async () => {
    if (syncState !== 'idle') return;
    
    setSyncState('saving');
    
    try {
      await saveWheelData(wheelId, currentPageId, organizationData);
      setSyncState('idle');
    } catch (error) {
      setSyncState('error');
      throw error;
    }
  }, [wheelId, currentPageId, organizationData, syncState]);
  
  // Auto-save with debounce
  const debouncedSave = useDebouncedCallback(save, 3000);
  
  useEffect(() => {
    if (autoSaveEnabled && syncState === 'idle') {
      debouncedSave();
    }
  }, [organizationData, autoSaveEnabled, syncState]);
  
  return (
    <SyncContext.Provider value={...}>
      {children}
    </SyncContext.Provider>
  );
}
```

#### 1.6 PageContext - Multi-Year Navigation
```typescript
// src/contexts/PageContext.tsx
export interface PageContextValue {
  // Pages
  pages: WheelPage[];
  currentPageId: string | null;
  currentPage: WheelPage | null;
  
  // Navigation
  switchPage: (pageId: string) => void;
  createPage: (year: number) => Promise<WheelPage>;
  deletePage: (pageId: string) => Promise<void>;
  duplicatePage: (pageId: string) => Promise<WheelPage>;
  
  // Loading state
  pagesLoading: boolean;
}

export function PageProvider({ wheelId, children }: Props) {
  const [pages, setPages] = useState<WheelPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load pages on mount
  useEffect(() => {
    loadPages(wheelId);
  }, [wheelId]);
  
  // Switch page = load new organization data
  const switchPage = useCallback((pageId: string) => {
    setCurrentPageId(pageId);
    // OrganizationContext will react to this change
  }, []);
  
  return (
    <PageContext.Provider value={...}>
      {children}
    </PageContext.Provider>
  );
}
```

### Phase 2: Extract Hooks (Week 2)

#### 2.1 useSaveManager - Unified Save Logic
```typescript
// src/hooks/useSaveManager.ts
export function useSaveManager(wheelId: string, pageId: string) {
  const { organizationData } = useOrganization();
  const { title, colors } = useWheel();
  
  const saveQueue = useRef<SaveOperation[]>([]);
  const isProcessing = useRef(false);
  
  // Enqueue save operation
  const enqueueSave = useCallback((operation: SaveOperation) => {
    saveQueue.current.push(operation);
    processSaveQueue();
  }, []);
  
  // Process queue with atomic transactions
  const processSaveQueue = async () => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    
    while (saveQueue.current.length > 0) {
      const operation = saveQueue.current.shift();
      
      try {
        await executeSave(operation);
      } catch (error) {
        // Rollback and re-queue
        saveQueue.current.unshift(operation);
        console.error('[SaveManager] Failed to save:', error);
        break;
      }
    }
    
    isProcessing.current = false;
  };
  
  // Single save function (no flags needed!)
  const executeSave = async (operation: SaveOperation) => {
    switch (operation.type) {
      case 'metadata':
        await updateWheel(wheelId, { title, colors });
        break;
      case 'organization':
        await saveWheelData(wheelId, pageId, organizationData);
        break;
      case 'full':
        await Promise.all([
          updateWheel(wheelId, { title, colors }),
          saveWheelData(wheelId, pageId, organizationData)
        ]);
        break;
    }
  };
  
  return {
    enqueueSave,
    isSaving: isProcessing.current,
    queueLength: saveQueue.current.length
  };
}
```

#### 2.2 useRealtimeSync - Separate Realtime Logic
```typescript
// src/hooks/useRealtimeSync.ts
export function useRealtimeSync(wheelId: string, pageId: string) {
  const { setOrganizationData } = useOrganization();
  const { setSyncState } = useSync();
  
  const lastSyncTimestamp = useRef(Date.now());
  const lastModifiedBy = useRef<string | null>(null);
  
  useEffect(() => {
    const channel = supabase
      .channel(`wheel:${wheelId}:${pageId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'wheel_pages',
        filter: `id=eq.${pageId}`
      }, (payload) => {
        // Only update if change is from another user
        if (payload.new.modified_by !== lastModifiedBy.current) {
          console.log('[Realtime] Update from another user');
          setOrganizationData(payload.new.organization_data);
          lastSyncTimestamp.current = Date.now();
        } else {
          console.log('[Realtime] Ignoring own update');
        }
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [wheelId, pageId]);
  
  // Mark when we make a change (prevent echo)
  const markModified = useCallback((userId: string) => {
    lastModifiedBy.current = userId;
    lastSyncTimestamp.current = Date.now();
  }, []);
  
  return { markModified };
}
```

#### 2.3 useVersionControl - Extract Version History
```typescript
// src/hooks/useVersionControl.ts
export function useVersionControl(wheelId: string) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const createVersion = useCallback(async (description: string) => {
    const { organizationData } = useOrganization();
    const { title, colors } = useWheel();
    
    const snapshot = {
      title,
      colors,
      organizationData,
      timestamp: Date.now()
    };
    
    await wheelService.createVersion(wheelId, snapshot, description);
    loadVersions();
  }, [wheelId]);
  
  const restoreVersion = useCallback(async (versionId: string) => {
    setIsRestoring(true);
    const version = await wheelService.getVersion(versionId);
    
    // Update contexts
    const { setTitle, setColors } = useWheel();
    const { setOrganizationData } = useOrganization();
    
    setTitle(version.snapshot.title);
    setColors(version.snapshot.colors);
    setOrganizationData(version.snapshot.organizationData);
    
    setIsRestoring(false);
  }, []);
  
  return {
    versions,
    createVersion,
    restoreVersion,
    isRestoring
  };
}
```

### Phase 3: Split into Components (Week 3)

#### 3.1 New Component Structure
```
src/
  components/
    WheelEditor/
      index.tsx                    - Provider wrapper (50 lines)
      WheelEditorLayout.tsx        - Main layout (100 lines)
      Sidebar/
        index.tsx                  - Sidebar container (80 lines)
        OrganizationPanel.tsx      - Organization view (200 lines)
        SettingsPanel.tsx          - Display settings (100 lines)
      Canvas/
        index.tsx                  - Canvas container (80 lines)
        YearWheel.tsx              - Wheel rendering (kept mostly same)
        ZoomControls.tsx           - Zoom UI (50 lines)
      Header/
        index.tsx                  - Header container (100 lines)
        SaveStatus.tsx             - Save indicator (50 lines)
        VersionButton.tsx          - Version history (50 lines)
      Modals/
        VersionHistoryModal.tsx    - Version UI (kept mostly same)
        ExportModal.tsx            - Export UI (kept mostly same)
        AddPageModal.tsx           - Page creation (kept mostly same)
```

#### 3.2 WheelEditor Entry Point
```typescript
// src/components/WheelEditor/index.tsx
export function WheelEditor({ wheelId }: Props) {
  return (
    <WheelProvider wheelId={wheelId}>
      <PageProvider>
        <OrganizationProvider>
          <ViewProvider>
            <SyncProvider>
              <CollaborationProvider>
                <WheelEditorLayout />
              </CollaborationProvider>
            </SyncProvider>
          </ViewProvider>
        </OrganizationProvider>
      </PageProvider>
    </WheelProvider>
  );
}
```

#### 3.3 WheelEditorLayout
```typescript
// src/components/WheelEditor/WheelEditorLayout.tsx
export function WheelEditorLayout() {
  const { isSidebarOpen } = useView();
  const { syncState } = useSync();
  
  if (syncState === 'loading') {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="flex h-screen">
      {isSidebarOpen && <Sidebar />}
      
      <div className="flex-1 flex flex-col">
        <Header />
        <Canvas />
      </div>
      
      <AIAssistantPanel />
      
      {/* Modals */}
      <VersionHistoryModal />
      <ExportModal />
      <AddPageModal />
    </div>
  );
}
```

## Implementation Timeline

### Week 1: Extract Contexts ✅ START HERE
- [ ] Day 1-2: Create WheelContext + PageContext
- [ ] Day 3: Create OrganizationContext
- [ ] Day 4: Create ViewContext
- [ ] Day 5: Create SyncContext + CollaborationContext

### Week 2: Extract Hooks
- [ ] Day 1-2: useSaveManager (replace all 3 save mechanisms)
- [ ] Day 3: useRealtimeSync (replace realtime logic)
- [ ] Day 4: useVersionControl (extract version logic)
- [ ] Day 5: Testing and bug fixes

### Week 3: Split Components
- [ ] Day 1-2: Create new component structure
- [ ] Day 3-4: Migrate existing components to use contexts
- [ ] Day 5: Remove old App.jsx WheelEditor function

### Week 4: Testing and Cleanup
- [ ] Day 1-2: Integration testing
- [ ] Day 3: Performance profiling
- [ ] Day 4: Remove dead code and refs
- [ ] Day 5: Documentation

## Migration Strategy

### Approach: Incremental Extraction (Low Risk)
1. **Keep App.jsx working** - Don't break existing functionality
2. **Create contexts alongside** - Add contexts without removing old code
3. **Gradually adopt contexts** - Migrate one component at a time
4. **Test at each step** - Ensure nothing breaks
5. **Remove old code last** - Only after everything migrated

### Example: Migrating OrganizationPanel
```typescript
// BEFORE (25 props):
<OrganizationPanel
  organizationData={organizationData}
  setOrganizationData={setOrganizationData}
  year={year}
  colors={colors}
  // ... 21 more props
/>

// AFTER (0 props!):
<OrganizationPanel />

// Inside OrganizationPanel:
function OrganizationPanel() {
  const { organizationData, updateItem } = useOrganization();
  const { year } = useWheel();
  const { colors } = useWheel();
  // All data from contexts!
}
```

## Quick Wins (If Can't Refactor Everything)

### 1. Extract Save Logic TODAY ✅ HIGHEST IMPACT
```typescript
// NEW: src/hooks/useSaveManager.ts
// Move ALL save logic here
// Remove autoSave, autoSaveOrganizationData, handleSave
// Replace with single save() function
```

**Impact:** Eliminates save conflicts, removes 5 flags, fixes data loss bugs

### 2. Consolidate Flags → State Machine
```typescript
// Replace these 5 flags:
// isLoadingData, isInitialLoad, isRealtimeUpdate, isSavingRef, isRestoringVersion

// With single state machine:
type SyncState = 'idle' | 'loading' | 'saving' | 'restoring' | 'error';
const [syncState, setSyncState] = useState<SyncState>('idle');

// Clear rules:
if (syncState !== 'idle') return; // Don't save/load
```

**Impact:** Removes race conditions, removes arbitrary timeouts, clear state transitions

### 3. Extract Page Management
```typescript
// NEW: src/hooks/usePageManager.ts
const { pages, currentPageId, switchPage } = usePageManager(wheelId);

// Remove from App.jsx:
// - pages state
// - currentPageId state  
// - page loading logic
// - page switching logic
```

**Impact:** Cleaner navigation, easier to add multi-year features

## Risks and Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:** Incremental migration, keep old code until new code proven

### Risk 2: Realtime Conflicts During Migration
**Mitigation:** Use feature flags, migrate one user at a time

### Risk 3: Performance Regression
**Mitigation:** Profile before/after, use React DevTools Profiler

### Risk 4: Data Loss During Save Refactoring
**Mitigation:** 
- Add extensive logging
- Create backups before deployment
- Canary deployment (10% of users first)
- Rollback plan ready

## Success Metrics

### Code Quality
- [ ] App.jsx reduced from 2,300 lines to < 300 lines
- [ ] State variables reduced from 38 to < 10
- [ ] Component props reduced from 26 to < 5
- [ ] All arbitrary timeouts removed
- [ ] All save flags removed

### Performance
- [ ] Re-renders reduced by 70%+
- [ ] Save conflicts eliminated (0 data loss reports)
- [ ] Initial load time improved by 30%+

### Developer Experience
- [ ] New feature development time reduced by 50%
- [ ] Bug fix time reduced by 60%
- [ ] Onboarding time for new devs: 3 days instead of 3 weeks

## Next Steps

1. **COMMIT TO REFACTORING** - This is not optional, it's critical
2. **Start with Phase 1** - Extract contexts (Week 1)
3. **Get feedback early** - Show progress after Day 2
4. **Don't add new features** - until refactoring complete
5. **Celebrate wins** - Each context extracted is progress

## Related Documents
- `docs/PROMPT_ENGINEERING_REFACTORING.md` - Prompt refactoring (completed)
- `docs/ARCHITECTURE.md` - Original architecture (needs update after refactor)
- `.github/copilot-instructions.md` - AI coding agent instructions (needs update)

## Priority
🔴 **CRITICAL** - Blocks all other development
🔴 **HIGH RISK** - Data loss incidents likely without this
🔴 **START IMMEDIATELY** - Every day of delay increases technical debt

---

**Created:** Nov 5, 2025
**Author:** AI Agent (based on architectural analysis)
**Status:** READY TO START - Phase 1 Week 1
**Estimated Effort:** 4 weeks (1 developer full-time)
**ROI:** High - Will enable 3-6 months of paralyzed development to resume
