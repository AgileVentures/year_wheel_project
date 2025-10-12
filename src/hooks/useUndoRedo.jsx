import { useState, useCallback, useRef, useEffect } from 'react';

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
  
  // History stacks
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Flag to prevent adding to history during undo/redo
  const isUndoRedoAction = useRef(false);

  /**
   * Add state to history
   */
  const addToHistory = useCallback((newState) => {
    if (isUndoRedoAction.current) {
      return; // Don't add to history during undo/redo
    }

    setHistory(prev => {
      // Remove any future history (we're creating a new timeline)
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new state
      newHistory.push(newState);
      
      // Limit history size
      if (newHistory.length > limit) {
        return newHistory.slice(-limit);
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => {
      const newIndex = prev + 1;
      return newIndex >= limit ? limit - 1 : newIndex;
    });
  }, [currentIndex, limit]);

  /**
   * Set state WITHOUT debouncing for immediate undo history
   * This ensures undo/redo always has the correct state
   */
  const setState = useCallback((newState) => {
    // CRITICAL: Use setStateInternal's callback to get LATEST state
    // This prevents stale closure issues when multiple state updates happen
    setStateInternal(prevState => {
      // Support functional updates with LATEST prevState
      const resolvedState = typeof newState === 'function' 
        ? newState(prevState) 
        : newState;
      
      // Add to history IMMEDIATELY (no debouncing for undo history)
      // This ensures every state change can be undone
      addToHistory(resolvedState);
      
      return resolvedState;
    });
  }, [addToHistory]);

  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setStateInternal(history[newIndex]);
      
      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 0);
      
      return true;
    }
    return false;
  }, [currentIndex, history]);

  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setStateInternal(history[newIndex]);
      
      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 0);
      
      return true;
    }
    return false;
  }, [currentIndex, history]);

  /**
   * Clear history
   */
  const clear = useCallback(() => {
    setHistory([state]);
    setCurrentIndex(0);
  }, [state]);

  /**
   * Can undo/redo flags
   */
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

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
          if (redo()) {
            // Show toast
            const event = new CustomEvent('showToast', {
              detail: { message: 'Ångrade åtgärd', type: 'info' }
            });
            window.dispatchEvent(event);
          }
        } else {
          // Undo: Ctrl+Z or Cmd+Z
          if (undo()) {
            // Show toast
            const event = new CustomEvent('showToast', {
              detail: { message: 'Ångrat', type: 'info' }
            });
            window.dispatchEvent(event);
          }
        }
      }
      
      // Alternative redo: Ctrl+Y
      if (isMod && e.key === 'y') {
        e.preventDefault();
        if (redo()) {
          const event = new CustomEvent('showToast', {
            detail: { message: 'Ångrade åtgärd', type: 'info' }
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
    clear,
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
    clear
  } = useUndoRedo(initialStates, options);

  /**
   * Set individual state property
   * Supports both object updates and function callbacks
   */
  const setStates = useCallback((updates) => {
    setState(prev => {
      // Support functional updates: updates can be a function that receives prevState
      const resolvedUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return {
        ...prev,
        ...resolvedUpdates
      };
    });
  }, [setState]);

  return {
    states: state,
    setStates,
    undo,
    redo,
    canUndo,
    canRedo,
    clear
  };
}
