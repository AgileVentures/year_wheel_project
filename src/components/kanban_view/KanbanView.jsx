import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import KanbanItemDialog from './KanbanItemDialog';

const KanbanView = ({
  wheelStructure,
  wheel,
  pages = [],
  onUpdateItem,
  onDeleteItem,
  currentWheelId,
}) => {
  const { t } = useTranslation();
  
  const { rings = [], activityGroups = [], labels = [] } = wheelStructure || {};
  const items = wheelStructure?.items || [];
  
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [yearFilter, setYearFilter] = useState('all');
  
  // Get available years from pages
  const availableYears = useMemo(() => {
    const years = pages.map(p => parseInt(p.year, 10)).filter(y => !isNaN(y));
    return [...new Set(years)].sort((a, b) => a - b);
  }, [pages]);
  
  // Filter items by year
  const filteredItems = useMemo(() => {
    if (yearFilter === 'all') return items;
    const yearNum = parseInt(yearFilter, 10);
    return items.filter(item => {
      const itemYear = new Date(item.startDate).getFullYear();
      return itemYear === yearNum;
    });
  }, [items, yearFilter]);
  
  const itemsByLabel = useMemo(() => {
    const grouped = new Map();
    labels.forEach(l => { if (l.visible) grouped.set(l.id, []); });
    grouped.set('unlabeled', []);
    filteredItems.forEach(item => {
      const key = item.labelId || 'unlabeled';
      if (grouped.has(key)) grouped.get(key).push(item);
    });
    return grouped;
  }, [filteredItems, labels]);
  
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.currentTarget.style.opacity = '0.4';
  };
  
  const handleDragEnd = (e) => {
    setDraggedItem(null);
    e.currentTarget.style.opacity = '1';
  };
  
  const handleDrop = (e, targetLabelId) => {
    e.preventDefault();
    if (!draggedItem) return;
    const newLabelId = targetLabelId === 'unlabeled' ? null : targetLabelId;
    if (draggedItem.labelId !== newLabelId && onUpdateItem) {
      onUpdateItem({ ...draggedItem, labelId: newLabelId });
    }
    setDraggedItem(null);
  };
  
  const toggleColumn = (labelId) => {
    setCollapsedColumns(prev => ({ ...prev, [labelId]: !prev[labelId] }));
  };
  
  const getActivityGroup = (id) => activityGroups.find(ag => ag.id === id);
  const getRing = (id) => rings.find(r => r.id === id);
  
  const renderColumn = (labelId, labelName, labelColor, items) => {
    const isCollapsed = collapsedColumns[labelId];
    
    return (
      <div
        key={labelId}
        className={`flex-shrink-0 flex flex-col rounded-sm shadow-lg overflow-hidden transition-all duration-200 ${isCollapsed ? 'w-16' : 'w-80'}`}
        style={{ backgroundColor: labelColor || '#f3f4f6' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, labelId)}
      >
        <div
          className="p-4 cursor-pointer flex items-center justify-between"
          onClick={() => toggleColumn(labelId)}
        >
          {!isCollapsed && (
            <>
              <h3 className="font-bold">{labelName}</h3>
              <span className="bg-white/50 px-2 py-1 rounded text-sm">{items.length}</span>
            </>
          )}
          {isCollapsed && (
            <div className="writing-mode-vertical transform rotate-180">
              <span className="font-bold text-sm">{labelName}</span>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.map(item => {
              const ag = getActivityGroup(item.activityId);
              const ring = getRing(item.ringId);
              
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setEditingItem(item)}
                  className="bg-white rounded p-3 cursor-move shadow hover:shadow-lg"
                >
                  <div className="font-semibold text-sm mb-1">{item.name}</div>
                  {ag && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: ag.color }}></div>
                      <span>{ag.name}</span>
                    </div>
                  )}
                  {ring && <div className="text-xs text-gray-500 mt-1">{ring.name}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t('kanbanView.title', 'Kanban-vy')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('kanbanView.subtitle', 'Objekt grupperade efter etiketter')}
          </p>
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('listView.allYears', 'Alla år')}</option>
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      
      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto px-6 py-4">
        <div className="flex gap-4 h-full">
          {renderColumn('unlabeled', t('listView.unlabeled', 'Utan etikett'), '#e5e7eb', itemsByLabel.get('unlabeled') || [])}
          {labels.filter(l => l.visible).map(label => 
            renderColumn(label.id, label.name, label.color, itemsByLabel.get(label.id) || [])
          )}
        </div>
      </div>
      
      {editingItem && (
        <KanbanItemDialog
          item={editingItem}
          wheelStructure={wheelStructure}
          wheel={wheel}
          onClose={() => setEditingItem(null)}
          onUpdate={(updated) => {
            if (onUpdateItem) onUpdateItem(updated);
            setEditingItem(null);
          }}
          onDelete={(item) => {
            if (onDeleteItem) onDeleteItem(item);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

export default KanbanView;
