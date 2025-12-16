import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Calendar, User, MoveVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import EditItemModal from '../EditItemModal';

/**
 * ListView Component
 * 
 * Displays wheel items (activities) in a list/table view grouped by rings
 * Similar to Monday.com-style board view
 * 
 * @param {Object} wheelStructure - Contains rings, activityGroups, labels, and items
 * @param {number} year - Current year being displayed
 * @param {Function} onUpdateItem - Callback when item is updated
 * @param {Function} onDeleteItem - Callback when item is deleted
 * @param {Function} onAddItems - Callback when new items are added (expects array)
 * @param {string} currentWheelId - Current wheel ID for edit modal
 */
const ListView = ({ 
  wheelStructure, 
  year,
  onUpdateItem,
  onDeleteItem,
  onAddItems,
  currentWheelId
}) => {
  const { t, i18n } = useTranslation();
  const [expandedRings, setExpandedRings] = useState({});
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  
  // Convert year to number for comparison
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
  
  // Filter items by year and group by rings
  const itemsByRing = useMemo(() => {
    const rings = wheelStructure.rings || [];
    const items = wheelStructure.items || [];
    const activityGroups = wheelStructure.activityGroups || [];
    
    // Filter items for the current year
    const yearItems = items.filter(item => {
      const itemYear = new Date(item.startDate).getFullYear();
      return itemYear === yearNum;
    });
    
    // Group items by ring
    const grouped = {};
    rings.forEach(ring => {
      const ringItems = yearItems.filter(item => item.ringId === ring.id);
      grouped[ring.id] = {
        ring,
        items: ringItems.sort((a, b) => 
          new Date(a.startDate) - new Date(b.startDate)
        )
      };
    });
    
    return grouped;
  }, [wheelStructure, yearNum]);
  
  const toggleRing = (ringId) => {
    setExpandedRings(prev => ({
      ...prev,
      [ringId]: !prev[ringId]
    }));
  };
  
  const handleAddItemToRing = (ringId) => {
    // Get the ring's first activity group, or the first available one
    const firstActivityGroup = (wheelStructure.activityGroups || [])[0];
    if (!firstActivityGroup) {
      alert(t('listView.noActivityGroups', 'Du måste skapa minst en aktivitetsgrupp först'));
      return;
    }
    
    const newItem = {
      id: `item-${Date.now()}`,
      name: t('listView.newItem', 'Ny aktivitet'),
      ringId: ringId,
      activityId: firstActivityGroup.id,
      labelId: null,
      startDate: new Date(yearNum, 0, 1).toISOString().split('T')[0],
      endDate: new Date(yearNum, 0, 7).toISOString().split('T')[0],
      time: '',
      description: ''
    };
    
    if (onAddItems) {
      onAddItems([newItem]); // Wrap in array since handler expects array
    }
  };
  
  const formatDateRange = (startDate, endDate) => {
    const locale = i18n.language === 'sv' ? sv : enUS;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Format: "Oct 7 - Nov 2" or "Jul 15 - Aug 8"
    const startFormatted = format(start, 'MMM d', { locale });
    const endFormatted = format(end, 'MMM d', { locale });
    
    return `${startFormatted} - ${endFormatted}`;
  };
  
  const getActivityGroup = (activityId) => {
    return (wheelStructure.activityGroups || []).find(ag => ag.id === activityId);
  };
  
  const getRingTypeLabel = (type) => {
    return type === 'inner' 
      ? t('listView.innerRing', 'Innerring') 
      : t('listView.outerRing', 'Ytterring');
  };
  
  const handleToggleItem = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  const handleToggleAll = (ringItems) => {
    const allSelected = ringItems.every(item => selectedItems.has(item.id));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      ringItems.forEach(item => {
        if (allSelected) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
      });
      return newSet;
    });
  };
  
  const handleMoveToRing = (itemIds, targetRingId) => {
    itemIds.forEach(itemId => {
      const item = wheelStructure.items.find(i => i.id === itemId);
      if (item) {
        onUpdateItem({ ...item, ringId: targetRingId });
      }
    });
    setSelectedItems(new Set());
  };
  
  const handleDeleteSelected = () => {
    if (window.confirm(t('listView.confirmDelete', `Är du säker på att du vill ta bort ${selectedItems.size} aktiviteter?`))) {
      selectedItems.forEach(itemId => {
        onDeleteItem(itemId);
      });
      setSelectedItems(new Set());
    }
  };
  
  return (
    <div className="w-full h-full bg-gray-50 overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {t('listView.title', 'Listvy')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('listView.subtitle', 'Aktiviteter grupperade efter ringar')}
              </p>
            </div>
            
            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <span className="text-sm font-medium text-blue-900">
                  {selectedItems.size} {t('listView.selected', 'valda')}
                </span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleMoveToRing(Array.from(selectedItems), e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-sm border border-blue-300 rounded px-2 py-1"
                >
                  <option value="">{t('listView.moveToRing', 'Flytta till ring...')}</option>
                  {wheelStructure.rings.map(ring => (
                    <option key={ring.id} value={ring.id}>{ring.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleDeleteSelected}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {t('common:actions.delete', 'Ta bort')}
                </button>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  {t('listView.clearSelection', 'Rensa')}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Rings List */}
        <div className="space-y-4">
          {Object.entries(itemsByRing).map(([ringId, { ring, items }]) => {
            const isExpanded = expandedRings[ringId] !== false; // Default to expanded
            const activityGroup = getActivityGroup(items[0]?.activityId);
            
            return (
              <div key={ringId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Ring Header */}
                <div 
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleRing(ringId)}
                >
                  <div className="flex items-center gap-3">
                    <button 
                      className="text-gray-500 hover:text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRing(ringId);
                      }}
                    >
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ring.name}
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {getRingTypeLabel(ring.type)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {items.length} {t('listView.items', 'aktiviteter')}
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddItemToRing(ringId);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Plus size={16} />
                    {t('listView.addItem', 'Lägg till')}
                  </button>
                </div>
                
                {/* Items Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-2 text-left w-8">
                            <input 
                              type="checkbox" 
                              checked={items.every(item => selectedItems.has(item.id))}
                              onChange={() => handleToggleAll(items)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('listView.item', 'Aktivitet')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('listView.ringType', 'Ring-typ')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('listView.status', 'Status')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('listView.date', 'Datum')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('listView.timeline', 'Tidslinje')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                            {t('listView.actions', 'Åtgärder')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {items.map((item) => {
                          const itemActivityGroup = getActivityGroup(item.activityId);
                          const startDate = new Date(item.startDate);
                          const isSelected = selectedItems.has(item.id);
                          
                          return (
                            <tr key={item.id} className={`hover:bg-gray-50 transition-colors group ${isSelected ? 'bg-blue-50' : ''}`}>
                              <td className="px-4 py-3">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => handleToggleItem(item.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              
                              {/* Item Name */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded flex-shrink-0"
                                    style={{ backgroundColor: itemActivityGroup?.color || '#D1D5DB' }}
                                  />
                                  <button
                                    onClick={() => setEditingItem(item)}
                                    className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left"
                                  >
                                    {item.name}
                                  </button>
                                </div>
                              </td>
                              
                              {/* Ring Type Selector */}
                              <td className="px-4 py-3">
                                <select
                                  value={item.ringId}
                                  onChange={(e) => onUpdateItem({ ...item, ringId: e.target.value })}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {wheelStructure.rings.map(r => (
                                    <option key={r.id} value={r.id}>
                                      {r.name} ({getRingTypeLabel(r.type)})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              
                              {/* Status */}
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                                  {itemActivityGroup?.name || t('listView.noStatus', 'Ingen status')}
                                </span>
                              </td>
                              
                              {/* Date */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar size={14} />
                                  {format(startDate, 'MMM d', { locale: i18n.language === 'sv' ? sv : enUS })}
                                </div>
                              </td>
                              
                              {/* Timeline */}
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                                  {formatDateRange(item.startDate, item.endDate)}
                                </span>
                              </td>
                              
                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setEditingItem(item)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                    title={t('listView.edit', 'Redigera')}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => onDeleteItem(item.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                    title={t('listView.delete', 'Ta bort')}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        
                        {/* Add Item Row */}
                        <tr className="hover:bg-gray-50">
                          <td colSpan="7" className="px-4 py-2">
                            <button
                              onClick={() => handleAddItemToRing(ringId)}
                              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              <Plus size={16} />
                              {t('listView.addItemButton', '+ Lägg till aktivitet')}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Empty State */}
        {Object.keys(itemsByRing).length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {t('listView.noRings', 'Inga ringar hittades. Skapa ringar för att komma igång.')}
            </p>
          </div>
        )}
      </div>
      
      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          wheelStructure={wheelStructure}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onClose={() => setEditingItem(null)}
          currentWheelId={currentWheelId}
        />
      )}
    </div>
  );
};

export default ListView;
