import { Search, Settings, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2, Edit2, X, Link as LinkIcon } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import AddAktivitetModal from './AddAktivitetModal';
import EditAktivitetModal from './EditAktivitetModal';
import RingIntegrationModal from './RingIntegrationModal';
import { getRingIntegrations } from '../services/integrationService';

function OrganizationPanel({ 
  organizationData,
  onOrganizationChange,
  title,
  onTitleChange,
  colors,
  onColorsChange,
  onPaletteChange,
  onZoomToMonth,
  onZoomToQuarter,
  showRingNames,
  onShowRingNamesChange,
  showLabels,
  onShowLabelsChange,
  onSaveToDatabase // New prop to trigger immediate save
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('disc'); // disc, liste, kalender
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAktivitet, setEditingAktivitet] = useState(null);
  const [integrationRing, setIntegrationRing] = useState(null); // Ring being configured for integration
  const [ringIntegrations, setRingIntegrations] = useState({}); // Track which rings have integrations: {ringId: true/false}
  const loadingIntegrationsRef = useRef(false);
  
  // Load integration status for all rings
  useEffect(() => {
    const loadIntegrationStatus = async () => {
      // Prevent multiple simultaneous loads
      if (loadingIntegrationsRef.current) {
        return;
      }
      
      loadingIntegrationsRef.current = true;
      const statusMap = {};
      
      // Use Promise.all for parallel requests instead of sequential loop
      const integrationPromises = organizationData.rings.map(async (ring) => {
        // Skip temporary IDs
        if (!ring.id || ring.id.startsWith('ring-') || ring.id.startsWith('inner-ring-') || ring.id.startsWith('outer-ring-')) {
          return { ringId: ring.id, hasIntegration: false };
        }
        try {
          const integrations = await getRingIntegrations(ring.id);
          return { ringId: ring.id, hasIntegration: integrations && integrations.length > 0 };
        } catch (err) {
          console.error(`Error loading integrations for ring ${ring.id}:`, err);
          return { ringId: ring.id, hasIntegration: false };
        }
      });
      
      const results = await Promise.all(integrationPromises);
      results.forEach(({ ringId, hasIntegration }) => {
        statusMap[ringId] = hasIntegration;
      });
      
      setRingIntegrations(statusMap);
      loadingIntegrationsRef.current = false;
    };
    
    if (organizationData.rings.length > 0) {
      loadIntegrationStatus();
    }
  }, [organizationData.rings.length]); // Only re-check when NUMBER of rings changes
  
  const [sortBy, setSortBy] = useState('startDate'); // startDate, name, ring
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [selectedMonth, setSelectedMonth] = useState(9); // October (0-indexed)
  const [selectedYear, setSelectedYear] = useState(2025);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    innerRings: true,
    outerRings: true,
    activityGroups: true,
    labels: true
  });
  const [expandedInnerRings, setExpandedInnerRings] = useState({});

  // Calendar helpers
  const monthNames = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
  ];
  const daysOfWeek = ['må', 'ti', 'on', 'to', 'fr', 'lö', 'sö'];
  
  // Calculate current quarter (0-3) from selected month
  const currentQuarter = Math.floor(selectedMonth / 3);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0
  };

  // Search filter - must be defined before calendar days
  const searchLower = searchQuery.toLowerCase();
  const innerRings = organizationData.rings.filter(ring => ring.type === 'inner');
  const outerRings = organizationData.rings.filter(ring => ring.type === 'outer');
  const filteredInnerRings = innerRings.filter(ring =>
    ring.name.toLowerCase().includes(searchLower)
  );
  const filteredOuterRings = outerRings.filter(ring =>
    ring.name.toLowerCase().includes(searchLower)
  );
  const filteredActivityGroups = (organizationData.activityGroups || []).filter(group =>
    group.name.toLowerCase().includes(searchLower)
  );
  const filteredLabels = organizationData.labels.filter(label =>
    label.name.toLowerCase().includes(searchLower)
  );
  
  // Fuzzy search for activities (only in Liste view)
  const filteredAktiviteter = useMemo(() => {
    if (!organizationData.items) return [];
    
    // If no search query or not in Liste view, return all items
    if (!searchQuery || activeView !== 'liste') {
      return organizationData.items;
    }
    
    // Configure Fuse.js for fuzzy search
    const fuse = new Fuse(organizationData.items, {
      keys: [
        { name: 'name', weight: 2 }, // Activity name has highest weight
        { name: 'time', weight: 0.5 }
      ],
      threshold: 0.4, // 0 = perfect match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 2
    });
    
    // Perform fuzzy search
    const results = fuse.search(searchQuery);
    return results.map(result => result.item);
  }, [organizationData.items, searchQuery, activeView]);

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

  // Get aktiviteter for selected month
  const aktiviteterForMonth = filteredAktiviteter.filter(item => {
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

  const handleShowActivityGroups = (show) => {
    const updatedGroups = (organizationData.activityGroups || []).map(group => ({
      ...group,
      visible: show
    }));
    onOrganizationChange({ ...organizationData, activityGroups: updatedGroups });
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

  const toggleActivityGroup = (groupId) => {
    const updatedGroups = (organizationData.activityGroups || []).map(group =>
      group.id === groupId ? { ...group, visible: !group.visible } : group
    );
    onOrganizationChange({ ...organizationData, activityGroups: updatedGroups });
  };

  const toggleLabel = (labelId) => {
    const updatedLabels = organizationData.labels.map(label =>
      label.id === labelId ? { ...label, visible: !label.visible } : label
    );
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  // Count items
  const countRingItems = (ringId) => {
    return organizationData.items?.filter(item => item.ringId === ringId).length || 0;
  };

  const countActivityGroupItems = (groupId) => {
    return organizationData.items?.filter(item => item.activityId === groupId).length || 0;
  };

  const countLabelItems = (labelId) => {
    return organizationData.items?.filter(item => item.labelId === labelId).length || 0;
  };

  // Add new aktivitet
  const handleAddAktivitet = (newAktivitet) => {
    const updatedItems = [...(organizationData.items || []), newAktivitet];
    onOrganizationChange({ ...organizationData, items: updatedItems });
  };

  // Update aktivitet
  const handleUpdateAktivitet = (updatedAktivitet) => {
    const updatedItems = organizationData.items.map(item =>
      item.id === updatedAktivitet.id ? updatedAktivitet : item
    );
    onOrganizationChange({ ...organizationData, items: updatedItems });
  };

  // Delete aktivitet
  const handleDeleteAktivitet = (aktivitetId) => {
    const updatedItems = organizationData.items.filter(item => item.id !== aktivitetId);
    onOrganizationChange({ ...organizationData, items: updatedItems });
  };

  // Sort aktiviteter for list view
  const getSortedAktiviteter = () => {
    const items = [...filteredAktiviteter];
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
  const handleAddInnerRing = async () => {
    const newRing = {
      id: `ring-${Date.now()}`, // Temporary ID - will be replaced with UUID after save
      name: `Innerring ${innerRings.length + 1}`,
      type: 'inner',
      visible: true,
      data: Array.from({ length: 12 }, () => [""]),
      orientation: 'vertical'
    };
    const updatedOrgData = { ...organizationData, rings: [...organizationData.rings, newRing] };
    
    // Update state - this will trigger auto-save after 2 seconds
    onOrganizationChange(updatedOrgData);
  };

  const handleAddOuterRing = async () => {
    const newRing = {
      id: `ring-${Date.now()}`, // Temporary ID - will be replaced with UUID after save
      name: `Ytterring ${outerRings.length + 1}`,
      type: 'outer',
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      visible: true
    };
    const updatedOrgData = { ...organizationData, rings: [...organizationData.rings, newRing] };
    
    // Update state - this will trigger auto-save after 2 seconds
    onOrganizationChange(updatedOrgData);
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

  const handleInnerRingTextChange = (ringId, monthIndex, text) => {
    const updatedRings = organizationData.rings.map(ring => {
      if (ring.id === ringId && ring.type === 'inner') {
        const newData = [...ring.data];
        newData[monthIndex] = [text];
        return { ...ring, data: newData };
      }
      return ring;
    });
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const handleInnerRingOrientationChange = (ringId, orientation) => {
    const updatedRings = organizationData.rings.map(ring =>
      ring.id === ringId ? { ...ring, orientation } : ring
    );
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const toggleInnerRingExpanded = (ringId) => {
    setExpandedInnerRings(prev => ({
      ...prev,
      [ringId]: !prev[ringId]
    }));
  };

  // Activity Group management
  const handleAddActivityGroup = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      name: `Aktivitetsgrupp ${(organizationData.activityGroups || []).length + 1}`,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      visible: true
    };
    const updatedGroups = [...(organizationData.activityGroups || []), newGroup];
    onOrganizationChange({ ...organizationData, activityGroups: updatedGroups });
  };

  const handleRemoveActivityGroup = (groupId) => {
    if ((organizationData.activityGroups || []).length <= 1) return;
    const updatedGroups = (organizationData.activityGroups || []).filter(g => g.id !== groupId);
    onOrganizationChange({ ...organizationData, activityGroups: updatedGroups });
  };

  const handleActivityGroupNameChange = (groupId, newName) => {
    const updatedGroups = (organizationData.activityGroups || []).map(group =>
      group.id === groupId ? { ...group, name: newName } : group
    );
    onOrganizationChange({ ...organizationData, activityGroups: updatedGroups });
  };

  const handleActivityGroupColorChange = (groupId, newColor) => {
    const updatedGroups = (organizationData.activityGroups || []).map(group =>
      group.id === groupId ? { ...group, color: newColor } : group
    );
    onOrganizationChange({ ...organizationData, activityGroups: updatedGroups });
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
            <h1 className="text-base font-semibold text-gray-900">Hantera</h1>
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
              title="Färgpalett och visning"
            >
              <Settings size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Title Input - Always visible */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Titel
          </label>
          <input
            type="text"
            value={title || ''}
            onChange={(e) => onTitleChange && onTitleChange(e.target.value)}
            placeholder="Namnge ditt hjul..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1 italic">Sparas automatiskt</p>
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
            Lista
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

        {/* Search - Only show in Liste view */}
        {activeView === 'liste' && (
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Sök aktiviteter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Filter Visning & Add Button */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-700">Filtrera Visning</div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            <span>Lägg till</span>
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
                {filteredAktiviteter.length} aktivitet{filteredAktiviteter.length !== 1 ? 'er' : ''}
              </h3>
            </div>

            {/* List Table */}
            {filteredAktiviteter.length > 0 ? (
              <div className="space-y-1">
                {getSortedAktiviteter().map((item) => {
                  const ring = organizationData.rings.find(r => r.id === item.ringId);
                  const activityGroup = (organizationData.activityGroups || []).find(a => a.id === item.activityId);
                  const label = organizationData.labels.find(l => l.id === item.labelId);
                  const startDate = new Date(item.startDate);
                  const endDate = new Date(item.endDate);
                  
                  return (
                    <div
                      key={item.id}
                      className="group bg-white border border-gray-200 rounded-sm p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-3 h-3 rounded flex-shrink-0"
                              style={{ backgroundColor: activityGroup?.color || '#D1D5DB' }}
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
                              <span>{activityGroup?.name || 'N/A'}</span>
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
                            onClick={() => setEditingAktivitet(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Redigera"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Radera "${item.name}"?`)) {
                                handleDeleteAktivitet(item.id);
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
                  {searchQuery ? 'Inga aktiviteter matchar din sökning' : 'Inga aktiviteter ännu'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>Lägg till aktivitet</span>
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
                  const hasEvents = day && aktiviteterForMonth.some(event => {
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
            <div className="pt-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">
                Aktiviteter denna månad ({aktiviteterForMonth.length})
              </h4>
              {aktiviteterForMonth.length > 0 ? (
                <div className="space-y-2">
                  {aktiviteterForMonth.map(event => {
                    const activityGroup = (organizationData.activityGroups || []).find(a => a.id === event.activityId);
                    const startDate = new Date(event.startDate);
                    const endDate = new Date(event.endDate);
                    
                    return (
                      <div
                        key={event.id}
                        className="group flex items-start gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => setEditingAktivitet(event)}
                      >
                        <div
                          className="w-3 h-3 rounded mt-0.5 flex-shrink-0"
                          style={{ backgroundColor: activityGroup?.color || '#D1D5DB' }}
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
                  Inga aktiviteter denna månad
                </p>
              )}
            </div>
          </div>
        )}

        {activeView === 'disc' && (
        <>
        {/* INNERRINGAR Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection('innerRings')}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              INNERRINGAR
            </h2>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${expandedSections.innerRings ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.innerRings && (
            <>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Innerringar visas mellan centrum och månaderna. Lägg till aktiviteter för att visualisera händelser på dessa ringar.
              </p>

              <div className="space-y-1 mb-2">
                {filteredInnerRings.map((ring) => (
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
                    <div
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: ring.color || '#cccccc' }}
                      title={`Färg: ${ring.color || '#cccccc'} (ändras via färgpalett i inställningar)`}
                    />
                    <input
                      type="text"
                      value={ring.name}
                      onChange={(e) => handleRingNameChange(ring.id, e.target.value)}
                      className="flex-1 text-xs text-gray-700 bg-transparent border-none focus:outline-none focus:bg-white focus:px-1"
                    />
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {countRingItems(ring.id)}
                    </span>
                    <button
                      onClick={() => setIntegrationRing(ring)}
                      className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity relative ${
                        ringIntegrations[ring.id] 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                      title={ringIntegrations[ring.id] ? 'Datakälla ansluten - klicka för att hantera' : 'Koppla datakälla'}
                    >
                      <LinkIcon size={12} />
                      {ringIntegrations[ring.id] && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      )}
                    </button>
                    {innerRings.length > 1 && (
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
                    onClick={() => {
                      const updatedRings = organizationData.rings.map(ring =>
                        ring.type === 'inner' ? { ...ring, visible: true } : ring
                      );
                      onOrganizationChange({ ...organizationData, rings: updatedRings });
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Alla
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => {
                      const updatedRings = organizationData.rings.map(ring =>
                        ring.type === 'inner' ? { ...ring, visible: false } : ring
                      );
                      onOrganizationChange({ ...organizationData, rings: updatedRings });
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Ingen
                  </button>
                </div>
                <button
                  onClick={handleAddInnerRing}
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>Lägg till</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* YTTERRINGAR Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection('outerRings')}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              YTTERRINGAR
            </h2>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${expandedSections.outerRings ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.outerRings && (
            <>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Ytterringar visas utanför månaderna. Använd dem för att kategorisera händelser i avdelningar, team eller målgrupper.
              </p>

              <div className="space-y-1 mb-2">
                {filteredOuterRings.map((ring) => (
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
                    <div
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: ring.color || '#cccccc' }}
                      title={`Färg: ${ring.color || '#cccccc'} (ändras via färgpalett i inställningar)`}
                    />
                    <input
                      type="text"
                      value={ring.name}
                      onChange={(e) => handleRingNameChange(ring.id, e.target.value)}
                      className="flex-1 text-xs text-gray-700 bg-transparent border-none focus:outline-none focus:bg-white focus:px-1"
                    />
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {countRingItems(ring.id)}
                    </span>
                    <button
                      onClick={() => setIntegrationRing(ring)}
                      className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity relative ${
                        ringIntegrations[ring.id] 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                      title={ringIntegrations[ring.id] ? 'Datakälla ansluten - klicka för att hantera' : 'Koppla datakälla'}
                    >
                      <LinkIcon size={12} />
                      {ringIntegrations[ring.id] && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      )}
                    </button>
                    {outerRings.length > 0 && (
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
                    onClick={() => {
                      const updatedRings = organizationData.rings.map(ring =>
                        ring.type === 'outer' ? { ...ring, visible: true } : ring
                      );
                      onOrganizationChange({ ...organizationData, rings: updatedRings });
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Alla
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => {
                      const updatedRings = organizationData.rings.map(ring =>
                        ring.type === 'outer' ? { ...ring, visible: false } : ring
                      );
                      onOrganizationChange({ ...organizationData, rings: updatedRings });
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Ingen
                  </button>
                </div>
                <button
                  onClick={handleAddOuterRing}
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>Lägg till</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* AKTIVITETSGRUPPER Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection('activityGroups')}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              AKTIVITETSGRUPPER
            </h2>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${expandedSections.activityGroups ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.activityGroups && (
            <>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Aktivitetsgrupper används för att färgkoda aktiviteter på hjulet. Varje aktivitet måste tillhöra en grupp.
              </p>

              <div className="space-y-1 mb-2">
                {filteredActivityGroups.map((group) => (
                  <div
                    key={group.id}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={group.visible}
                      onChange={() => toggleActivityGroup(group.id)}
                      className="w-3 h-3 rounded"
                    />
                    <input
                      type="color"
                      value={group.color}
                      onChange={(e) => handleActivityGroupColorChange(group.id, e.target.value)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => handleActivityGroupNameChange(group.id, e.target.value)}
                      className="flex-1 text-xs text-gray-700 bg-transparent border-none focus:outline-none focus:bg-white focus:px-1"
                    />
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {countActivityGroupItems(group.id)}
                    </span>
                    {(organizationData.activityGroups || []).length > 1 && (
                      <button
                        onClick={() => handleRemoveActivityGroup(group.id)}
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
                    onClick={() => handleShowActivityGroups(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Alla
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => handleShowActivityGroups(false)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Ingen
                  </button>
                </div>
                <button
                  onClick={handleAddActivityGroup}
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
      <div className="p-6 border-t border-gray-200 mt-auto flex items-center justify-center">
        <img 
          src="/year_wheel_logo.svg" 
          alt="YearWheel" 
          className="w-44 hover:scale-105 transition-transform"
        />
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <AddAktivitetModal
          organizationData={organizationData}
          onAddAktivitet={handleAddAktivitet}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {/* Edit Item Modal */}
      {editingAktivitet && (
        <EditAktivitetModal
          aktivitet={editingAktivitet}
          organizationData={organizationData}
          onUpdateAktivitet={handleUpdateAktivitet}
          onDeleteAktivitet={handleDeleteAktivitet}
          onClose={() => setEditingAktivitet(null)}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-md my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-sm z-10">
              <h2 className="text-lg font-semibold text-gray-900">Färgpalett och visning</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Färgpalett</h3>
                <p className="text-xs text-gray-500 mb-3">Välj en färgpalett för aktiviteter och ringar</p>
                <div className="space-y-2">
                  <div 
                    onClick={() => {
                      const newColors = ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"];
                      
                      const updatedActivities = (organizationData.activityGroups || []).map((act, index) => ({
                        ...act,
                        color: newColors[index % newColors.length]
                      }));
                      
                      const outerRings = (organizationData.rings || []).filter(r => r.type === 'outer');
                      const updatedRings = (organizationData.rings || []).map((ring) => {
                        if (ring.type === 'outer') {
                          const ringIndex = outerRings.indexOf(ring);
                          const newColor = newColors[ringIndex % newColors.length];
                          return { ...ring, color: newColor };
                        }
                        return ring;
                      });
                      
                      const newOrganizationData = { ...organizationData, activityGroups: updatedActivities, rings: updatedRings };
                      
                      if (onPaletteChange) {
                        onPaletteChange(newColors, newOrganizationData);
                      } else {
                        if (onColorsChange) onColorsChange(newColors);
                        onOrganizationChange(newOrganizationData);
                      }
                    }}
                    className="cursor-pointer p-3 border-2 border-gray-200 hover:border-blue-500 rounded-sm transition-colors"
                  >
                    <div className="flex gap-2 mb-1">
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#F5E6D3' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#A8DCD1' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#F4A896' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#B8D4E8' }}></div>
                    </div>
                    <p className="text-xs text-gray-700 font-medium">Pastell (standard)</p>
                  </div>

                  <div 
                    onClick={() => {
                      const newColors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B"];
                      
                      const updatedActivities = (organizationData.activityGroups || []).map((act, index) => ({
                        ...act,
                        color: newColors[index % newColors.length]
                      }));
                      
                      // Update outer ring colors to match palette
                      const outerRings = (organizationData.rings || []).filter(r => r.type === 'outer');
                      const updatedRings = (organizationData.rings || []).map((ring) => {
                        if (ring.type === 'outer') {
                          const ringIndex = outerRings.indexOf(ring);
                          const newColor = newColors[ringIndex % newColors.length];
                          return { ...ring, color: newColor };
                        }
                        return ring;
                      });
                      
                      const newOrganizationData = { ...organizationData, activityGroups: updatedActivities, rings: updatedRings };
                      
                      if (onPaletteChange) {
                        onPaletteChange(newColors, newOrganizationData);
                      } else {
                        if (onColorsChange) onColorsChange(newColors);
                        onOrganizationChange(newOrganizationData);
                      }
                    }}
                    className="cursor-pointer p-3 border-2 border-gray-200 hover:border-blue-500 rounded-sm transition-colors"
                  >
                    <div className="flex gap-2 mb-1">
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#EF4444' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#10B981' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
                    </div>
                    <p className="text-xs text-gray-700 font-medium">Livlig</p>
                  </div>

                  <div 
                    onClick={() => {
                      const newColors = ["#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
                      
                      const updatedActivities = (organizationData.activityGroups || []).map((act, index) => ({
                        ...act,
                        color: newColors[index % newColors.length]
                      }));
                      
                      const outerRings = (organizationData.rings || []).filter(r => r.type === 'outer');
                      const updatedRings = (organizationData.rings || []).map((ring) => {
                        if (ring.type === 'outer') {
                          const ringIndex = outerRings.indexOf(ring);
                          const newColor = newColors[ringIndex % newColors.length];
                          return { ...ring, color: newColor };
                        }
                        return ring;
                      });
                      
                      const newOrganizationData = { ...organizationData, activityGroups: updatedActivities, rings: updatedRings };
                      
                      if (onPaletteChange) {
                        onPaletteChange(newColors, newOrganizationData);
                      } else {
                        if (onColorsChange) onColorsChange(newColors);
                        onOrganizationChange(newOrganizationData);
                      }
                    }}
                    className="cursor-pointer p-3 border-2 border-gray-200 hover:border-blue-500 rounded-sm transition-colors"
                  >
                    <div className="flex gap-2 mb-1">
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#EC4899' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#06B6D4' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#84CC16' }}></div>
                    </div>
                    <p className="text-xs text-gray-700 font-medium">Modern</p>
                  </div>

                  <div 
                    onClick={() => {
                      const newColors = ["#1E3A8A", "#7C2D12", "#065F46", "#78350F"];
                      
                      const updatedActivities = (organizationData.activityGroups || []).map((act, index) => ({
                        ...act,
                        color: newColors[index % newColors.length]
                      }));
                      
                      const outerRings = (organizationData.rings || []).filter(r => r.type === 'outer');
                      const updatedRings = (organizationData.rings || []).map((ring) => {
                        if (ring.type === 'outer') {
                          const ringIndex = outerRings.indexOf(ring);
                          const newColor = newColors[ringIndex % newColors.length];
                          return { ...ring, color: newColor };
                        }
                        return ring;
                      });
                      
                      const newOrganizationData = { ...organizationData, activityGroups: updatedActivities, rings: updatedRings };
                      
                      if (onPaletteChange) {
                        onPaletteChange(newColors, newOrganizationData);
                      } else {
                        if (onColorsChange) onColorsChange(newColors);
                        onOrganizationChange(newOrganizationData);
                      }
                    }}
                    className="cursor-pointer p-3 border-2 border-gray-200 hover:border-blue-500 rounded-sm transition-colors"
                  >
                    <div className="flex gap-2 mb-1">
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#1E3A8A' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#7C2D12' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#065F46' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#78350F' }}></div>
                    </div>
                    <p className="text-xs text-gray-700 font-medium">Klassisk</p>
                  </div>

                  <div 
                    onClick={() => {
                      const newColors = ["#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB"];
                      
                      const updatedActivities = (organizationData.activityGroups || []).map((act, index) => ({
                        ...act,
                        color: newColors[index % newColors.length]
                      }));
                      
                      const outerRings = (organizationData.rings || []).filter(r => r.type === 'outer');
                      const updatedRings = (organizationData.rings || []).map((ring) => {
                        if (ring.type === 'outer') {
                          const ringIndex = outerRings.indexOf(ring);
                          const newColor = newColors[ringIndex % newColors.length];
                          return { ...ring, color: newColor };
                        }
                        return ring;
                      });
                      
                      const newOrganizationData = { ...organizationData, activityGroups: updatedActivities, rings: updatedRings };
                      
                      if (onPaletteChange) {
                        onPaletteChange(newColors, newOrganizationData);
                      } else {
                        if (onColorsChange) onColorsChange(newColors);
                        onOrganizationChange(newOrganizationData);
                      }
                    }}
                    className="cursor-pointer p-3 border-2 border-gray-200 hover:border-blue-500 rounded-sm transition-colors"
                  >
                    <div className="flex gap-2 mb-1">
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#4B5563' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#6B7280' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#9CA3AF' }}></div>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: '#D1D5DB' }}></div>
                    </div>
                    <p className="text-xs text-gray-700 font-medium">Grayscale</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Visningsalternativ</h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded transition-colors">
                    <span className="text-sm text-gray-600">Visa ringnamn</span>
                    <input
                      type="checkbox"
                      checked={showRingNames}
                      onChange={(e) => onShowRingNamesChange && onShowRingNamesChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded transition-colors">
                    <span className="text-sm text-gray-600">Visa etiketter</span>
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => onShowLabelsChange && onShowLabelsChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ring Integration Modal */}
      {integrationRing && (
        <RingIntegrationModal
          ring={integrationRing}
          onClose={() => setIntegrationRing(null)}
          onSyncComplete={() => {
            // Trigger refresh of wheel data
            // The parent component should handle reloading the wheel
            setIntegrationRing(null);
          }}
        />
      )}
    </div>
  );
}

export default OrganizationPanel;
