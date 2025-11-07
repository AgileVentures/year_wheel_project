import { X, Edit2, Trash2, GripVertical, ExternalLink, MessageCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { showConfirmDialog } from '../utils/dialogs';
import { fetchLinkedWheelInfo } from '../services/wheelService';
import ItemCommentsPanel from './ItemCommentsPanel';
import { getCommentCount } from '../services/commentService';

function ItemTooltip({ item, organizationData, position, onEdit, onDelete, onClose, readonly = false, wheel = null }) {
  const { t, i18n } = useTranslation(['editor']);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);
  const [linkedWheelInfo, setLinkedWheelInfo] = useState(null);
  const [loadingLinkedWheel, setLoadingLinkedWheel] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'comments'
  const [commentCount, setCommentCount] = useState(0);
  const tooltipRef = useRef(null);

  const ring = item ? organizationData.rings.find(r => r.id === item.ringId) : null;
  const activity = item ? organizationData.activityGroups.find(a => a.id === item.activityId) : null;
  const label = item ? organizationData.labels.find(l => l.id === item.labelId) : null;
  const startDate = item ? new Date(item.startDate) : null;
  const endDate = item ? new Date(item.endDate) : null;

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
        width: activeTab === 'comments' ? '500px' : '320px',
        maxHeight: '80vh',
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

        {/* Tabs (only show if wheel exists - meaning this is a database wheel) */}
        {wheel && (
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
          </div>
        )}
      </div>

      {/* Content - scrollable area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'details' ? (
          <div className="p-3 space-y-2 text-xs">
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
        ) : (
          // Comments tab
          wheel && <div className="p-3 h-full"><ItemCommentsPanel item={item} wheel={wheel} /></div>
        )}
      </div>

      {/* Actions - only show in edit mode and details tab */}
      {!readonly && activeTab === 'details' && (
        <div className="flex gap-2 p-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={() => {
              onEdit(item);
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
          >
            <Edit2 size={12} />
            <span>{t('editor:itemTooltip.edit')}</span>
          </button>
          <button
            onClick={async () => {
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
            className="px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ItemTooltip;
