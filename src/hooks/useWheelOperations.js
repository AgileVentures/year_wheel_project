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
  
  // Keep callback ref updated
  useEffect(() => {
    onOperationRef.current = onOperation;
  }, [onOperation]);

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
    if (!wheelId || !pageId || !user) {
      return;
    }

    // Create a broadcast channel for this page
    const channel = supabase.channel(`operations:page:${pageId}`, {
      config: {
        broadcast: { self: false }, // Don't receive our own broadcasts
      },
    });

    // Listen for operations from other users
    channel
      .on('broadcast', { event: 'operation' }, (payload) => {
        // Call the callback with the operation
        if (onOperationRef.current && payload.payload) {
          onOperationRef.current(payload.payload);
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
  }, [wheelId, pageId, user]);

  return {
    broadcastOperation,
  };
}
