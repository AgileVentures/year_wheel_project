import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addMonths, startOfMonth, endOfMonth, eachWeekOfInterval, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

/**
 * GanttTimelinePane Component
 * 
 * Right panel showing the timeline with:
 * - Time header (months/weeks/days depending on zoom)
 * - SVG bars for items (styled like timeline pills)
 * - Today marker
 * - Grid lines
 */
const GanttTimelinePane = ({
  groupedItems,
  groupBy,
  expandedGroups,
  selectedItemId,
  timeScale,
  wheelStructure,
  onItemClick,
  onUpdateItem,
}) => {
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollContainerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartX = useRef(0);
  const scrollStartX = useRef(0);
  
  const locale = i18n.language === 'sv' ? sv : enUS;
  const { rings = [], activityGroups = [], labels = [] } = wheelStructure || {};
  
  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Handle horizontal scroll for panning (will be enhanced with zoom later)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleWheel = (e) => {
      // Horizontal scroll for panning
      if (!e.ctrlKey && !e.metaKey) {
        // Let browser handle normal horizontal scroll
        return;
      }
      
      // Ctrl/Cmd + scroll for zooming (future enhancement)
      e.preventDefault();
      // TODO: Implement zoom on scroll
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);
  
  // Mouse drag for panning
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsPanning(true);
    panStartX.current = e.clientX;
    scrollStartX.current = scrollContainerRef.current.scrollLeft;
    e.preventDefault();
  };
  
  const handleMouseMove = (e) => {
    if (!isPanning) return;
    const dx = panStartX.current - e.clientX;
    scrollContainerRef.current.scrollLeft = scrollStartX.current + dx;
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning]);
  
  // Calculate row height (same as row pane)
  const GROUP_HEADER_HEIGHT = 36;
  const ITEM_ROW_HEIGHT = 40;
  
  // Get group metadata
  const getGroupInfo = (groupId) => {
    switch (groupBy) {
      case 'rings':
        return rings.find(r => r.id === groupId) || { name: 'Unknown', color: '#94A3B8' };
      case 'labels':
        return labels.find(l => l.id === groupId) || { name: 'Unlabeled', color: '#94A3B8' };
      case 'activityGroups':
        return activityGroups.find(ag => ag.id === groupId) || { name: 'Unknown', color: '#94A3B8' };
      default:
        return { name: 'Unknown', color: '#94A3B8' };
    }
  };
  
  const getActivityGroupColor = (activityId) => {
    const group = activityGroups.find(ag => ag.id === activityId);
    return group?.color || '#94A3B8';
  };
  
  // Generate time ticks based on zoom level
  const generateTimeTicks = () => {
    const { viewStart, viewEnd, zoomLevel } = timeScale;
    
    if (zoomLevel === 'month') {
      // Show months
      const months = [];
      let current = startOfMonth(viewStart);
      const end = endOfMonth(viewEnd);
      
      while (current <= end) {
        months.push({
          date: current,
          label: format(current, 'MMM', { locale }),
          width: timeScale.dateToX(endOfMonth(current)) - timeScale.dateToX(current),
        });
        current = addMonths(current, 1);
      }
      return months;
    } else if (zoomLevel === 'week') {
      // Show weeks
      const weeks = eachWeekOfInterval(
        { start: viewStart, end: viewEnd },
        { weekStartsOn: 1 } // Monday
      );
      return weeks.map(week => ({
        date: week,
        label: format(week, 'w', { locale }),
        width: timeScale.dateToX(endOfWeek(week, { weekStartsOn: 1 })) - timeScale.dateToX(week),
      }));
    } else {
      // Show days
      const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
      return days.map(day => ({
        date: day,
        label: format(day, 'd', { locale }),
        width: timeScale.pixelsPerDay,
      }));
    }
  };
  
  const timeTicks = generateTimeTicks();
  
  // Calculate total timeline width from ticks
  const timelineWidth = timeTicks.reduce((sum, tick) => sum + tick.width, 0);
  
  // Use timeline width or minimum viewport width
  const effectiveWidth = Math.max(timelineWidth, containerWidth, 1200);
  
  // Calculate total height
  const calculateHeight = () => {
    let height = 0;
    Object.entries(groupedItems).forEach(([groupId, items]) => {
      height += GROUP_HEADER_HEIGHT;
      if (expandedGroups[groupId]) {
        height += items.length * ITEM_ROW_HEIGHT;
      }
    });
    return Math.max(height, 400);
  };
  
  const totalHeight = calculateHeight();
  
  // Render timeline bars
  const renderBars = () => {
    const bars = [];
    let currentY = 0;
    
    Object.entries(groupedItems).forEach(([groupId, items]) => {
      currentY += GROUP_HEADER_HEIGHT;
      
      if (expandedGroups[groupId]) {
        items.forEach((item, index) => {
          const startX = timeScale.dateToX(new Date(item.startDate));
          const endX = timeScale.dateToX(new Date(item.endDate));
          const width = Math.max(endX - startX, 20); // Minimum 20px width
          const y = currentY + index * ITEM_ROW_HEIGHT;
          
          const color = getActivityGroupColor(item.activityId);
          const isSelected = selectedItemId === item.id;
          
          bars.push(
            <g key={item.id} onClick={() => onItemClick(item)} className="cursor-pointer">
              {/* Bar background (rounded pill) */}
              <rect
                x={startX}
                y={y + 8}
                width={width}
                height={24}
                rx={12}
                ry={12}
                fill={color}
                opacity={isSelected ? 1 : 0.9}
                stroke={isSelected ? '#3B82F6' : 'none'}
                strokeWidth={isSelected ? 2 : 0}
                className="transition-all hover:opacity-100"
              />
              
              {/* Item name text */}
              <text
                x={startX + 8}
                y={y + 24}
                fontSize="12"
                fill="white"
                className="pointer-events-none"
                style={{ userSelect: 'none' }}
              >
                {item.name.length > 30 ? item.name.slice(0, 30) + '...' : item.name}
              </text>
            </g>
          );
        });
        
        currentY += items.length * ITEM_ROW_HEIGHT;
      }
    });
    
    return bars;
  };
  
  // Today marker
  const todayX = timeScale.dateToX(new Date());
  const showTodayMarker = todayX >= 0 && todayX <= containerWidth;
  
  return (
    <div 
      ref={scrollContainerRef}
      className={`flex-1 overflow-auto bg-white ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
      data-cy="gantt-timeline-pane"
      onMouseDown={handleMouseDown}
    >
      {/* Time header */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <div className="flex h-12 items-stretch">
          {timeTicks.map((tick, index) => (
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
      
      {/* Timeline content */}
      <div ref={containerRef} className="relative" style={{ height: `${totalHeight}px`, width: `${effectiveWidth}px`, minWidth: '100%' }}>
        {/* Grid lines */}
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          width={effectiveWidth}
          height={totalHeight}
        >
          {timeTicks.map((tick, index) => {
            const x = timeScale.dateToX(tick.date);
            return (
              <line
                key={index}
                x1={x}
                y1={0}
                x2={x}
                y2={totalHeight}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            );
          })}
          
          {/* Today marker */}
          {showTodayMarker && (
            <>
              <line
                x1={todayX}
                y1={0}
                x2={todayX}
                y2={totalHeight}
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
              <circle
                cx={todayX}
                cy={8}
                r={4}
                fill="#EF4444"
              />
            </>
          )}
        </svg>
        
        {/* Item bars */}
        <svg
          className="absolute inset-0"
          width={effectiveWidth}
          height={totalHeight}
        >
          {renderBars()}
        </svg>
      </div>
    </div>
  );
};

export default GanttTimelinePane;
