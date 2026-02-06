/**
 * Activity Reminder Service
 * Manages email reminders for activities
 */

import { supabase } from '../lib/supabase';

/**
 * Get all reminders for an item
 * @param {string} itemId - Item ID
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getItemReminders(itemId) {
  try {
    const { data, error } = await supabase
      .from('activity_reminders')
      .select(`
        *,
        recipient_profile:profiles!activity_reminders_recipient_user_id_fkey(id, full_name, email)
      `)
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return { data: null, error };
  }
}

/**
 * Create a new reminder
 * @param {Object} reminderData - Reminder configuration
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createReminder(reminderData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('activity_reminders')
      .insert({
        item_id: reminderData.itemId,
        wheel_id: reminderData.wheelId,
        created_by: user.id,
        reminder_type: reminderData.reminderType,
        days_offset: reminderData.daysOffset,
        recipient_type: reminderData.recipientType,
        recipient_user_id: reminderData.recipientUserId || null,
        custom_message: reminderData.customMessage || null,
        applies_to_all_occurrences: reminderData.appliesToAllOccurrences || false
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating reminder:', error);
    return { data: null, error };
  }
}

/**
 * Update a reminder
 * @param {string} reminderId - Reminder ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateReminder(reminderId, updates) {
  try {
    const { data, error } = await supabase
      .from('activity_reminders')
      .update(updates)
      .eq('id', reminderId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating reminder:', error);
    return { data: null, error };
  }
}

/**
 * Delete a reminder
 * @param {string} reminderId - Reminder ID
 * @returns {Promise<{error: Error|null}>}
 */
export async function deleteReminder(reminderId) {
  try {
    const { error } = await supabase
      .from('activity_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return { error };
  }
}

/**
 * Update item status
 * @param {string} itemId - Item ID
 * @param {string} status - New status (planned, not_started, started, in_progress, done)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateItemStatus(itemId, status) {
  try {
    const { data, error } = await supabase
      .from('items')
      .update({ status })
      .eq('id', itemId)
      .select();

    if (error) throw error;
    
    // Check if any rows were updated
    if (!data || data.length === 0) {
      throw new Error('No item found or you do not have permission to update it');
    }
    
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error updating item status:', error);
    return { data: null, error };
  }
}

/**
 * Get reminders count for an item
 * @param {string} itemId - Item ID
 * @returns {Promise<{data: number|null, error: Error|null}>}
 */
export async function getRemindersCount(itemId) {
  try {
    const { count, error } = await supabase
      .from('activity_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId)
      .eq('status', 'pending');

    if (error) throw error;
    return { data: count, error: null };
  } catch (error) {
    console.error('Error fetching reminders count:', error);
    return { data: null, error };
  }
}

/**
 * Cancel all pending reminders for an item
 * @param {string} itemId - Item ID
 * @returns {Promise<{error: Error|null}>}
 */
export async function cancelItemReminders(itemId) {
  try {
    const { error } = await supabase
      .from('activity_reminders')
      .update({ status: 'cancelled' })
      .eq('item_id', itemId)
      .eq('status', 'pending');

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error cancelling reminders:', error);
    return { error };
  }
}
