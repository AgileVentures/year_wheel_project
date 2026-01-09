import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  
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
  
  // Container dimensions
  const [containerWidth, setContainerWidth] = useState(1000);
  const [containerHeight, setContainerHeight] = useState(600);
  
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
  
  // Time scale calculations
  const timeScale = useTimeScale({
    viewStart,
    viewEnd,
    containerWidth,
    zoomLevel,
  });
  
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
      
      {/* Mini Wheel Navigator */}
      <div className="px-4 py-2 bg-white border-b">
        <MiniWheelNavigator
          viewStart={viewStart}
          viewEnd={viewEnd}
          yearFilter={yearFilter}
          availableYears={availableYears}
          onViewportChange={handleViewportChange}
        />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
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
        />
      </div>
    </div>
  );
};

export default GanttView;
