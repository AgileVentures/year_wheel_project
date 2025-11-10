import { useState, useRef, useCallback } from 'react';

/**
 * useSaveQueue Hook
 * 
 * Queues save operations to prevent data loss when changes happen during database sync.
 * Ensures changes made during a save are captured and saved in the next cycle.
 * 
 * Problem solved:
 * - User makes change A → saves to DB → syncs back
 * - During save/sync, user makes change B
 * - Change B gets overwritten by sync from change A
 * 
 * Solution:
 * - Changes accumulate in queue during active save
 * - Queue processes sequentially (one save at a time)
 * - Multiple rapid changes merge into single save
 * - Failed saves retry automatically
 * 
 * Features:
 * - Sequential save processing (one at a time)
 * - Pending changes queue accumulates during active save
 * - Optimistic local state prevents stale data overwrites
 * - Automatic retry on next change if save fails
 * - Change merging for efficiency
 * 
 * @param {Function} saveFn - Async function that saves to database (receives merged state)
 * @param {Object} options
 * @param {Function} options.onSaveSuccess - Callback after successful save (receives changes, metadata)
 * @param {Function} options.onSaveError - Callback on save failure (receives error, changes, metadata)
 * @param {number} options.maxRetries - Max automatic retries per save (default: 3)
 * @returns {Object} { enqueueSave, isSaving, pendingCount, clearQueue, isIdle }
 */
export function useSaveQueue(saveFn, options = {}) {
  const { onSaveSuccess, onSaveError, maxRetries = 3 } = options;

  // Active save state
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Queue refs (avoid re-renders)
  const saveQueue = useRef([]);
  const currentSavePromise = useRef(null);
  const isProcessing = useRef(false);

  /**
   * Add changes to queue
   * 
   * @param {Object} changes - Partial state changes to save
   * @param {Object} metadata - Optional metadata (label, timestamp, etc.)
   */
  const enqueueSave = useCallback((changes, metadata = {}) => {
    // Add to queue with timestamp
    saveQueue.current.push({
      changes,
      metadata: {
        ...metadata,
        enqueuedAt: Date.now()
      }
    });

    setPendingCount(saveQueue.current.length);

    // Start processing if not already running
    if (!isProcessing.current) {
      processQueue();
    }
  }, []);

  /**
   * Process queue sequentially
   */
  const processQueue = useCallback(async () => {
    if (isProcessing.current || saveQueue.current.length === 0) {
      return;
    }

    isProcessing.current = true;
    setIsSaving(true);

    while (saveQueue.current.length > 0) {
      // Merge all pending changes into single save operation
      // This is critical: if user made 5 changes during previous save,
      // we don't want 5 separate saves - we want ONE with the final state
      const mergedChanges = saveQueue.current.reduce((acc, item) => {
        return { ...acc, ...item.changes };
      }, {});

      const mergedMetadata = {
        batchSize: saveQueue.current.length,
        firstEnqueuedAt: saveQueue.current[0].metadata.enqueuedAt,
        lastEnqueuedAt: saveQueue.current[saveQueue.current.length - 1].metadata.enqueuedAt,
        retryCount: saveQueue.current[0].metadata.retryCount || 0
      };

      // Clear queue BEFORE save (new changes go to next batch)
      // This is the KEY to solving the race condition:
      // - Any changes made DURING this save will queue up for NEXT save
      // - They won't be lost or overwritten
      const savedItems = [...saveQueue.current];
      saveQueue.current = [];
      setPendingCount(0);

      try {
        // Execute save
        currentSavePromise.current = saveFn(mergedChanges, mergedMetadata);
        await currentSavePromise.current;

        // Success callback
        if (onSaveSuccess) {
          onSaveSuccess(mergedChanges, mergedMetadata);
        }

      } catch (error) {
        console.error('Save failed:', error);

        // Error callback
        if (onSaveError) {
          onSaveError(error, mergedChanges, mergedMetadata);
        }

        // Retry logic: re-add failed changes to front of queue
        const retryCount = mergedMetadata.retryCount || 0;
        
        if (retryCount < maxRetries) {
          // Re-queue with incremented retry count
          saveQueue.current.unshift({
            changes: mergedChanges,
            metadata: { 
              ...mergedMetadata, 
              retryCount: retryCount + 1,
              lastError: error.message 
            }
          });
          setPendingCount(saveQueue.current.length);

          // Wait a bit before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 5000)));
        } else {
          // Max retries exceeded - stop processing
          console.error(`Save failed after ${maxRetries} retries, giving up`);
          
          // Re-add to queue anyway so user can manually retry later
          saveQueue.current.unshift({
            changes: mergedChanges,
            metadata: { 
              ...mergedMetadata, 
              retryCount,
              failed: true,
              lastError: error.message 
            }
          });
          setPendingCount(saveQueue.current.length);
          
          break;
        }
      }
    }

    currentSavePromise.current = null;
    isProcessing.current = false;
    setIsSaving(false);
  }, [saveFn, onSaveSuccess, onSaveError, maxRetries]);

  /**
   * Clear all pending saves (use with caution)
   */
  const clearQueue = useCallback(() => {
    saveQueue.current = [];
    setPendingCount(0);
  }, []);

  /**
   * Check if queue is completely idle (not saving, no pending)
   */
  const isIdle = !isSaving && pendingCount === 0;

  return {
    enqueueSave,
    isSaving,
    pendingCount,
    clearQueue,
    isIdle
  };
}
