import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * Real-time operations broadcasting for collaborative editing
 * 
 * Broadcasts item operations (drag, resize, edit) through Supabase Realtime
 * so other users can see changes in real-time before they're saved to DB.
 * 
 * Operations are ephemeral - they don't persist, just for live preview.
 * Actual data persistence happens through auto-save to database.
 * 
 * @param {string} wheelId - The wheel ID
 * @param {string} pageId - The current page ID
 * @param {function} onOperation - Callback when operation received: (operation) => void
 * 
 * @returns {Object} { broadcastOperation }
 * 
 * Operation format:
 * {
 *   type: 'drag' | 'resize' | 'edit' | 'delete' | 'create',
 *   itemId: string,
 *   data: { ... operation-specific data ... },
 *   userId: string,
 *   userEmail: string,
 *   timestamp: ISO string
 * }
 */
export function useWheelOperations(wheelId, pageId, onOperation) {
  const { user } = useAuth();
  const channelRef = useRef(null);
  const onOperationRef = useRef(onOperation);
  const currentPageIdRef = useRef(pageId);
  
  // Keep refs updated
  useEffect(() => {
    onOperationRef.current = onOperation;
    currentPageIdRef.current = pageId;
  }, [onOperation, pageId]);

  // Broadcast an operation to other users
  const broadcastOperation = useCallback(async (type, itemId, data = {}) => {
    if (!channelRef.current || !user) {
      return;
    }

    const operation = {
      type,
      itemId,
      data,
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
      pageId: currentPageIdRef.current, // Include pageId in operation
    };

    try {
      // Send as broadcast message (not presence - more suitable for operations)
      await channelRef.current.send({
        type: 'broadcast',
        event: 'operation',
        payload: operation,
      });
    } catch (error) {
      console.error('[Operations] Broadcast failed:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!wheelId || !user) {
      return;
    }

    // CRITICAL: Subscribe to WHEEL-LEVEL channel (not page-specific)
    // This prevents re-subscription loops during page navigation
    const channel = supabase.channel(`operations:wheel:${wheelId}`, {
      config: {
        broadcast: { self: false }, // Don't receive our own broadcasts
      },
    });

    // Listen for operations from other users
    channel
      .on('broadcast', { event: 'operation' }, (payload) => {
        // Only process operations for the current page
        if (payload.payload && payload.payload.pageId === currentPageIdRef.current) {
          if (onOperationRef.current) {
            onOperationRef.current(payload.payload);
          }
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[Operations] Subscription error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [wheelId, user]); // Removed pageId from dependencies - use ref instead

  return {
    broadcastOperation,
  };
}
