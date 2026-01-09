import { useState, useMemo, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, addMonths, startOfWeek, endOfWeek, addWeeks, getISOWeek, format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import GanttToolbar from './GanttToolbar';
import GanttRowPane from './GanttRowPane';
import GanttTimelinePane from './GanttTimelinePane';
import GanttExportModal from './GanttExportModal';
import ItemTooltip from '../ItemTooltip';
import EditItemModal from '../EditItemModal';
import { useGanttData } from './useGanttData';
import { useTimeScale } from './useTimeScale';
import { exportGanttAsPNG, exportGanttAsPDF, exportGanttAsCSV, printGantt } from './GanttExporter';

/**
 * GanttView Component
 * 
 * Displays wheel items in a Gantt chart with:
 * - Ring-based swimlanes
 * - Timeline bars styled like YearWheel timeline pills
 * - Mini wheel navigator for time navigation
 * - Pan and zoom capabilities
 * 
 * @param {Object} wheelStructure - Contains rings, activityGroups, labels, and items
 * @param {Object} wheel - Current wheel data
 * @param {Array} pages - All pages (years) with their items
 * @param {Function} onUpdateItem - Callback when item is updated
 * @param {Function} onDeleteItem - Callback when item is deleted
 * @param {string} currentWheelId - Current wheel ID
 * @param {React.Ref} ref - Forwarded ref for imperative handle
 */
const GanttView = forwardRef(function GanttView({
  wheelStructure,
  wheel,
  pages = [],
  onUpdateItem,
  onDeleteItem,
  currentWheelId,
}, ref) {
  const { t, i18n } = useTranslation();
  
  // View state
  const [yearFilter, setYearFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('rings'); // 'rings' | 'labels' | 'activityGroups'
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
    // Time scale state
  const [viewStart, setViewStart] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), 0, 1); // Start of current year
  });
  const [viewEnd, setViewEnd] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), 11, 31); // End of current year
  });
  const [zoomLevel, setZoomLevel] = useState('month'); // 'day' | 'week' | 'month'
  
  // Shared scroll position for syncing row pane and timeline
  const scrollContainerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const timelineScrollRef = useRef(null);
  const rowPaneRef = useRef(null);
  const timelineHeaderRef = useRef(null);
  const [timelineTicks, setTimelineTicks] = useState([]);
  const [monthSpanTicks, setMonthSpanTicks] = useState([]); // For day zoom top row
  
  // Calculate timeline width based on zoom level and date range
  const timelineWidth = useMemo(() => {
    const totalMs = viewEnd.getTime() - viewStart.getTime();
    const totalDays = totalMs / (1000 * 60 * 60 * 24);
    
    // Pixels per day based on zoom level
    let pixelsPerDay;
    switch (zoomLevel) {
      case 'day':
        pixelsPerDay = 30; // Very detailed
        break;
      case 'week':
        pixelsPerDay = 10; // Medium detail
        break;
      case 'month':
      default:
        pixelsPerDay = 5; // Overview
        break;
    }
    
    return Math.max(800, totalDays * pixelsPerDay);
  }, [viewStart, viewEnd, zoomLevel]);
  
  // Get available years from pages
  const availableYears = useMemo(() => {
    const years = pages.map(p => parseInt(p.year, 10)).filter(y => !isNaN(y));
    return [...new Set(years)].sort((a, b) => a - b);
  }, [pages]);
  
  // Initialize view range when available years change and "all" is selected
  useEffect(() => {
    if (yearFilter === 'all' && availableYears.length > 0) {
      const minYear = Math.min(...availableYears);
      const maxYear = Math.max(...availableYears);
      setViewStart(new Date(minYear, 0, 1));
      setViewEnd(new Date(maxYear, 11, 31));
    }
  }, [availableYears, yearFilter]);
  
  // Constants for row heights - must match both panes
  const GROUP_HEADER_HEIGHT = 36;
  const ITEM_ROW_HEIGHT = 40;
  
  // Transform data for Gantt display
  const { groupedItems, allItems } = useGanttData({
    wheelStructure,
    pages,
    yearFilter,
    groupBy,
  });
  
  // Calculate total content height based on expanded groups
  const contentHeight = useMemo(() => {
    let height = 0;
    Object.entries(groupedItems).forEach(([groupId, items]) => {
      height += GROUP_HEADER_HEIGHT;
      if (expandedGroups[groupId]) {
        height += items.length * ITEM_ROW_HEIGHT;
      }
    });
    return Math.max(height, 400);
  }, [groupedItems, expandedGroups]);
  
  // Initialize all groups as expanded when groupedItems changes
  useEffect(() => {
    if (Object.keys(groupedItems).length > 0) {
      setExpandedGroups(prev => {
        const newExpanded = { ...prev };
        Object.keys(groupedItems).forEach(groupId => {
          // Only set to true if not already defined (preserve user's collapse state)
          if (newExpanded[groupId] === undefined) {
            newExpanded[groupId] = true;
          }
        });
        return newExpanded;
      });
    }
  }, [groupedItems]); // React to actual data changes
  
  // Reset expanded state when grouping changes
  useEffect(() => {
    const initialExpanded = {};
    Object.keys(groupedItems).forEach(groupId => {
      initialExpanded[groupId] = true;
    });
    setExpandedGroups(initialExpanded);
  }, [groupBy, yearFilter]); // Reset when grouping or filter changes
  
  // Time scale calculations
  const timeScale = useTimeScale({
    viewStart,
    viewEnd,
    containerWidth: timelineWidth,
    zoomLevel,
  });
  
  // Generate timeline ticks for header
  useEffect(() => {
    const { viewStart, viewEnd } = timeScale;
    const locale = i18n.language === 'sv' ? sv : enUS;
    
    // Determine if we're showing multiple years (need to show year in labels)
    const startYear = viewStart.getFullYear();
    const endYear = viewEnd.getFullYear();
    const showYear = yearFilter === 'all' || startYear !== endYear;
    
    let ticks = [];
    if (zoomLevel === 'month') {
      let current = startOfMonth(viewStart);
      const end = endOfMonth(viewEnd);
      
      while (current <= end) {
        const tickEnd = endOfMonth(current);
        ticks.push({
          date: current,
          label: format(current, 'MMM', { locale }),
          labelLine2: showYear ? format(current, 'yy') : null,
          width: timeScale.dateToX(tickEnd) - timeScale.dateToX(current),
        });
        current = addMonths(current, 1);
      }
    } else if (zoomLevel === 'week') {
      // Week zoom - use weekRingDisplayMode setting from wheel
      const weekDisplayMode = wheel?.weekRingDisplayMode || 'week-numbers';
      let current = startOfWeek(viewStart, { weekStartsOn: 1 }); // Monday start
      const end = endOfWeek(viewEnd, { weekStartsOn: 1 });
      
      while (current <= end) {
        const tickEnd = endOfWeek(current, { weekStartsOn: 1 });
        let label, labelLine2;
        if (weekDisplayMode === 'dates') {
          // Show date range on line 1, month+year on line 2
          const startDay = format(current, 'd', { locale });
          const endDay = format(tickEnd, 'd', { locale });
          const month = format(current, 'MMM', { locale });
          label = `${startDay}-${endDay}`;
          labelLine2 = showYear ? `${month} ${format(current, 'yy')}` : month;
        } else {
          // Show week number like "v2" or "W2" on line 1, year on line 2
          const weekNum = getISOWeek(current);
          const weekPrefix = i18n.language === 'sv' ? 'v' : 'W';
          label = `${weekPrefix}${weekNum}`;
          labelLine2 = showYear ? format(current, 'yy') : null;
        }
        ticks.push({
          date: current,
          label,
          labelLine2,
          width: timeScale.dateToX(tickEnd) - timeScale.dateToX(current),
        });
        current = addWeeks(current, 1);
      }
    } else if (zoomLevel === 'day') {
      // Day zoom - show just day numbers
      let current = new Date(viewStart);
      const end = new Date(viewEnd);
      
      while (current <= end) {
        const tickEnd = new Date(current);
        tickEnd.setDate(tickEnd.getDate() + 1);
        ticks.push({
          date: new Date(current),
          label: format(current, 'd'), // Just day number
          labelLine2: null,
          width: timeScale.dateToX(tickEnd) - timeScale.dateToX(current),
        });
        current.setDate(current.getDate() + 1);
      }
      
      // Generate month spans for top row
      const monthSpans = [];
      let monthStart = startOfMonth(viewStart);
      const monthEnd = endOfMonth(viewEnd);
      
      while (monthStart <= monthEnd) {
        const spanStart = monthStart < viewStart ? viewStart : monthStart;
        const spanEndDate = endOfMonth(monthStart);
        const spanEnd = spanEndDate > viewEnd ? viewEnd : spanEndDate;
        
        const startX = timeScale.dateToX(spanStart);
        const endX = timeScale.dateToX(new Date(spanEnd.getTime() + 24 * 60 * 60 * 1000)); // Include last day
        
        monthSpans.push({
          label: format(monthStart, 'MMMM', { locale }),
          labelLine2: showYear ? format(monthStart, 'yyyy') : null,
          width: endX - startX,
          startX,
        });
        
        monthStart = addMonths(monthStart, 1);
      }
      setMonthSpanTicks(monthSpans);
    } else {
      setMonthSpanTicks([]);
    }
    setTimelineTicks(ticks);
  }, [timeScale.viewStart, timeScale.viewEnd, zoomLevel, timelineWidth, i18n.language, yearFilter, wheel?.weekRingDisplayMode]);
  
  // Scroll to appropriate position when year filter changes
  // - If "all" or current year: scroll to today
  // - Otherwise: scroll to January 1st of selected year
  useEffect(() => {
    if (!timelineScrollRef.current || !timeScale) return;
    
    // Small delay to ensure timeline is rendered
    const scrollTimer = setTimeout(() => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const filterYear = yearFilter === 'all' ? null : parseInt(yearFilter, 10);
      
      // Determine target date
      let targetDate;
      if (yearFilter === 'all' || filterYear === currentYear) {
        targetDate = today;
      } else {
        targetDate = new Date(filterYear, 0, 1); // January 1st of selected year
      }
      
      const targetX = timeScale.dateToX(targetDate);
      const viewportWidth = timelineScrollRef.current.clientWidth;
      // Center the target date in viewport
      const targetScroll = Math.max(0, targetX - viewportWidth / 3);
      
      timelineScrollRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
      
      // Sync header scroll
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollTo({
          left: targetScroll,
          behavior: 'smooth'
        });
      }
    }, 100);
    
    return () => clearTimeout(scrollTimer);
  }, [yearFilter, timeScale]);
  
  // Handlers
  const handleZoomIn = () => {
    const levels = ['month', 'week', 'day'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1]);
    }
  };
  
  const handleZoomOut = () => {
    const levels = ['month', 'week', 'day'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(levels[currentIndex - 1]);
    }
  };
  
  const handleTodayClick = () => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const yearEnd = new Date(today.getFullYear(), 11, 31);
    setViewStart(yearStart);
    setViewEnd(yearEnd);
  };
  
  const handleYearChange = (year) => {
    setYearFilter(year);
    if (year !== 'all') {
      const yearNum = parseInt(year, 10);
      setViewStart(new Date(yearNum, 0, 1));
      setViewEnd(new Date(yearNum, 11, 31));
    } else if (availableYears.length > 0) {
      // "All years" - span from earliest to latest available year
      const minYear = Math.min(...availableYears);
      const maxYear = Math.max(...availableYears);
      setViewStart(new Date(minYear, 0, 1));
      setViewEnd(new Date(maxYear, 11, 31));
    }
  };
  
  const handleGroupByChange = (newGroupBy) => {
    setGroupBy(newGroupBy);
    setExpandedGroups({}); // Reset expansion state
  };
  
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  // Handle click on item name in row pane - scroll to center item in view
  const handleRowItemClick = (item) => {
    setSelectedItemId(item.id);
    
    // Auto-scroll timeline to center the item in view
    if (timelineScrollRef.current && item.startDate) {
      const scrollContainer = timelineScrollRef.current;
      const itemStartX = timeScale.dateToX(new Date(item.startDate));
      const itemEndX = item.endDate ? timeScale.dateToX(new Date(item.endDate)) : itemStartX;
      const itemCenterX = (itemStartX + itemEndX) / 2;
      const viewportWidth = scrollContainer.clientWidth;
      
      // Center the item in the viewport
      const targetScroll = Math.max(0, itemCenterX - viewportWidth / 2);
      scrollContainer.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };
  
  // Handle click on bar in timeline - show tooltip
  const handleBarClick = (item, event) => {
    setSelectedItemId(item.id);
    setSelectedItem(item);
    
    // Position tooltip near click, ensuring it stays within viewport
    if (event) {
      const tooltipWidth = 320;
      const tooltipHeight = 200;
      const padding = 10;
      
      let x = event.clientX + padding;
      let y = event.clientY + padding;
      
      // Adjust if would go off right edge
      if (x + tooltipWidth > window.innerWidth) {
        x = event.clientX - tooltipWidth - padding;
      }
      
      // Adjust if would go off bottom edge
      if (y + tooltipHeight > window.innerHeight) {
        y = event.clientY - tooltipHeight - padding;
      }
      
      // Ensure not off left or top edge
      x = Math.max(padding, x);
      y = Math.max(padding, y);
      
      setTooltipPosition({ x, y });
    } else {
      setTooltipPosition({ x: 300, y: 100 });
    }
  };
  
  const handleCloseTooltip = () => {
    setSelectedItem(null);
    setTooltipPosition(null);
    setSelectedItemId(null);
  };
  
  const handleEditItem = (item) => {
    setEditingItem(item);
    handleCloseTooltip();
  };
  
  const handleDeleteItem = async (itemId) => {
    if (onDeleteItem) {
      await onDeleteItem(itemId);
    }
    handleCloseTooltip();
  };
  
  // Open export modal (called from Header)
  const handleOpenExportModal = useCallback(() => {
    setShowExportModal(true);
  }, []);
  
  // Export handler with options from modal
  const handleExportWithOptions = useCallback(async (exportFormat, options = {}) => {
    const {
      dateRange,
      showNamesPanel = true,
      showDatesOnBars = false,
      showLegend = true,
      showDependencies = true,
      pdfSize = 'auto',
    } = options;
    
    const exportOptions = {
      title: wheel?.title || t('gantt.title', 'Tidslinje'),
      viewStart: dateRange?.start || viewStart,
      viewEnd: dateRange?.end || viewEnd,
      wheelStructure,
      locale: i18n.language,
      groupedItems,
      allItems,
      // New options
      showNamesPanel,
      showDatesOnBars,
      showLegend,
      showDependencies,
      pdfSize,
    };
    
    try {
      switch (exportFormat) {
        case 'png':
          await exportGanttAsPNG(exportOptions);
          break;
        case 'pdf':
          await exportGanttAsPDF(exportOptions);
          break;
        case 'csv':
          await exportGanttAsCSV(exportOptions);
          break;
        case 'print':
          await printGantt(exportOptions);
          break;
        default:
          console.warn('Unknown export format:', exportFormat);
      }
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error toast to user
    }
  }, [wheel?.title, viewStart, viewEnd, wheelStructure, i18n.language, t, groupedItems, allItems]);
  
  // Expose export function via ref for parent components
  // Opens the modal instead of exporting directly
  useImperativeHandle(ref, () => ({
    export: handleOpenExportModal,
  }), [handleOpenExportModal]);
  
  return (
    <div className="flex flex-col h-full bg-gray-50" data-cy="gantt-view">
      {/* Toolbar */}
      <GanttToolbar
        yearFilter={yearFilter}
        availableYears={availableYears}
        groupBy={groupBy}
        zoomLevel={zoomLevel}
        onYearChange={handleYearChange}
        onGroupByChange={handleGroupByChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onTodayClick={handleTodayClick}
      />
      
      {/* Unified sticky header row */}
      <div className="flex-shrink-0 flex border-b border-gray-200 bg-white sticky top-0 z-20 shadow-sm">
        {/* Left: Row pane header */}
        <div className="w-80 flex-shrink-0 px-3 py-3 bg-gray-100 border-r border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">
            {t(`gantt.${groupBy}`, groupBy.charAt(0).toUpperCase() + groupBy.slice(1))}
          </h3>
        </div>
        
        {/* Right: Timeline header */}
        <div 
          ref={timelineHeaderRef}
          className="flex-1 overflow-x-hidden bg-gray-50"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Day zoom: Two-row header with months on top, days below */}
          {zoomLevel === 'day' && monthSpanTicks.length > 0 ? (
            <div style={{ width: `${timelineWidth}px` }}>
              {/* Top row: Month spans */}
              <div className="flex h-6 items-stretch border-b border-gray-200">
                {monthSpanTicks.map((tick, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 border-r border-gray-300 px-2 text-center flex items-center justify-center bg-gray-100"
                    style={{ width: `${tick.width}px` }}
                  >
                    <span className="text-xs font-semibold text-gray-700 truncate">
                      {tick.label}{tick.labelLine2 ? ` ${tick.labelLine2}` : ''}
                    </span>
                  </div>
                ))}
              </div>
              {/* Bottom row: Day numbers */}
              <div className="flex h-6 items-stretch">
                {timelineTicks.map((tick, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 border-r border-gray-200 text-center flex items-center justify-center"
                    style={{ width: `${tick.width}px` }}
                  >
                    <span className="text-[11px] text-gray-600">
                      {tick.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Single row header for month/week zoom */
            <div className="flex h-10 items-stretch" style={{ width: `${timelineWidth}px` }}>
              {timelineTicks.map((tick, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 border-r border-gray-200 px-1 py-1 text-center flex flex-col justify-center"
                  style={{ width: `${tick.width}px` }}
                >
                  <span className="text-xs font-medium text-gray-600 leading-tight truncate">
                    {tick.label}
                  </span>
                  {tick.labelLine2 && (
                    <span className="text-[10px] text-gray-400 leading-tight">
                      {tick.labelLine2}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Main content area - shared scroll container */}
      <div ref={scrollContainerRef} className="flex-1 flex overflow-y-auto overflow-x-hidden relative min-w-0">
        {/* Left: Row pane with groups */}
        <div ref={rowPaneRef}>
          <GanttRowPane
            groupedItems={groupedItems}
            groupBy={groupBy}
            expandedGroups={expandedGroups}
            selectedItemId={selectedItemId}
            wheelStructure={wheelStructure}
            onToggleGroup={toggleGroup}
            onItemClick={handleRowItemClick}
            contentHeight={contentHeight}
          />
        </div>
        
        {/* Right: Timeline pane with bars */}
        <GanttTimelinePane
          groupedItems={groupedItems}
          groupBy={groupBy}
          expandedGroups={expandedGroups}
          selectedItemId={selectedItemId}
          timeScale={timeScale}
          wheelStructure={wheelStructure}
          onItemClick={handleBarClick}
          onUpdateItem={onUpdateItem}
          onHeaderScroll={(scrollLeft) => {
            if (timelineHeaderRef.current) {
              timelineHeaderRef.current.scrollLeft = scrollLeft;
            }
          }}
          contentHeight={contentHeight}
          timeTicks={timelineTicks}
          effectiveWidth={timelineWidth}
          scrollRef={timelineScrollRef}
        />
      </div>
      
      {/* Item Tooltip */}
      {selectedItem && tooltipPosition && (
        <ItemTooltip
          item={selectedItem}
          wheelStructure={wheelStructure}
          position={tooltipPosition}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onClose={handleCloseTooltip}
          onOpenItem={(itemId) => {
            const item = allItems.find(i => i.id === itemId);
            if (item) {
              setSelectedItem(item);
            }
          }}
          wheel={wheel}
        />
      )}
      
      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          wheelStructure={wheelStructure}
          currentWheelId={currentWheelId}
          onUpdateItem={onUpdateItem}
          onDeleteItem={handleDeleteItem}
          onClose={() => setEditingItem(null)}
        />
      )}
      
      {/* Export Options Modal */}
      <GanttExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportWithOptions}
        viewStart={viewStart}
        viewEnd={viewEnd}
        allItems={allItems}
        availableYears={availableYears}
      />
    </div>
  );
});

export default GanttView;
