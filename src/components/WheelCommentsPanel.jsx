import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, MessageSquare, Activity, Filter, Clock } from 'lucide-react';
import MentionInput from './MentionInput';
import { useTeamMembers } from '../hooks/useTeamMembers';
import {
  getWheelComments,
  createWheelComment,
  deleteWheelComment,
  subscribeToWheelComments,
  getAllWheelComments,
} from '../services/wheelCommentService';
import { createComment } from '../services/commentService';
import { showConfirmDialog } from '../utils/dialogs';

/**
 * Parse and render comment content with styled mentions
 * Format: @[Display Name](userId) → Display Name as styled text
 */
function renderCommentContent(content) {
  if (!content) return '';
  
  // Replace @[Display Name](userId) with just the Display Name in a styled span
  const mentionPattern = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/gi;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = mentionPattern.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    
    // Add styled mention (just the display name)
    const displayName = match[1];
    parts.push(
      <span key={match.index} className="font-medium text-blue-600 bg-blue-50 px-1 rounded">
        @{displayName}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : content;
}

/**
 * WheelCommentsPanel - Unified view of all comments on a wheel
 * Shows general wheel comments + item comments grouped by activity
 */
export default function WheelCommentsPanel({ wheel, wheelStructure, onClose, onNavigateToItem }) {
  const { t } = useTranslation('notifications');
  const [wheelComments, setWheelComments] = useState([]);
  const [itemComments, setItemComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'wheel' | 'items'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'
  const [selectedActivityId, setSelectedActivityId] = useState(null);

  const { teamMembers, loading: loadingMembers } = useTeamMembers(wheel, null);
  
  // Ensure teamMembers is always an array
  const safeTeamMembers = Array.isArray(teamMembers) ? teamMembers : [];

  // Load all comments
  useEffect(() => {
    loadComments();
  }, [wheel?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!wheel?.id) return;

    const subscription = subscribeToWheelComments(wheel.id, () => {
      loadComments();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [wheel?.id]);

  const loadComments = async () => {
    if (!wheel?.id) return;
    setLoading(true);

    try {
      const { data, error } = await getAllWheelComments(wheel.id);
      if (error) throw error;

      setWheelComments(data.wheelComments || []);
      setItemComments(data.itemComments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await createWheelComment({
        wheelId: wheel.id,
        content: newComment,
      });

      if (error) throw error;

      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error creating comment:', error);
      alert(t('wheelComments.errorCreatingComment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = await showConfirmDialog({
      title: t('wheelComments.confirmDeleteComment'),
      message: '',
      confirmText: t('comments.delete'),
      cancelText: t('comments.cancel'),
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });

    if (!confirmed) return;

    try {
      const { success, error } = await deleteWheelComment(commentId);
      if (error) throw error;
      loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(t('wheelComments.errorDeletingComment'));
    }
  };

  const handleReplyToComment = async (parentCommentId, content) => {
    try {
      const { data, error } = await createWheelComment({
        wheelId: wheel.id,
        content,
        parentCommentId,
      });

      if (error) throw error;
      loadComments();
    } catch (error) {
      console.error('Error creating reply:', error);
      throw error; // Re-throw to let CommentItem handle it
    }
  };

  const handleReplyToItemComment = async (itemId, parentCommentId, content) => {
    try {
      const { data, error } = await createComment({
        itemId,
        wheelId: wheel.id,
        content,
        parentCommentId,
      });

      if (error) throw error;
      loadComments();
    } catch (error) {
      console.error('Error creating item comment reply:', error);
      throw error;
    }
  };

  // Group item comments by activity
  const itemCommentsByActivity = useMemo(() => {
    const grouped = {};
    itemComments.forEach(comment => {
      if (!comment.item) return;
      
      const item = wheelStructure?.items?.find(i => i.id === comment.item_id);
      if (!item) return;

      const activityGroup = wheelStructure?.activityGroups?.find(a => a.id === item.activityId);
      if (!activityGroup) return;

      if (!grouped[activityGroup.id]) {
        grouped[activityGroup.id] = {
          activityGroup,
          items: {},
        };
      }

      if (!grouped[activityGroup.id].items[comment.item.id]) {
        grouped[activityGroup.id].items[comment.item.id] = {
          item: comment.item,
          itemData: item,
          comments: [],
        };
      }

      grouped[activityGroup.id].items[comment.item.id].comments.push(comment);
    });

    return grouped;
  }, [itemComments, wheelStructure]);

  // Filter and sort comments
  const filteredWheelComments = useMemo(() => {
    let comments = [...wheelComments];
    
    if (sortBy === 'oldest') {
      comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return comments;
  }, [wheelComments, sortBy]);

  const filteredItemCommentsByActivity = useMemo(() => {
    if (selectedActivityId) {
      return itemCommentsByActivity[selectedActivityId] 
        ? { [selectedActivityId]: itemCommentsByActivity[selectedActivityId] }
        : {};
    }
    return itemCommentsByActivity;
  }, [itemCommentsByActivity, selectedActivityId]);

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return t('wheelComments.justNow');
    if (diffInSeconds < 3600) return t('wheelComments.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('wheelComments.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    return t('wheelComments.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
  };

  const showWheelComments = filter === 'all' || filter === 'wheel';
  const showItemComments = filter === 'all' || filter === 'items';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <div>
            <h2 className="text-xl font-semibold">{t('wheelComments.allComments')}</h2>
            <p className="text-sm text-gray-500">
              {wheel?.title || t('wheelComments.untitled')} - {wheel?.year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50 flex items-center gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{t('wheelComments.filter')}:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="all">{t('wheelComments.showAll')}</option>
              <option value="wheel">{t('wheelComments.wheelCommentsOnly')}</option>
              <option value="items">{t('wheelComments.itemCommentsOnly')}</option>
            </select>
          </div>

          {showItemComments && (
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{t('wheelComments.activity')}:</span>
              <select
                value={selectedActivityId || ''}
                onChange={(e) => setSelectedActivityId(e.target.value || null)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="">{t('wheelComments.allActivities')}</option>
                {wheelStructure?.activityGroups?.map(activity => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{t('wheelComments.sort')}:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="newest">{t('wheelComments.newestFirst')}</option>
              <option value="oldest">{t('wheelComments.oldestFirst')}</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">{t('wheelComments.loading')}...</div>
          ) : (
            <>
              {/* Wheel Comments Section */}
              {showWheelComments && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    {t('wheelComments.generalComments')}
                    <span className="text-sm font-normal text-gray-500">
                      ({filteredWheelComments.length})
                    </span>
                  </h3>

                  {filteredWheelComments.length === 0 ? (
                    <p className="text-gray-500 text-sm italic py-4">
                      {t('wheelComments.noGeneralComments')}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredWheelComments.map(comment => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          onDelete={handleDeleteComment}
                          onReply={handleReplyToComment}
                          formatRelativeTime={formatRelativeTime}
                          t={t}
                          teamMembers={safeTeamMembers}
                          wheelId={wheel.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Item Comments Section */}
              {showItemComments && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    {t('wheelComments.activityComments')}
                    <span className="text-sm font-normal text-gray-500">
                      ({itemComments.length})
                    </span>
                  </h3>

                  {Object.keys(filteredItemCommentsByActivity).length === 0 ? (
                    <p className="text-gray-500 text-sm italic py-4">
                      {t('wheelComments.noActivityComments')}
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(filteredItemCommentsByActivity).map(([activityId, { activityGroup, items }]) => (
                        <div key={activityId} className="border border-gray-200 rounded-sm p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: activityGroup.color }}
                            />
                            <h4 className="font-medium">{activityGroup.name}</h4>
                          </div>

                          <div className="space-y-4 pl-6">
                            {Object.entries(items).map(([itemId, { item, itemData, comments }]) => (
                              <div key={itemId} className="border-l-2 border-gray-200 pl-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">{item.name}</span>
                                  {onNavigateToItem && (
                                    <button
                                      onClick={() => {
                                        onNavigateToItem(itemId);
                                        onClose(); // Close the panel so user can see the wheel
                                      }}
                                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                    >
                                      {t('wheelComments.viewItem')} →
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {comments.map(comment => (
                                    <CommentItem
                                      key={comment.id}
                                      comment={comment}
                                      onDelete={null} // Item comments managed from ItemCommentsPanel
                                      onReply={(parentCommentId, content) => 
                                        handleReplyToItemComment(itemId, parentCommentId, content)
                                      }
                                      formatRelativeTime={formatRelativeTime}
                                      t={t}
                                      small
                                      teamMembers={safeTeamMembers}
                                      wheelId={wheel.id}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Comment Section - Compact */}
        <div className="p-3 border-t bg-gray-50 flex-shrink-0">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <MentionInput
                value={newComment}
                onChange={setNewComment}
                teamMembers={safeTeamMembers}
                placeholder={t('wheelComments.addCommentPlaceholder')}
              />
            </div>
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {submitting ? t('wheelComments.posting') : t('comments.post')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CommentItem - Individual comment display with threading support
 */
function CommentItem({ 
  comment, 
  onDelete, 
  onReply,
  formatRelativeTime, 
  t, 
  small = false,
  teamMembers = [],
  wheelId = null,
  depth = 0 
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      await onReply(comment.id, replyContent);
      setReplyContent('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-2' : ''}`}>
      <div className={`bg-white border border-gray-200 rounded-sm p-3 ${small ? 'text-sm' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {comment.user_profile?.avatar_url ? (
                <img
                  src={comment.user_profile.avatar_url}
                  alt={comment.user_profile.full_name}
                  className={`rounded-full ${small ? 'w-6 h-6' : 'w-8 h-8'}`}
                />
              ) : (
                <div className={`rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium ${small ? 'w-6 h-6 text-xs' : 'w-8 h-8'}`}>
                  {comment.user_profile?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className={`font-medium ${small ? 'text-xs' : 'text-sm'}`}>
                  {comment.user_profile?.full_name || t('wheelComments.unknownUser')}
                </div>
                <div className={`text-gray-500 ${small ? 'text-xs' : 'text-xs'}`}>
                  {formatRelativeTime(comment.created_at)}
                </div>
              </div>
            </div>
            <div className={`text-gray-700 ${small ? 'text-xs' : 'text-sm'} whitespace-pre-wrap mb-2`}>
              {renderCommentContent(comment.content)}
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
              {onReply && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <MessageSquare size={14} />
                  {showReplyForm ? t('comments.cancel') : t('comments.reply')}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
                >
                  {t('comments.delete')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reply form */}
        {showReplyForm && onReply && (
          <div className="mt-3 pl-10 border-l-2 border-gray-200">
            <MentionInput
              value={replyContent}
              onChange={setReplyContent}
              teamMembers={teamMembers}
              placeholder={t('comments.replyTo', { name: comment.user_profile?.full_name || 'user' })}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || submitting}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? t('wheelComments.posting') : t('comments.post')}
              </button>
              <button
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent('');
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
              >
                {t('comments.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Render replies recursively */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onDelete={onDelete}
              onReply={onReply}
              formatRelativeTime={formatRelativeTime}
              t={t}
              small={small}
              teamMembers={teamMembers}
              wheelId={wheelId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
