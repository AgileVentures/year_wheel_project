import { Search, Settings, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2, Edit2, X } from 'lucide-react';
import { useState } from 'react';
import AddItemModal from './AddItemModal';
import EditItemModal from './EditItemModal';

function OrganizationPanel({ 
  organizationData,
  onOrganizationChange
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('disc'); // disc, liste, kalender
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [sortBy, setSortBy] = useState('startDate'); // startDate, name, ring
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [selectedMonth, setSelectedMonth] = useState(9); // October (0-indexed)
  const [selectedYear, setSelectedYear] = useState(2025);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    rings: true,
    activities: true,
    labels: true
  });

  // Calendar helpers
  const monthNames = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
  ];
  const daysOfWeek = ['må', 'ti', 'on', 'to', 'fr', 'lö', 'sö'];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
  const calendarDays = [];
  
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get events for selected month
  const eventsForMonth = filteredItems.filter(item => {
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const itemStart = new Date(item.startDate);
    const itemEnd = new Date(item.endDate);
    return itemEnd >= monthStart && itemStart <= monthEnd;
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filter visibility toggles
  const handleShowRings = (show) => {
    const updatedRings = organizationData.rings.map(ring => ({
      ...ring,
      visible: show
    }));
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const handleShowActivities = (show) => {
    const updatedActivities = organizationData.activities.map(activity => ({
      ...activity,
      visible: show
    }));
    onOrganizationChange({ ...organizationData, activities: updatedActivities });
  };

  const handleShowLabels = (show) => {
    const updatedLabels = organizationData.labels.map(label => ({
      ...label,
      visible: show
    }));
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  // Toggle individual items
  const toggleRing = (ringId) => {
    const updatedRings = organizationData.rings.map(ring =>
      ring.id === ringId ? { ...ring, visible: !ring.visible } : ring
    );
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const toggleActivity = (activityId) => {
    const updatedActivities = organizationData.activities.map(activity =>
      activity.id === activityId ? { ...activity, visible: !activity.visible } : activity
    );
    onOrganizationChange({ ...organizationData, activities: updatedActivities });
  };

  const toggleLabel = (labelId) => {
    const updatedLabels = organizationData.labels.map(label =>
      label.id === labelId ? { ...label, visible: !label.visible } : label
    );
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  // Search filter
  const searchLower = searchQuery.toLowerCase();
  const filteredRings = organizationData.rings.filter(ring =>
    ring.name.toLowerCase().includes(searchLower)
  );
  const filteredActivities = organizationData.activities.filter(activity =>
    activity.name.toLowerCase().includes(searchLower)
  );
  const filteredLabels = organizationData.labels.filter(label =>
    label.name.toLowerCase().includes(searchLower)
  );
  const filteredItems = organizationData.items?.filter(item =>
    item.name.toLowerCase().includes(searchLower)
  ) || [];

  // Count items
  const countRingItems = (ringId) => {
    return organizationData.items?.filter(item => item.ringId === ringId).length || 0;
  };

  const countActivityItems = (activityId) => {
    return organizationData.items?.filter(item => item.activityId === activityId).length || 0;
  };

  const countLabelItems = (labelId) => {
    return organizationData.items?.filter(item => item.labelId === labelId).length || 0;
  };

  // Add new item
  const handleAddItem = (newItem) => {
    const updatedItems = [...(organizationData.items || []), newItem];
    onOrganizationChange({ ...organizationData, items: updatedItems });
  };

  // Update item
  const handleUpdateItem = (updatedItem) => {
    const updatedItems = organizationData.items.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    onOrganizationChange({ ...organizationData, items: updatedItems });
  };

  // Delete item
  const handleDeleteItem = (itemId) => {
    const updatedItems = organizationData.items.filter(item => item.id !== itemId);
    onOrganizationChange({ ...organizationData, items: updatedItems });
  };

  // Sort items for list view
  const getSortedItems = () => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      let compareA, compareB;
      
      switch (sortBy) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'ring':
          const ringA = organizationData.rings.find(r => r.id === a.ringId);
          const ringB = organizationData.rings.find(r => r.id === b.ringId);
          compareA = ringA?.name.toLowerCase() || '';
          compareB = ringB?.name.toLowerCase() || '';
          break;
        case 'startDate':
        default:
          compareA = new Date(a.startDate);
          compareB = new Date(b.startDate);
          break;
      }
      
      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return items;
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Refresh functionality
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Reload data from localStorage
    const storedData = localStorage.getItem("yearWheelData");
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        if (data.organizationData) {
          onOrganizationChange(data.organizationData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
    
    // Reset search and filters
    setSearchQuery('');
    setActiveView('disc');
    
    // Stop spinning after animation
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Ring management
  const handleAddRing = () => {
    const newRing = {
      id: `ring-${Date.now()}`,
      name: `Ring ${organizationData.rings.length + 1}`,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      visible: true
    };
    const updatedRings = [...organizationData.rings, newRing];
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const handleRemoveRing = (ringId) => {
    if (organizationData.rings.length <= 1) return;
    const updatedRings = organizationData.rings.filter(r => r.id !== ringId);
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const handleRingNameChange = (ringId, newName) => {
    const updatedRings = organizationData.rings.map(ring =>
      ring.id === ringId ? { ...ring, name: newName } : ring
    );
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const handleRingColorChange = (ringId, newColor) => {
    const updatedRings = organizationData.rings.map(ring =>
      ring.id === ringId ? { ...ring, color: newColor } : ring
    );
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  // Activity management
  const handleAddActivity = () => {
    const newActivity = {
      id: `activity-${Date.now()}`,
      name: `Aktivitet ${organizationData.activities.length + 1}`,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      visible: true
    };
    const updatedActivities = [...organizationData.activities, newActivity];
    onOrganizationChange({ ...organizationData, activities: updatedActivities });
  };

  const handleRemoveActivity = (activityId) => {
    if (organizationData.activities.length <= 1) return;
    const updatedActivities = organizationData.activities.filter(a => a.id !== activityId);
    onOrganizationChange({ ...organizationData, activities: updatedActivities });
  };

  const handleActivityNameChange = (activityId, newName) => {
    const updatedActivities = organizationData.activities.map(activity =>
      activity.id === activityId ? { ...activity, name: newName } : activity
    );
    onOrganizationChange({ ...organizationData, activities: updatedActivities });
  };

  const handleActivityColorChange = (activityId, newColor) => {
    const updatedActivities = organizationData.activities.map(activity =>
      activity.id === activityId ? { ...activity, color: newColor } : activity
    );
    onOrganizationChange({ ...organizationData, activities: updatedActivities });
  };

  // Label management
  const handleAddLabel = () => {
    const newLabel = {
      id: `label-${Date.now()}`,
      name: `Etikett ${organizationData.labels.length + 1}`,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      visible: true
    };
    const updatedLabels = [...organizationData.labels, newLabel];
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  const handleRemoveLabel = (labelId) => {
    if (organizationData.labels.length <= 1) return;
    const updatedLabels = organizationData.labels.filter(l => l.id !== labelId);
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  const handleLabelNameChange = (labelId, newName) => {
    const updatedLabels = organizationData.labels.map(label =>
      label.id === labelId ? { ...label, name: newName } : label
    );
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  const handleLabelColorChange = (labelId, newColor) => {
    const updatedLabels = organizationData.labels.map(label =>
      label.id === labelId ? { ...label, color: newColor } : label
    );
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <h1 className="text-base font-normal text-gray-900">Marketing department</h1>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleRefresh}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Uppdatera"
            >
              <RefreshCw 
                size={16} 
                className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Inställningar"
            >
              <Settings size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-6 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveView('disc')}
            className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
              activeView === 'disc'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Disc
            {activeView === 'disc' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveView('liste')}
            className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
              activeView === 'liste'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Liste
            {activeView === 'liste' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveView('kalender')}
            className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
              activeView === 'kalender'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Kalender
            {activeView === 'kalender' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Sök"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
          />
        </div>

        {/* Filter Visning & Add Button */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-700">Filtrera Visning</div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Content Sections */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'liste' && (
          <div className="p-4">
            {/* List Header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                {filteredItems.length} händelse{filteredItems.length !== 1 ? 'r' : ''}
              </h3>
            </div>

            {/* List Table */}
            {filteredItems.length > 0 ? (
              <div className="space-y-1">
                {getSortedItems().map((item) => {
                  const ring = organizationData.rings.find(r => r.id === item.ringId);
                  const activity = organizationData.activities.find(a => a.id === item.activityId);
                  const label = organizationData.labels.find(l => l.id === item.labelId);
                  const startDate = new Date(item.startDate);
                  const endDate = new Date(item.endDate);
                  
                  return (
                    <div
                      key={item.id}
                      className="group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-3 h-3 rounded flex-shrink-0"
                              style={{ backgroundColor: activity?.color || '#D1D5DB' }}
                            />
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {item.name}
                            </h4>
                          </div>
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Ring:</span>
                              <span>{ring?.name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Aktivitet:</span>
                              <span>{activity?.name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Datum:</span>
                              <span>
                                {startDate.toLocaleDateString('sv-SE')} - {endDate.toLocaleDateString('sv-SE')}
                              </span>
                            </div>
                            {item.time && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Tid:</span>
                                <span>{item.time}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Redigera"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Radera "${item.name}"?`)) {
                                handleDeleteItem(item.id);
                              }
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Radera"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery ? 'Inga händelser matchar din sökning' : 'Inga händelser ännu'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>Lägg till händelse</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === 'kalender' && (
          <div className="p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  const newDate = new Date(selectedYear, selectedMonth - 1, 1);
                  setSelectedMonth(newDate.getMonth());
                  setSelectedYear(newDate.getFullYear());
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <h3 className="text-sm font-semibold text-gray-900">
                {monthNames[selectedMonth]} {selectedYear}
              </h3>
              <button
                onClick={() => {
                  const newDate = new Date(selectedYear, selectedMonth + 1, 1);
                  setSelectedMonth(newDate.getMonth());
                  setSelectedYear(newDate.getFullYear());
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="mb-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map(day => (
                  <div key={day} className="text-center text-xs text-gray-500 font-medium">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const hasEvents = day && eventsForMonth.some(event => {
                    const startDate = new Date(event.startDate);
                    const endDate = new Date(event.endDate);
                    const currentDate = new Date(selectedYear, selectedMonth, day);
                    return currentDate >= startDate && currentDate <= endDate;
                  });

                  return (
                    <div
                      key={index}
                      className={`aspect-square flex items-center justify-center text-xs relative ${
                        day
                          ? 'text-gray-900 hover:bg-gray-100 rounded cursor-pointer'
                          : ''
                      }`}
                    >
                      {day || ''}
                      {hasEvents && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Events List for Selected Month */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">
                Händelser denna månad ({eventsForMonth.length})
              </h4>
              {eventsForMonth.length > 0 ? (
                <div className="space-y-2">
                  {eventsForMonth.map(event => {
                    const activity = organizationData.activities.find(a => a.id === event.activityId);
                    const startDate = new Date(event.startDate);
                    const endDate = new Date(event.endDate);
                    
                    return (
                      <div
                        key={event.id}
                        className="group flex items-start gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => setEditingItem(event)}
                      >
                        <div
                          className="w-3 h-3 rounded mt-0.5 flex-shrink-0"
                          style={{ backgroundColor: activity?.color || '#D1D5DB' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {event.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {startDate.getDate()} - {endDate.getDate()} {monthNames[selectedMonth].slice(0, 3)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">
                  Inga händelser denna månad
                </p>
              )}
            </div>
          </div>
        )}

        {activeView === 'disc' && (
        <>
        {/* RINGE Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection('rings')}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              RINGAR
            </h2>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${expandedSections.rings ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.rings && (
            <>
              <div className="space-y-1 mb-2">
                {filteredRings.map((ring) => (
                  <div
                    key={ring.id}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={ring.visible}
                      onChange={() => toggleRing(ring.id)}
                      className="w-3 h-3 rounded"
                    />
                    <input
                      type="color"
                      value={ring.color}
                      onChange={(e) => handleRingColorChange(ring.id, e.target.value)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={ring.name}
                      onChange={(e) => handleRingNameChange(ring.id, e.target.value)}
                      className="flex-1 text-xs text-gray-700 bg-transparent border-none focus:outline-none focus:bg-white focus:px-1"
                    />
                    {organizationData.rings.length > 1 && (
                      <button
                        onClick={() => handleRemoveRing(ring.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-600 hover:bg-red-50 rounded transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Visa:</span>
                  <button
                    onClick={() => handleShowRings(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Alla
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => handleShowRings(false)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Ingen
                  </button>
                </div>
                <button
                  onClick={handleAddRing}
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>Lägg till</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* AKTIVITETER Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection('activities')}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              AKTIVITETER
            </h2>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${expandedSections.activities ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.activities && (
            <>
              <div className="space-y-1 mb-2">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={activity.visible}
                      onChange={() => toggleActivity(activity.id)}
                      className="w-3 h-3 rounded"
                    />
                    <input
                      type="color"
                      value={activity.color}
                      onChange={(e) => handleActivityColorChange(activity.id, e.target.value)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={activity.name}
                      onChange={(e) => handleActivityNameChange(activity.id, e.target.value)}
                      className="flex-1 text-xs text-gray-700 bg-transparent border-none focus:outline-none focus:bg-white focus:px-1"
                    />
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {countActivityItems(activity.id)}
                    </span>
                    {organizationData.activities.length > 1 && (
                      <button
                        onClick={() => handleRemoveActivity(activity.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-600 hover:bg-red-50 rounded transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Visa:</span>
                  <button
                    onClick={() => handleShowActivities(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Alla
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => handleShowActivities(false)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Ingen
                  </button>
                </div>
                <button
                  onClick={handleAddActivity}
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>Lägg till</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* LABELS Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection('labels')}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              LABELS
            </h2>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${expandedSections.labels ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.labels && (
            <>
              <div className="space-y-1 mb-2">
                {filteredLabels.map((label) => (
                  <div
                    key={label.id}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={label.visible}
                      onChange={() => toggleLabel(label.id)}
                      className="w-3 h-3 rounded"
                    />
                    <input
                      type="color"
                      value={label.color}
                      onChange={(e) => handleLabelColorChange(label.id, e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer"
                    />
                    <input
                      type="text"
                      value={label.name}
                      onChange={(e) => handleLabelNameChange(label.id, e.target.value)}
                      className="flex-1 text-xs text-gray-700 bg-transparent border-none focus:outline-none focus:bg-white focus:px-1"
                    />
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {countLabelItems(label.id)}
                    </span>
                    {organizationData.labels.length > 1 && (
                      <button
                        onClick={() => handleRemoveLabel(label.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-600 hover:bg-red-50 rounded transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Visa:</span>
                  <button
                    onClick={() => handleShowLabels(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Alla
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => handleShowLabels(false)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Ingen
                  </button>
                </div>
                <button
                  onClick={handleAddLabel}
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>Lägg till</span>
                </button>
              </div>
            </>
          )}
        </div>
        </>
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>
          YearWheel
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <AddItemModal
          organizationData={organizationData}
          onAddItem={handleAddItem}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          organizationData={organizationData}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Inställningar</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Organisation</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Ringar:</span>
                    <span className="font-medium">{organizationData.rings.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aktiviteter:</span>
                    <span className="font-medium">{organizationData.activities.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Etiketter:</span>
                    <span className="font-medium">{organizationData.labels.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Händelser:</span>
                    <span className="font-medium">{organizationData.items?.length || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Åtgärder</h3>
                <button
                  onClick={() => {
                    handleRefresh();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Ladda om data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationPanel;
