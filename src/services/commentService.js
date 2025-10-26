/**
 * Comment Service
 * Handles all comment-related operations including CRUD, mention extraction, and notifications
 */

import { supabase } from '../lib/supabase';

/**
 * @typedef {Object} Comment
 * @property {string} id - Comment ID
 * @property {string} item_id - Item ID this comment belongs to
 * @property {string} wheel_id - Wheel ID
 * @property {string} user_id - User ID who created the comment
 * @property {string} content - Comment content (may include @mentions)
 * @property {string|null} parent_comment_id - Parent comment ID for threading
 * @property {string[]} mentioned_users - Array of user IDs mentioned in this comment
 * @property {string} created_at - Timestamp when comment was created
 * @property {string} updated_at - Timestamp when comment was last updated
 * @property {string|null} deleted_at - Timestamp when comment was soft-deleted
 * @property {Object} user_profile - Profile of the comment author
 * @property {Comment[]} [replies] - Child comments (if loaded)
 */

/**
 * Extract user IDs from @mentions in text
 * Format: @[Display Name](userId)
 * @param {string} content - Comment content with mentions
 * @returns {string[]} Array of mentioned user IDs
 */
export function extractMentionedUserIds(content) {
  if (!content) return [];
  
  // Match format: @[Display Name](userId) or @userId
  const mentionPattern = /@\[([^\]]+)\]\(([a-f0-9-]+)\)|@([a-f0-9-]+)/gi;
  const matches = [...content.matchAll(mentionPattern)];
  
  return matches
    .map(match => match[2] || match[3]) // Get userId from either format
    .filter(Boolean)
    .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
}

/**
 * Get all comments for an item
 * @param {string} itemId - Item ID
 * @param {Object} options - Query options
 * @param {boolean} [options.includeDeleted=false] - Include soft-deleted comments
 * @param {boolean} [options.threaded=true] - Return comments in threaded structure
 * @returns {Promise<{data: Comment[]|null, error: Error|null}>}
 */
export async function getComments(itemId, { includeDeleted = false, threaded = true } = {}) {
  try {
    let query = supabase
      .from('item_comments')
      .select('*')
      .eq('item_id', itemId)
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
    console.error('Error fetching comments:', error);
    return { data: null, error };
  }
}

/**
 * Create a new comment
 * @param {Object} commentData - Comment data
 * @param {string} commentData.itemId - Item ID
 * @param {string} commentData.wheelId - Wheel ID
 * @param {string} commentData.content - Comment content
 * @param {string} [commentData.parentCommentId] - Parent comment ID for replies
 * @returns {Promise<{data: Comment|null, error: Error|null}>}
 */
export async function createComment({ itemId, wheelId, content, parentCommentId = null }) {
  try {
    // Extract mentioned user IDs from content
    const mentionedUsers = extractMentionedUserIds(content);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('item_comments')
      .insert({
        item_id: itemId,
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
    console.error('Error creating comment:', error);
    return { data: null, error };
  }
}

/**
 * Update a comment
 * @param {string} commentId - Comment ID
 * @param {string} content - New comment content
 * @returns {Promise<{data: Comment|null, error: Error|null}>}
 */
export async function updateComment(commentId, content) {
  try {
    // Extract updated mentions
    const mentionedUsers = extractMentionedUserIds(content);

    const { data, error } = await supabase
      .from('item_comments')
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
    console.error('Error updating comment:', error);
    return { data: null, error };
  }
}

/**
 * Soft-delete a comment
 * @param {string} commentId - Comment ID
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteComment(commentId) {
  try {
    const { data, error } = await supabase.rpc('soft_delete_comment', {
      p_comment_id: commentId,
    });

    if (error) throw error;
    return { success: data, error: null };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error };
  }
}

/**
 * Get comment count for an item
 * @param {string} itemId - Item ID
 * @returns {Promise<{data: number|null, error: Error|null}>}
 */
export async function getCommentCount(itemId) {
  try {
    const { count, error } = await supabase
      .from('item_comments')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId)
      .is('deleted_at', null);

    if (error) throw error;
    return { data: count, error: null };
  } catch (error) {
    console.error('Error fetching comment count:', error);
    return { data: null, error };
  }
}

/**
 * Get a single comment by ID
 * @param {string} commentId - Comment ID
 * @returns {Promise<{data: Comment|null, error: Error|null}>}
 */
export async function getCommentById(commentId) {
  try {
    const { data, error } = await supabase
      .from('item_comments')
      .select('*')
      .eq('id', commentId)
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
    console.error('Error fetching comment:', error);
    return { data: null, error };
  }
}

/**
 * Subscribe to real-time comments for an item
 * @param {string} itemId - Item ID
 * @param {Function} callback - Callback function to handle comment changes
 * @returns {Object} Supabase realtime subscription
 */
export function subscribeToComments(itemId, callback) {
  return supabase
    .channel(`comments:${itemId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'item_comments',
        filter: `item_id=eq.${itemId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Format a mention for display
 * Converts @[Display Name](userId) to a clickable mention
 * @param {string} content - Comment content with mentions
 * @param {Function} onMentionClick - Optional callback when mention is clicked
 * @returns {string} Formatted content (HTML or React elements)
 */
export function formatMentions(content, onMentionClick = null) {
  if (!content) return content;
  
  // This is a simple string replacement for HTML rendering
  // For React components, you'd return JSX with clickable elements
  const mentionPattern = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/gi;
  
  return content.replace(mentionPattern, (match, displayName, userId) => {
    return `<span class="mention" data-user-id="${userId}">@${displayName}</span>`;
  });
}

export default {
  extractMentionedUserIds,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getCommentCount,
  getCommentById,
  subscribeToComments,
  formatMentions,
};
