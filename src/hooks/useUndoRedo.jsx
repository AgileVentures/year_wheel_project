import { useState, useCallback, useRef, useEffect } from 'react';
import { produce, current, freeze } from 'immer';

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
 * @returns {Object} { state, setState, undo, redo, canUndo, canRedo, clear, historyLength, currentIndex }
 */
export function useUndoRedo(initialState, options = {}) {
  const {
    limit = 50,
    enableKeyboard = true
  } = options;

  // Current state
  const [state, setStateInternal] = useState(initialState);
  
  // History stacks with metadata (using Immer freeze for immutability)
  const [history, setHistory] = useState([{ state: freeze(initialState, true), label: 'Start' }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Flag to prevent adding to history during undo/redo
  const isUndoRedoAction = useRef(false);
  
  // Track save points in history (for "undo to save" feature)
  const lastSaveIndex = useRef(0);
  
  // Batch mode (for drag operations, etc.)
  const isBatchMode = useRef(false);
  const batchModeLabel = useRef('');
  const batchModeState = useRef(null);

  /**
   * Add state to history with optional label
   * Uses Immer to create immutable snapshots efficiently
   */
  const addToHistory = useCallback((newState, label = 'Ändring') => {
    if (isUndoRedoAction.current) {
      return; // Don't add to history during undo/redo
    }

    // In batch mode, just store the latest state without adding to history yet
    if (isBatchMode.current) {
      // Use Immer freeze to ensure immutability in batch mode
      batchModeState.current = freeze(newState, true);
      return;
    }

    setHistory(prev => {
      // Use Immer produce to create new history array immutably
      return produce(prev, draft => {
        // Remove any future history (we're creating a new timeline)
        draft.splice(currentIndex + 1);
        
        // Add new state with label (Immer freeze ensures deep immutability)
        // freeze() creates a deeply frozen copy, preventing accidental mutations
        draft.push({ state: freeze(newState, true), label });
        
        // Limit history size
        if (draft.length > limit) {
          // Keep only the last 'limit' entries
          draft.splice(0, draft.length - limit);
        }
      });
    });
    
    setCurrentIndex(prev => {
      const newIndex = prev + 1;
      return newIndex >= limit ? limit - 1 : newIndex;
    });
  }, [currentIndex, limit]);

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
    if (currentIndex > 0 && history.length > 0) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex - 1;
      const historyEntry = history[newIndex];
      
      // Safety check: ensure history entry exists
      if (!historyEntry) {
        console.error('Undo failed: history entry not found at index', newIndex);
        return false;
      }
      
      setCurrentIndex(newIndex);
      setStateInternal(historyEntry.state);
      
      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 0);
      
      return historyEntry.label || 'Ändring';
    }
    return false;
  }, [currentIndex, history]);

  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1 && history.length > 0) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex + 1;
      const historyEntry = history[newIndex];
      
      // Safety check: ensure history entry exists
      if (!historyEntry) {
        console.error('Redo failed: history entry not found at index', newIndex);
        return false;
      }
      
      setCurrentIndex(newIndex);
      setStateInternal(historyEntry.state);
      
      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 0);
      
      return historyEntry.label || 'Ändring';
    }
    return false;
  }, [currentIndex, history]);
  /**
   * Undo to last save point
   */
  const undoToSave = useCallback(() => {
    if (currentIndex > lastSaveIndex.current && history.length > 0) {
      const saveIndex = lastSaveIndex.current;
      const historyEntry = history[saveIndex];
      
      // Safety check: ensure history entry exists
      if (!historyEntry) {
        console.error('Undo to save failed: history entry not found at index', saveIndex);
        return false;
      }
      
      isUndoRedoAction.current = true;
      setCurrentIndex(saveIndex);
      setStateInternal(historyEntry.state);
      
      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 0);
      
      return true;
    }
    return false;
  }, [currentIndex, history]);

  /**
   * Start batch mode - accumulate changes without creating history entries
   * Used for drag operations to prevent history spam
   * Uses Immer freeze to preserve initial state
   */
  const startBatch = useCallback((label = 'Gruppoperation') => {
    isBatchMode.current = true;
    batchModeLabel.current = label;
    // Freeze initial state to prevent mutations
    batchModeState.current = freeze(state, true);
  }, [state]);

  /**
   * End batch mode - commit accumulated changes as single history entry
   */
  const endBatch = useCallback(() => {
    if (isBatchMode.current && batchModeState.current !== null) {
      // Commit the batch as a single history entry
      addToHistory(batchModeState.current, batchModeLabel.current);
      setStateInternal(batchModeState.current);
    }
    isBatchMode.current = false;
    batchModeLabel.current = '';
    batchModeState.current = null;
  }, [addToHistory]);

  /**
   * Cancel batch mode - discard accumulated changes
   */
  const cancelBatch = useCallback(() => {
    isBatchMode.current = false;
    batchModeLabel.current = '';
    batchModeState.current = null;
  }, []);

  /**
   * Clear history
   * Uses Immer freeze to ensure immutability
   */
  const clear = useCallback(() => {
    setHistory([{ state: freeze(state, true), label: 'Start' }]);
    setCurrentIndex(0);
    lastSaveIndex.current = 0;
  }, [state]);

  /**
   * Can undo/redo flags and labels
   */
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  const hasUnsavedChanges = currentIndex !== lastSaveIndex.current;
  const unsavedChangesCount = Math.abs(currentIndex - lastSaveIndex.current);
  
  // Get descriptive labels for UI with safety checks
  const undoLabel = canUndo && history[currentIndex - 1] ? (history[currentIndex - 1].label || '') : '';
  const redoLabel = canRedo && history[currentIndex + 1] ? (history[currentIndex + 1].label || '') : '';

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
            // Show toast with descriptive label
            const event = new CustomEvent('showToast', {
              detail: { message: `Gör om: ${label}`, type: 'info' }
            });
            window.dispatchEvent(event);
          }
        } else {
          // Undo: Ctrl+Z or Cmd+Z
          const label = undo();
          if (label) {
            // Show toast with descriptive label
            const event = new CustomEvent('showToast', {
              detail: { message: `Ångra: ${label}`, type: 'info' }
            });
            window.dispatchEvent(event);
          }
        }
      }
      
      // Alternative redo: Ctrl+Y
      if (isMod && e.key === 'y') {
        e.preventDefault();
        const label = redo();
        if (label) {
          const event = new CustomEvent('showToast', {
            detail: { message: `Gör om: ${label}`, type: 'info' }
          });
          window.dispatchEvent(event);
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
    currentIndex
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
    cancelBatch
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
    cancelBatch
  };
}
