import { useCallback, useRef } from 'react';
import { useSaveQueue } from './useSaveQueue';
import { saveWheelSnapshot } from '../services/wheelService';

/**
 * useWheelSaveQueue Hook
 * 
 * Wrapper around useSaveQueue specifically for wheel data persistence.
 * Prevents data loss when changes happen during database save/sync operations.
 * 
 * Problem solved:
 * 1. User drags item A → saves to DB → syncs back from DB
 * 2. During save/sync, user drags item B
 * 3. Sync from step 1 overwrites item B's position (data loss!)
 * 
 * Solution:
 * - All saves go through a queue (one at a time)
 * - Changes during active save accumulate in queue
 * - Queue processes sequentially when previous save completes
 * - Local state (optimistic) takes precedence over database syncs
 * 
 * Usage:
 * ```javascript
 * const { enqueueSave, isSaving, pendingCount, hasQueuedChanges } = useWheelSaveQueue(wheelId);
 * 
 * // On any change (drag, resize, edit):
 * enqueueSave(snapshot, { label: 'Flytta aktivitet' });
 * 
 * // Check if local state should take precedence:
 * if (hasQueuedChanges()) {
 *   // Use local optimistic state, don't sync from DB
 * }
 * ```
 * 
 * @param {string} wheelId - The wheel ID to save
 * @param {Object} options - Configuration options
 * @param {Function} options.onSaveSuccess - Callback after successful save
 * @param {Function} options.onSaveError - Callback on save failure
 * @param {Function} options.onMarkSaved - Callback to mark undo history as saved
 * @param {Function} options.shouldSkipSync - Ref/function to check if DB sync should be skipped
 * @returns {Object} { enqueueSave, isSaving, pendingCount, clearQueue, isIdle, hasQueuedChanges }
 */
export function useWheelSaveQueue(wheelId, options = {}) {
  const { 
    onSaveSuccess, 
    onSaveError,
    onMarkSaved,
    shouldSkipSync
  } = options;

  // Track when we have queued changes (for optimistic UI)
  const hasQueuedChangesRef = useRef(false);

  /**
   * Save function that merges all pending changes into single snapshot
   */
  const saveFn = useCallback(async (mergedChanges, metadata) => {
    console.log(`[useWheelSaveQueue] Saving batch of ${metadata.batchSize} changes to wheel ${wheelId?.substring(0, 8)}`);
    
    // mergedChanges contains the latest complete snapshot
    // (all queued snapshots merged together)
    const snapshot = mergedChanges.snapshot;
    
    if (!snapshot) {
      throw new Error('No snapshot provided to save');
    }

    // Save to database
    const result = await saveWheelSnapshot(wheelId, snapshot);
    
    console.log(`[useWheelSaveQueue] ✅ Saved successfully in ${Date.now() - metadata.firstEnqueuedAt}ms`);
    
    return result;
  }, [wheelId]);

  // Initialize save queue
  const { enqueueSave: enqueueRaw, isSaving, pendingCount, clearQueue, isIdle } = useSaveQueue(
    saveFn,
    {
      onSaveSuccess: (changes, metadata) => {
        // Clear queued changes flag after successful save
        hasQueuedChangesRef.current = false;
        
        // Call user callback
        if (onSaveSuccess) {
          onSaveSuccess(changes, metadata);
        }

        // Mark undo history as saved (if callback provided)
        if (onMarkSaved) {
          onMarkSaved();
        }
      },
      onSaveError: (error, changes, metadata) => {
        console.error('[useWheelSaveQueue] Save failed:', error);
        
        // Keep queued changes flag true on error (retry will happen)
        
        // Show error toast
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { 
            message: 'Kunde inte spara ändringar. Försöker igen...', 
            type: 'error' 
          }
        }));

        // Call user callback
        if (onSaveError) {
          onSaveError(error, changes, metadata);
        }
      },
      maxRetries: 3
    }
  );

  /**
   * Enqueue a save operation
   * 
   * @param {Object} snapshot - Complete wheel snapshot to save
   * @param {Object} metadata - Optional metadata (label, etc.)
   */
  const enqueueSave = useCallback((snapshot, metadata = {}) => {
    // Validate snapshot structure
    if (!snapshot || typeof snapshot !== 'object') {
      console.error('[useWheelSaveQueue] Invalid snapshot provided');
      return;
    }

    // Mark that we have queued changes (for optimistic UI)
    hasQueuedChangesRef.current = true;

    // Wrap snapshot in expected format
    enqueueRaw({ snapshot }, metadata);
  }, [enqueueRaw]);

  /**
   * Check if there are queued changes that haven't been saved yet
   * Use this to determine if local optimistic state should take precedence over DB syncs
   * 
   * @returns {boolean} True if there are unsaved changes in the queue
   */
  const hasQueuedChanges = useCallback(() => {
    return hasQueuedChangesRef.current || isSaving || pendingCount > 0;
  }, [isSaving, pendingCount]);

  return {
    enqueueSave,
    isSaving,
    pendingCount,
    clearQueue,
    isIdle,
    hasQueuedChanges
  };
}
