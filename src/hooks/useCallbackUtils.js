import { useCallback, useRef } from 'react';

/**
 * Throttles a callback function to prevent excessive executions
 * Useful for preventing too many canvas redraws from rapid realtime updates
 * 
 * @param {Function} callback - The function to throttle
 * @param {number} delay - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 * 
 * @example
 * const throttledRefresh = useThrottledCallback(() => {
 *   loadWheelData();
 * }, 1000); // Max once per second
 */
export function useThrottledCallback(callback, delay = 1000) {
  const timeoutRef = useRef(null);
  const lastCallRef = useRef(0);
  const pendingRef = useRef(false);

  return useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    // If enough time has passed, execute immediately
    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      callback(...args);
      return;
    }

    // Otherwise, schedule for later
    pendingRef.current = true;

    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (pendingRef.current) {
          lastCallRef.current = Date.now();
          callback(...args);
          pendingRef.current = false;
        }
        timeoutRef.current = null;
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);
}

/**
 * Debounces a callback function - only executes after a period of inactivity
 * Useful for search inputs or auto-save functionality
 * 
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Time to wait after last call before executing
 * @returns {Function} Debounced function
 * 
 * @example
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveToDatabase(data);
 * }, 500); // Wait 500ms after last change
 */
export function useDebouncedCallback(callback, delay = 500) {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback(...args);
      timeoutRef.current = null;
    }, delay);
  }, [callback, delay]);
}

/**
 * Batches multiple rapid function calls into a single execution
 * Collects all arguments and executes once after a delay
 * 
 * @param {Function} callback - Function that receives array of all batched arguments
 * @param {number} delay - Time to wait before executing batch
 * @returns {Function} Batched function
 * 
 * @example
 * const batchedUpdate = useBatchedCallback((updates) => {
 *   // updates = [[arg1], [arg2], [arg3], ...]
 *   applyBulkUpdate(updates);
 * }, 100);
 */
export function useBatchedCallback(callback, delay = 100) {
  const timeoutRef = useRef(null);
  const batchRef = useRef([]);

  return useCallback((...args) => {
    // Add to batch
    batchRef.current.push(args);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      const batch = [...batchRef.current];
      batchRef.current = [];
      callback(batch);
      timeoutRef.current = null;
    }, delay);
  }, [callback, delay]);
}

/**
 * Rate limits a function to execute at most once per interval
 * Unlike throttle, this enforces a strict rate limit
 * 
 * @param {Function} callback - The function to rate limit
 * @param {number} interval - Minimum time between executions
 * @returns {Object} { execute, canExecute, remainingTime }
 * 
 * @example
 * const { execute, canExecute } = useRateLimitedCallback(sendMessage, 2000);
 * if (canExecute) {
 *   execute(message);
 * } else {
 *   console.log('Please wait before sending another message');
 * }
 */
export function useRateLimitedCallback(callback, interval = 1000) {
  const lastExecutionRef = useRef(0);

  const execute = useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionRef.current;

    if (timeSinceLastExecution >= interval) {
      lastExecutionRef.current = now;
      callback(...args);
      return true;
    }
    return false;
  }, [callback, interval]);

  const canExecute = useCallback(() => {
    const now = Date.now();
    return now - lastExecutionRef.current >= interval;
  }, [interval]);

  const remainingTime = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastExecutionRef.current;
    return Math.max(0, interval - elapsed);
  }, [interval]);

  return { execute, canExecute, remainingTime };
}
