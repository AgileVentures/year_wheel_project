/**
 * Notification Service
 * Handles all notification-related operations including creation, retrieval, and status updates
 */

import { supabase } from '../lib/supabase';

/**
 * @typedef {Object} Notification
 * @property {string} id - Notification ID
 * @property {string} user_id - Recipient user ID
 * @property {string} type - Notification type: 'mention', 'assignment', 'comment', 'wheel_share', 'team_invite', 'system'
 * @property {string} title - Notification title
 * @property {string|null} message - Optional notification message
 * @property {string|null} wheel_id - Related wheel ID
 * @property {string|null} item_id - Related item ID
 * @property {string|null} comment_id - Related comment ID
 * @property {string|null} triggered_by - User ID who triggered the notification
 * @property {boolean} read - Whether notification has been read
 * @property {string|null} read_at - Timestamp when notification was read
 * @property {string} created_at - Timestamp when notification was created
 * @property {string|null} action_url - Deep link URL for navigation
 * @property {Object|null} triggered_by_profile - Profile of user who triggered notification
 * @property {Object|null} wheel - Related wheel data
 * @property {Object|null} item - Related item data
 */

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.userId - Recipient user ID
 * @param {string} notificationData.type - Notification type
 * @param {string} notificationData.title - Notification title
 * @param {string} [notificationData.message] - Optional message
 * @param {string} [notificationData.wheelId] - Related wheel ID
 * @param {string} [notificationData.itemId] - Related item ID
 * @param {string} [notificationData.commentId] - Related comment ID
 * @param {string} [notificationData.triggeredBy] - User ID who triggered notification
 * @param {string} [notificationData.actionUrl] - Deep link URL
 * @returns {Promise<{data: Notification|null, error: Error|null}>}
 */
export async function createNotification({
  userId,
  type,
  title,
  message = null,
  wheelId = null,
  itemId = null,
  commentId = null,
  triggeredBy = null,
  actionUrl = null,
}) {
  try {
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_wheel_id: wheelId,
      p_item_id: itemId,
      p_comment_id: commentId,
      p_triggered_by: triggeredBy,
      p_action_url: actionUrl,
    });

    if (error) throw error;

    // Fetch the created notification with related data
    if (data) {
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select(`
          *,
          wheel:year_wheels(id, title),
          item:items(id, name)
        `)
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      // Fetch triggered_by profile separately
      if (notification && notification.triggered_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .eq('id', notification.triggered_by)
          .single();
        
        notification.triggered_by_profile = profile;
      }

      return { data: notification, error: null };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { data: null, error };
  }
}

/**
 * Get notifications for the current user
 * @param {Object} options - Query options
 * @param {boolean} [options.unreadOnly=false] - Only fetch unread notifications
 * @param {number} [options.limit=50] - Maximum number of notifications to fetch
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<{data: Notification[]|null, error: Error|null}>}
 */
export async function getNotifications({ unreadOnly = false, limit = 50, offset = 0 } = {}) {
  try {
    let query = supabase
      .from('notifications')
      .select(`
        *,
        wheel:year_wheels(id, title),
        item:items(id, name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch triggered_by profiles separately
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(n => n.triggered_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        // Map profiles to notifications
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        data.forEach(notification => {
          if (notification.triggered_by) {
            notification.triggered_by_profile = profileMap.get(notification.triggered_by) || null;
          }
        });
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: null, error };
  }
}

/**
 * Get unread notification count
 * @returns {Promise<{data: number|null, error: Error|null}>}
 */
export async function getUnreadCount() {
  try {
    const { data, error } = await supabase.rpc('get_unread_notification_count');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return { data: null, error };
  }
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID to mark as read
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function markAsRead(notificationId) {
  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });

    if (error) throw error;
    return { success: data, error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error };
  }
}

/**
 * Mark all notifications as read for the current user
 * @returns {Promise<{count: number|null, error: Error|null}>}
 */
export async function markAllAsRead() {
  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read');

    if (error) throw error;
    return { count: data, error: null };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { count: null, error };
  }
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID to delete
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error };
  }
}

/**
 * Get notification by ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise<{data: Notification|null, error: Error|null}>}
 */
export const getNotificationById = async (notificationId) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .select(`
        *,
        wheel:year_wheels(id, title),
        item:items(id, name)
      `)
      .eq('id', notificationId)
      .single();

    if (error) throw error;

    // Fetch triggered_by profile separately
    if (notification && notification.triggered_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', notification.triggered_by)
        .single();
      
      notification.triggered_by_profile = profile;
    }

    return { data: notification, error: null };
  } catch (error) {
    console.error('Error fetching notification:', error);
    return { data: null, error };
  }
};

/**
 * Subscribe to real-time notifications for the current user
 * Note: This function returns a subscription object that should be cleaned up
 * @param {Function} callback - Callback function to handle new notifications
 * @returns {Object} Supabase realtime subscription
 */
export function subscribeToNotifications(callback) {
  return supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${supabase.auth.getUser().then(r => r.data?.user?.id)}`,
      },
      callback
    )
    .subscribe();
}

export default {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationById,
  subscribeToNotifications,
};
