/**
 * useRealtimeNotifications Hook
 * Subscribes to real-time notifications and provides notification management functions
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../services/notificationService';

/**
 * Custom hook for real-time notifications
 * @param {Object} options - Hook options
 * @param {boolean} [options.autoFetch=true] - Automatically fetch notifications on mount
 * @param {number} [options.limit=50] - Maximum number of notifications to fetch
 * @returns {Object} Notification state and methods
 */
export function useRealtimeNotifications({ autoFetch = true, limit = 50 } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getNotifications({ unreadOnly, limit });

    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }

    setNotifications(data || []);
    setLoading(false);
  }, [limit]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    const { data, error: countError } = await getUnreadCount();

    if (countError) {
      console.error('Error fetching unread count:', countError);
      return;
    }

    setUnreadCount(data || 0);
  }, []);

  // Mark notification as read
  const handleMarkAsRead = useCallback(async (notificationId) => {
    const { success, error: markError } = await markAsRead(notificationId);

    if (markError) {
      console.error('Error marking notification as read:', markError);
      return false;
    }

    if (success) {
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    return success;
  }, []);

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    const { count, error: markError } = await markAllAsRead();

    if (markError) {
      console.error('Error marking all notifications as read:', markError);
      return false;
    }

    // Update local state
    setNotifications(prev =>
      prev.map(notif => ({
        ...notif,
        read: true,
        read_at: new Date().toISOString(),
      }))
    );
    setUnreadCount(0);

    return true;
  }, []);

  // Delete notification
  const handleDelete = useCallback(async (notificationId) => {
    const { success, error: deleteError } = await deleteNotification(notificationId);

    if (deleteError) {
      console.error('Error deleting notification:', deleteError);
      return false;
    }

    if (success) {
      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }

    return success;
  }, [notifications]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          // Fetch the full notification with related data
          const { data: newNotification } = await supabase
            .from('notifications')
            .select(`
              *,
              wheel:year_wheels(id, title),
              item:items(id, name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newNotification) {
            // Fetch triggered_by profile separately
            if (newNotification.triggered_by) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .eq('id', newNotification.triggered_by)
                .single();
              
              newNotification.triggered_by_profile = profile;
            }

            // Check if it's for the current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user && newNotification.user_id === user.id) {
              setNotifications(prev => [newNotification, ...prev]);
              if (!newNotification.read) {
                setUnreadCount(prev => prev + 1);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          setNotifications(prev =>
            prev.map(notif =>
              notif.id === payload.new.id ? { ...notif, ...payload.new } : notif
            )
          );

          // Update unread count if read status changed
          if (payload.old.read === false && payload.new.read === true) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const deletedNotification = notifications.find(n => n.id === payload.old.id);
          setNotifications(prev => prev.filter(notif => notif.id !== payload.old.id));
          
          if (deletedNotification && !deletedNotification.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notifications]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [autoFetch, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDelete,
    refresh: fetchNotifications,
  };
}

export default useRealtimeNotifications;
