import { X, Edit2, Trash2, GripVertical, ExternalLink, MessageCircle, Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { showConfirmDialog, showToast } from '../utils/dialogs';
import { fetchLinkedWheelInfo } from '../services/wheelService';
import ItemCommentsPanel from './ItemCommentsPanel';
import RemindersPanel from './RemindersPanel';
import { getCommentCount } from '../services/commentService';
import { getRemindersCount, updateItemStatus } from '../services/reminderService';

function ItemTooltip({ item, wheelStructure, position, onEdit, onDelete, onClose, onOpenItem, readonly = false, wheel = null }) {
  const { t, i18n } = useTranslation(['editor']);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);
  const [linkedWheelInfo, setLinkedWheelInfo] = useState(null);
  const [loadingLinkedWheel, setLoadingLinkedWheel] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'comments', or 'reminders'
  const [commentCount, setCommentCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);
  const [itemStatus, setItemStatus] = useState(item?.status || 'planned');
  const tooltipRef = useRef(null);

  // Status options for activity lifecycle
  const STATUS_OPTIONS = [
    { value: 'planned', label: t('editor:reminders.statusOptions.planned', 'Planerad'), color: 'bg-gray-100 text-gray-700' },
    { value: 'not_started', label: t('editor:reminders.statusOptions.not_started', 'Ej påbörjad'), color: 'bg-yellow-100 text-yellow-700' },
    { value: 'started', label: t('editor:reminders.statusOptions.started', 'Påbörjad'), color: 'bg-blue-100 text-blue-700' },
    { value: 'in_progress', label: t('editor:reminders.statusOptions.in_progress', 'Pågående'), color: 'bg-indigo-100 text-indigo-700' },
    { value: 'done', label: t('editor:reminders.statusOptions.done', 'Klar'), color: 'bg-green-100 text-green-700' }
  ];

  const ring = item ? wheelStructure.rings.find(r => r.id === item.ringId) : null;
  const activity = item ? wheelStructure.activityGroups.find(a => a.id === item.activityId) : null;
  const label = item ? wheelStructure.labels.find(l => l.id === item.labelId) : null;
  const startDate = item ? new Date(item.startDate) : null;
  const endDate = item ? new Date(item.endDate) : null;
  const isCluster = item?.isCluster || false;
  const clusterItems = isCluster ? (item.items || []) : [];

  // Fetch linked wheel info if item has linkedWheelId
  useEffect(() => {
    const loadLinkedWheelInfo = async () => {
      if (!item || !item.linkedWheelId) {
        setLinkedWheelInfo(null);
        setLoadingLinkedWheel(false);
        return;
      }

      setLoadingLinkedWheel(true);
      try {
        const wheelInfo = await fetchLinkedWheelInfo(item.linkedWheelId);
        setLinkedWheelInfo(wheelInfo);
      } catch (error) {
        console.error('Error loading linked wheel info:', error);
        setLinkedWheelInfo(null);
      } finally {
        setLoadingLinkedWheel(false);
      }
    };

    loadLinkedWheelInfo();
  }, [item]);

  // Fetch comment count
  useEffect(() => {
    const loadCommentCount = async () => {
      if (!item) {
        setCommentCount(0);
        return;
      }

      try {
        // Only fetch comments for valid UUIDs (not temporary/week IDs)
        const isValidUUID = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
        if (isValidUUID && wheel) {
          const { data } = await getCommentCount(item.id);
          if (data !== null) {
            setCommentCount(data);
          }
        } else {
          setCommentCount(0);
        }
      } catch (error) {
        console.error('Error loading comment count:', error);
        setCommentCount(0);
      }
    };
    loadCommentCount();
  }, [item, wheel]);

  // Fetch reminder count
  useEffect(() => {
    const loadReminderCount = async () => {
      if (!item) {
        setReminderCount(0);
        return;
      }

      try {
        const isValidUUID = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
        if (isValidUUID && wheel) {
          const { data } = await getRemindersCount(item.id);
          if (data !== null) {
            setReminderCount(data);
          }
        } else {
          setReminderCount(0);
        }
      } catch (error) {
        console.error('Error loading reminder count:', error);
        setReminderCount(0);
      }
    };
    loadReminderCount();
  }, [item, wheel]);

  // Update position when prop changes
  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  // Constrain position to viewport boundaries
  const constrainToViewport = (pos) => {
    if (!tooltipRef.current) return pos;
    
    const rect = tooltipRef.current.getBoundingClientRect();
    const margin = 10;
    
    return {
      x: Math.max(margin, Math.min(pos.x, window.innerWidth - rect.width - margin)),
      y: Math.max(margin, Math.min(pos.y, window.innerHeight - rect.height - margin))
    };
  };

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newPos = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        };
        setCurrentPosition(constrainToViewport(newPos));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleDragStart = (e) => {
    if (tooltipRef.current && e.target.closest('.drag-handle')) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  // Handle activity status change
  const handleStatusChange = async (newStatus) => {
    const { data, error } = await updateItemStatus(item.id, newStatus);
    
    if (error) {
      showToast(t('editor:reminders.toasts.statusUpdateError', 'Kunde inte uppdatera status'), 'error');
    } else {
      setItemStatus(newStatus);
      showToast(t('editor:reminders.toasts.statusUpdateSuccess', 'Status uppdaterad'), 'success');
    }
  };

  if (!item) {
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      className="fixed bg-white rounded-sm shadow-xl border border-gray-200 z-50"
      style={{
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        width: '600px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseDown={handleDragStart}
    >
      {/* Header with drag handle and tabs */}
      <div className="flex-shrink-0">
        <div className="flex items-start justify-between p-3 border-b border-gray-200">
          <button
            className="drag-handle p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing mr-2"
            title={t('editor:itemTooltip.dragToMove')}
          >
            <GripVertical size={16} className="text-gray-400" />
          </button>
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: activity?.color || '#D1D5DB' }}
              />
              <h3 className="text-sm font-semibold text-gray-900 break-words">
                {item.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs (only show if wheel exists and not a cluster) */}
        {wheel && !isCluster && (
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('editor:itemTooltip.details', 'Details')}
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'comments'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <MessageCircle size={14} />
              <span>{t('editor:itemTooltip.comments', 'Comments')}</span>
              {commentCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                  {commentCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'reminders'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Bell size={14} />
              <span>{t('editor:itemTooltip.reminders', 'Reminders')}</span>
              {reminderCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                  {reminderCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Content - scrollable area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'details' ? (
          <div className="p-3 space-y-2 text-xs">
            {isCluster && (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-900 font-medium mb-2">
                  {t('editor:itemTooltip.clusterInfo', { count: clusterItems.length })}
                </p>
                <ul className="space-y-1.5 ml-2">
                  {clusterItems.map((clusterItem, index) => (
                    <li key={index} className="text-xs text-blue-800 flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span 
                        className="cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenItem && clusterItem.id) {
                            onOpenItem(clusterItem.id);
                          }
                        }}
                      >
                        {clusterItem.name}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-blue-700 mt-2 italic">
                  {t('editor:itemTooltip.clusterZoomHint')}
                </p>
              </div>
            )}
            
            {/* Activity Status */}
            {!isCluster && !readonly && (
              <div className="mb-3 pb-3 border-b border-gray-200">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {t('editor:reminders.status', 'Status')}
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {STATUS_OPTIONS.map(status => (
                    <button
                      key={status.value}
                      onClick={() => handleStatusChange(status.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        itemStatus === status.value
                          ? status.color + ' ring-1 ring-offset-1 ring-gray-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t('editor:itemTooltip.ring')}:</span>
              <span className="text-gray-900 font-medium">{ring?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t('editor:itemTooltip.activity')}:</span>
              <span className="text-gray-900 font-medium">{activity?.name || 'N/A'}</span>
            </div>
            {label && label.id !== 'no-label' && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t('editor:itemTooltip.label')}:</span>
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-gray-900 font-medium">{label.name}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t('editor:itemTooltip.start')}:</span>
              <span className="text-gray-900 font-medium">
                {startDate.toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'sv-SE')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t('editor:itemTooltip.end')}:</span>
              <span className="text-gray-900 font-medium">
                {endDate.toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'sv-SE')}
              </span>
            </div>
            {item.time && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t('editor:itemTooltip.time')}:</span>
                <span className="text-gray-900 font-medium">{item.time}</span>
              </div>
            )}
            {item.description && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-500 block mb-1">{t('editor:itemTooltip.description')}:</span>
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}
            
            {/* Linked Wheel Section */}
            {item.linkedWheelId && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-500 block mb-1.5">{t('editor:itemTooltip.linkedWheel')}:</span>
                {loadingLinkedWheel ? (
                  <div className="text-xs text-gray-500 italic">{t('editor:itemTooltip.loadingLinkedWheel')}</div>
                ) : linkedWheelInfo ? (
                  <button
                    onClick={() => {
                      const url = `/wheel/${item.linkedWheelId}?from=${window.location.pathname.split('/')[2]}`;
                      window.open(url, '_blank');
                    }}
                    className="w-full flex items-center justify-between gap-2 p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors group"
                  >
                    <div className="flex-1 text-left">
                      <div className="text-xs font-medium text-blue-900">
                        {linkedWheelInfo.title}
                      </div>
                      <div className="text-xs text-blue-700">
                        {linkedWheelInfo.year}
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-blue-600 group-hover:text-blue-800 flex-shrink-0" />
                  </button>
                ) : (
                  <div className="text-xs text-gray-500 italic">{t('editor:itemTooltip.linkedWheelNotFound')}</div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'comments' ? (
          // Comments tab
          wheel && <div className="p-3 h-full"><ItemCommentsPanel item={item} wheel={wheel} /></div>
        ) : activeTab === 'reminders' ? (
          // Reminders tab
          wheel && <div className="p-3 h-full"><RemindersPanel item={item} wheel={wheel} /></div>
        ) : null}
      </div>

      {/* Actions - only show in edit mode and details tab */}
      {!readonly && activeTab === 'details' && (
        <div className="flex flex-col gap-2 p-3 border-t border-gray-200 flex-shrink-0">
          {isCluster && (
            <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 text-center">
              {t('editor:itemTooltip.clusterEditHint', 'Zoom in to edit individual activities')}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!isCluster) {
                  onEdit(item);
                  onClose();
                }
              }}
              disabled={isCluster}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded transition-colors text-xs font-medium ${
                isCluster
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Edit2 size={12} />
              <span>{t('editor:itemTooltip.edit')}</span>
            </button>
            <button
              onClick={async () => {
                if (isCluster) return;
                const confirmed = await showConfirmDialog({
                  title: t('editor:itemTooltip.deleteTitle', { defaultValue: 'Radera aktivitet' }),
                  message: t('editor:itemTooltip.deleteConfirm', { name: item.name }),
                  confirmText: t('editor:itemTooltip.deleteButton', { defaultValue: 'Radera' }),
                  cancelText: t('editor:itemTooltip.cancel', { defaultValue: 'Avbryt' }),
                  confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
                });
                if (confirmed) {
                  onDelete(item.id);
                  onClose();
                }
              }}
              disabled={isCluster}
              className={`px-3 py-1.5 rounded transition-colors ${
                isCluster
                  ? 'border border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border border-red-300 text-red-600 hover:bg-red-50'
              }`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemTooltip;
