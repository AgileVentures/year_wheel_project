import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Plus, X, Eye, EyeOff, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import EditItemModal from '../EditItemModal';
import AddItemModal from '../AddItemModal';

/**
 * KanbanView Component
 * 
 * Displays wheel items in a Kanban board grouped by labels
 * Inspired by Fizzy's clean card-based interface
 * 
 * @param {Object} wheelStructure - Contains rings, activityGroups, labels, and items
 * @param {number} year - Current year being displayed
 * @param {Array} pages - All pages (years) with their items
 * @param {Function} onUpdateItem - Callback when item is updated
 * @param {Function} onDeleteItem - Callback when item is deleted
 * @param {Function} onAddItems - Callback when new items are added
 * @param {Function} onOrganizationChange - Callback when organization structure changes
 * @param {Function} onNavigateToItemOnWheel - Callback to navigate to item on wheel
 * @param {string} currentWheelId - Current wheel ID
 * @param {string} currentPageId - Current page ID
 */
const KanbanView = ({
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
  
  // First-time setup state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [hasConfigured, setHasConfigured] = useState(false);
  
  // Kanban state
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [addItemLabelId, setAddItemLabelId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTargetLabelId, setDropTargetLabelId] = useState(null);
  
  const { rings = [], activityGroups = [], labels = [], items = [] } = wheelStructure || {};
  
  // Check if labels exist and show setup modal on first load
  useEffect(() => {
    const hasLabels = labels && labels.length > 0;
    const storedConfig = localStorage.getItem(`kanban-config-${currentWheelId}`);
    
    if (!hasLabels && !storedConfig) {
      setShowSetupModal(true);
    } else if (storedConfig) {
      setHasConfigured(true);
    }
  }, [currentWheelId, labels]);
  
  // Get all items from all pages
  const allItems = useMemo(() => {
    return pages.flatMap(page => (page.items || []).map(item => ({
      ...item,
      _pageYear: parseInt(page.year, 10)
    })));
  }, [pages]);
  
  // Group items by label
  const itemsByLabel = useMemo(() => {
    const grouped = new Map();
    
    // Initialize with all labels
    labels.forEach(label => {
      if (label.visible) {
        grouped.set(label.id, []);
      }
    });
    
    // Add unlabeled group
    grouped.set('unlabeled', []);
    
    // Group items
    allItems.forEach(item => {
      if (item.labelId && grouped.has(item.labelId)) {
        grouped.get(item.labelId).push(item);
      } else {
        grouped.get('unlabeled').push(item);
      }
    });
    
    return grouped;
  }, [allItems, labels]);
  
  // Handle label creation with suggested defaults
  const handleCreateDefaultLabels = () => {
    const defaultLabels = [
      { name: 'Kanske', color: '#94A3B8' },
      { name: 'Intressant', color: '#60A5FA' },
      { name: 'Kommer arbeta på', color: '#FBBF24' },
      { name: 'Pågår', color: '#F59E0B' },
      { name: 'Klart', color: '#10B981' },
      { name: 'Avvisat', color: '#EF4444' }
    ];
    
    const newLabels = defaultLabels.map((label, index) => ({
      id: `label-${Date.now()}-${index}`,
      name: label.name,
      color: label.color,
      visible: true,
      createdAt: new Date().toISOString()
    }));
    
    if (onOrganizationChange) {
      onOrganizationChange({
        ...wheelStructure,
        labels: [...labels, ...newLabels]
      });
    }
    
    localStorage.setItem(`kanban-config-${currentWheelId}`, JSON.stringify({ configured: true }));
    setHasConfigured(true);
    setShowSetupModal(false);
  };
  
  // Toggle column collapse
  const toggleColumn = (labelId) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [labelId]: !prev[labelId]
    }));
  };
  
  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };
  
  const handleDragOver = (e, labelId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetLabelId(labelId);
  };
  
  const handleDragLeave = () => {
    setDropTargetLabelId(null);
  };
  
  const handleDrop = (e, targetLabelId) => {
    e.preventDefault();
    setDropTargetLabelId(null);
    
    if (!draggedItem || draggedItem.labelId === targetLabelId) {
      setDraggedItem(null);
      return;
    }
    
    // Update item with new label
    const updatedItem = {
      ...draggedItem,
      labelId: targetLabelId === 'unlabeled' ? null : targetLabelId
    };
    
    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
    
    setDraggedItem(null);
  };
  
  // Get gradient style for column based on label color
  const getColumnGradient = (color) => {
    if (!color) return 'bg-gray-50';
    
    // Create a lighter version for gradient
    const rgb = hexToRgb(color);
    if (!rgb) return 'bg-gray-50';
    
    const lighterRgb = {
      r: Math.min(255, rgb.r + 40),
      g: Math.min(255, rgb.g + 40),
      b: Math.min(255, rgb.b + 40)
    };
    
    return {
      background: `linear-gradient(180deg, ${rgbToHex(lighterRgb)} 0%, ${color} 100%)`
    };
  };
  
  // Helper functions for color manipulation
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const rgbToHex = (rgb) => {
    return '#' + [rgb.r, rgb.g, rgb.b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };
  
  // Get contrast color for text
  const getContrastColor = (hexColor) => {
    if (!hexColor) return '#1F2937';
    
    const rgb = hexToRgb(hexColor);
    if (!rgb) return '#1F2937';
    
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 155 ? '#1F2937' : '#FFFFFF';
  };
  
  // Get activity group info
  const getActivityGroup = (activityId) => {
    return activityGroups.find(ag => ag.id === activityId);
  };
  
  // Get ring info
  const getRing = (ringId) => {
    return rings.find(r => r.id === ringId);
  };
  
  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const locale = i18n.language === 'sv' ? sv : enUS;
      return format(date, 'd MMM', { locale });
    } catch (e) {
      return dateStr;
    }
  };
  
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-cy="kanban-setup-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Välkommen till Kanban-vy
            </h2>
            <p className="text-gray-600 mb-6">
              För att använda Kanban-vyn behöver du etiketter (labels) för att organisera dina aktiviteter.
              Vill du skapa ett standarduppsättning av etiketter?
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Föreslagna etiketter:</h3>
              <div className="space-y-2">
                {[
                  { name: 'Kanske', color: '#94A3B8' },
                  { name: 'Intressant', color: '#60A5FA' },
                  { name: 'Kommer arbeta på', color: '#FBBF24' },
                  { name: 'Pågår', color: '#F59E0B' },
                  { name: 'Klart', color: '#10B981' },
                  { name: 'Avvisat', color: '#EF4444' }
                ].map((label, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm text-gray-700">{label.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  localStorage.setItem(`kanban-config-${currentWheelId}`, JSON.stringify({ configured: true }));
                  setShowSetupModal(false);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                data-cy="kanban-skip-setup"
              >
                Hoppa över
              </button>
              <button
                onClick={handleCreateDefaultLabels}
                className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
                data-cy="kanban-create-labels"
              >
                Skapa etiketter
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-4 h-full min-w-max">
          {/* Render label columns */}
          {labels
            .filter(label => label.visible)
            .map(label => {
              const items = itemsByLabel.get(label.id) || [];
              const isCollapsed = collapsedColumns[label.id];
              
              return (
                <div
                  key={label.id}
                  className={`flex-shrink-0 flex flex-col rounded-xl shadow-lg overflow-hidden transition-all ${
                    isCollapsed ? 'w-16' : 'w-80'
                  } ${dropTargetLabelId === label.id ? 'ring-4 ring-blue-400 ring-offset-2 scale-105' : ''}`}
                  style={isCollapsed ? {} : getColumnGradient(label.color)}
                  onDragOver={(e) => handleDragOver(e, label.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, label.id)}
                  data-cy="kanban-column"
                  data-label-id={label.id}
                  data-label-name={label.name}
                >
                  {/* Column Header */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleColumn(label.id)}
                    style={{
                      backgroundColor: label.color,
                      color: getContrastColor(label.color)
                    }}
                  >
                    {isCollapsed ? (
                      <div className="flex flex-col items-center w-full">
                        <span className="font-semibold text-sm transform -rotate-90 whitespace-nowrap origin-center">
                          {label.name}
                        </span>
                        <div className="mt-2 flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                          <span className="text-xs font-bold">{items.length}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{label.name}</h3>
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                            <span className="text-xs font-bold">{items.length}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleColumn(label.id);
                          }}
                          className="hover:bg-white/20 p-1 rounded transition-colors"
                        >
                          <ChevronDown size={18} />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Column Content */}
                  {!isCollapsed && (
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      {items.map(item => {
                        const activityGroup = getActivityGroup(item.activityId);
                        const ring = getRing(item.ringId);
                        
                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onClick={() => setEditingItem(item)}
                            className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                            data-cy="kanban-card"
                            data-item-id={item.id}
                            data-item-name={item.name}
                          >
                            <h4 className="font-semibold text-gray-900 mb-2">{item.name}</h4>
                            
                            {item.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            
                            <div className="space-y-2">
                              {activityGroup && (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: activityGroup.color }}
                                  />
                                  <span className="text-xs text-gray-600">{activityGroup.name}</span>
                                </div>
                              )}
                              
                              {ring && (
                                <div className="text-xs text-gray-500">
                                  📍 {ring.name}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{formatDate(item.startDate)}</span>
                                <span>→</span>
                                <span>{formatDate(item.endDate)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Add Item Button */}
                      <button
                        onClick={() => setAddItemLabelId(label.id)}
                        className="w-full py-3 border-2 border-dashed border-white/30 rounded-lg hover:border-white/60 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-white/70 hover:text-white"
                        data-cy="kanban-add-item"
                        data-label-id={label.id}
                      >
                        <Plus size={18} />
                        <span className="text-sm font-medium">Lägg till</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          
          {/* Unlabeled Column */}
          <div
            className={`flex-shrink-0 flex flex-col bg-gray-100 rounded-xl shadow-lg overflow-hidden transition-all ${
              collapsedColumns['unlabeled'] ? 'w-16' : 'w-80'
            } ${dropTargetLabelId === 'unlabeled' ? 'ring-4 ring-blue-400 ring-offset-2 scale-105' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'unlabeled')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'unlabeled')}
            data-cy="kanban-column"
            data-label-id="unlabeled"
            data-label-name="Utan etikett"
          >
            <div
              className="p-4 bg-gray-300 text-gray-700 flex items-center justify-between cursor-pointer"
              onClick={() => toggleColumn('unlabeled')}
            >
              {collapsedColumns['unlabeled'] ? (
                <div className="flex flex-col items-center w-full">
                  <span className="font-semibold text-sm transform -rotate-90 whitespace-nowrap">
                    Utan etikett
                  </span>
                  <div className="mt-2 flex items-center justify-center w-6 h-6 rounded-full bg-white/40">
                    <span className="text-xs font-bold">{itemsByLabel.get('unlabeled')?.length || 0}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Utan etikett</h3>
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/40">
                      <span className="text-xs font-bold">{itemsByLabel.get('unlabeled')?.length || 0}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleColumn('unlabeled');
                    }}
                    className="hover:bg-white/20 p-1 rounded transition-colors"
                  >
                    <ChevronDown size={18} />
                  </button>
                </>
              )}
            </div>
            
            {!collapsedColumns['unlabeled'] && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {(itemsByLabel.get('unlabeled') || []).map(item => {
                  const activityGroup = getActivityGroup(item.activityId);
                  const ring = getRing(item.ringId);
                  
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={() => setEditingItem(item)}
                      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                      data-cy="kanban-card"
                      data-item-id={item.id}
                      data-item-name={item.name}
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{item.name}</h4>
                      
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        {activityGroup && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: activityGroup.color }}
                            />
                            <span className="text-xs text-gray-600">{activityGroup.name}</span>
                          </div>
                        )}
                        
                        {ring && (
                          <div className="text-xs text-gray-500">
                            📍 {ring.name}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatDate(item.startDate)}</span>
                          <span>→</span>
                          <span>{formatDate(item.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          wheelStructure={wheelStructure}
          onClose={() => setEditingItem(null)}
          onSave={onUpdateItem}
          onDelete={onDeleteItem}
        />
      )}
      
      {/* Add Item Modal */}
      {addItemLabelId && (
        <AddItemModal
          wheelId={currentWheelId}
          pageId={currentPageId}
          wheelStructure={wheelStructure}
          initialLabelId={addItemLabelId}
          onClose={() => setAddItemLabelId(null)}
          onSave={(newItems) => {
            if (onAddItems) {
              onAddItems(newItems);
            }
            setAddItemLabelId(null);
          }}
        />
      )}
    </div>
  );
};

export default KanbanView;
