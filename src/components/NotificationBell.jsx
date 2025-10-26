/**
 * NotificationBell Component
 * Displays notification icon with unread count badge and dropdown list
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(timestamp, t) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('common.justNow', 'Just now');
  if (diffMins < 60) return t('common.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('common.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('common.daysAgo', { count: diffDays });
  
  return then.toLocaleDateString();
}

/**
 * Single notification item
 */
function NotificationItem({ notification, onMarkAsRead, onDelete, onNavigate }) {
  const { t } = useTranslation('notifications');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = async () => {
    // Mark as read if not already
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }

    // Navigate to context if action URL exists
    if (notification.action_url) {
      onNavigate(notification.action_url);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    await onDelete(notification.id);
  };

  const handleMarkAsRead = async (e) => {
    e.stopPropagation();
    await onMarkAsRead(notification.id);
  };

  return (
    <div
      className={`group px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 ${
        !notification.read ? 'bg-blue-50' : ''
      } ${isDeleting ? 'opacity-50' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Notification title */}
          <div className="flex items-center gap-2 mb-1">
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
            )}
            <p className="text-sm font-medium text-gray-900 truncate">
              {notification.title}
            </p>
          </div>

          {/* Notification message */}
          {notification.message && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-1">
              {notification.message}
            </p>
          )}

          {/* Context info */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {notification.triggered_by_profile && (
              <span>{notification.triggered_by_profile.full_name || notification.triggered_by_profile.email}</span>
            )}
            <span>•</span>
            <span>{formatRelativeTime(notification.created_at, t)}</span>
            {notification.wheel?.title && (
              <>
                <span>•</span>
                <span className="truncate">{notification.wheel.title}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.read && (
            <button
              onClick={handleMarkAsRead}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={t('notifications.markRead', 'Mark as read')}
            >
              <Check size={14} className="text-gray-600" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title={t('notifications.delete', 'Delete')}
          >
            <X size={14} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main NotificationBell component
 */
export function NotificationBell() {
  const { t } = useTranslation('notifications');
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useRealtimeNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleNavigate = (url) => {
    setIsOpen(false);
    navigate(url);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon with badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm transition-colors"
        aria-label={t('notifications.title')}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-sm shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('notifications.title')}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <CheckCheck size={14} />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            )}

            {error && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-red-600">{t('notifications.error')}</p>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="px-4 py-12 text-center">
                <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">{t('notifications.noNotifications')}</p>
              </div>
            )}

            {!loading && !error && notifications.length > 0 && (
              <div>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Could navigate to a dedicated notifications page in the future
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('notifications.viewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
