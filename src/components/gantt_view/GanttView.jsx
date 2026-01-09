import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import GanttToolbar from './GanttToolbar';
import GanttRowPane from './GanttRowPane';
import GanttTimelinePane from './GanttTimelinePane';
import MiniWheelNavigator from './MiniWheelNavigator';
import { useGanttData } from './useGanttData';
import { useTimeScale } from './useTimeScale';

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
 */
const GanttView = ({
  wheelStructure,
  wheel,
  pages = [],
  onUpdateItem,
  onDeleteItem,
  currentWheelId,
}) => {
  const { t, i18n } = useTranslation();
  
  // View state
  const [yearFilter, setYearFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('rings'); // 'rings' | 'labels' | 'activityGroups'
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedItemId, setSelectedItemId] = useState(null);
  
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
  
  // Container dimensions - use larger default for proper rendering
  const [timelineWidth, setTimelineWidth] = useState(2000);
  const [containerHeight, setContainerHeight] = useState(600);
  
  // Shared scroll position for syncing row pane and timeline
  const scrollContainerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const [headerScrollLeft, setHeaderScrollLeft] = useState(0);
  const [timelineTicks, setTimelineTicks] = useState([]);
  
  // Get available years from pages
  const availableYears = useMemo(() => {
    const years = pages.map(p => parseInt(p.year, 10)).filter(y => !isNaN(y));
    return [...new Set(years)].sort((a, b) => a - b);
  }, [pages]);
  
  // Transform data for Gantt display
  const { groupedItems, allItems } = useGanttData({
    wheelStructure,
    pages,
    yearFilter,
    groupBy,
  });
  
  // Initialize all groups as expanded when groupedItems changes
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
    
    let ticks = [];
    if (zoomLevel === 'month') {
      let current = startOfMonth(viewStart);
      const end = endOfMonth(viewEnd);
      
      while (current <= end) {
        const tickEnd = endOfMonth(current);
        ticks.push({
          date: current,
          label: format(current, 'MMM', { locale }),
          width: timeScale.dateToX(tickEnd) - timeScale.dateToX(current),
        });
        current = addMonths(current, 1);
      }
    }
    setTimelineTicks(ticks);
  }, [timeScale.viewStart, timeScale.viewEnd, zoomLevel, timelineWidth, i18n.language]);
  
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
  
  const handleViewportChange = (newStart, newEnd) => {
    setViewStart(newStart);
    setViewEnd(newEnd);
  };
  
  const handleItemClick = (item) => {
    setSelectedItemId(item.id);
    // TODO: Open edit modal
  };
  
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
        
        {/* Right: Timeline month header */}
        <div 
          ref={headerScrollRef}
          className="flex-1 overflow-x-hidden bg-gray-50"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex h-12 items-stretch" style={{ width: `${timelineWidth}px` }}>
            {timelineTicks.map((tick, index) => (
              <div
                key={index}
                className="flex-shrink-0 border-r border-gray-200 px-2 py-2 text-center"
                style={{ width: `${tick.width}px` }}
              >
                <span className="text-xs font-medium text-gray-600">
                  {tick.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main content area - shared scroll container */}
      <div ref={scrollContainerRef} className="flex-1 flex overflow-y-auto overflow-x-hidden relative">
        {/* Mini Wheel Navigator - Overlay in top-right */}
        <div className="absolute top-4 right-4 z-20">
          <MiniWheelNavigator
            viewStart={viewStart}
            viewEnd={viewEnd}
            yearFilter={yearFilter}
            availableYears={availableYears}
            onViewportChange={handleViewportChange}
          />
        </div>
        
        {/* Left: Row pane with groups */}
        <GanttRowPane
          groupedItems={groupedItems}
          groupBy={groupBy}
          expandedGroups={expandedGroups}
          selectedItemId={selectedItemId}
          wheelStructure={wheelStructure}
          onToggleGroup={toggleGroup}
          onItemClick={handleItemClick}
        />
        
        {/* Right: Timeline pane with bars */}
        <GanttTimelinePane
          groupedItems={groupedItems}
          groupBy={groupBy}
          expandedGroups={expandedGroups}
          selectedItemId={selectedItemId}
          timeScale={timeScale}
          wheelStructure={wheelStructure}
          onItemClick={handleItemClick}
          onUpdateItem={onUpdateItem}
          onWidthChange={setTimelineWidth}
          onHeaderScroll={(scrollLeft) => {
            if (headerScrollRef.current) {
              headerScrollRef.current.scrollLeft = scrollLeft;
            }
          }}
          timeTicks={timelineTicks}
          effectiveWidth={timelineWidth}
        />
      </div>
    </div>
  );
};

export default GanttView;
