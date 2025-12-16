import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Calendar, User, MoveVertical, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import EditItemModal from '../EditItemModal';
import AddItemModal from '../AddItemModal';
import ConfirmDialog from '../ConfirmDialog';

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
 * @param {Function} onOrganizationChange - Callback when organization structure changes
 * @param {Function} onNavigateToItemOnWheel - Callback to navigate to item on wheel
 * @param {string} currentWheelId - Current wheel ID for edit modal
 */
const ListView = ({ 
  wheelStructure, 
  year,
  onUpdateItem,
  onDeleteItem,
  onAddItems,
  onOrganizationChange,
  onNavigateToItemOnWheel,
  currentWheelId
}) => {
  const { t, i18n } = useTranslation();
  const [expandedRings, setExpandedRings] = useState({});
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [addItemRingId, setAddItemRingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetRingId, setDropTargetRingId] = useState(null);
  
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
    setAddItemRingId(ringId);
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
    setConfirmDelete(true);
  };
  
  const confirmDeleteAction = () => {
    selectedItems.forEach(itemId => {
      onDeleteItem(itemId);
    });
    setSelectedItems(new Set());
    setConfirmDelete(false);
  };
  
  const handleDeleteSingleItem = (item) => {
    setItemToDelete(item);
  };
  
  const confirmDeleteSingleItem = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };
  
  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };
  
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetRingId(null);
  };
  
  const handleDragEnter = (e, ringId) => {
    e.preventDefault();
    setDropTargetRingId(ringId);
  };
  
  const handleDragOver = (e, ringId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDragLeave = (e, ringId) => {
    // Only clear if we're leaving the ring container itself, not child elements
    if (e.currentTarget === e.target) {
      setDropTargetRingId(null);
    }
  };
  
  const handleDrop = (e, targetRingId) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop event:', { draggedItem, targetRingId });
    if (draggedItem && draggedItem.ringId !== targetRingId) {
      console.log('Updating item ring from', draggedItem.ringId, 'to', targetRingId);
      onUpdateItem({ ...draggedItem, ringId: targetRingId });
    }
    setDraggedItem(null);
    setDropTargetRingId(null);
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
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-sm px-4 py-2">
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
              <div 
                key={ringId} 
                className={`bg-white rounded-sm shadow-sm border overflow-hidden transition-all ${
                  dropTargetRingId === ringId ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50' : 'border-gray-200'
                }`}
                onDragEnter={(e) => handleDragEnter(e, ringId)}
                onDragOver={(e) => handleDragOver(e, ringId)}
                onDragLeave={(e) => handleDragLeave(e, ringId)}
                onDrop={(e) => handleDrop(e, ringId)}
              >
                {/* Ring Header */}
                <div 
                  className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${
                    dropTargetRingId === ringId ? 'bg-blue-100' : 'bg-gray-50'
                  }`}
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
                    <select
                      value={ring.type}
                      onChange={(e) => {
                        e.stopPropagation();
                        const updatedRings = wheelStructure.rings.map(r => 
                          r.id === ringId ? { ...r, type: e.target.value } : r
                        );
                        if (onOrganizationChange) {
                          onOrganizationChange({ ...wheelStructure, rings: updatedRings });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs px-2 py-1 rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="inner">{t('listView.innerRing', 'Innerring')}</option>
                      <option value="outer">{t('listView.outerRing', 'Ytterring')}</option>
                    </select>
                    <span className="text-sm text-gray-500">
                      {items.length} {t('listView.items', 'aktiviteter')}
                    </span>
                  </div>
                  
                  {!isExpanded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddItemToRing(ringId);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Plus size={16} />
                      {t('listView.addItemButton', '+ Lägg till aktivitet')}
                    </button>
                  )}
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
                              checked={items.length > 0 && items.every(item => selectedItems.has(item.id))}
                              onChange={() => handleToggleAll(items)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('listView.item', 'Aktivitet')}
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
                            <tr 
                              key={item.id} 
                              className={`hover:bg-gray-50 transition-colors group cursor-move ${
                                isSelected ? 'bg-blue-50' : ''
                              } ${
                                draggedItem?.id === item.id ? 'opacity-50' : ''
                              }`}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, item)}
                              onDragEnd={handleDragEnd}
                            >
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
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-[#00A4A6] to-[#2D4EC8] text-white">
                                  {formatDateRange(item.startDate, item.endDate)}
                                </span>
                              </td>
                              
                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {onNavigateToItemOnWheel && (
                                    <button
                                      onClick={() => onNavigateToItemOnWheel(item.id)}
                                      className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                      title={t('listView.showInWheel', 'Visa i hjul')}
                                    >
                                      <Eye size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEditingItem(item)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                    title={t('listView.edit', 'Redigera')}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSingleItem(item)}
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
                          <td colSpan="6" className="px-4 py-2">
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
      
      {/* Add Item Modal */}
      {addItemRingId && (
        <AddItemModal
          wheelStructure={wheelStructure}
          year={yearNum}
          onAddItem={(items) => {
            onAddItems(Array.isArray(items) ? items : [items]);
            setAddItemRingId(null);
          }}
          onClose={() => setAddItemRingId(null)}
          preselectedRingId={addItemRingId}
        />
      )}
      
      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={confirmDelete}
          title={t('listView.deleteTitle', 'Ta bort aktiviteter')}
          message={t('listView.confirmDelete', `Är du säker på att du vill ta bort ${selectedItems.size} aktiviteter?`)}
          confirmLabel={t('common:actions.delete', 'Ta bort')}
          cancelLabel={t('common:actions.cancel', 'Avbryt')}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(false)}
          variant="danger"
        />
      )}
      
      {/* Confirm Delete Single Item Dialog */}
      {itemToDelete && (
        <ConfirmDialog
          isOpen={!!itemToDelete}
          title={t('listView.deleteTitle', 'Ta bort aktivitet')}
          message={t('listView.confirmDeleteSingle', `Är du säker på att du vill ta bort "${itemToDelete.name}"?`)}
          confirmLabel={t('common:actions.delete', 'Ta bort')}
          cancelLabel={t('common:actions.cancel', 'Avbryt')}
          onConfirm={confirmDeleteSingleItem}
          onCancel={() => setItemToDelete(null)}
          variant="danger"
        />
      )}
    </div>
  );
};

export default ListView;
