import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Real-time synchronization hook for Year Wheel data
 * 
 * Listens to changes in wheel_rings, activity_groups, labels, and items tables
 * and triggers a callback when any changes occur for the specified wheel.
 * 
 * @param {string} wheelId - The ID of the wheel to monitor
 * @param {function} onDataChange - Callback function called when data changes
 *   Receives: (eventType, tableName, payload) => void
 *   - eventType: 'INSERT', 'UPDATE', or 'DELETE'
 *   - tableName: 'wheel_rings', 'activity_groups', 'labels', or 'items'
 *   - payload: { old: {...}, new: {...}, eventType, ... }
 * 
 * @example
 * useRealtimeWheel(currentWheel?.id, (eventType, tableName, payload) => {
 *   console.log(`${tableName} ${eventType}:`, payload);
 *   refetchWheelData(); // Re-fetch the entire wheel
 * });
 */
export function useRealtimeWheel(wheelId, onDataChange) {
  const channelRef = useRef(null);
  const wheelIdRef = useRef(wheelId);

  // Keep wheelId in ref to avoid recreating subscriptions
  useEffect(() => {
    wheelIdRef.current = wheelId;
  }, [wheelId]);

  // Wrap callback in useCallback to ensure stable reference
  const handleChange = useCallback((tableName) => {
    return (payload) => {
      const eventType = payload.eventType; // 'INSERT', 'UPDATE', 'DELETE'
      
      // console.log(`[Realtime] ${tableName} ${eventType}`, {
      //   old: payload.old,
      //   new: payload.new,
      //   wheelId: wheelIdRef.current
      // });

      // Call the user's callback
      if (onDataChange) {
        onDataChange(eventType, tableName, payload);
      }
    };
  }, [onDataChange]);

  useEffect(() => {
    // Don't subscribe if no wheelId
    if (!wheelId) {
      // console.log('[Realtime] No wheelId, skipping subscription');
      return;
    }

    // console.log(`[Realtime] Setting up subscriptions for wheel: ${wheelId}`);

    // Create a unique channel for this wheel
    const channel = supabase.channel(`wheel:${wheelId}`);

    // Subscribe to wheel_rings changes
    channel.on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'wheel_rings',
        filter: `wheel_id=eq.${wheelId}`,
      },
      handleChange('wheel_rings')
    );

    // Subscribe to activity_groups changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'activity_groups',
        filter: `wheel_id=eq.${wheelId}`,
      },
      handleChange('activity_groups')
    );

    // Subscribe to labels changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'labels',
        filter: `wheel_id=eq.${wheelId}`,
      },
      handleChange('labels')
    );

    // Subscribe to items changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `wheel_id=eq.${wheelId}`,
      },
      handleChange('items')
    );

    // Subscribe to the channel
    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`[Realtime] Successfully subscribed to wheel: ${wheelId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Subscription error:', status);
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] Subscription timed out');
        } else if (status === 'CLOSED') {
          // console.log('[Realtime] Channel closed');
        }
      });

    // Store channel reference for cleanup
    channelRef.current = channel;

    // Cleanup function
    return () => {
      // console.log(`[Realtime] Cleaning up subscriptions for wheel: ${wheelId}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [wheelId, handleChange]);

  // Return channel status for debugging
  return {
    isSubscribed: channelRef.current?.state === 'joined',
    channel: channelRef.current,
  };
}

/**
 * Hook for monitoring year_wheels table changes
 * Useful for detecting when a wheel is deleted or its metadata changes
 * 
 * @param {function} onWheelChange - Callback when any wheel changes
 */
export function useRealtimeWheels(onWheelChange) {
  const channelRef = useRef(null);

  const handleChange = useCallback((payload) => {
    // console.log('[Realtime] Wheel metadata changed:', payload);
    if (onWheelChange) {
      onWheelChange(payload.eventType, payload);
    }
  }, [onWheelChange]);

  useEffect(() => {
    // console.log('[Realtime] Setting up wheel metadata subscription');

    const channel = supabase
      .channel('wheels-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'year_wheels',
        },
        handleChange
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log('[Realtime] Subscribed to wheels metadata');
        }
      });

    channelRef.current = channel;

    return () => {
      // console.log('[Realtime] Cleaning up wheels metadata subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [handleChange]);

  return {
    isSubscribed: channelRef.current?.state === 'joined',
  };
}
