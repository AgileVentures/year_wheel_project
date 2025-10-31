import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Real-time synchronization hook for Year Wheel data
 * 
 * Listens to changes in wheel_rings, activity_groups, labels, and items tables
 * and triggers a callback when any changes occur for the specified page.
 * 
 * CRITICAL: Filters by page_id to avoid cross-page contamination!
 * 
 * @param {string} wheelId - The ID of the wheel to monitor (for items only)
 * @param {string} pageId - The ID of the page to monitor (PRIMARY filter)
 * @param {function} onDataChange - Callback function called when data changes
 *   Receives: (eventType, tableName, payload) => void
 *   - eventType: 'INSERT', 'UPDATE', or 'DELETE'
 *   - tableName: 'wheel_rings', 'activity_groups', 'labels', or 'items'
 *   - payload: { old: {...}, new: {...}, eventType, ... }
 * 
 * @example
 * useRealtimeWheel(wheelId, pageId, (eventType, tableName, payload) => {
 *   console.log(`${tableName} ${eventType}:`, payload);
 *   refetchPageData(); // Re-fetch the current page
 * });
 */
export function useRealtimeWheel(wheelId, pageId, onDataChange) {
  const channelRef = useRef(null);
  const wheelIdRef = useRef(wheelId);
  const pageIdRef = useRef(pageId);

  // Keep IDs in refs to avoid recreating subscriptions
  useEffect(() => {
    wheelIdRef.current = wheelId;
    pageIdRef.current = pageId;
  }, [wheelId, pageId]);

  // Wrap callback - use ref for onDataChange to avoid recreating subscriptions
  const onDataChangeRef = useRef(onDataChange);
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  const handleChange = useCallback((tableName) => {
    return (payload) => {
      const eventType = payload.eventType; // 'INSERT', 'UPDATE', 'DELETE'
      
      // console.log(`[Realtime] ${tableName} ${eventType}`, {
      //   old: payload.old,
      //   new: payload.new,
      //   wheelId: wheelIdRef.current
      // });

      // Call the user's callback (from ref to get latest)
      if (onDataChangeRef.current) {
        onDataChangeRef.current(eventType, tableName, payload);
      }
    };
  }, []); // No dependencies - callback is stable

  useEffect(() => {
    // Don't subscribe if no wheelId or pageId
    if (!wheelId || !pageId) {
      // console.log('[Realtime] Missing wheelId or pageId, skipping subscription');
      return;
    }


    // Create a unique channel for this wheel+page combination
    const channel = supabase.channel(`wheel:${wheelId}:page:${pageId}`);

    // ARCHITECTURE: Rings/Groups/Labels are SHARED (filter by wheel_id)
    //               Items are DISTRIBUTED (filter by page_id)

    // Subscribe to wheel_rings changes (wheel-scoped - shared across pages)
    channel.on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'wheel_rings',
        filter: `wheel_id=eq.${wheelId}`, // ✅ Shared - use wheel_id
      },
      handleChange('wheel_rings')
    );

    // Subscribe to activity_groups changes (wheel-scoped - shared across pages)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'activity_groups',
        filter: `wheel_id=eq.${wheelId}`, // ✅ Shared - use wheel_id
      },
      handleChange('activity_groups')
    );

    // Subscribe to labels changes (wheel-scoped - shared across pages)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'labels',
        filter: `wheel_id=eq.${wheelId}`, // ✅ Shared - use wheel_id
      },
      handleChange('labels')
    );

    // Subscribe to items changes (page-scoped - distributed by year)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `page_id=eq.${pageId}`, // ✅ Distributed - use page_id
      },
      handleChange('items')
    );

    // Subscribe to the channel
    channel
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Subscription error:', status);
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] Subscription timed out');
        }
      });

    // Store channel reference for cleanup
    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [wheelId, pageId, handleChange]); // Only re-subscribe when wheelId or pageId changes

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
