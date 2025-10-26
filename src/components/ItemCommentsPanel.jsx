/**
 * ItemCommentsPanel Component
 * Threaded comment section with @mention support for wheel items
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, Edit2, Trash2, MoreVertical } from 'lucide-react';
import MentionInput from './MentionInput';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useAuth } from '../hooks/useAuth';
import { showConfirmDialog } from '../utils/dialogs';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  subscribeToComments,
} from '../services/commentService';

/**
 * Format relative time
 */
function formatRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return then.toLocaleDateString();
}

/**
 * Single comment component (recursive for threading)
 */
function CommentItem({ comment, onReply, onEdit, onDelete, currentUserId, depth = 0 }) {
  const { t } = useTranslation('notifications');
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const isOwner = comment.user_id === currentUserId;
  const hasReplies = comment.replies && comment.replies.length > 0;

  // Parse mentions in content to display as highlighted
  const renderContent = (content) => {
    if (!content) return null;
    
    // Replace @[Display Name](userId) with styled spans
    const mentionPattern = /@\[([^\]]+)\]\([a-f0-9-]+\)/gi;
    const parts = content.split(mentionPattern);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mention display name
        return (
          <span key={index} className="bg-blue-100 text-blue-700 px-1 rounded font-medium">
            @{part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.user_profile?.avatar_url ? (
            <img
              src={comment.user_profile.avatar_url}
              alt={comment.user_profile.full_name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium text-sm">
              {(comment.user_profile?.full_name?.[0] || comment.user_profile?.email?.[0] || '?').toUpperCase()}
            </div>
          )}
        </div>

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              {comment.user_profile?.full_name || comment.user_profile?.email}
            </span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(comment.created_at)}
            </span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-gray-400 italic">
                ({t('comments.edited')})
              </span>
            )}
          </div>

          {/* Content */}
          <div className="text-sm text-gray-700 mb-2">
            {renderContent(comment.content)}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => onReply(comment)}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              {t('comments.reply')}
            </button>
            
            {isOwner && (
              <>
                <button
                  onClick={() => onEdit(comment)}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  {t('comments.edit')}
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  {t('comments.delete')}
                </button>
              </>
            )}
          </div>

          {/* Replies */}
          {hasReplies && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  currentUserId={currentUserId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main ItemCommentsPanel component
 */
export function ItemCommentsPanel({ item, wheel }) {
  const { t } = useTranslation('notifications');
  const { user } = useAuth();
  const { teamMembers } = useTeamMembers(wheel, user);
  
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [item.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = subscribeToComments(item.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        loadComments(); // Reload to get proper threading
      } else if (payload.eventType === 'UPDATE') {
        setComments(prev => updateCommentInTree(prev, payload.new));
      } else if (payload.eventType === 'DELETE') {
        setComments(prev => removeCommentFromTree(prev, payload.old.id));
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [item.id]);

  const loadComments = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getComments(item.id, { threaded: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setComments(data || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || submitting) return;

    setSubmitting(true);

    const { data, error: createError } = await createComment({
      itemId: item.id,
      wheelId: wheel.id,
      content: newCommentText,
      parentCommentId: replyingTo?.id || null,
    });

    if (createError) {
      console.error('Error creating comment:', createError);
      alert(t('comments.error'));
    } else {
      setNewCommentText('');
      setReplyingTo(null);
      loadComments(); // Reload to get proper threading
    }

    setSubmitting(false);
  };

  const handleEdit = (comment) => {
    setEditingComment(comment);
    setNewCommentText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setNewCommentText('');
  };

  const handleUpdateComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !editingComment || submitting) return;

    setSubmitting(true);

    const { data, error: updateError } = await updateComment(
      editingComment.id,
      newCommentText
    );

    if (updateError) {
      console.error('Error updating comment:', updateError);
      alert(t('comments.error'));
    } else {
      setEditingComment(null);
      setNewCommentText('');
      loadComments();
    }

    setSubmitting(false);
  };

  const handleDelete = async (commentId) => {
    const confirmed = await showConfirmDialog({
      title: t('comments.deleteTitle', 'Ta bort kommentar'),
      message: t('comments.deleteConfirm'),
      confirmText: t('comments.delete', 'Ta bort'),
      cancelText: t('comments.cancel', 'Avbryt'),
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });

    if (!confirmed) return;

    const { success, error: deleteError } = await deleteComment(commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      // Show error toast instead of alert
      const event = new CustomEvent('showToast', {
        detail: { 
          message: t('comments.error'), 
          type: 'error' 
        }
      });
      window.dispatchEvent(event);
    } else {
      loadComments();
    }
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    setEditingComment(null);
  };

  // Helper functions for updating comment tree
  const updateCommentInTree = (comments, updatedComment) => {
    return comments.map(comment => {
      if (comment.id === updatedComment.id) {
        return { ...comment, ...updatedComment };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, updatedComment),
        };
      }
      return comment;
    });
  };

  const removeCommentFromTree = (comments, commentId) => {
    return comments
      .filter(comment => comment.id !== commentId)
      .map(comment => ({
        ...comment,
        replies: comment.replies ? removeCommentFromTree(comment.replies, commentId) : [],
      }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b">
        <MessageCircle size={20} className="text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          {t('comments.title')}
        </h3>
        <span className="text-sm text-gray-500">
          ({comments.length})
        </span>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto mb-4 min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-red-600">{t('comments.error')}</p>
          </div>
        )}

        {!loading && !error && comments.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">{t('comments.noComments')}</p>
          </div>
        )}

        {!loading && !error && comments.length > 0 && (
          <div className="space-y-1">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t pt-4">
        {replyingTo && (
          <div className="mb-2 text-sm text-gray-600 flex items-center justify-between bg-gray-50 p-2 rounded">
            <span>
              {t('comments.replyTo', { name: replyingTo.user_profile?.full_name || replyingTo.user_profile?.email })}
            </span>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        )}

        {editingComment && (
          <div className="mb-2 text-sm text-gray-600 flex items-center justify-between bg-blue-50 p-2 rounded">
            <span>{t('comments.edit')}</span>
            <button
              onClick={handleCancelEdit}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={editingComment ? handleUpdateComment : handleSubmit}>
          <MentionInput
            value={newCommentText}
            onChange={setNewCommentText}
            teamMembers={teamMembers}
            placeholder={t('comments.placeholder')}
            multiLine={true}
            rows={3}
          />
          
          <div className="flex items-center justify-end gap-2 mt-2">
            {(editingComment || replyingTo) && (
              <button
                type="button"
                onClick={editingComment ? handleCancelEdit : () => setReplyingTo(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                disabled={submitting}
              >
                {t('comments.cancel')}
              </button>
            )}
            <button
              type="submit"
              disabled={!newCommentText.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {editingComment ? t('comments.save') : t('comments.post')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ItemCommentsPanel;
