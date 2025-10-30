import { Search, Settings, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2, Edit2, X, Link as LinkIcon, Info, GripVertical } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Fuse from 'fuse.js';
import AddItemModal from './AddItemModal';
import EditItemModal from './EditItemModal';
import RingIntegrationModal from './RingIntegrationModal';
import MonthNavigator from './MonthNavigator';
import QuarterNavigator from './QuarterNavigator';
import { getRingIntegrations } from '../services/integrationService';
import { showConfirmDialog } from '../utils/dialogs';

function OrganizationPanel({ 
  organizationData,
  onOrganizationChange,
  title,
  onTitleChange,
  colors,
  onColorsChange,
  onPaletteChange,
  year,
  zoomedMonth,
  zoomedQuarter,
  onZoomToMonth,
  onZoomToQuarter,
  showRingNames,
  onShowRingNamesChange,
  showLabels,
  onShowLabelsChange,
  weekRingDisplayMode,
  onWeekRingDisplayModeChange,
  onSaveToDatabase, // Trigger immediate save
  onReloadData, // Reload wheel data from database
  currentWheelId // For wheel linking
}) {
  const { t } = useTranslation(['editor', 'common']);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('disc'); // disc, liste, kalender
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAktivitet, setEditingAktivitet] = useState(null);
  const [integrationRing, setIntegrationRing] = useState(null); // Ring being configured for integration
  const [ringIntegrations, setRingIntegrations] = useState({}); // Track which rings have integrations: {ringId: true/false}
  const loadingIntegrationsRef = useRef(false);
  const [infoDialog, setInfoDialog] = useState(null); // { title, content } for info dialog
  const [draggedRing, setDraggedRing] = useState(null); // Track which ring is being dragged
  const [dragOverSection, setDragOverSection] = useState(null); // Track which section is being dragged over ('inner' or 'outer')
  
  // Local state for title to avoid updating history on every keystroke
  const [localTitle, setLocalTitle] = useState(title || '');
  
  // Local state for ring names, activity group names, and label names
  const [localRingNames, setLocalRingNames] = useState({});
  const [localActivityGroupNames, setLocalActivityGroupNames] = useState({});
  const [localLabelNames, setLocalLabelNames] = useState({});
  
  // Track which fields are currently being edited (have focus)
  const editingFieldRef = useRef({ type: null, id: null });
  
  // Sync local title when prop changes (e.g., from undo/redo or load)
  useEffect(() => {
    setLocalTitle(title || '');
  }, [title]);
  
  // Sync local ring names when organizationData changes (but not while editing)
  useEffect(() => {
    const ringNamesMap = {};
    organizationData.rings.forEach(ring => {
      // Only update if we're not currently editing this specific ring
      if (editingFieldRef.current.type === 'ring' && editingFieldRef.current.id === ring.id) {
        // Preserve the current local value (even if empty) while editing
        ringNamesMap[ring.id] = localRingNames[ring.id] !== undefined ? localRingNames[ring.id] : ring.name;
      } else {
        ringNamesMap[ring.id] = ring.name;
      }
    });
    setLocalRingNames(ringNamesMap);
  }, [organizationData.rings]);
  
  // Sync local activity group names when organizationData changes (but not while editing)
  useEffect(() => {
    const groupNamesMap = {};
    (organizationData.activityGroups || []).forEach(group => {
      // Only update if we're not currently editing this specific group
      if (editingFieldRef.current.type === 'activityGroup' && editingFieldRef.current.id === group.id) {
        // Preserve the current local value (even if empty) while editing
        groupNamesMap[group.id] = localActivityGroupNames[group.id] !== undefined ? localActivityGroupNames[group.id] : group.name;
      } else {
        groupNamesMap[group.id] = group.name;
      }
    });
    setLocalActivityGroupNames(groupNamesMap);
  }, [organizationData.activityGroups]);
  
  // Sync local label names when organizationData changes (but not while editing)
  useEffect(() => {
    const labelNamesMap = {};
    organizationData.labels.forEach(label => {
      // Only update if we're not currently editing this specific label
      if (editingFieldRef.current.type === 'label' && editingFieldRef.current.id === label.id) {
        labelNamesMap[label.id] = localLabelNames[label.id] || label.name;
      } else {
        labelNamesMap[label.id] = label.name;
      }
    });
    setLocalLabelNames(labelNamesMap);
  }, [organizationData.labels]);
  
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

  // Sync calendar view with zoom state
  useEffect(() => {
    if (zoomedMonth !== null) {
      setSelectedMonth(zoomedMonth);
      setSelectedYear(parseInt(year));
    }
  }, [zoomedMonth, year]);

  // Calendar helpers
  const monthNames = [
    t('common:monthsFull.january'), t('common:monthsFull.february'), t('common:monthsFull.march'),
    t('common:monthsFull.april'), t('common:monthsFull.may'), t('common:monthsFull.june'),
    t('common:monthsFull.july'), t('common:monthsFull.august'), t('common:monthsFull.september'),
    t('common:monthsFull.october'), t('common:monthsFull.november'), t('common:monthsFull.december')
  ];
  const daysOfWeek = [
    t('common:daysShort.monday'), t('common:daysShort.tuesday'), t('common:daysShort.wednesday'),
    t('common:daysShort.thursday'), t('common:daysShort.friday'), t('common:daysShort.saturday'),
    t('common:daysShort.sunday')
  ];
  
  // Calculate current quarter (0-3) from selected month
  const currentQuarter = Math.floor(selectedMonth / 3);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0
  };

  const getWeekNumber = (date) => {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
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
    
    // Remove the ring
    const updatedRings = organizationData.rings.filter(r => r.id !== ringId);
    
    // CRITICAL: Also remove all items on this ring to prevent orphaned items
    const updatedItems = organizationData.items.filter(item => item.ringId !== ringId);
    
    console.log(`[handleRemoveRing] Removing ring ${ringId} and ${organizationData.items.length - updatedItems.length} items`);
    
    onOrganizationChange({ 
      ...organizationData, 
      rings: updatedRings,
      items: updatedItems
    });
  };

  const handleRingNameChange = (ringId, newName) => {
    // Update local state immediately
    setLocalRingNames(prev => ({ ...prev, [ringId]: newName }));
  };
  
  const handleRingNameFocus = (ringId) => {
    // Mark this field as being edited
    editingFieldRef.current = { type: 'ring', id: ringId };
  };
  
  const handleRingNameBlur = (ringId) => {
    // Clear editing state
    editingFieldRef.current = { type: null, id: null };
    
    // Commit to global state on blur
    const newName = localRingNames[ringId];
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

  // Drag and Drop handlers for changing ring type and reordering
  const handleDragStart = (e, ring) => {
    setDraggedRing(ring);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragEnd = () => {
    setDraggedRing(null);
    setDragOverSection(null);
  };

  const handleDragOver = (e, sectionType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(sectionType);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  const handleDragOverRing = (e, targetRing) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedRing && draggedRing.id !== targetRing.id) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDropOnRing = (e, targetRing) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedRing || draggedRing.id === targetRing.id) {
      return;
    }

    const rings = [...organizationData.rings];
    const draggedIndex = rings.findIndex(r => r.id === draggedRing.id);
    const targetIndex = rings.findIndex(r => r.id === targetRing.id);

    // If dragging within same type (reordering)
    if (draggedRing.type === targetRing.type) {
      // Remove dragged ring
      const [removed] = rings.splice(draggedIndex, 1);
      // Insert at target position
      rings.splice(targetIndex, 0, removed);
      
      onOrganizationChange({ ...organizationData, rings });
      setDraggedRing(null);
      return;
    }

    // If dragging to different type (type conversion)
    const updatedRing = { ...draggedRing, type: targetRing.type };
    
    // When converting to outer ring, ensure it has a color
    if (targetRing.type === 'outer' && !updatedRing.color) {
      updatedRing.color = '#' + Math.floor(Math.random()*16777215).toString(16);
    }
    
    // When converting to inner ring, ensure it has data and orientation
    if (targetRing.type === 'inner') {
      if (!updatedRing.data) {
        updatedRing.data = Array.from({ length: 12 }, () => [""]);
      }
      if (!updatedRing.orientation) {
        updatedRing.orientation = 'vertical';
      }
    }

    // Remove from old position
    rings.splice(draggedIndex, 1);
    // Insert at target position
    rings.splice(targetIndex, 0, updatedRing);

    onOrganizationChange({ ...organizationData, rings });
    setDraggedRing(null);
  };

  const handleDrop = (e, targetType) => {
    e.preventDefault();
    setDragOverSection(null);

    if (!draggedRing) {
      return;
    }

    // If same type, don't do anything (reordering is handled by handleDropOnRing)
    if (draggedRing.type === targetType) {
      setDraggedRing(null);
      return;
    }

    // Update ring type (dropping on empty space in different section)
    const updatedRings = organizationData.rings.map(ring => {
      if (ring.id === draggedRing.id) {
        const updatedRing = { ...ring, type: targetType };
        
        // When converting to outer ring, ensure it has a color
        if (targetType === 'outer' && !updatedRing.color) {
          updatedRing.color = '#' + Math.floor(Math.random()*16777215).toString(16);
        }
        
        // When converting to inner ring, ensure it has data and orientation
        if (targetType === 'inner') {
          if (!updatedRing.data) {
            updatedRing.data = Array.from({ length: 12 }, () => [""]);
          }
          if (!updatedRing.orientation) {
            updatedRing.orientation = 'vertical';
          }
        }
        
        return updatedRing;
      }
      return ring;
    });

    onOrganizationChange({ ...organizationData, rings: updatedRings });
    setDraggedRing(null);
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
    // Update local state immediately
    setLocalActivityGroupNames(prev => ({ ...prev, [groupId]: newName }));
  };
  
  const handleActivityGroupNameFocus = (groupId) => {
    // Mark this field as being edited
    editingFieldRef.current = { type: 'activityGroup', id: groupId };
  };
  
  const handleActivityGroupNameBlur = (groupId) => {
    // Clear editing state
    editingFieldRef.current = { type: null, id: null };
    
    // Commit to global state on blur
    const newName = localActivityGroupNames[groupId];
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
    // Update local state immediately
    setLocalLabelNames(prev => ({ ...prev, [labelId]: newName }));
  };
  
  const handleLabelNameFocus = (labelId) => {
    // Mark this field as being edited
    editingFieldRef.current = { type: 'label', id: labelId };
  };
  
  const handleLabelNameBlur = (labelId) => {
    // Clear editing state
    editingFieldRef.current = { type: null, id: null };
    
    // Commit to global state on blur
    const newName = localLabelNames[labelId];
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
            <h1 className="text-base font-semibold text-gray-900">{t('editor:title')}</h1>
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
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={(e) => {
              const trimmedValue = e.target.value.trim();
              if (trimmedValue !== title) {
                onTitleChange && onTitleChange(trimmedValue || title);
              }
            }}
            placeholder={t('editor:wheelTitle.placeholder')}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1 italic">{t('editor:wheelTitle.autoSave')}</p>
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
            {t('editor:tabs.disc')}
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
            {t('editor:tabs.list')}
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
            {t('editor:tabs.calendar')}
            {activeView === 'kalender' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveView('zoom')}
            className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
              activeView === 'zoom'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('editor:tabs.zoom', 'Zoom')}
            {activeView === 'zoom' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
        </div>

        {/* Zoom Status Indicator - Show when zoomed in */}
        {(zoomedMonth !== null || zoomedQuarter !== null) && activeView !== 'zoom' && (
          <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-blue-900">
                {t('zoom:zoomedIn')}
                {zoomedMonth !== null && `: ${t(`common:months.${zoomedMonth}`)}`}
                {zoomedQuarter !== null && `: Q${zoomedQuarter + 1}`}
              </span>
            </div>
            <button
              onClick={() => {
                if (zoomedMonth !== null) onZoomToMonth(null);
                if (zoomedQuarter !== null) onZoomToQuarter(null);
              }}
              className="text-xs text-blue-700 hover:text-blue-900 font-medium underline"
            >
              {t('zoom:clickToReset')}
            </button>
          </div>
        )}

        {/* Search - Only show in Liste view */}
        {activeView === 'liste' && (
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('editor:search.placeholder')}
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
          <div className="text-xs font-medium text-gray-700">{t('editor:filter.title')}</div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            data-onboarding="add-activity"
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            <span>{t('editor:activities.addActivity')}</span>
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
                {t('editor:activities.count', { count: filteredAktiviteter.length })}
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
                            onClick={async () => {
                              const confirmed = await showConfirmDialog({
                                title: t('editor:activities.deleteTitle', { defaultValue: 'Radera aktivitet' }),
                                message: t('editor:activities.deleteConfirmMessage', { name: item.name }),
                                confirmText: t('common:actions.delete', { defaultValue: 'Radera' }),
                                cancelText: t('common:actions.cancel', { defaultValue: 'Avbryt' }),
                                confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
                              });
                              if (confirmed) {
                                handleDeleteAktivitet(item.id);
                              }
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={t('common:actions.delete')}
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
                  {searchQuery ? t('editor:activities.noSearchResults') : t('editor:activities.empty')}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>{t('editor:activities.addActivity')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === 'kalender' && (
          <div className="p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  const newDate = new Date(selectedYear, selectedMonth - 1, 1);
                  setSelectedMonth(newDate.getMonth());
                  setSelectedYear(newDate.getFullYear());
                }}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <h3 className="text-base font-semibold text-gray-900">
                {monthNames[selectedMonth]} {selectedYear}
              </h3>
              <button
                onClick={() => {
                  const newDate = new Date(selectedYear, selectedMonth + 1, 1);
                  setSelectedMonth(newDate.getMonth());
                  setSelectedYear(newDate.getFullYear());
                }}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Timeline View - Activities grouped by day */}
            <div className="space-y-1">
              {aktiviteterForMonth.length > 0 ? (
                (() => {
                  // Group activities by start date
                  const activitiesByDate = aktiviteterForMonth.reduce((acc, event) => {
                    const startDate = new Date(event.startDate);
                    const dateKey = `${startDate.getFullYear()}-${startDate.getMonth()}-${startDate.getDate()}`;
                    if (!acc[dateKey]) {
                      acc[dateKey] = {
                        date: startDate,
                        activities: []
                      };
                    }
                    acc[dateKey].activities.push(event);
                    return acc;
                  }, {});

                  // Sort by date
                  const sortedDates = Object.values(activitiesByDate).sort(
                    (a, b) => a.date - b.date
                  );

                  return sortedDates.map(({ date, activities }) => {
                    const weekNumber = getWeekNumber(date);
                    const dayName = daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1];
                    
                    return (
                      <div key={date.toISOString()} className="mb-4">
                        {/* Date Header */}
                        <div className="flex items-baseline gap-2 mb-2 px-2">
                          <span className="text-xs font-semibold text-gray-900">
                            {dayName} {date.getDate()} {monthNames[date.getMonth()].slice(0, 3)}
                          </span>
                          <span className="text-xs text-gray-400">
                            v.{weekNumber}
                          </span>
                        </div>
                        
                        {/* Activities for this date */}
                        <div className="space-y-1 pl-4 border-l-2 border-gray-200">
                          {activities.map(event => {
                            const activityGroup = (organizationData.activityGroups || []).find(a => a.id === event.activityId);
                            const ring = organizationData.rings.find(r => r.id === event.ringId);
                            const endDate = new Date(event.endDate);
                            const isSameDay = date.toDateString() === endDate.toDateString();
                            
                            return (
                              <div
                                key={event.id}
                                className="group flex items-start gap-2 p-2 bg-white border border-gray-200 rounded hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                                onClick={() => setEditingAktivitet(event)}
                              >
                                <div
                                  className="w-1 h-full rounded flex-shrink-0 -ml-2"
                                  style={{ backgroundColor: activityGroup?.color || '#D1D5DB' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 mb-0.5">
                                    {event.name}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{ring?.name}</span>
                                    {!isSameDay && (
                                      <>
                                        <span>•</span>
                                        <span>till {endDate.getDate()} {monthNames[endDate.getMonth()].slice(0, 3)}</span>
                                      </>
                                    )}
                                    {event.time && (
                                      <>
                                        <span>•</span>
                                        <span>{event.time}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <Edit2 size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500 mb-4">
                    {t('editor:calendar.noActivities')}
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>{t('editor:activities.addActivity')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'zoom' && (
          <>
            {/* MÅNADER Section */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="w-full flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {t('zoom:months.title')}
                </h2>
                <span className="text-xs text-gray-500">
                  {organizationData.items?.length || 0} {t('zoom:activities')}
                </span>
              </div>
              
              <MonthNavigator
                year={year}
                currentMonth={zoomedMonth}
                organizationData={organizationData}
                onMonthSelect={onZoomToMonth}
                onResetZoom={() => onZoomToMonth(null)}
              />
            </div>
            
            {/* KVARTAL Section */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="w-full flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {t('zoom:quarters.title')}
                </h2>
                <span className="text-xs text-gray-500">
                  {organizationData.items?.length || 0} {t('zoom:activities')}
                </span>
              </div>
              
              <QuarterNavigator
                year={year}
                currentQuarter={zoomedQuarter}
                organizationData={organizationData}
                onQuarterSelect={onZoomToQuarter}
                onResetZoom={() => onZoomToQuarter(null)}
              />
            </div>
          </>
        )}

        {activeView === 'disc' && (
        <>
        {/* INNERRINGAR Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="w-full flex items-center justify-between mb-2">
            <button
              onClick={() => setInfoDialog({
                title: t('editor:rings.innerRings'),
                content: t('editor:rings.innerDescription')
              })}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {t('editor:rings.innerRings')}
              </h2>
              <Info size={12} className="text-blue-600" />
            </button>
            <button
              onClick={() => toggleSection('innerRings')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronDown 
                size={14} 
                className={`text-gray-400 transition-transform ${expandedSections.innerRings ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {expandedSections.innerRings && (
            <>

              <div 
                className={`space-y-1 mb-2 rounded-sm transition-colors ${
                  dragOverSection === 'inner' ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, 'inner')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'inner')}
              >
                {filteredInnerRings.length === 0 ? (
                  <div className="px-3 py-4 text-center border-2 border-dashed border-gray-200 rounded-sm bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">
                      {t('editor:rings.noInnerRings')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('editor:rings.dragHereOrAdd')}
                    </p>
                  </div>
                ) : (
                  filteredInnerRings.map((ring) => (
                  <div
                    key={ring.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ring)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOverRing(e, ring)}
                    onDrop={(e) => handleDropOnRing(e, ring)}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors cursor-move ${
                      draggedRing?.id === ring.id ? 'opacity-50' : ''
                    } ${
                      draggedRing && draggedRing.id !== ring.id && draggedRing.type === 'inner' 
                        ? 'border-t-2 border-blue-400' 
                        : ''
                    }`}
                  >
                    <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="checkbox"
                      checked={ring.visible}
                      onChange={() => toggleRing(ring.id)}
                      className="w-3 h-3 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <input
                      type="text"
                      value={localRingNames[ring.id] !== undefined ? localRingNames[ring.id] : ring.name}
                      onChange={(e) => handleRingNameChange(ring.id, e.target.value)}
                      onFocus={() => handleRingNameFocus(ring.id)}
                      onBlur={() => handleRingNameBlur(ring.id)}
                      onMouseDown={(e) => e.stopPropagation()}
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
                      title={ringIntegrations[ring.id] ? t('editor:rings.integrationConnected') : t('editor:rings.integrationConnect')}
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
                ))
                )}
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
                    {t('common:labels.none')}
                  </button>
                </div>
                <button
                  onClick={handleAddInnerRing}
                  data-onboarding="add-inner-ring"
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>{t('common:actions.add')}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* YTTERRINGAR Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="w-full flex items-center justify-between mb-2">
            <button
              onClick={() => setInfoDialog({
                title: t('editor:rings.outerRings'),
                content: t('editor:rings.outerDescription')
              })}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {t('editor:rings.outerRings')}
              </h2>
              <Info size={12} className="text-blue-600" />
            </button>
            <button
              onClick={() => toggleSection('outerRings')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronDown 
                size={14} 
                className={`text-gray-400 transition-transform ${expandedSections.outerRings ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {expandedSections.outerRings && (
            <>

              <div 
                className={`space-y-1 mb-2 rounded-sm transition-colors ${
                  dragOverSection === 'outer' ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, 'outer')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'outer')}
              >
                {filteredOuterRings.length === 0 ? (
                  <div className="px-3 py-4 text-center border-2 border-dashed border-gray-200 rounded-sm bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">
                      {t('editor:rings.noOuterRings')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('editor:rings.dragHereOrAdd')}
                    </p>
                  </div>
                ) : (
                  filteredOuterRings.map((ring) => (
                  <div
                    key={ring.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ring)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOverRing(e, ring)}
                    onDrop={(e) => handleDropOnRing(e, ring)}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors cursor-move ${
                      draggedRing?.id === ring.id ? 'opacity-50' : ''
                    } ${
                      draggedRing && draggedRing.id !== ring.id && draggedRing.type === 'outer' 
                        ? 'border-t-2 border-blue-400' 
                        : ''
                    }`}
                  >
                    <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="checkbox"
                      checked={ring.visible}
                      onChange={() => toggleRing(ring.id)}
                      className="w-3 h-3 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: ring.color || '#cccccc' }}
                      title={ring.color || '#cccccc'}
                    />
                    <input
                      type="text"
                      value={localRingNames[ring.id] !== undefined ? localRingNames[ring.id] : ring.name}
                      onChange={(e) => handleRingNameChange(ring.id, e.target.value)}
                      onFocus={() => handleRingNameFocus(ring.id)}
                      onBlur={() => handleRingNameBlur(ring.id)}
                      onMouseDown={(e) => e.stopPropagation()}
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
                      title={ringIntegrations[ring.id] ? t('editor:rings.integrationConnected') : t('editor:rings.integrationConnect')}
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
                ))
                )}
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
                    {t('common:labels.none')}
                  </button>
                </div>
                <button
                  onClick={handleAddOuterRing}
                  data-onboarding="add-outer-ring"
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>{t('common:actions.add')}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* AKTIVITETSGRUPPER Section */}
        <div className="px-4 py-3 border-b border-gray-200" data-onboarding="activity-groups">
          <div className="w-full flex items-center justify-between mb-2">
            <button
              onClick={() => setInfoDialog({
                title: t('editor:activityGroups.title'),
                content: t('editor:activityGroups.description')
              })}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {t('editor:activityGroups.title')}
              </h2>
              <Info size={12} className="text-blue-600" />
            </button>
            <button
              onClick={() => toggleSection('activityGroups')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronDown 
                size={14} 
                className={`text-gray-400 transition-transform ${expandedSections.activityGroups ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {expandedSections.activityGroups && (
            <>

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
                      value={group.color || '#3B82F6'}
                      onChange={(e) => handleActivityGroupColorChange(group.id, e.target.value)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localActivityGroupNames[group.id] !== undefined ? localActivityGroupNames[group.id] : group.name}
                      onChange={(e) => handleActivityGroupNameChange(group.id, e.target.value)}
                      onFocus={() => handleActivityGroupNameFocus(group.id)}
                      onBlur={() => handleActivityGroupNameBlur(group.id)}
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
                    {t('common:labels.none')}
                  </button>
                </div>
                <button
                  onClick={handleAddActivityGroup}
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>{t('common:actions.add')}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* LABELS Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="w-full flex items-center justify-between mb-2">
            <button
              onClick={() => setInfoDialog({
                title: t('editor:labels.title'),
                content: t('editor:labels.description')
              })}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {t('editor:labels.title')}
              </h2>
              <Info size={12} className="text-blue-600" />
            </button>
            <button
              onClick={() => toggleSection('labels')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronDown 
                size={14} 
                className={`text-gray-400 transition-transform ${expandedSections.labels ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

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
                      value={label.color || '#10B981'}
                      onChange={(e) => handleLabelColorChange(label.id, e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localLabelNames[label.id] || label.name}
                      onChange={(e) => handleLabelNameChange(label.id, e.target.value)}
                      onFocus={() => handleLabelNameFocus(label.id)}
                      onBlur={() => handleLabelNameBlur(label.id)}
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
                    {t('common:labels.none')}
                  </button>
                </div>
                <button
                  onClick={handleAddLabel}
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>{t('common:actions.add')}</span>
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
        <AddItemModal
          organizationData={organizationData}
          onAddItem={handleAddAktivitet}
          onClose={() => setIsAddModalOpen(false)}
          currentWheelId={currentWheelId}
        />
      )}

      {/* Edit Item Modal */}
      {editingAktivitet && (
        <EditItemModal
          item={editingAktivitet}
          organizationData={organizationData}
          currentWheelId={currentWheelId}
          onUpdateItem={handleUpdateAktivitet}
          onDeleteItem={handleDeleteAktivitet}
          onClose={() => setEditingAktivitet(null)}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-md my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-sm z-10">
              <h2 className="text-lg font-semibold text-gray-900">{t('editor:settings.title')}</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t('editor:settings.colorPalette')}</h3>
                <p className="text-xs text-gray-500 mb-3">{t('editor:settings.colorPaletteDescription')}</p>
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
                    <p className="text-xs text-gray-700 font-medium">{t('editor:settings.palettePastel')}</p>
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
                    <p className="text-xs text-gray-700 font-medium">{t('editor:settings.paletteVibrant')}</p>
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
                    <p className="text-xs text-gray-700 font-medium">{t('editor:settings.paletteModern')}</p>
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
                    <p className="text-xs text-gray-700 font-medium">{t('editor:settings.paletteClassic')}</p>
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
                <h3 className="text-sm font-medium text-gray-700 mb-3">{t('editor:settings.displayOptions')}</h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded transition-colors">
                    <span className="text-sm text-gray-600">{t('editor:settings.showRingNames')}</span>
                    <input
                      type="checkbox"
                      checked={showRingNames}
                      onChange={(e) => onShowRingNamesChange && onShowRingNamesChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-600">{t('editor:settings.showLabelsAlways')}</span>
                      <span className="text-xs text-gray-400">{t('editor:settings.showLabelsHint')}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => onShowLabelsChange && onShowLabelsChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-600">{t('editor:settings.weekRingDisplay')}</span>
                      <span className="text-xs text-gray-400">{t('editor:settings.weekRingDisplayHint')}</span>
                    </div>
                    <select
                      value={weekRingDisplayMode}
                      onChange={(e) => onWeekRingDisplayModeChange && onWeekRingDisplayModeChange(e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="week-numbers">{t('editor:settings.weekNumbers')}</option>
                      <option value="dates">{t('editor:settings.dates')}</option>
                    </select>
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
          onSyncComplete={async () => {
            // Reload wheel data to get synced items
            console.log('[OrganizationPanel] Sync complete, reloading wheel data...');
            if (onReloadData) {
              await onReloadData();
              console.log('[OrganizationPanel] Wheel data reloaded successfully');
            }
            // Don't close modal automatically - let user see the success message
            // setIntegrationRing(null);
          }}
        />
      )}

      {/* Info Dialog */}
      {infoDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">{infoDialog.title}</h2>
              <button
                onClick={() => setInfoDialog(null)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 leading-relaxed">{infoDialog.content}</p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setInfoDialog(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {t('common:actions.ok', { defaultValue: 'OK' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationPanel;
