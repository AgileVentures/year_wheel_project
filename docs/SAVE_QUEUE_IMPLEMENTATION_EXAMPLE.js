/**
 * SAVE QUEUE INTEGRATION EXAMPLE
 * 
 * This file shows the exact changes needed in App.jsx to integrate the save queue.
 * Copy the relevant sections into your App.jsx file.
 */

// ============================================================
// STEP 1: Add Import at Top of App.jsx
// ============================================================

import { useWheelSaveQueue } from './hooks/useWheelSaveQueue';


// ============================================================
// STEP 2: Initialize Save Queue (add after wheelId is set)
// ============================================================

function App() {
  // ... existing state ...
  const [wheelId, setWheelId] = useState(null);
  
  // ADD THIS: Initialize save queue
  const { 
    enqueueSave, 
    isSaving: isSavingToQueue, 
    pendingCount, 
    isIdle: isSaveQueueIdle 
  } = useWheelSaveQueue(wheelId, {
    onSaveSuccess: (changes, metadata) => {
      console.log(`✅ Saved batch of ${metadata.batchSize} changes`);
      
      // Mark undo history as saved
      if (historyRef.current?.wheelStructure) {
        const currentIndex = historyRef.current.wheelStructure.index;
        markSaved('wheelStructure', currentIndex);
      }
    },
    onSaveError: (error, changes, metadata) => {
      console.error('❌ Save failed:', error);
      showToast('Kunde inte spara ändringar. Försöker igen...', 'error');
    }
  });

  // ... rest of component ...
}


// ============================================================
// STEP 3: Update enqueueFullSave Function
// ============================================================

// BEFORE (current implementation - keeps async nature):
const enqueueFullSave = useCallback(async (reason = 'manual') => {
  // ... existing validation logic ...
  
  const snapshot = buildWheelSnapshot();
  const result = await saveWheelSnapshot(wheelId, snapshot); // ❌ Direct save
  
  // ... rest of function ...
  return result;
}, [/* deps */]);


// AFTER (with queue - NON-BLOCKING):
const enqueueFullSave = useCallback((reason = 'manual') => {
  // ... existing validation logic ...
  
  const snapshot = buildWheelSnapshot();
  
  // Queue the save instead of awaiting it
  enqueueSave(snapshot, { label: reason }); // ✅ Queued save
  
  // Return immediately (non-blocking)
  return { validation: validateSnapshotPages(snapshot, latestValuesRef.current) };
}, [enqueueSave, buildWheelSnapshot, validateSnapshotPages, latestValuesRef]);


// ============================================================
// STEP 4: Update handleSave Function
// ============================================================

// BEFORE:
const handleSave = useCallback(async (options = {}) => {
  const { silent = false, reason = 'manual' } = options;

  if (wheelId) {
    try {
      const saveResult = await enqueueFullSave(reason); // ❌ Await blocks
      
      if (!silent) {
        showToast('Data har sparats!', 'success');
      }
    } catch (error) {
      console.error('Error saving wheel:', error);
      showToast('Kunde inte spara', 'error');
    }
    return;
  }
  
  // ... localStorage fallback ...
}, [wheelId, enqueueFullSave, showToast]);


// AFTER:
const handleSave = useCallback((options = {}) => {
  const { silent = false, reason = 'manual' } = options;

  if (wheelId) {
    try {
      const saveResult = enqueueFullSave(reason); // ✅ Non-blocking
      
      if (!silent && reason === 'manual') {
        // Show immediate feedback for manual saves
        showToast('Sparar ändringar...', 'info');
      }
    } catch (error) {
      console.error('Error queueing save:', error);
      showToast('Kunde inte spara', 'error');
    }
    return;
  }
  
  // ... localStorage fallback (unchanged) ...
}, [wheelId, enqueueFullSave, showToast]);


// ============================================================
// STEP 5: Update Auto-Save Logic
// ============================================================

// BEFORE:
const autoSave = useCallback(async (reason) => {
  if (!autoSaveEnabled || !wheelId) return;
  await handleSave({ silent: true, reason }); // ❌ Blocks on async
}, [autoSaveEnabled, wheelId, handleSave]);


// AFTER:
const autoSave = useCallback((reason) => {
  if (!autoSaveEnabled || !wheelId) return;
  handleSave({ silent: true, reason }); // ✅ Non-blocking, queues immediately
}, [autoSaveEnabled, wheelId, handleSave]);


// ============================================================
// STEP 6: Add Save Status UI Component
// ============================================================

// Add this component near your other UI components
function SaveStatusIndicator({ isSaving, pendingCount, isIdle }) {
  if (isIdle) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Allt sparat</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>
          Sparar
          {pendingCount > 0 && ` (${pendingCount} väntande)`}
          ...
        </span>
      </div>
    );
  }

  return null;
}

// Use it in your JSX:
<div className="flex items-center gap-4">
  <SaveStatusIndicator 
    isSaving={isSavingToQueue} 
    pendingCount={pendingCount} 
    isIdle={isSaveQueueIdle} 
  />
  
  <button onClick={() => handleSave({ reason: 'manual' })}>
    Spara manuellt
  </button>
</div>


// ============================================================
// STEP 7: Update Drag/Resize Handlers (Example)
// ============================================================

// BEFORE (in YearWheel.jsx or wherever drag is handled):
const handleItemDragEnd = async (updatedItem) => {
  // Update local state
  setWheelStructure(prev => ({
    ...prev,
    items: prev.items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    )
  }));
  
  // Save immediately (blocks if another save is active)
  await handleSave({ silent: true, reason: 'drag' }); // ❌ Can lose changes
};


// AFTER:
const handleItemDragEnd = (updatedItem) => {
  // Update local state (optimistic)
  setWheelStructure(prev => ({
    ...prev,
    items: prev.items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    )
  }));
  
  // Queue save (non-blocking, safe for rapid changes)
  handleSave({ silent: true, reason: 'drag' }); // ✅ Queues save
};


// ============================================================
// TESTING CHECKLIST
// ============================================================

/**
 * After integration, test these scenarios:
 * 
 * 1. RAPID DRAG TEST
 *    - Drag item A, release
 *    - Immediately drag item B (before A saves)
 *    - Wait for all saves
 *    - Expected: Both items at new positions ✅
 * 
 * 2. DRAG DURING SAVE TEST
 *    - Drag item A, release
 *    - During save (watch console logs), drag A again
 *    - Wait for saves
 *    - Expected: Item A at final position ✅
 * 
 * 3. MULTI-CHANGE TEST
 *    - Drag item A
 *    - Resize item B
 *    - Edit item C name
 *    - All within 1 second
 *    - Expected: All 3 changes saved, console shows "Saved batch of 3 changes" ✅
 * 
 * 4. NETWORK ERROR TEST
 *    - Open DevTools → Network tab → Throttle to "Offline"
 *    - Make a change
 *    - Expected: Error toast + retry attempts logged ✅
 *    - Go back online
 *    - Expected: Queued saves complete automatically ✅
 * 
 * 5. PAGE SWITCH DURING SAVE TEST
 *    - Make change on page 1
 *    - Immediately switch to page 2 (before save completes)
 *    - Switch back to page 1
 *    - Expected: Change on page 1 is persisted ✅
 */


// ============================================================
// DEBUGGING TIPS
// ============================================================

/**
 * Console logs to watch for:
 * 
 * ✅ SUCCESS:
 * [useSaveQueue] Saving batch of 1 changes to wheel abc123
 * [saveWheelSnapshot] Received snapshot structure: { ... }
 * [useSaveQueue] ✅ Saved successfully in 342ms
 * 
 * ⚠️ QUEUING:
 * [useSaveQueue] Saving batch of 3 changes to wheel abc123
 * (means 3 rapid changes were merged into 1 save - good!)
 * 
 * ❌ ERRORS:
 * [useSaveQueue] Save failed: [error details]
 * [useSaveQueue] Retrying (attempt 2/3)
 * 
 * 🔍 TRACKING:
 * pendingCount: Shows number of changes waiting in queue
 * isSaving: True during active database save
 * isIdle: True when queue is empty and nothing saving
 */
