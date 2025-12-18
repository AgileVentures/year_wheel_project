import { useRef, useCallback, useState, useEffect } from 'react';

/**
 * useOptimisticSync Hook
 * 
 * Manages optimistic updates with proper conflict detection for real-time collaboration.
 * Solves the problem of rapid local changes being overwritten by stale database syncs.
 * 
 * Key Features:
 * - Tracks "dirty" state separately from debounce timing
 * - Blocks incoming realtime updates while local changes are pending
 * - Detects conflicts when remote changes arrive during local editing
 * - Provides version tracking for proper conflict resolution
 * - Accumulates changes during debounce window (no lost updates)
 * 
 * Architecture:
 * - Local changes mark state as "dirty" immediately
 * - Dirty flag stays true until save completes successfully
 * - Realtime updates are queued (not applied) while dirty
 * - After save, queued remote updates are checked for conflicts
 * - Conflicts trigger user notification for resolution
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Debounce delay for saves (default: 500ms)
 * @param {number} options.conflictWindowMs - Window to detect conflicts after save (default: 2000ms)
 * @param {Function} options.onConflictDetected - Callback when conflict is detected
 * @returns {Object} Sync state and control functions
 */
export function useOptimisticSync(options = {}) {
  const {
    debounceMs = 500,
    conflictWindowMs = 2000,
    onConflictDetected
  } = options;

  // ==========================================
  // DIRTY STATE TRACKING
  // ==========================================
  
  // Is there uncommitted local work? (true from first change until save completes)
  const isDirtyRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // Local version counter (increments with each local change)
  const localVersionRef = useRef(0);
  
  // Last saved version (for conflict detection)
  const lastSavedVersionRef = useRef(0);
  
  // Timestamp of last save completion
  const lastSaveTimestampRef = useRef(0);
  
  // Timestamp of when we became dirty
  const dirtyTimestampRef = useRef(0);

  // ==========================================
  // PENDING CHANGES ACCUMULATOR
  // ==========================================
  
  // Accumulates field-level changes during debounce window
  // Key insight: We track WHAT changed, not just IF something changed
  const pendingChangesRef = useRef({
    // Structure changes (rings, activityGroups, labels)
    structure: {
      rings: new Map(), // id -> { action: 'add'|'modify'|'delete', data: {...} }
      activityGroups: new Map(),
      labels: new Map()
    },
    // Item changes (page-scoped)
    items: new Map(), // id -> { action: 'add'|'modify'|'delete', data: {...}, pageId: string }
    // Metadata changes
    metadata: {} // { field: newValue } - simple last-write-wins
  });

  // ==========================================
  // QUEUED REMOTE UPDATES
  // ==========================================
  
  // Remote updates that arrived while dirty (for conflict checking)
  const queuedRemoteUpdatesRef = useRef([]);
  
  // Flag indicating we have potential conflicts to resolve
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictDetails, setConflictDetails] = useState(null);

  // ==========================================
  // DEBOUNCE MANAGEMENT
  // ==========================================
  
  const debounceTimerRef = useRef(null);
  const saveCallbackRef = useRef(null);
  
  // Is a save currently in progress?
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  // ==========================================
  // PUBLIC API
  // ==========================================

  /**
   * Mark a local change (call this when user modifies anything)
   * This immediately marks state as dirty and tracks the specific change
   * 
   * @param {string} category - 'structure', 'items', or 'metadata'
   * @param {string} type - For structure: 'rings'|'activityGroups'|'labels', for items: pageId
   * @param {string} action - 'add', 'modify', or 'delete'
   * @param {string} id - Entity ID (for structure/items)
   * @param {Object} data - The changed data
   */
  const markChange = useCallback((category, type, action, id, data) => {
    // Increment local version
    localVersionRef.current += 1;
    
    // Mark as dirty
    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      dirtyTimestampRef.current = Date.now();
      setIsDirty(true);
    }
    
    // Track the specific change
    const pending = pendingChangesRef.current;
    
    if (category === 'structure') {
      // Structure changes (rings, activityGroups, labels)
      const map = pending.structure[type];
      if (map) {
        if (action === 'delete') {
          // If we previously added this in the same batch, just remove it
          if (map.get(id)?.action === 'add') {
            map.delete(id);
          } else {
            map.set(id, { action, data, version: localVersionRef.current });
          }
        } else {
          // Add or modify - update with latest data
          const existing = map.get(id);
          if (existing?.action === 'add' && action === 'modify') {
            // Keep as 'add' but update data
            map.set(id, { action: 'add', data, version: localVersionRef.current });
          } else {
            map.set(id, { action, data, version: localVersionRef.current });
          }
        }
      }
    } else if (category === 'items') {
      // Item changes (type = pageId)
      const map = pending.items;
      if (action === 'delete') {
        if (map.get(id)?.action === 'add') {
          map.delete(id);
        } else {
          map.set(id, { action, data, pageId: type, version: localVersionRef.current });
        }
      } else {
        const existing = map.get(id);
        if (existing?.action === 'add' && action === 'modify') {
          map.set(id, { action: 'add', data, pageId: type, version: localVersionRef.current });
        } else {
          map.set(id, { action, data, pageId: type, version: localVersionRef.current });
        }
      }
    } else if (category === 'metadata') {
      // Metadata changes (type = field name, id not used)
      pending.metadata[type] = { value: data, version: localVersionRef.current };
    }
  }, []);

  /**
   * Check if we should block incoming realtime updates
   * Call this in your realtime handler before applying remote changes
   * 
   * @returns {boolean} True if remote updates should be blocked/queued
   */
  const shouldBlockRemoteUpdates = useCallback(() => {
    // Block if we're dirty (have local changes)
    if (isDirtyRef.current) {
      return true;
    }
    
    // Block if we're actively saving
    if (isSavingRef.current) {
      return true;
    }
    
    // Block briefly after save to avoid race conditions
    const timeSinceLastSave = Date.now() - lastSaveTimestampRef.current;
    if (timeSinceLastSave < 1000) {
      return true;
    }
    
    return false;
  }, []);

  /**
   * Queue a remote update for later conflict checking
   * Call this when a realtime update arrives but shouldBlockRemoteUpdates() returns true
   * 
   * @param {string} table - Database table name
   * @param {string} eventType - 'INSERT', 'UPDATE', 'DELETE'
   * @param {Object} payload - Realtime payload
   */
  const queueRemoteUpdate = useCallback((table, eventType, payload) => {
    queuedRemoteUpdatesRef.current.push({
      table,
      eventType,
      payload,
      timestamp: Date.now(),
      localVersionAtQueue: localVersionRef.current
    });
  }, []);

  /**
   * Get accumulated pending changes for saving
   * Returns a structured object of all changes since last save
   * 
   * @returns {Object} Pending changes
   */
  const getPendingChanges = useCallback(() => {
    const pending = pendingChangesRef.current;
    
    return {
      structure: {
        rings: {
          added: Array.from(pending.structure.rings.entries())
            .filter(([, v]) => v.action === 'add')
            .map(([id, v]) => ({ id, ...v.data })),
          modified: Array.from(pending.structure.rings.entries())
            .filter(([, v]) => v.action === 'modify')
            .map(([id, v]) => ({ id, ...v.data })),
          deleted: Array.from(pending.structure.rings.entries())
            .filter(([, v]) => v.action === 'delete')
            .map(([id]) => id)
        },
        activityGroups: {
          added: Array.from(pending.structure.activityGroups.entries())
            .filter(([, v]) => v.action === 'add')
            .map(([id, v]) => ({ id, ...v.data })),
          modified: Array.from(pending.structure.activityGroups.entries())
            .filter(([, v]) => v.action === 'modify')
            .map(([id, v]) => ({ id, ...v.data })),
          deleted: Array.from(pending.structure.activityGroups.entries())
            .filter(([, v]) => v.action === 'delete')
            .map(([id]) => id)
        },
        labels: {
          added: Array.from(pending.structure.labels.entries())
            .filter(([, v]) => v.action === 'add')
            .map(([id, v]) => ({ id, ...v.data })),
          modified: Array.from(pending.structure.labels.entries())
            .filter(([, v]) => v.action === 'modify')
            .map(([id, v]) => ({ id, ...v.data })),
          deleted: Array.from(pending.structure.labels.entries())
            .filter(([, v]) => v.action === 'delete')
            .map(([id]) => id)
        }
      },
      items: {
        added: Array.from(pending.items.entries())
          .filter(([, v]) => v.action === 'add')
          .map(([id, v]) => ({ id, ...v.data, pageId: v.pageId })),
        modified: Array.from(pending.items.entries())
          .filter(([, v]) => v.action === 'modify')
          .map(([id, v]) => ({ id, ...v.data, pageId: v.pageId })),
        deleted: Array.from(pending.items.entries())
          .filter(([, v]) => v.action === 'delete')
          .map(([id, v]) => ({ id, pageId: v.pageId }))
      },
      metadata: Object.entries(pending.metadata).reduce((acc, [key, val]) => {
        acc[key] = val.value;
        return acc;
      }, {}),
      localVersion: localVersionRef.current
    };
  }, []);

  /**
   * Check if there are any pending changes
   * 
   * @returns {boolean} True if there are unsaved changes
   */
  const hasPendingChanges = useCallback(() => {
    const pending = pendingChangesRef.current;
    return (
      pending.structure.rings.size > 0 ||
      pending.structure.activityGroups.size > 0 ||
      pending.structure.labels.size > 0 ||
      pending.items.size > 0 ||
      Object.keys(pending.metadata).length > 0
    );
  }, []);

  /**
   * Clear pending changes after successful save
   */
  const clearPendingChanges = useCallback(() => {
    pendingChangesRef.current = {
      structure: {
        rings: new Map(),
        activityGroups: new Map(),
        labels: new Map()
      },
      items: new Map(),
      metadata: {}
    };
    
    // Update saved version
    lastSavedVersionRef.current = localVersionRef.current;
    lastSaveTimestampRef.current = Date.now();
    
    // Clear dirty state
    isDirtyRef.current = false;
    setIsDirty(false);
  }, []);

  /**
   * Check queued remote updates for conflicts after save
   * Call this after a successful save to detect conflicts
   * 
   * @returns {Object|null} Conflict details if conflicts detected, null otherwise
   */
  const checkForConflicts = useCallback(() => {
    const queued = queuedRemoteUpdatesRef.current;
    
    if (queued.length === 0) {
      return null;
    }
    
    // Check each queued update for conflicts with our saved changes
    const conflicts = [];
    const pending = pendingChangesRef.current;
    
    for (const update of queued) {
      const { table, eventType, payload } = update;
      const entityId = payload.new?.id || payload.old?.id;
      
      // Check if we modified the same entity
      let localChange = null;
      
      if (table === 'wheel_rings') {
        localChange = pending.structure.rings.get(entityId);
      } else if (table === 'activity_groups') {
        localChange = pending.structure.activityGroups.get(entityId);
      } else if (table === 'labels') {
        localChange = pending.structure.labels.get(entityId);
      } else if (table === 'items') {
        localChange = pending.items.get(entityId);
      }
      
      if (localChange) {
        // We have a conflict - both local and remote modified the same entity
        conflicts.push({
          table,
          entityId,
          localAction: localChange.action,
          remoteAction: eventType.toLowerCase(),
          localData: localChange.data,
          remoteData: payload.new || payload.old,
          timestamp: update.timestamp
        });
      }
    }
    
    // Clear the queue
    queuedRemoteUpdatesRef.current = [];
    
    if (conflicts.length > 0) {
      setHasConflict(true);
      setConflictDetails(conflicts);
      
      if (onConflictDetected) {
        onConflictDetected(conflicts);
      }
      
      return conflicts;
    }
    
    return null;
  }, [onConflictDetected]);

  /**
   * Resolve conflict by choosing local or remote version
   * 
   * @param {'local'|'remote'|'merge'} resolution - How to resolve
   * @param {Function} applyRemote - Callback to apply remote changes if chosen
   */
  const resolveConflict = useCallback((resolution, applyRemote) => {
    if (resolution === 'remote' && applyRemote) {
      // Apply all queued remote updates
      const queued = queuedRemoteUpdatesRef.current;
      for (const update of queued) {
        applyRemote(update.table, update.eventType, update.payload);
      }
    }
    // 'local' resolution = do nothing, our save already persisted local changes
    // 'merge' would need more sophisticated logic
    
    // Clear conflict state
    queuedRemoteUpdatesRef.current = [];
    setHasConflict(false);
    setConflictDetails(null);
  }, []);

  /**
   * Register the save callback for debounced saving
   * 
   * @param {Function} saveCallback - Async function to perform the save
   */
  const setSaveCallback = useCallback((saveCallback) => {
    saveCallbackRef.current = saveCallback;
  }, []);

  /**
   * Trigger a debounced save
   * Call this after marking changes to schedule a save
   */
  const scheduleSave = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Schedule new save
    debounceTimerRef.current = setTimeout(async () => {
      debounceTimerRef.current = null;
      
      // Check if we still have changes to save
      if (!hasPendingChanges()) {
        return;
      }
      
      // Check if we have a save callback
      if (!saveCallbackRef.current) {
        console.warn('[useOptimisticSync] No save callback registered');
        return;
      }
      
      // Don't start new save if one is in progress
      if (isSavingRef.current) {
        // Re-schedule
        scheduleSave();
        return;
      }
      
      // Start save
      isSavingRef.current = true;
      setIsSaving(true);
      
      try {
        const changes = getPendingChanges();
        await saveCallbackRef.current(changes);
        
        // Save successful - clear pending changes
        clearPendingChanges();
        
        // Check for conflicts with queued remote updates
        checkForConflicts();
        
      } catch (error) {
        console.error('[useOptimisticSync] Save failed:', error);
        // Keep dirty state and pending changes for retry
        // The next change or manual save will retry
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    }, debounceMs);
  }, [debounceMs, hasPendingChanges, getPendingChanges, clearPendingChanges, checkForConflicts]);

  /**
   * Force immediate save (no debounce)
   * Use for critical saves like before navigation
   */
  const saveImmediately = useCallback(async () => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (!hasPendingChanges()) {
      return { success: true, noChanges: true };
    }
    
    if (!saveCallbackRef.current) {
      return { success: false, error: 'No save callback registered' };
    }
    
    // Wait for any in-progress save to complete
    if (isSavingRef.current) {
      // Simple wait loop - in production you might want a proper promise
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isSavingRef.current) {
        return { success: false, error: 'Another save in progress' };
      }
    }
    
    isSavingRef.current = true;
    setIsSaving(true);
    
    try {
      const changes = getPendingChanges();
      await saveCallbackRef.current(changes);
      clearPendingChanges();
      checkForConflicts();
      return { success: true };
    } catch (error) {
      console.error('[useOptimisticSync] Immediate save failed:', error);
      return { success: false, error };
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [hasPendingChanges, getPendingChanges, clearPendingChanges, checkForConflicts]);

  /**
   * Get summary of pending changes for UI
   */
  const getPendingChangesSummary = useCallback(() => {
    const pending = pendingChangesRef.current;
    return {
      rings: pending.structure.rings.size,
      activityGroups: pending.structure.activityGroups.size,
      labels: pending.structure.labels.size,
      items: pending.items.size,
      metadata: Object.keys(pending.metadata).length,
      total: (
        pending.structure.rings.size +
        pending.structure.activityGroups.size +
        pending.structure.labels.size +
        pending.items.size +
        Object.keys(pending.metadata).length
      )
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    isDirty,
    isSaving,
    hasConflict,
    conflictDetails,
    
    // Change tracking
    markChange,
    hasPendingChanges,
    getPendingChanges,
    getPendingChangesSummary,
    clearPendingChanges,
    
    // Realtime coordination
    shouldBlockRemoteUpdates,
    queueRemoteUpdate,
    
    // Conflict resolution
    checkForConflicts,
    resolveConflict,
    
    // Save control
    setSaveCallback,
    scheduleSave,
    saveImmediately,
    
    // Version info
    getLocalVersion: () => localVersionRef.current,
    getLastSavedVersion: () => lastSavedVersionRef.current
  };
}

export default useOptimisticSync;
