import { useRef, useCallback, useEffect, useState } from 'react';
import { updateWheel, saveWheelData, updatePage, createVersion, fetchPages, createPage } from '../services/wheelService';

/**
 * Unified Save Manager Hook
 * 
 * Replaces the 3 conflicting save mechanisms:
 * - autoSave (10s debounce for metadata)
 * - autoSaveWheelStructure (3s debounce for org data)
 * - handleSave (manual save button)
 * 
 * Also eliminates 5 flags:
 * - isLoadingData
 * - isInitialLoad
 * - isRealtimeUpdate
 * - isSavingRef
 * - isRestoringVersion
 * 
 * With a single state machine and atomic save queue.
 */

type SaveState = 'idle' | 'loading' | 'saving' | 'error';

interface SaveOperation {
  type: 'metadata' | 'organization' | 'full' | 'version';
  data?: any;
  timestamp: number;
  isManual?: boolean;
}

interface SaveManagerOptions {
  wheelId: string | null;
  autoSaveEnabled: boolean;
  metadataDebounceMs?: number;
  organizationDebounceMs?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface SaveManagerReturn {
  // State
  saveState: SaveState;
  isSaving: boolean;
  canSave: boolean;
  lastSaveTimestamp: number;
  
  // Actions
  enqueueSave: (operation: Omit<SaveOperation, 'timestamp'>) => void;
  saveNow: (type?: 'metadata' | 'organization' | 'full') => Promise<void>;
  
  // Metadata setters (will auto-queue saves)
  setMetadata: (data: {
    title?: string;
    colors?: string[];
    showWeekRing?: boolean;
    showMonthRing?: boolean;
    showRingNames?: boolean;
    showLabels?: boolean;
    weekRingDisplayMode?: 'week-numbers' | 'dates';
  }) => void;
  
  // Organization data setter (will auto-queue save)
  setWheelStructure: (data: any) => void;
  
  // Version control
  createVersionSnapshot: (description?: string) => Promise<void>;
  
  // State management
  markLoading: () => void;
  markIdle: () => void;
  ignoreSave: () => void; // For realtime updates
  
  // Update refs (called from parent component)
  updateRefs: (refs: {
    metadata?: any;
    wheelStructure?: any;
    currentPageId?: string | null;
    currentYear?: string;
    pages?: any[];
  }) => void;
}

export function useSaveManager(options: SaveManagerOptions): SaveManagerReturn {
  const {
    wheelId,
    autoSaveEnabled,
    metadataDebounceMs = 10000, // 10s for metadata
    organizationDebounceMs = 3000, // 3s for org data
    onSaveSuccess,
    onSaveError
  } = options;
  
  // State machine (replaces 5 flags)
  const [saveState, setSaveState] = useState<SaveState>('idle');
  
  // Save queue (atomic operations)
  const saveQueue = useRef<SaveOperation[]>([]);
  const isProcessing = useRef(false);
  
  // Timers for debouncing
  const metadataTimer = useRef<NodeJS.Timeout | null>(null);
  const organizationTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Last save timestamp (for ignoring own realtime broadcasts)
  const lastSaveTimestamp = useRef(Date.now());
  
  // Data refs (latest values)
  const metadataRef = useRef<any>(null);
  const wheelStructureRef = useRef<any>(null);
  const currentPageIdRef = useRef<string | null>(null);
  const currentYearRef = useRef<string>('2025');
  const pagesRef = useRef<any[]>([]);
  
  /**
   * Enqueue a save operation
   */
  const enqueueSave = useCallback((operation: Omit<SaveOperation, 'timestamp'>) => {
    // Don't queue if no wheelId (localStorage mode)
    if (!wheelId) return;
    
    // Don't queue if state doesn't allow it
    if (saveState === 'loading') {
      console.log('[SaveManager] Skipping save - currently loading');
      return;
    }
    
    const saveOp: SaveOperation = {
      ...operation,
      timestamp: Date.now()
    };
    
    // Add to queue
    saveQueue.current.push(saveOp);
    
    // Start processing if not already running
    if (!isProcessing.current) {
      processSaveQueue();
    }
  }, [wheelId, saveState]);
  
  /**
   * Process the save queue atomically
   */
  const processSaveQueue = useCallback(async () => {
    if (isProcessing.current || saveQueue.current.length === 0) return;
    if (!wheelId) return;
    
    isProcessing.current = true;
    setSaveState('saving');
    
    try {
      // Batch operations by type (coalesce multiple metadata updates into one)
      const operations = [...saveQueue.current];
      saveQueue.current = [];
      
      // Group by type
      const metadataOps = operations.filter(op => op.type === 'metadata');
      const organizationOps = operations.filter(op => op.type === 'organization');
      const fullOps = operations.filter(op => op.type === 'full');
      const versionOps = operations.filter(op => op.type === 'version');
      
      // Execute in order: full saves first, then organization, then metadata, then versions
      
      // Full saves (manual saves)
      for (const op of fullOps) {
        await executeFullSave(op);
      }
      
      // Organization saves (most frequent)
      if (organizationOps.length > 0) {
        // Take the latest one (others are stale)
        const latestOrgOp = organizationOps[organizationOps.length - 1];
        await executeOrganizationSave(latestOrgOp);
      }
      
      // Metadata saves (least frequent)
      if (metadataOps.length > 0 && fullOps.length === 0) {
        // Only save metadata if we didn't already do a full save
        const latestMetadataOp = metadataOps[metadataOps.length - 1];
        await executeMetadataSave(latestMetadataOp);
      }
      
      // Version snapshots
      for (const op of versionOps) {
        await executeVersionSave(op);
      }
      
      // Success
      lastSaveTimestamp.current = Date.now();
      setSaveState('idle');
      onSaveSuccess?.();
      
    } catch (error) {
      console.error('[SaveManager] Save failed:', error);
      setSaveState('error');
      onSaveError?.(error as Error);
      
      // Optionally re-queue failed operations?
      // For now, we'll just fail and let user retry
      
    } finally {
      isProcessing.current = false;
      
      // Check if more operations queued while we were saving
      if (saveQueue.current.length > 0) {
        setTimeout(() => processSaveQueue(), 100);
      }
    }
  }, [wheelId, onSaveSuccess, onSaveError]);
  
  /**
   * Execute metadata save (lightweight)
   */
  const executeMetadataSave = useCallback(async (operation: SaveOperation) => {
    if (!wheelId || !metadataRef.current) return;
    
    const metadata = metadataRef.current;
    
    await updateWheel(wheelId, {
      title: metadata.title,
      colors: metadata.colors,
      showWeekRing: metadata.showWeekRing,
      showMonthRing: metadata.showMonthRing,
      showRingNames: metadata.showRingNames,
      showLabels: metadata.showLabels,
      weekRingDisplayMode: metadata.weekRingDisplayMode,
    });
    
    console.log('[SaveManager] Metadata saved');
  }, [wheelId]);
  
  /**
   * Execute organization data save (frequent)
   */
  const executeOrganizationSave = useCallback(async (operation: SaveOperation) => {
    if (!wheelId || !wheelStructureRef.current) return;
    
    const orgData = wheelStructureRef.current;
    let pageId = currentPageIdRef.current;
    const year = currentYearRef.current;
    
    // Ensure we have a page for this year
    if (!pageId) {
      const existingPages = await fetchPages(wheelId);
      const pageForYear = existingPages.find(p => p.year === parseInt(year));
      
      if (pageForYear) {
        pageId = pageForYear.id;
        currentPageIdRef.current = pageId;
      } else {
        const newPage = await createPage(wheelId, {
          year: parseInt(year),
          title: year,
          wheelStructure: orgData
        });
        pageId = newPage.id;
        currentPageIdRef.current = pageId;
        pagesRef.current = [...existingPages, newPage];
      }
    }
    
    const currentYearNum = parseInt(year);

    // Save to database tables (rings, groups, items)
    // @ts-ignore - saveWheelData accepts pageId parameter (wheelService.js line 328)
    const { ringIdMap, activityIdMap, labelIdMap } = await saveWheelData(wheelId, orgData, pageId);
    
    // Update page's structure JSONB (shared metadata only)
    const updatedStructure = {
      rings: orgData.rings.map((ring: any) => ({
        ...ring,
        id: ringIdMap.get(ring.id) || ring.id
      })),
      activityGroups: orgData.activityGroups.map((group: any) => ({
        ...group,
        id: activityIdMap.get(group.id) || group.id
      })),
      labels: orgData.labels.map((label: any) => ({
        ...label,
        id: labelIdMap.get(label.id) || label.id
      }))
    };

    await updatePage(pageId, {
      structure: updatedStructure,
      year: currentYearNum
    });
    
    console.log('[SaveManager] Organization data saved');
  }, [wheelId]);
  
  /**
   * Execute full save (manual save button)
   */
  const executeFullSave = useCallback(async (operation: SaveOperation) => {
    if (!wheelId) return;
    
    // Save both metadata and organization data
    await executeMetadataSave(operation);
    await executeOrganizationSave(operation);
    
    // NOTE: Version creation is now ONLY done via explicit handleSaveWithVersion in WheelEditor
    // Regular saves do NOT create versions to avoid clutter
    
    console.log('[SaveManager] Full save completed');
  }, [wheelId, executeMetadataSave, executeOrganizationSave]);
  
  /**
   * Execute version snapshot
   */
  const executeVersionSave = useCallback(async (operation: SaveOperation) => {
    if (!wheelId || !metadataRef.current || !wheelStructureRef.current) return;
    
    const metadata = metadataRef.current;
    const orgData = wheelStructureRef.current;
    const { description, isAutoSave } = operation.data || {};
    
    try {
      await createVersion(
        wheelId,
        {
          title: metadata.title,
          year: currentYearRef.current,
          colors: metadata.colors,
          showWeekRing: metadata.showWeekRing,
          showMonthRing: metadata.showMonthRing,
          showRingNames: metadata.showRingNames,
          showLabels: metadata.showLabels,
          weekRingDisplayMode: metadata.weekRingDisplayMode,
          wheelStructure: orgData
        },
        description,
        isAutoSave
      );
      
      console.log('[SaveManager] Version snapshot created');
    } catch (error) {
      console.error('[SaveManager] Version snapshot failed:', error);
      // Don't fail the entire save if version fails
    }
  }, [wheelId]);
  
  /**
   * Save immediately (manual save)
   */
  const saveNow = useCallback(async (type: 'metadata' | 'organization' | 'full' = 'full') => {
    enqueueSave({ type, isManual: true });
    
    // Wait for queue to process
    while (isProcessing.current || saveQueue.current.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [enqueueSave]);
  
  /**
   * Update metadata (will auto-queue save)
   */
  const setMetadata = useCallback((data: any) => {
    metadataRef.current = { ...metadataRef.current, ...data };
    
    if (!autoSaveEnabled || saveState === 'loading') return;
    
    // Debounce metadata saves
    if (metadataTimer.current) {
      clearTimeout(metadataTimer.current);
    }
    
    metadataTimer.current = setTimeout(() => {
      enqueueSave({ type: 'metadata' });
    }, metadataDebounceMs);
  }, [autoSaveEnabled, saveState, metadataDebounceMs, enqueueSave]);
  
  /**
   * Update organization data (will auto-queue save)
   */
  const setWheelStructure = useCallback((data: any) => {
    wheelStructureRef.current = data;
    
    if (!autoSaveEnabled || saveState === 'loading') return;
    
    // Debounce organization saves
    if (organizationTimer.current) {
      clearTimeout(organizationTimer.current);
    }
    
    organizationTimer.current = setTimeout(() => {
      enqueueSave({ type: 'organization' });
    }, organizationDebounceMs);
  }, [autoSaveEnabled, saveState, organizationDebounceMs, enqueueSave]);
  
  /**
   * Create version snapshot
   */
  const createVersionSnapshot = useCallback(async (description?: string) => {
    enqueueSave({
      type: 'version',
      data: { description, isAutoSave: false }
    });
  }, [enqueueSave]);
  
  /**
   * Mark as loading (prevents saves)
   */
  const markLoading = useCallback(() => {
    setSaveState('loading');
  }, []);
  
  /**
   * Mark as idle (allows saves)
   */
  const markIdle = useCallback(() => {
    setSaveState('idle');
  }, []);
  
  /**
   * Ignore next save (for realtime updates)
   */
  const ignoreSave = useCallback(() => {
    // Clear any pending debounced saves
    if (metadataTimer.current) {
      clearTimeout(metadataTimer.current);
      metadataTimer.current = null;
    }
    if (organizationTimer.current) {
      clearTimeout(organizationTimer.current);
      organizationTimer.current = null;
    }
  }, []);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (metadataTimer.current) clearTimeout(metadataTimer.current);
      if (organizationTimer.current) clearTimeout(organizationTimer.current);
    };
  }, []);
  
  return {
    // State
    saveState,
    isSaving: saveState === 'saving',
    canSave: saveState === 'idle',
    
    // Actions
    enqueueSave,
    saveNow,
    setMetadata,
    setWheelStructure,
    createVersionSnapshot,
    
    // State management
    markLoading,
    markIdle,
    ignoreSave,
    
    // Expose refs for reading
    lastSaveTimestamp: lastSaveTimestamp.current,
    
    // Update refs (called from parent component)
    updateRefs: useCallback((refs: {
      metadata?: any;
      wheelStructure?: any;
      currentPageId?: string | null;
      currentYear?: string;
      pages?: any[];
    }) => {
      if (refs.metadata) metadataRef.current = refs.metadata;
      if (refs.wheelStructure) wheelStructureRef.current = refs.wheelStructure;
      if (refs.currentPageId !== undefined) currentPageIdRef.current = refs.currentPageId;
      if (refs.currentYear) currentYearRef.current = refs.currentYear;
      if (refs.pages) pagesRef.current = refs.pages;
    }, [])
  };
}
