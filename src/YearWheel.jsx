/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import YearWheelClass from "./YearWheelClass";
import ItemTooltip from "./components/ItemTooltip";
import EditItemModal from "./components/EditItemModal";
import BulkActionsToolbar from "./components/BulkActionsToolbar";

// Helper function to show confirm dialog
const showConfirmDialog = (title, message, confirmText, cancelText, confirmButtonClass = 'bg-blue-600 hover:bg-blue-700 text-white') => {
  return new Promise((resolve) => {
    const event = new CustomEvent('showConfirmDialog', {
      detail: {
        title,
        message,
        confirmText,
        cancelText,
        confirmButtonClass,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      }
    });
    window.dispatchEvent(event);
  });
};

function YearWheel({
  wheelId,
  wheelData,
  ringsData,
  title,
  year,
  colors,
  organizationData,
  showYearEvents,
  showSeasonRing,
  yearEventsCollection,
  showWeekRing,
  showMonthRing,
  showRingNames,
  showLabels,
  weekRingDisplayMode,
  zoomedMonth,
  zoomedQuarter,
  onSetZoomedMonth,
  onSetZoomedQuarter,
  initialRotation = 0,
  onRotationChange,
  onWheelReady,
  onDragStart,
  onUpdateAktivitet,
  onDeleteAktivitet,
  onItemClick, // External callback for item clicks (e.g., cast to TV)
  readonly = false,
  hideControls = false,
  broadcastActivity,
  activeEditors = [],
  broadcastOperation,
  renderSize = 2000, // Canvas render resolution (higher = better quality)
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const notifiedWheelRef = useRef(null); // Track which wheel instance was notified
  const hasAutoFittedRef = useRef(false); // Track if we've done initial auto-fit
  const [zoomLevel, setZoomLevel] = useState(100); // Percentage: 50% to 200%, default 100%
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Pan offset in pixels
  const [events, setEvents] = useState([]);
  const [yearWheel, setYearWheel] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinSpeed, setSpinSpeed] = useState('medium'); // 'slow', 'medium', 'fast'
  const [isWheelReady, setIsWheelReady] = useState(false); // Track if wheel is ready to show
  const [selectedItem, setSelectedItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  
  // Multi-select mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  const { t, i18n } = useTranslation(['common']);
  
  // Broadcast editing activity when item modal opens/closes from canvas
  useEffect(() => {
    if (!broadcastActivity) return;
    
    if (editingItem) {
      // User started editing an item
      broadcastActivity('editing', {
        itemId: editingItem.id,
        itemName: editingItem.name || 'Unnamed item',
      });
    } else {
      // User stopped editing
      broadcastActivity('viewing');
    }
  }, [editingItem, broadcastActivity]);
  
  // CRITICAL: Filter organizationData to only include items for the current year
  // This prevents cross-page pollution in the canvas rendering
  const yearFilteredOrgData = useMemo(() => {
    if (!organizationData || !organizationData.items) return organizationData;
    
    const currentYear = parseInt(year);
    const filteredItems = organizationData.items.filter(item => {
      const startYear = new Date(item.startDate).getFullYear();
      const endYear = new Date(item.endDate).getFullYear();
      // Include item if it overlaps with the year
      return startYear <= currentYear && endYear >= currentYear;
    });
    
    return {
      ...organizationData,
      items: filteredItems
    };
  }, [organizationData, year]);
  
  const monthNames = useMemo(() => [
    t('common:monthsFull.january'),
    t('common:monthsFull.february'),
    t('common:monthsFull.march'),
    t('common:monthsFull.april'),
    t('common:monthsFull.may'),
    t('common:monthsFull.june'),
    t('common:monthsFull.july'),
    t('common:monthsFull.august'),
    t('common:monthsFull.september'),
    t('common:monthsFull.october'),
    t('common:monthsFull.november'),
    t('common:monthsFull.december')
  ], [t, i18n.language]);

  const maintainScrollCenter = useCallback((zoomChangeCallback) => {
    if (!scrollContainerRef.current) {
      zoomChangeCallback();
      return;
    }
    
    const container = scrollContainerRef.current;
    
    // Get current vertical scroll position as percentage of scrollable area
    const scrollYPercent = container.scrollHeight > container.clientHeight
      ? container.scrollTop / (container.scrollHeight - container.clientHeight)
      : 0.5;
    
    // Apply zoom change
    zoomChangeCallback();
    
    // Restore vertical scroll position after DOM updates (horizontal is auto-centered by flexbox)
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        const c = scrollContainerRef.current;
        c.scrollTop = scrollYPercent * (c.scrollHeight - c.clientHeight);
      }
    });
  }, []);
  
  const zoomIn = () => {
    maintainScrollCenter(() => {
      setZoomLevel(prev => Math.min(prev + 10, 200));
    });
  };
  
  const zoomOut = () => {
    maintainScrollCenter(() => {
      setZoomLevel(prev => Math.max(prev - 10, 50));
    });
  };
  
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Base display size at 100% zoom is 1000px
    const baseDisplaySize = 1000;
    
    // Calculate zoom to fit (with some padding)
    const widthZoom = (containerWidth * 0.9 / baseDisplaySize) * 100;
    const heightZoom = ((containerHeight - 80) * 0.9 / baseDisplaySize) * 100; // 80px for toolbar
    
    const optimalZoom = Math.min(widthZoom, heightZoom, 200);
    setZoomLevel(Math.max(50, Math.floor(optimalZoom)));
    
    // Center the vertical scroll position after zoom change
    setPanOffset({ x: 0, y: 0 });
    
    // Center vertical scroll after zoom is applied (horizontal is auto-centered)
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
      }
    }, 50);
  }, []);
  
  // Auto-fit on initial load
  useEffect(() => {
    if (!hasAutoFittedRef.current && containerRef.current) {
      // Small delay to ensure container has rendered with correct dimensions
      const timer = setTimeout(() => {
        fitToScreen();
        hasAutoFittedRef.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fitToScreen]);
  
  // Pan navigation functions
  const panStep = 100; // pixels to move per arrow click
  
  const panUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop -= panStep;
    }
  };
  
  const panDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop += panStep;
    }
  };
  
  const panLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft -= panStep;
    }
  };
  
  const panRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += panStep;
    }
  };

  // Use refs to avoid recreating callbacks (which would destroy the wheel instance)
  const onDragStartRef = useRef(onDragStart);
  const onUpdateAktivitetRef = useRef(onUpdateAktivitet);
  const onDeleteAktivitetRef = useRef(onDeleteAktivitet);

  // Keep refs up to date
  useEffect(() => {
    onDragStartRef.current = onDragStart;
    onUpdateAktivitetRef.current = onUpdateAktivitet;
    onDeleteAktivitetRef.current = onDeleteAktivitet;
  }, [onDragStart, onUpdateAktivitet, onDeleteAktivitet]);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      const newMode = !prev;
      // Clear selections when exiting selection mode
      if (!newMode) {
        setSelectedItems(new Set());
      }
      // Always close tooltip when toggling selection mode
      setSelectedItem(null);
      setTooltipPosition(null);
      return newMode;
    });
  }, []);

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Bulk operations
  const handleBulkMoveToRing = useCallback((ringId) => {
    if (onUpdateAktivitetRef.current && selectedItems.size > 0) {
      selectedItems.forEach(itemId => {
        const item = organizationData.items.find(i => i.id === itemId);
        if (item) {
          onUpdateAktivitetRef.current({ ...item, ringId });
        }
      });
      clearSelections();
    }
  }, [selectedItems, organizationData, clearSelections]);

  const handleBulkChangeActivityGroup = useCallback((activityId) => {
    if (onUpdateAktivitetRef.current && selectedItems.size > 0) {
      selectedItems.forEach(itemId => {
        const item = organizationData.items.find(i => i.id === itemId);
        if (item) {
          onUpdateAktivitetRef.current({ ...item, activityId });
        }
      });
      clearSelections();
    }
  }, [selectedItems, organizationData, clearSelections]);

  const handleBulkDelete = useCallback(async () => {
    if (onDeleteAktivitetRef.current && selectedItems.size > 0) {
      // Confirm before deleting
      const confirmMessage = selectedItems.size === 1
        ? t('common:selection.confirmDeleteOne', { count: selectedItems.size })
        : t('common:selection.confirmDelete', { count: selectedItems.size });
      
      const confirmed = await showConfirmDialog(
        t('common:actions.delete'),
        confirmMessage,
        t('common:actions.delete'),
        t('common:actions.cancel'),
        'bg-red-600 hover:bg-red-700 text-white'
      );
      
      if (confirmed) {
        selectedItems.forEach(itemId => {
          onDeleteAktivitetRef.current(itemId);
        });
        clearSelections();
      }
    }
  }, [selectedItems, clearSelections, t]);

  const handleItemClick = useCallback((item, position) => {
    // If external click handler provided (e.g., for casting), call it
    // This takes priority over all other modes
    if (onItemClick) {
      onItemClick(item);
      return;
    }
    
    // In selection mode, ONLY toggle item selection (no tooltip, no other actions)
    if (selectionMode) {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
      return; // Early return - don't show tooltip in selection mode
    }
    
    // Normal mode: show tooltip only
    setSelectedItem(item);
    
    // Position tooltip at upper left of container with some padding
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + 20,  // 20px padding from left edge
        y: rect.top + 20    // 20px padding from top edge
      });
    } else {
      // Fallback to click position if container ref not available
      setTooltipPosition(position);
    }
  }, [onItemClick, selectionMode]);

  const handleDragStart = useCallback((item) => {
    if (onDragStartRef.current) {
      onDragStartRef.current(item);
    }
  }, []); // Empty deps - uses ref

  const handleUpdateAktivitet = useCallback((updatedItem) => {
    if (onUpdateAktivitetRef.current) {
      onUpdateAktivitetRef.current(updatedItem);
    }
  }, []); // Empty deps - uses ref

  const handleDeleteAktivitet = useCallback((itemId) => {
    if (onDeleteAktivitetRef.current) {
      onDeleteAktivitetRef.current(itemId);
    }
  }, []); // Empty deps - uses ref

  useEffect(() => {
    setEvents(yearEventsCollection || []);
  }, [year, yearEventsCollection]);
  
  // Sync selectedMonthIndex with zoomedMonth prop (only when prop changes from outside)
  useEffect(() => {
    // Only update if the change came from outside (e.g., from calendar sidebar)
    if (zoomedMonth !== null) {
      setSelectedMonthIndex(zoomedMonth);
    } else if (zoomedMonth === null && zoomedQuarter === null) {
      setSelectedMonthIndex(null);
    }
    
    // Update YearWheelClass instance with new zoom state
    if (yearWheel && yearWheel.updateZoomState) {
      yearWheel.updateZoomState(zoomedMonth, zoomedQuarter);
    }
  }, [zoomedMonth, zoomedQuarter, yearWheel]);

  // Center vertical scroll position after wheel is created and layout is complete, then fade in
  useEffect(() => {
    if (!scrollContainerRef.current || !canvasRef.current || !yearWheel) return;
    
    const centerScrollPosition = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      // Center the vertical scroll only (horizontal is centered by flexbox)
      const scrollTop = (container.scrollHeight - container.clientHeight) / 2;
      container.scrollTop = scrollTop;
    };
    
    // Center immediately and show wheel right after centering
    centerScrollPosition();
    
    // Use requestAnimationFrame for smoother timing
    requestAnimationFrame(() => {
      centerScrollPosition();
      // Show wheel after one frame to ensure centering is complete
      requestAnimationFrame(() => {
        setIsWheelReady(true);
      });
    });
  }, [yearWheel]); // Re-center when wheel instance changes
  
  // Apply zoom to canvas display size (separate from wheel creation)
  // Base display size is 1000px at 100% zoom (50% of internal 2000px resolution)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const baseDisplaySize = 1000; // 100% zoom = 1000px display
    const displaySize = baseDisplaySize * (zoomLevel / 100);
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    canvas.style.maxWidth = 'none';
    canvas.style.aspectRatio = '1 / 1';
  }, [zoomLevel]);

  // Create and render the wheel
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Set wheel as not ready immediately when starting new creation
    setIsWheelReady(false);
    
    const canvas = canvasRef.current;
    // Use provided render size (default 2000px, can be higher for TV displays)
    canvas.width = renderSize;
    canvas.height = renderSize;

    // Create the YearWheel instance
    const newYearWheel = new YearWheelClass(
      canvas,
      year,
      title,
      colors,
      renderSize,
      yearEventsCollection,
      {
        showYearEvents,
        showSeasonRing,
        ringsData,
        organizationData: yearFilteredOrgData, // CRITICAL: Pass year-filtered data to canvas
        showWeekRing,
        showMonthRing,
        showRingNames,
        showLabels,
        weekRingDisplayMode,
        zoomedMonth,
        zoomedQuarter,
        monthNames,
        zoomLevel, // Pass zoom level for smart text scaling
        onItemClick: handleItemClick,
        onDragStart: handleDragStart,
        onUpdateAktivitet: handleUpdateAktivitet,
        onRotationChange, // Pass rotation callback for casting sync
        selectionMode,
        selectedItems: Array.from(selectedItems),
        readonly, // Pass readonly to disable interactions
        activeEditors, // Pass active editors for real-time collaboration
        broadcastOperation, // Pass broadcast function for real-time operations
      }
    );
    
    setYearWheel(newYearWheel);
    newYearWheel.create();
    
    // Stop spinning when wheel is recreated to prevent animation accumulation
    setIsSpinning(false);

    // Cleanup function to remove event listeners from old instance
    return () => {
      if (newYearWheel && newYearWheel.cleanup) {
        newYearWheel.cleanup();
      }
    };
  }, [
    ringsData,
    title,
    year,
    colors,
    showYearEvents,
    showSeasonRing,
    yearEventsCollection,
    showWeekRing,
    showMonthRing,
    showRingNames,
    showLabels,
    weekRingDisplayMode,
    renderSize, // Include renderSize to recreate wheel when resolution changes
    // zoomedMonth and zoomedQuarter excluded - updated via updateZoomState to prevent wheel recreation
    monthNames,
    handleItemClick,
    handleDragStart,
    handleUpdateAktivitet,
    // organizationData excluded - updated via updateOrganizationData to prevent wheel recreation during drag
  ]);

  // Update organization data without recreating the wheel instance
  // This preserves drag state and prevents wheel from going blank during drag
  useEffect(() => {
    if (yearWheel && yearFilteredOrgData) {
      yearWheel.updateOrganizationData(yearFilteredOrgData);
    }
  }, [yearFilteredOrgData, yearWheel]);

  // Update rotation angle from external source (casting)
  useEffect(() => {
    if (yearWheel && initialRotation !== undefined) {
      yearWheel.rotationAngle = initialRotation;
      yearWheel.create(); // Redraw with new rotation
    }
  }, [initialRotation, yearWheel]);
  
  // Update zoom level for smart text scaling (without recreating wheel)
  useEffect(() => {
    if (yearWheel && yearWheel.updateZoomLevel) {
      yearWheel.updateZoomLevel(zoomLevel);
    }
  }, [zoomLevel, yearWheel]);
  
  // Update selection mode and selected items (without recreating wheel)
  useEffect(() => {
    if (yearWheel && yearWheel.updateSelection) {
      yearWheel.updateSelection(selectionMode, Array.from(selectedItems));
    }
    
    // Close tooltip when entering selection mode
    if (selectionMode) {
      setSelectedItem(null);
      setTooltipPosition(null);
    }
  }, [selectionMode, selectedItems, yearWheel]);
  
  // Update active editors for real-time collaboration (without recreating wheel)
  useEffect(() => {
    if (yearWheel && yearWheel.updateActiveEditors) {
      yearWheel.updateActiveEditors(activeEditors);
    }
  }, [activeEditors, yearWheel]);

  // Notify parent when wheel instance changes (only once per instance)
  // Expose yearWheel methods to parent via onWheelReady
  useEffect(() => {
    if (yearWheel && yearWheel !== notifiedWheelRef.current) {
      notifiedWheelRef.current = yearWheel;
      if (onWheelReady) {
        // Attach custom methods to yearWheel instance
        yearWheel.openItemTooltip = (itemId) => {
          const item = organizationData?.items?.find(i => i.id === itemId);
          if (item) {
            // Calculate center position for tooltip
            const tooltipPos = {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            };
            setSelectedItem(item);
            setTooltipPosition(tooltipPos);
          }
        };
        
        onWheelReady(yearWheel);
      }
    }
  }, [yearWheel, onWheelReady, organizationData]);

  const toggleSpinning = () => {
    if (!yearWheel) return; // Safety check
    
    if (isSpinning) {
      yearWheel.stopSpinning();
      setIsSpinning(false);
    } else {
      // Speed mapping: slow = 0.08 rad/s, medium = 0.15 rad/s, fast = 0.30 rad/s
      const speedMap = { slow: 0.08, medium: 0.15, fast: 0.30 };
      yearWheel.startSpinning(speedMap[spinSpeed]);
      setIsSpinning(true);
    }
  };

  const handleSpeedChange = (newSpeed) => {
    setSpinSpeed(newSpeed);
    if (isSpinning && yearWheel) {
      // Update speed on the fly if already spinning
      const speedMap = { slow: 0.08, medium: 0.15, fast: 0.30 };
      yearWheel.setAnimationSpeed(speedMap[newSpeed]);
    }
  };

  return (
    <div ref={containerRef} className="relative flex flex-col w-full h-full">
      <div 
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-auto bg-white transition-opacity duration-150"
        style={{ opacity: isWheelReady ? 1 : 0 }}
      >
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // Smooth progressive padding based on zoom level (no hard cutoff!)
          // At 100%: 0% padding, At 150%: 25% padding, At 200%: 50% padding
          minHeight: zoomLevel > 100 ? `${100 + (zoomLevel - 100)}%` : '100%',
          minWidth: zoomLevel > 100 ? `${100 + (zoomLevel - 100)}%` : '100%',
          width: zoomLevel > 100 ? `${100 + (zoomLevel - 100)}%` : '100%',
          paddingTop: zoomLevel > 100 ? `${(zoomLevel - 100) / 2}%` : '0',
          paddingBottom: zoomLevel > 100 ? `${(zoomLevel - 100) / 2}%` : '0',
          paddingLeft: zoomLevel > 100 ? `${(zoomLevel - 100) / 2}%` : '0',
          paddingRight: zoomLevel > 100 ? `${(zoomLevel - 100) / 2}%` : '0'
        }}>
            <canvas
              ref={canvasRef}
              style={{
                width: `${2000 * (zoomLevel / 100)}px`,
                height: `${2000 * (zoomLevel / 100)}px`,
                maxWidth: 'none',
                aspectRatio: '1 / 1'
              }}
              className="drop-shadow-2xl"
            />
        </div>
      </div>
      
      {/* Navigation cross - only show when zoomed in, positioned upper right */}
      {zoomLevel > 100 && (
        <div className={`${readonly ? 'fixed' : 'absolute'} top-4 right-4 pointer-events-none z-20`}>
          <div className="relative w-28 h-28 pointer-events-auto">
            {/* Up arrow */}
            <button
              onClick={panUp}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-300 transition-all hover:scale-110 text-gray-700"
              title="Flytta upp"
              aria-label="Pan up"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            
            {/* Right arrow */}
            <button
              onClick={panRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-300 transition-all hover:scale-110 text-gray-700"
              title="Flytta höger"
              aria-label="Pan right"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Down arrow */}
            <button
              onClick={panDown}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-300 transition-all hover:scale-110 text-gray-700"
              title="Flytta ner"
              aria-label="Pan down"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Left arrow */}
            <button
              onClick={panLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-300 transition-all hover:scale-110 text-gray-700"
              title="Flytta vänster"
              aria-label="Pan left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {!hideControls && (
      <div className="sticky bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex gap-3 items-center p-3 flex-wrap justify-center">
          {/* Zoom Controls */}
          <div className="flex gap-2 items-center">
            <button
              onClick={zoomOut}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-lg font-semibold transition-colors"
              title="Zooma ut"
            >
              −
            </button>
            <input
              type="range"
              min="50"
              max="200"
              value={zoomLevel}
              onChange={(e) => {
                const newValue = parseInt(e.target.value);
                maintainScrollCenter(() => {
                  setZoomLevel(newValue);
                });
              }}
              className="w-32 h-2 bg-gray-200 rounded-sm appearance-none cursor-pointer"
              title={`${zoomLevel}%`}
            />
            <button
              onClick={zoomIn}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-lg font-semibold transition-colors"
              title="Zooma in"
            >
              +
            </button>
            <span className="text-xs font-medium text-gray-600 min-w-[45px] text-center">
              {zoomLevel}%
            </span>
          </div>

          {/* View Controls */}
          <div className="flex gap-2 items-center border-l border-gray-200 pl-3">
            <button
              onClick={fitToScreen}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium transition-colors"
              title="Anpassa till skärm"
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Anpassa
            </button>
            <button
              onClick={toggleSpinning}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                isSpinning
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {isSpinning ? 'Stoppa' : 'Rotera'}
            </button>
            
            {/* Speed Control - show when spinning */}
            {isSpinning && (
              <div className="flex gap-1 items-center">
                <span className="text-xs text-gray-600">Hastighet:</span>
                {['slow', 'medium', 'fast'].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      spinSpeed === speed
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {speed === 'slow' ? 'Långsam' : speed === 'medium' ? 'Normal' : 'Snabb'}
                  </button>
                ))}
              </div>
            )}
            
            {!readonly && (
              <button
                onClick={toggleSelectionMode}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  selectionMode
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={selectionMode ? t('common:selection.exitModeTooltip') : t('common:selection.enterModeTooltip')}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {selectionMode ? t('common:selection.exitMode') : t('common:selection.enterMode')}
              </button>
            )}
          </div>

          {/* Date Zoom Controls - Only show in readonly/preview mode */}
          {readonly && (
            <div className="flex gap-2 items-center border-l border-gray-200 pl-3">
              <span className="text-xs font-medium text-gray-600">Zooma:</span>
              <select
                value={selectedMonthIndex !== null ? selectedMonthIndex : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setSelectedMonthIndex(null);
                    if (onSetZoomedMonth) onSetZoomedMonth(null);
                    if (onSetZoomedQuarter) onSetZoomedQuarter(null);
                  } else {
                    const monthIndex = parseInt(value);
                    setSelectedMonthIndex(monthIndex);
                    if (onSetZoomedMonth) onSetZoomedMonth(monthIndex);
                    if (onSetZoomedQuarter) onSetZoomedQuarter(null);
                  }
                }}
                className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white min-w-[110px]"
              >
                <option value="">Hela året</option>
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((quarter) => (
                  <button
                    key={quarter}
                    onClick={() => {
                      const quarterIndex = quarter - 1;
                      if (zoomedQuarter === quarterIndex) {
                        // Toggle off
                        if (onSetZoomedQuarter) onSetZoomedQuarter(null);
                        setSelectedMonthIndex(null);
                      } else {
                        // Set quarter
                        if (onSetZoomedQuarter) onSetZoomedQuarter(quarterIndex);
                        if (onSetZoomedMonth) onSetZoomedMonth(null);
                        setSelectedMonthIndex(null);
                      }
                    }}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      zoomedQuarter === (quarter - 1)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={`Kvartal ${quarter}`}
                  >
                    Q{quarter}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selectionMode && selectedItems.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedItems.size}
          rings={organizationData.rings || []}
          activityGroups={organizationData.activityGroups || []}
          onMoveToRing={handleBulkMoveToRing}
          onChangeActivityGroup={handleBulkChangeActivityGroup}
          onDelete={handleBulkDelete}
          onClear={clearSelections}
        />
      )}

      {/* Item Tooltip - Don't show in selection mode */}
      {!selectionMode && selectedItem && tooltipPosition && (
        <ItemTooltip
          item={selectedItem}
          organizationData={yearFilteredOrgData}
          position={tooltipPosition}
          onEdit={setEditingItem}
          onDelete={handleDeleteAktivitet}
          onClose={() => {
            setSelectedItem(null);
            setTooltipPosition(null);
          }}
          readonly={readonly}
          wheel={wheelData}
        />
      )}

      {/* Edit Aktivitet Modal - only in edit mode */}
      {editingItem && !readonly && (
        <EditItemModal
          item={editingItem}
          organizationData={organizationData}
          currentWheelId={wheelId}
          onUpdateItem={handleUpdateAktivitet}
          onDeleteItem={handleDeleteAktivitet}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

export default YearWheel;
