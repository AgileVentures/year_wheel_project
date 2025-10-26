/**
 * Wheel Comment Service
 * Handles wheel-level comments (general comments not tied to specific items)
 */

import { supabase } from '../lib/supabase';
import { extractMentionedUserIds } from './commentService';

/**
 * Get all wheel comments
 * @param {string} wheelId - Wheel ID
 * @param {Object} options - Query options
 * @param {boolean} [options.includeDeleted=false] - Include soft-deleted comments
 * @param {boolean} [options.threaded=true] - Return comments in threaded structure
 * @returns {Promise<{data: Comment[]|null, error: Error|null}>}
 */
export async function getWheelComments(wheelId, { includeDeleted = false, threaded = true } = {}) {
  try {
    let query = supabase
      .from('wheel_comments')
      .select('*')
      .eq('wheel_id', wheelId)
      .order('created_at', { ascending: true });

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch user profiles separately
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Attach profiles to comments
      data.forEach(comment => {
        comment.user_profile = profilesMap.get(comment.user_id) || null;
      });
    }

    // Organize into threaded structure if requested
    if (threaded && data) {
      const commentsMap = new Map();
      const rootComments = [];

      // First pass: create map and identify root comments
      data.forEach(comment => {
        commentsMap.set(comment.id, { ...comment, replies: [] });
        if (!comment.parent_comment_id) {
          rootComments.push(commentsMap.get(comment.id));
        }
      });

      // Second pass: attach children to parents
      data.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies.push(commentsMap.get(comment.id));
          }
        }
      });

      return { data: rootComments, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching wheel comments:', error);
    return { data: null, error };
  }
}

/**
 * Create a new wheel comment
 * @param {Object} commentData - Comment data
 * @param {string} commentData.wheelId - Wheel ID
 * @param {string} commentData.content - Comment content
 * @param {string} [commentData.parentCommentId] - Parent comment ID for replies
 * @returns {Promise<{data: Comment|null, error: Error|null}>}
 */
export async function createWheelComment({ wheelId, content, parentCommentId = null }) {
  try {
    // Extract mentioned user IDs from content
    const mentionedUsers = extractMentionedUserIds(content);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('wheel_comments')
      .insert({
        wheel_id: wheelId,
        user_id: user.id,
        content,
        parent_comment_id: parentCommentId,
        mentioned_users: mentionedUsers,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Fetch user profile separately
    if (data && data.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', data.user_id)
        .single();
      
      data.user_profile = profile;
    }

    // Notifications are created automatically by database trigger
    return { data, error: null };
  } catch (error) {
    console.error('Error creating wheel comment:', error);
    return { data: null, error };
  }
}

/**
 * Update a wheel comment
 * @param {string} commentId - Comment ID
 * @param {string} content - New comment content
 * @returns {Promise<{data: Comment|null, error: Error|null}>}
 */
export async function updateWheelComment(commentId, content) {
  try {
    // Extract updated mentions
    const mentionedUsers = extractMentionedUserIds(content);

    const { data, error } = await supabase
      .from('wheel_comments')
      .update({
        content,
        mentioned_users: mentionedUsers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select('*')
      .single();

    if (error) throw error;

    // Fetch user profile separately
    if (data && data.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', data.user_id)
        .single();
      
      data.user_profile = profile;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error updating wheel comment:', error);
    return { data: null, error };
  }
}

/**
 * Soft-delete a wheel comment
 * @param {string} commentId - Comment ID
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteWheelComment(commentId) {
  try {
    const { data, error } = await supabase.rpc('soft_delete_wheel_comment', {
      p_comment_id: commentId,
    });

    if (error) throw error;
    return { success: data, error: null };
  } catch (error) {
    console.error('Error deleting wheel comment:', error);
    return { success: false, error };
  }
}

/**
 * Get wheel comment count
 * @param {string} wheelId - Wheel ID
 * @returns {Promise<{data: number|null, error: Error|null}>}
 */
export async function getWheelCommentCount(wheelId) {
  try {
    const { count, error } = await supabase
      .from('wheel_comments')
      .select('*', { count: 'exact', head: true })
      .eq('wheel_id', wheelId)
      .is('deleted_at', null);

    if (error) throw error;
    return { data: count, error: null };
  } catch (error) {
    console.error('Error fetching wheel comment count:', error);
    return { data: null, error };
  }
}

/**
 * Subscribe to real-time wheel comments
 * @param {string} wheelId - Wheel ID
 * @param {Function} callback - Callback function to handle comment changes
 * @returns {Object} Supabase realtime subscription
 */
export function subscribeToWheelComments(wheelId, callback) {
  return supabase
    .channel(`wheel-comments:${wheelId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wheel_comments',
        filter: `wheel_id=eq.${wheelId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Get all comments for a wheel (both item and wheel comments)
 * @param {string} wheelId - Wheel ID
 * @returns {Promise<{data: {itemComments: Array, wheelComments: Array}|null, error: Error|null}>}
 */
export async function getAllWheelComments(wheelId) {
  try {
    // Fetch wheel-level comments
    const { data: wheelComments, error: wheelError } = await getWheelComments(wheelId, { threaded: false });
    if (wheelError) throw wheelError;

    // Fetch item comments with item details
    const { data: itemComments, error: itemError } = await supabase
      .from('item_comments')
      .select('*, item:items(id, name)')
      .eq('wheel_id', wheelId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (itemError) throw itemError;

    // Fetch profiles for item comments
    if (itemComments && itemComments.length > 0) {
      const userIds = [...new Set(itemComments.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      itemComments.forEach(comment => {
        comment.user_profile = profilesMap.get(comment.user_id) || null;
      });
    }

    return { 
      data: {
        wheelComments: wheelComments || [],
        itemComments: itemComments || []
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching all wheel comments:', error);
    return { data: null, error };
  }
}

export default {
  getWheelComments,
  createWheelComment,
  updateWheelComment,
  deleteWheelComment,
  getWheelCommentCount,
  subscribeToWheelComments,
  getAllWheelComments,
};
