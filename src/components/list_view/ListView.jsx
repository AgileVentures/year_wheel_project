import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Calendar, User, MoveVertical, Eye, Pencil, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import EditItemModal from '../EditItemModal';
import AddItemModal from '../AddItemModal';
import { showConfirmDialog } from '../../utils/dialogs';

/**
 * ListView Component
 * 
 * Displays wheel items (activities) in a list/table view grouped by rings
 * 
 * @param {Object} wheelStructure - Contains rings, activityGroups, labels, and items
 * @param {number} year - Current year being displayed
 * @param {Array} pages - All pages (years) with their items
 * @param {Function} onUpdateItem - Callback when item is updated
 * @param {Function} onDeleteItem - Callback when item is deleted
 * @param {Function} onAddItems - Callback when new items are added (expects array)
 * @param {Function} onOrganizationChange - Callback when organization structure changes
 * @param {Function} onNavigateToItemOnWheel - Callback to navigate to item on wheel
 * @param {string} currentWheelId - Current wheel ID for edit modal
 * @param {string} currentPageId - Current page ID for add item modal
 */
const ListView = ({ 
  wheelStructure, 
  year,
  pages = [],
  onUpdateItem,
  onDeleteItem,
  onAddItems,
  onOrganizationChange,
  onNavigateToItemOnWheel,
  currentWheelId,
  currentPageId
}) => {
  const { t, i18n } = useTranslation();
  const [expandedRings, setExpandedRings] = useState({});
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [addItemRingId, setAddItemRingId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetRingId, setDropTargetRingId] = useState(null);
  const [editingRingId, setEditingRingId] = useState(null);
  const [editingRingName, setEditingRingName] = useState('');
  const [yearFilter, setYearFilter] = useState('all'); // 'all' or specific year
  
  // Convert year to number for comparison
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
  
  // Get available years from pages
  const availableYears = useMemo(() => {
    const years = pages.map(p => parseInt(p.year, 10)).filter(y => !isNaN(y));
    return [...new Set(years)].sort((a, b) => a - b);
  }, [pages]);
  
  // Get all items from all pages or filter by selected year
  // Cross-year items (same crossYearGroupId) are consolidated into a single entry
  const filteredItems = useMemo(() => {
    // Always get all items to properly consolidate cross-year groups
    const allItems = pages.flatMap(page => (page.items || []).map(item => ({
      ...item,
      _pageYear: parseInt(page.year, 10)
    })));
    
    // Build a map of all cross-year groups with their full item list
    const allCrossYearGroups = new Map();
    allItems.forEach(item => {
      if (item.crossYearGroupId) {
        if (!allCrossYearGroups.has(item.crossYearGroupId)) {
          allCrossYearGroups.set(item.crossYearGroupId, []);
        }
        allCrossYearGroups.get(item.crossYearGroupId).push(item);
      }
    });
    
    // Now filter based on yearFilter
    let rawItems;
    if (yearFilter === 'all') {
      rawItems = allItems;
    } else {
      const filterYear = parseInt(yearFilter, 10);
      rawItems = allItems.filter(item => item._pageYear === filterYear);
    }
    
    // Consolidate cross-year items into single entries
    const crossYearGroupsInView = new Set();
    const standaloneItems = [];
    
    rawItems.forEach(item => {
      if (item.crossYearGroupId) {
        // Track which cross-year groups are represented in the filtered view
        crossYearGroupsInView.add(item.crossYearGroupId);
      } else {
        standaloneItems.push(item);
      }
    });
    
    // Create consolidated entries for cross-year groups that have at least one item in view
    const consolidatedCrossYear = [];
    crossYearGroupsInView.forEach(groupId => {
      // Get ALL segments of this group (not just filtered ones) to show full date range
      const allGroupItems = allCrossYearGroups.get(groupId) || [];
      if (allGroupItems.length === 0) return;
      
      // Sort by start date to find the earliest start and latest end
      const sorted = allGroupItems.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      const earliest = sorted[0];
      const latest = sorted.reduce((a, b) => new Date(a.endDate) > new Date(b.endDate) ? a : b);
      
      // Use the first segment as the base, but with full date range
      consolidatedCrossYear.push({
        ...earliest,
        // Show full date range across all segments
        startDate: earliest.startDate,
        endDate: latest.endDate,
        // Store all segment IDs for operations
        _crossYearSegmentIds: allGroupItems.map(i => i.id),
        _isCrossYearConsolidated: true,
      });
    });
    
    return [...standaloneItems, ...consolidatedCrossYear];
  }, [pages, yearFilter]);
  
  // Filter items by year and group by rings
  const itemsByRing = useMemo(() => {
    const rings = wheelStructure.rings || [];
    
    // Group items by ring
    const grouped = {};
    rings.forEach(ring => {
      const ringItems = filteredItems.filter(item => item.ringId === ring.id);
      grouped[ring.id] = {
        ring,
        items: ringItems.sort((a, b) => 
          new Date(a.startDate) - new Date(b.startDate)
        )
      };
    });
    
    return grouped;
  }, [wheelStructure, filteredItems]);
  
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
    
    // Include year when showing all years, or when dates span multiple years
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const showYear = yearFilter === 'all' || startYear !== endYear;
    
    const dateFormat = showYear ? 'MMM d, yyyy' : 'MMM d';
    const startFormatted = format(start, dateFormat, { locale });
    const endFormatted = format(end, dateFormat, { locale });
    
    return `${startFormatted} - ${endFormatted}`;
  };
  
  const getActivityGroup = (activityId) => {
    return (wheelStructure.activityGroups || []).find(ag => ag.id === activityId);
  };
  
  const getLabel = (labelId) => {
    if (!labelId) return null;
    return (wheelStructure.labels || []).find(l => l.id === labelId);
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
  
  const handleDeleteSelected = async () => {
    const confirmed = await showConfirmDialog({
      title: t('listView.deleteTitle', 'Ta bort aktiviteter'),
      message: t('listView.confirmDelete', `Är du säker på att du vill ta bort ${selectedItems.size} aktiviteter?`),
      confirmText: t('common:actions.delete', 'Ta bort'),
      cancelText: t('common:actions.cancel', 'Avbryt'),
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });
    
    if (confirmed) {
      selectedItems.forEach(itemId => {
        onDeleteItem(itemId);
      });
      setSelectedItems(new Set());
    }
  };
  
  const handleDeleteSingleItem = async (item) => {
    const confirmed = await showConfirmDialog({
      title: t('listView.deleteTitle', 'Ta bort aktivitet'),
      message: t('listView.confirmDeleteSingle', `Är du säker på att du vill ta bort "${item.name}"?`),
      confirmText: t('common:actions.delete', 'Ta bort'),
      cancelText: t('common:actions.cancel', 'Avbryt'),
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });
    
    if (confirmed) {
      // For cross-year consolidated items, delete all segments
      if (item._isCrossYearConsolidated && item._crossYearSegmentIds) {
        item._crossYearSegmentIds.forEach(segmentId => {
          onDeleteItem(segmentId);
        });
      } else {
        onDeleteItem(item.id);
      }
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
    if (draggedItem && draggedItem.ringId !== targetRingId) {
      onUpdateItem({ ...draggedItem, ringId: targetRingId });
    }
    setDraggedItem(null);
    setDropTargetRingId(null);
  };
  
  // Ring name editing handlers
  const handleStartEditRingName = (e, ring) => {
    e.stopPropagation();
    setEditingRingId(ring.id);
    setEditingRingName(ring.name);
  };
  
  const handleSaveRingName = (e, ringId) => {
    e.stopPropagation();
    if (editingRingName.trim() && onOrganizationChange) {
      const updatedRings = wheelStructure.rings.map(r => 
        r.id === ringId ? { ...r, name: editingRingName.trim() } : r
      );
      onOrganizationChange({ ...wheelStructure, rings: updatedRings });
    }
    setEditingRingId(null);
    setEditingRingName('');
  };
  
  const handleCancelEditRingName = (e) => {
    e.stopPropagation();
    setEditingRingId(null);
    setEditingRingName('');
  };
  
  const handleRingNameKeyDown = (e, ringId) => {
    if (e.key === 'Enter') {
      handleSaveRingName(e, ringId);
    } else if (e.key === 'Escape') {
      handleCancelEditRingName(e);
    }
  };
  
  return (
    <div className="w-full h-full bg-gray-50 overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {t('listView.title', 'Listvy')}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t('listView.subtitle', 'Aktiviteter grupperade efter ringar')}
                </p>
              </div>
              
              {/* Year Filter */}
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('listView.allYears', 'Alla år')}</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
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
                    
                    {/* Editable Ring Name */}
                    {editingRingId === ringId ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingRingName}
                          onChange={(e) => setEditingRingName(e.target.value)}
                          onKeyDown={(e) => handleRingNameKeyDown(e, ringId)}
                          autoFocus
                          className="text-lg font-semibold text-gray-900 px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={(e) => handleSaveRingName(e, ringId)}
                          className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                          title={t('common:actions.save', 'Spara')}
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={handleCancelEditRingName}
                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title={t('common:actions.cancel', 'Avbryt')}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/name">
                        <h3 
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                          onClick={(e) => handleStartEditRingName(e, ring)}
                          title={t('listView.clickToEditRingName', 'Klicka för att redigera ringnamn')}
                        >
                          {ring.name}
                        </h3>
                        <button
                          onClick={(e) => handleStartEditRingName(e, ring)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/name:opacity-100 transition-opacity"
                          title={t('listView.editRingName', 'Redigera ringnamn')}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                    
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
                      className="flex items-center gap-1 px-3 py-1.5 sm:py-1.5 py-2.5 text-sm text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-sm transition-colors min-h-[44px] sm:min-h-0"
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">{t('listView.addItemButton', '+ Lägg till aktivitet')}</span>
                      <span className="sm:hidden">{t('listView.add', '+ Lägg till')}</span>
                    </button>
                  )}
                </div>
                
                {/* Items Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-2 text-left w-8 hidden sm:table-cell">
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
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                            {t('listView.type', 'Typ')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                            {t('listView.label', 'Etikett')}
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
                          const itemLabel = getLabel(item.labelId);
                          const startDate = new Date(item.startDate);
                          const isSelected = selectedItems.has(item.id);
                          
                          return (
                            <tr 
                              key={item.id} 
                              className={`hover:bg-gray-50 active:bg-gray-100 transition-colors group cursor-move ${
                                isSelected ? 'bg-blue-50' : ''
                              } ${
                                draggedItem?.id === item.id ? 'opacity-50' : ''
                              }`}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, item)}
                              onDragEnd={handleDragEnd}
                            >
                              <td className="px-4 py-3 hidden sm:table-cell">
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
                                    className="text-sm font-medium text-gray-900 hover:text-blue-600 active:text-blue-700 text-left min-h-[44px] sm:min-h-0 flex items-center"
                                  >
                                    {item.name}
                                  </button>
                                </div>
                              </td>
                              
                              {/* Type (Activity Group) - hidden on mobile */}
                              <td className="px-4 py-3 hidden md:table-cell">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  {itemActivityGroup?.name || t('listView.noType', 'Ingen typ')}
                                </span>
                              </td>
                              
                              {/* Label - hidden on mobile */}
                              <td className="px-4 py-3 hidden lg:table-cell">
                                {itemLabel ? (
                                  <span 
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                    style={{ 
                                      backgroundColor: itemLabel.color || '#94A3B8',
                                      color: (() => {
                                        const hexColor = itemLabel.color || '#94A3B8';
                                        const r = parseInt(hexColor.slice(1, 3), 16);
                                        const g = parseInt(hexColor.slice(3, 5), 16);
                                        const b = parseInt(hexColor.slice(5, 7), 16);
                                        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                        return luminance > 0.5 ? '#000000' : '#FFFFFF';
                                      })()
                                    }}
                                  >
                                    {itemLabel.name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">{t('listView.noLabel', '—')}</span>
                                )}
                              </td>
                              
                              {/* Timeline */}
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-[#00A4A6] to-[#2D4EC8] text-white">
                                  {formatDateRange(item.startDate, item.endDate)}
                                </span>
                              </td>
                              
                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 sm:gap-1 gap-2">
                                  {onNavigateToItemOnWheel && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigateToItemOnWheel(item.id);
                                      }}
                                      className="text-gray-400 hover:text-blue-600 active:text-blue-700 transition-colors p-1 sm:p-1 p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                                      title={t('listView.showInWheel', 'Visa i hjul')}
                                    >
                                      <Eye size={16} className="sm:w-4 sm:h-4 w-5 h-5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItem(item);
                                    }}
                                    className="text-gray-400 hover:text-blue-600 active:text-blue-700 transition-colors p-1 sm:p-1 p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                                    title={t('listView.edit', 'Redigera')}
                                  >
                                    <Edit2 size={16} className="sm:w-4 sm:h-4 w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSingleItem(item);
                                    }}
                                    className="text-gray-400 hover:text-red-600 active:text-red-700 transition-colors p-1 sm:p-1 p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                                    title={t('listView.delete', 'Ta bort')}
                                  >
                                    <Trash2 size={16} className="sm:w-4 sm:h-4 w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        
                        {/* Add Item Row */}
                        <tr className="hover:bg-gray-50 active:bg-gray-100">
                          <td colSpan="6" className="px-4 py-2">
                            <button
                              onClick={() => handleAddItemToRing(ringId)}
                              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 active:text-gray-900 transition-colors py-2 min-h-[44px] sm:min-h-0"
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
          onDeleteItem={(itemId) => {
            // For cross-year consolidated items, delete all segments
            if (editingItem._isCrossYearConsolidated && editingItem._crossYearSegmentIds) {
              editingItem._crossYearSegmentIds.forEach(segmentId => {
                onDeleteItem(segmentId);
              });
            } else {
              onDeleteItem(itemId);
            }
          }}
          onClose={() => setEditingItem(null)}
          currentWheelId={currentWheelId}
        />
      )}
      
      {/* Add Item Modal */}
      {addItemRingId && (
        <AddItemModal
          wheelStructure={wheelStructure}
          year={yearNum}
          pages={pages}
          currentPageId={currentPageId}
          currentWheelId={currentWheelId}
          onAddItem={(items) => {
            onAddItems(Array.isArray(items) ? items : [items]);
            setAddItemRingId(null);
          }}
          onClose={() => setAddItemRingId(null)}
          preselectedRingId={addItemRingId}
        />
      )}
    </div>
  );
};

export default ListView;
