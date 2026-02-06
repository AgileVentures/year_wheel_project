import { useState, useEffect } from 'react';
import { X, Calendar, Tag, Circle, MessageSquare, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import { ItemCommentsPanel } from '../ItemCommentsPanel';
import RemindersPanel from '../RemindersPanel';
import { getCommentCount } from '../../services/commentService';
import { getRemindersCount } from '../../services/reminderService';

const KanbanItemDialog = ({ item, wheelStructure, wheel, onClose, onUpdate, onDelete }) => {
  const { t, i18n } = useTranslation(['editor']);
  const [activeTab, setActiveTab] = useState('details');
  const [commentCount, setCommentCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);
  
  // Editable fields
  const [name, setName] = useState(item.name || '');
  const [description, setDescription] = useState(item.description || '');
  const [startDate, setStartDate] = useState(item.startDate || '');
  const [endDate, setEndDate] = useState(item.endDate || '');
  const [ringId, setRingId] = useState(item.ringId || '');
  const [activityId, setActivityId] = useState(item.activityId || '');
  const [labelId, setLabelId] = useState(item.labelId || null);
  
  const { rings = [], activityGroups = [], labels = [] } = wheelStructure || {};
  
  // Load comment count
  useEffect(() => {
    const loadCommentCount = async () => {
      if (item?.id) {
        const { data } = await getCommentCount(item.id);
        if (data !== null) {
          setCommentCount(data);
        }
      }
    };
    loadCommentCount();
  }, [item?.id]);

  // Load reminder count
  useEffect(() => {
    const loadReminderCount = async () => {
      if (item?.id) {
        const { data } = await getRemindersCount(item.id);
        if (data !== null) {
          setReminderCount(data);
        }
      }
    };
    loadReminderCount();
  }, [item?.id]);
  
  const handleSave = () => {
    const updatedItem = {
      ...item,
      name,
      description,
      startDate,
      endDate,
      ringId,
      activityId,
      labelId
    };
    onUpdate(updatedItem);
  };
  
  const handleDelete = async () => {
    if (window.confirm(t('editor:deleteItemConfirm', 'Are you sure you want to delete this item?'))) {
      onDelete(item);
    }
  };
  
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd');
  };
  
  const ring = rings.find(r => r.id === ringId);
  const activity = activityGroups.find(a => a.id === activityId);
  const label = labels.find(l => l.id === labelId);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-sm shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{t('editor:editItem', 'Edit Item')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('details')}
          >
            {t('editor:details', 'Details')}
          </button>
          <button
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'comments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('comments')}
          >
            <div className="flex items-center gap-2">
              {t('editor:comments', 'Comments')}
              {commentCount > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {commentCount}
                </span>
              )}
            </div>
          </button>
          <button
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'reminders'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('reminders')}
          >
            <div className="flex items-center gap-2">
              <Bell size={16} />
              {t('editor:reminders.title')}
              {reminderCount > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {reminderCount}
                </span>
              )}
            </div>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' ? (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('editor:name', 'Name')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('editor:itemName', 'Item name')}
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('editor:description', 'Description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('editor:itemDescription', 'Item description')}
                />
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={16} className="inline mr-1" />
                    {t('editor:startDate', 'Start Date')}
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(startDate)}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={16} className="inline mr-1" />
                    {t('editor:endDate', 'End Date')}
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(endDate)}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Ring */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Circle size={16} className="inline mr-1" />
                  {t('editor:ring', 'Ring')}
                </label>
                <select
                  value={ringId}
                  onChange={(e) => setRingId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('editor:selectRing', 'Select ring...')}</option>
                  {rings.filter(r => r.visible).map(ring => (
                    <option key={ring.id} value={ring.id}>
                      {ring.name} ({ring.type === 'inner' ? t('editor:inner', 'Inner') : t('editor:outer', 'Outer')})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Activity Group */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('editor:activityGroup', 'Activity Group')}
                </label>
                <select
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('editor:selectActivityGroup', 'Select activity group...')}</option>
                  {activityGroups.filter(ag => ag.visible).map(ag => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag size={16} className="inline mr-1" />
                  {t('editor:label', 'Label')}
                </label>
                <select
                  value={labelId || ''}
                  onChange={(e) => setLabelId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('common.unlabeled', 'Unlabeled')}</option>
                  {labels.filter(l => l.visible).map(label => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeTab === 'comments' ? (
            <ItemCommentsPanel item={item} wheel={wheel} />
          ) : activeTab === 'reminders' ? (
            <RemindersPanel item={item} wheel={wheel} />
          ) : null}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-sm transition-colors font-medium"
          >
            {t('editor:delete', 'Delete')}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm transition-colors font-medium"
            >
              {t('editor:cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-sm transition-colors font-medium"
            >
              {t('editor:save', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanItemDialog;
