import { useState, useCallback, useRef, useEffect } from 'react';
import { produce, current, freeze } from 'immer';
import { showToast } from '../utils/dialogs';

/**
 * useUndoRedo Hook
 * 
 * Provides undo/redo functionality for any state with keyboard shortcuts
 * 
 * Features:
 * - Ctrl+Z / Cmd+Z for undo
 * - Ctrl+Shift+Z / Cmd+Shift+Z for redo
 * - Configurable history limit
 * - Immediate history tracking (no debouncing)
 * - Clear history on major operations
 * - Immer for optimized deep cloning and immutability
 * 
 * @param {*} initialState - Initial state value
 * @param {Object} options - Configuration options
 * @param {number} options.limit - Max history entries (default: 50)
 * @param {boolean} options.enableKeyboard - Enable keyboard shortcuts (default: true)
 * @param {Object} options.shouldSkipHistory - Ref that indicates whether to skip adding to history
 * @param {Function} options.onStateRestored - Callback fired after undo/redo/jump sets a historical state
 * @returns {Object} { state, setState, undo, redo, canUndo, canRedo, clear, historyLength, currentIndex }
 */
export function useUndoRedo(initialState, options = {}) {
  const {
    limit = 10,
    enableKeyboard = true,
    shouldSkipHistory = null,
    onStateRestored = null
  } = options;

  // Current state
  const [state, setStateInternal] = useState(initialState);
  
  // History stacks with metadata (using Immer freeze for immutability)
  const [history, setHistory] = useState([{ state: freeze(initialState, true), label: 'Start' }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Refs to track current values synchronously (prevents stale closures)
  const historyRef = useRef(history);
  const currentIndexRef = useRef(currentIndex);
  const onStateRestoredRef = useRef(onStateRestored);
  
  // Update refs whenever state changes
  useEffect(() => {
    historyRef.current = history;
    currentIndexRef.current = currentIndex;
  }, [history, currentIndex]);

  useEffect(() => {
    onStateRestoredRef.current = onStateRestored;
  }, [onStateRestored]);
  
  // Flag to prevent adding to history during undo/redo
  const isUndoRedoAction = useRef(false);
  
  // Track save points in history (for "undo to save" feature)
  // Using state instead of ref so changes trigger re-renders for unsavedChangesCount
  const [lastSaveIndex, setLastSaveIndex] = useState(0);
  
  // Batch mode (for drag operations, etc.)
  const isBatchMode = useRef(false);
  const batchModeLabel = useRef('');
  const batchModeState = useRef(null);
  const batchModeInitialState = useRef(null);

  /**
   * Add state to history with optional label
   * Uses Immer to create immutable snapshots efficiently
   * 
   * @param {*} newState - New state to add to history
   * @param {string|Object} label - Either a string (legacy) or { type, params } object for i18n
   */
  const addToHistory = useCallback((newState, label = { type: 'change' }) => {
    if (isUndoRedoAction.current) {
      return; // Don't add to history during undo/redo
    }

    // Check if caller wants to skip history (e.g., during data load)
    if (shouldSkipHistory?.current) {
      return;
    }

    // In batch mode, just store the latest state without adding to history yet
    if (isBatchMode.current) {
      // Use Immer freeze to ensure immutability in batch mode
      batchModeState.current = freeze(newState, true);
      return;
    }

    // Normalize label to always be an object with { type, params }
    const normalizedLabel = typeof label === 'string' 
      ? { type: 'legacyString', text: label } // Legacy support for old string labels
      : label;

    // CRITICAL: Update both history and currentIndex atomically
    // Use ref to get current index to avoid stale closure
    const currentIdx = currentIndexRef.current;
    
    setHistory(prev => {
      // Use Immer produce to create new history array immutably
      const newHistory = produce(prev, draft => {
        // Remove any future history (we're creating a new timeline)
        draft.splice(currentIdx + 1);
        
        // Add new state with normalized label object (Immer freeze ensures deep immutability)
        // freeze() creates a deeply frozen copy, preventing accidental mutations
        draft.push({ state: freeze(newState, true), label: normalizedLabel });
        
        // Limit history size and adjust save index if needed
        if (draft.length > limit) {
          const trimCount = draft.length - limit;
          // Keep only the last 'limit' entries
          draft.splice(0, trimCount);
          
          // Adjust save index if it was trimmed (do this in effect or callback)
          setLastSaveIndex(prev => {
            if (prev >= trimCount) {
              return prev - trimCount;
            } else {
              // Save point was trimmed, reset to oldest entry
              return 0;
            }
          });
        }
      });
      
      // Update current index based on new history length
      setCurrentIndex(newHistory.length - 1);
      
      return newHistory;
    });
  }, [limit]);

  /**
   * Set state WITHOUT debouncing for immediate undo history
   * This ensures undo/redo always has the correct state
   * Uses Immer for functional updates when possible
   * 
   * @param {*} newState - New state value, function, or Immer recipe
   * @param {string} label - Optional descriptive label for undo button
   */
  const setState = useCallback((newState, label) => {
    // CRITICAL: Use setStateInternal's callback to get LATEST state
    // This prevents stale closure issues when multiple state updates happen
    setStateInternal(prevState => {
      let resolvedState;
      
      if (typeof newState === 'function') {
        // For functional updates, use Immer produce if state is an object
        // This enables draft mutations while maintaining immutability
        if (prevState && typeof prevState === 'object' && !Array.isArray(prevState)) {
          resolvedState = produce(prevState, draft => {
            // Call the function with current() to get plain values
            const update = newState(current(draft));
            // If function returns a value, use it; otherwise mutations were made
            if (update !== undefined) {
              return update;
            }
          });
        } else {
          // For primitives or arrays, use normal functional update
          resolvedState = newState(prevState);
        }
      } else {
        resolvedState = newState;
      }
      
      // Add to history IMMEDIATELY (no debouncing for undo history)
      // This ensures every state change can be undone
      addToHistory(resolvedState, label);
      
      return resolvedState;
    });
  }, [addToHistory]);

  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    // CRITICAL: Use refs to access current values, not stale closures
    const currentIdx = currentIndexRef.current;
    const currentHist = historyRef.current;
    
    if (currentIdx > 0 && currentHist.length > 0) {
      const newIndex = currentIdx - 1;
      
      // Bounds check with current values
      if (newIndex < 0 || newIndex >= currentHist.length) {
        console.error('Undo failed: index out of bounds', newIndex, 'history length:', currentHist.length);
        return false;
      }
      
      const historyEntry = currentHist[newIndex];
      if (!historyEntry) {
        console.error('Undo failed: history entry not found at index', newIndex);
        return false;
      }
      
      // Set flag IMMEDIATELY before any state updates
      isUndoRedoAction.current = true;
      
      // Update both index and state
      setCurrentIndex(newIndex);
      // CRITICAL: Update ref immediately to prevent double undo from keyboard + button
      currentIndexRef.current = newIndex;
      setStateInternal(historyEntry.state);

      if (onStateRestoredRef.current) {
        onStateRestoredRef.current(historyEntry.state, historyEntry.label || null, 'undo');
      }
      
      // Keep flag set for longer to ensure all effects complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isUndoRedoAction.current = false;
        });
      });
      
      return historyEntry.label || 'Ändring';
    }
    return false;
  }, []); // No dependencies - use refs instead

  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    // CRITICAL: Use refs to access current values, not stale closures
    const currentIdx = currentIndexRef.current;
    const currentHist = historyRef.current;
    
    if (currentIdx < currentHist.length - 1 && currentHist.length > 0) {
      const newIndex = currentIdx + 1;
      
      // Bounds check with current values
      if (newIndex < 0 || newIndex >= currentHist.length) {
        console.error('Redo failed: index out of bounds', newIndex, 'history length:', currentHist.length);
        return false;
      }
      
      const historyEntry = currentHist[newIndex];
      if (!historyEntry) {
        console.error('Redo failed: history entry not found at index', newIndex);
        return false;
      }
      
      // SAFETY: Prevent redoing to a state with empty items if current state has items
      // This prevents the wheel from going blank due to bad history state
      // CRITICAL: Get current state from the current history entry, not from closure
      const currentState = currentHist[currentIdx]?.state;
      const targetState = historyEntry.state;
      
      // Set flag IMMEDIATELY before any state updates
      isUndoRedoAction.current = true;
      
      // Update both index and state
      setCurrentIndex(newIndex);
      // CRITICAL: Update ref immediately to prevent double redo from keyboard + button
      currentIndexRef.current = newIndex;
      setStateInternal(historyEntry.state);

      if (onStateRestoredRef.current) {
        onStateRestoredRef.current(historyEntry.state, historyEntry.label || null, 'redo');
      }
      
      // Keep flag set for longer to ensure all effects complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isUndoRedoAction.current = false;
        });
      });
      
      return historyEntry.label || 'Ändring';
    }
    return false;
  }, []); // No dependencies - use refs instead
  /**
   * Mark current position as a save point
   */
  /**
   * Mark current position as saved
   * Used to track which history entries have been persisted to database
   * 
   * @param {number} index - Optional index to mark as saved (defaults to current index)
   */
  const markSaved = useCallback((index = null) => {
    const indexToMark = index !== null ? index : currentIndexRef.current;
    setLastSaveIndex(indexToMark);
  }, []);
  
  /**
   * Undo to last save point
   */
  const undoToSave = useCallback(() => {
    if (currentIndex > lastSaveIndex && history.length > 0) {
      let saveIndex = lastSaveIndex;
      
      // If save index is out of bounds (history was trimmed), use first entry
      if (saveIndex >= history.length) {
        console.warn(`Save point ${saveIndex} is out of bounds (history length: ${history.length}). Using oldest entry.`);
        saveIndex = 0;
        setLastSaveIndex(0); // Update to valid index
      }
      
      const historyEntry = history[saveIndex];
      
      // Safety check: ensure history entry exists
      if (!historyEntry) {
        console.error('Undo to save failed: history entry not found at index', saveIndex);
        return false;
      }
      
      isUndoRedoAction.current = true;
      setCurrentIndex(saveIndex);
      setStateInternal(historyEntry.state);

      if (onStateRestoredRef.current) {
        onStateRestoredRef.current(historyEntry.state, historyEntry.label || null, 'undoToSave');
      }
      
      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 0);
      
      return true;
    }
    return false;
  }, [currentIndex, history, lastSaveIndex]);

  /**
   * Start batch mode - accumulate changes without creating history entries
   * Used for drag operations to prevent history spam
   * Uses Immer freeze to preserve initial state
   */
  const startBatch = useCallback((label = 'Gruppoperation') => {
    isBatchMode.current = true;
    batchModeLabel.current = label;
    // Freeze CURRENT state as the "before batch" state
    batchModeInitialState.current = freeze(state, true);
    batchModeState.current = null;
  }, [state]);

  /**
   * End batch mode - commit accumulated changes as single history entry
   * The final state is what's currently in batchModeState (from accumulated updates)
   * OR the current state if no updates happened during batch
   * 
   * @returns {number|null} The new history index if entry was added, null otherwise
   */
  const endBatch = useCallback(() => {
    if (isBatchMode.current) {
      // Use the accumulated state if available, otherwise current state
      const finalState = batchModeState.current !== null ? batchModeState.current : state;
      // Debug: Log specific fields to see what changed
      if (finalState && batchModeInitialState.current) {
        const initialItems = batchModeInitialState.current.wheelStructure?.items || [];
        const finalItems = finalState.wheelStructure?.items || [];
        if (initialItems.length > 0 && finalItems.length > 0) {
          const firstInitialItem = initialItems[0];
          const firstFinalItem = finalItems[0];
        }
      }
      
      // Only add to history if state actually changed
      const initialState = batchModeInitialState.current;
      if (initialState !== null) {
        // Compare using JSON - but ensure we're comparing different objects
        const initialJSON = JSON.stringify(initialState);
        const finalJSON = JSON.stringify(finalState);
        
        const stateChanged = initialJSON !== finalJSON;
        
        if (stateChanged) {
          
          // CRITICAL: Reset batch mode BEFORE calling addToHistory
          // Otherwise addToHistory will see isBatchMode=true and store to batchModeState instead!
          const labelToUse = batchModeLabel.current;
          isBatchMode.current = false;
          batchModeLabel.current = '';
          batchModeState.current = null;
          batchModeInitialState.current = null;
          
          // Calculate what the new index will be after adding to history
          const newIndex = historyRef.current.length;
          
          addToHistory(finalState, labelToUse);
          // Update the actual state to the final state
          setStateInternal(finalState);
          
          // Return the new index so caller can immediately mark it as saved
          return newIndex;
        } else {
          // Still need to reset batch mode
          isBatchMode.current = false;
          batchModeLabel.current = '';
          batchModeState.current = null;
          batchModeInitialState.current = null;
          return null;
        }
      } else {
        // Still need to reset batch mode
        isBatchMode.current = false;
        batchModeLabel.current = '';
        batchModeState.current = null;
        batchModeInitialState.current = null;
        return null;
      }
    }
    return null;
  }, [addToHistory, state]);

  /**
   * Cancel batch mode - discard accumulated changes
   */
  const cancelBatch = useCallback(() => {
    isBatchMode.current = false;
    batchModeLabel.current = '';
    batchModeState.current = null;
    batchModeInitialState.current = null; // Reset initial state too
  }, []);

  /**
   * Clear history
   * Uses Immer freeze to ensure immutability
   */
  const clear = useCallback(() => {
    // CRITICAL: Use setState callback to get CURRENT state, not stale closure
    setStateInternal(currentState => {
      // Reset history with the CURRENT state, not initial state
      setHistory([{ state: freeze(currentState, true), label: 'Start' }]);
      setCurrentIndex(0);
      setLastSaveIndex(0);
      
      // Return unchanged state (we're only clearing history)
      return currentState;
    });
  }, []); // No dependencies - use setState callback instead

  /**
   * Can undo/redo flags and labels
   */
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  const hasUnsavedChanges = currentIndex !== lastSaveIndex;
  const unsavedChangesCount = Math.abs(currentIndex - lastSaveIndex);
  
  // Get descriptive labels for UI with safety checks
  const undoLabel = canUndo && history[currentIndex - 1] ? (history[currentIndex - 1].label || '') : '';
  const redoLabel = canRedo && history[currentIndex + 1] ? (history[currentIndex + 1].label || '') : '';

  /**
   * Jump to specific history index
   */
  const jumpToIndex = useCallback((index) => {
    const currentHist = historyRef.current;
    
    if (index >= 0 && index < currentHist.length) {
      const entry = currentHist[index];
      if (entry) {
        // Set flag to prevent this from being added to history
        isUndoRedoAction.current = true;
        
        // Update both index and state
        setCurrentIndex(index);
        // State is already frozen when stored, no need to call current()
        setStateInternal(entry.state);

        if (onStateRestoredRef.current) {
          onStateRestoredRef.current(entry.state, entry.label || null, 'jump');
        }
        
        // Keep flag set for longer to ensure all effects complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isUndoRedoAction.current = false;
          });
        });
        
        return entry.label;
      }
    }
    return null;
  }, []);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (e) => {
      // Check for Ctrl/Cmd key
      const isMod = e.ctrlKey || e.metaKey;
      
      if (isMod && e.key === 'z') {
        e.preventDefault();
        
        if (e.shiftKey) {
          // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
          const label = redo();
          if (label) {
            showToast('toast:redo.action', 'info', { label });
          }
        } else {
          // Undo: Ctrl+Z or Cmd+Z
          const label = undo();
          if (label) {
            showToast('toast:undo.action', 'info', { label });
          }
        }
      }
      
      // Alternative redo: Ctrl+Y
      if (isMod && e.key === 'y') {
        e.preventDefault();
        const label = redo();
        if (label) {
          showToast('toast:redo.action', 'info', { label });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, enableKeyboard]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    clear,
    markSaved,
    undoToSave,
    hasUnsavedChanges,
    unsavedChangesCount,
    startBatch,
    endBatch,
    cancelBatch,
    historyLength: history.length,
    currentIndex,
    history, // Expose history for menu
    jumpToIndex
  };
}

/**
 * useMultiStateUndoRedo Hook
 * 
 * Manages undo/redo for multiple related states together
 * Perfect for complex forms or multi-field editors
 * 
 * @param {Object} initialStates - Object with initial state values
 * @param {Object} options - Configuration options
 * @returns {Object} { states, setStates, undo, redo, canUndo, canRedo }
 */
export function useMultiStateUndoRedo(initialStates, options = {}) {
  const {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    clear,
    markSaved,
    undoToSave,
    hasUnsavedChanges,
    unsavedChangesCount,
    startBatch,
    endBatch,
    cancelBatch,
    history,
    currentIndex,
    jumpToIndex
  } = useUndoRedo(initialStates, options);

  /**
   * Set individual state property
   * Supports both object updates and function callbacks
   * 
   * @param {Object|Function} updates - State updates to apply
   * @param {string} label - Optional descriptive label for undo button
   */
  const setStates = useCallback((updates, label) => {
    setState(prev => {
      // Support functional updates: updates can be a function that receives prevState
      const resolvedUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return {
        ...prev,
        ...resolvedUpdates
      };
    }, label);
  }, [setState]);

  return {
    states: state,
    setStates,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    clear,
    markSaved,
    undoToSave,
    hasUnsavedChanges,
    unsavedChangesCount,
    startBatch,
    endBatch,
    cancelBatch,
    history,
    currentIndex,
    jumpToIndex
  };
}
