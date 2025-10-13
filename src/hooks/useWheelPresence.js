import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * Real-time presence tracking for Year Wheel collaboration
 * 
 * Shows which team members are currently viewing/editing a wheel.
 * Uses Supabase Realtime Presence to track active users.
 * 
 * @param {string} wheelId - The ID of the wheel to track presence for
 * @returns {Array} activeUsers - Array of users currently viewing the wheel
 *   Each user object contains: { user_id, email, name, joined_at }
 * 
 * @example
 * const activeUsers = useWheelPresence(currentWheel?.id);
 * console.log(`${activeUsers.length} users viewing this wheel`);
 */
export function useWheelPresence(wheelId) {
  const [activeUsers, setActiveUsers] = useState([]);
  const { user } = useAuth();
  const channelRef = useRef(null);

  useEffect(() => {
    // Don't track presence if no wheel or user
    if (!wheelId || !user) {
      setActiveUsers([]);
      return;
    }

    // console.log(`[Presence] Joining wheel: ${wheelId} as ${user.email}`);

    // Create a presence channel for this wheel
    const channel = supabase.channel(`presence:wheel:${wheelId}`, {
      config: {
        presence: {
          key: user.id, // Use user ID as unique key
        },
      },
    });

    // Listen for presence state changes
    channel
      .on('presence', { event: 'sync' }, () => {
        // Get current presence state
        const state = channel.presenceState();
        
        // Flatten the state object into an array of users
        // Each key in state contains an array (for handling multiple connections per user)
        const allUsers = Object.values(state)
          .flat()
          .filter((u) => u.user_id !== user.id); // Exclude current user

        // Deduplicate by user_id (in case of multiple tabs/connections)
        const uniqueUsers = Array.from(
          new Map(allUsers.map(u => [u.user_id, u])).values()
        );

        // console.log(`[Presence] ${uniqueUsers.length} other users online:`, uniqueUsers);
        setActiveUsers(uniqueUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // console.log(`[Presence] User joined:`, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // console.log(`[Presence] User left:`, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`[Presence] Subscribed to wheel: ${wheelId}`);
          
          // Track this user's presence
          await channel.track({
            user_id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
            joined_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      // console.log(`[Presence] Leaving wheel: ${wheelId}`);
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [wheelId, user]);

  return activeUsers;
}

/**
 * Hook to broadcast "typing" or "editing" status
 * Useful for showing when a user is actively editing a specific item
 * 
 * @param {string} wheelId - The wheel being edited
 * @param {string} itemId - The specific item being edited (optional)
 * @returns {Object} { broadcastActivity, activeEditors }
 * 
 * @example
 * const { broadcastActivity, activeEditors } = useWheelActivity(wheelId);
 * 
 * // When user starts editing
 * broadcastActivity('editing', { itemId: 'item-123', itemName: 'Q1 Campaign' });
 * 
 * // When user stops editing
 * broadcastActivity('idle');
 */
export function useWheelActivity(wheelId) {
  const [activeEditors, setActiveEditors] = useState([]);
  const { user } = useAuth();
  const channelRef = useRef(null);

  const broadcastActivity = useCallback(async (activityType, metadata = {}) => {
    if (!channelRef.current || !user) return;

    const activityData = {
      user_id: user.id,
      email: user.email,
      activity: activityType, // 'idle', 'editing', 'viewing'
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    // console.log('[Activity] Broadcasting:', activityData);
    await channelRef.current.track(activityData);
  }, [user]);

  useEffect(() => {
    if (!wheelId || !user) {
      setActiveEditors([]);
      return;
    }

    // console.log(`[Activity] Setting up activity tracking for wheel: ${wheelId}`);

    const channel = supabase.channel(`activity:wheel:${wheelId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const editors = Object.values(state)
          .flat()
          .filter((u) => u.user_id !== user.id && u.activity !== 'idle');

        // console.log(`[Activity] Active editors:`, editors);
        setActiveEditors(editors);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Start with idle status
          await channel.track({
            user_id: user.id,
            email: user.email,
            activity: 'viewing',
            timestamp: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      // console.log(`[Activity] Cleaning up activity tracking`);
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [wheelId, user]);

  return {
    broadcastActivity,
    activeEditors,
  };
}
