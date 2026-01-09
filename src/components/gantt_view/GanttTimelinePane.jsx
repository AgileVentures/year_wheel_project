import { useRef, useEffect, useState, useMemo } from 'react';
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
  onWidthChange,
  onHeaderScroll,
  timeTicks: externalTimeTicks,
  effectiveWidth: externalEffectiveWidth,
  scrollRef,
}) => {
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const internalScrollRef = useRef(null);
  const scrollContainerRef = scrollRef || internalScrollRef;
  const headerScrollRef = useRef(null);
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
  
  // Sync horizontal scroll between header and content
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const headerScroll = headerScrollRef.current;
    if (!scrollContainer || !headerScroll) return;
    
    const handleScroll = () => {
      headerScroll.scrollLeft = scrollContainer.scrollLeft;
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Calculate row height (same as row pane)
  const GROUP_HEADER_HEIGHT = 36;
  const ITEM_ROW_HEIGHT = 40;
  const TIME_HEADER_HEIGHT = 48; // Height of the month header
  
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
  
  const timeTicks = externalTimeTicks || generateTimeTicks();
  
  // Calculate total timeline width from ticks - memoized to prevent loop
  const effectiveWidth = externalEffectiveWidth || useMemo(() => {
    const timelineWidth = timeTicks.reduce((sum, tick) => sum + tick.width, 0);
    return Math.max(timelineWidth, containerWidth, 2000);
  }, [timeTicks.length, containerWidth]); // Only recalc when tick count or container changes
  
  // Notify parent of scroll position for header sync
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !onHeaderScroll) return;
    
    const handleScroll = () => {
      onHeaderScroll(scrollContainer.scrollLeft);
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [onHeaderScroll]);
  
  // Report width to parent for timeScale calculations
  useEffect(() => {
    if (onWidthChange && effectiveWidth > 0) {
      // Use a small debounce to prevent rapid updates
      const timer = setTimeout(() => {
        onWidthChange(effectiveWidth);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [effectiveWidth]); // Remove onWidthChange from deps to prevent loop
  
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
      // Add space for group header
      currentY += GROUP_HEADER_HEIGHT;
      
      if (expandedGroups[groupId]) {
        items.forEach((item, index) => {
          const startX = timeScale.dateToX(new Date(item.startDate));
          const endX = timeScale.dateToX(new Date(item.endDate));
          const width = Math.max(endX - startX, 20); // Minimum 20px width
          // Y position - center 24px bar within 40px row (8px padding top/bottom)
          const y = currentY + index * ITEM_ROW_HEIGHT + 8;
          
          const color = getActivityGroupColor(item.activityId);
          const isSelected = selectedItemId === item.id;
          
          bars.push(
            <g key={item.id} onClick={() => onItemClick(item)} className="cursor-pointer">
              {/* Bar background (rounded pill) */}
              <rect
                x={startX}
                y={y}
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
                y={y + 16}
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
        
        // Advance Y position by height of all items in this group
        currentY += items.length * ITEM_ROW_HEIGHT;
      }
    });
    
    return bars;
  };
  
  // Today marker
  const todayX = timeScale.dateToX(new Date());
  const showTodayMarker = todayX >= 0 && todayX <= containerWidth;
  
  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {/* Timeline content - Scrollable */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
        data-cy="gantt-timeline-pane"
        onMouseDown={handleMouseDown}
      >
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
    </div>
  );
};

export default GanttTimelinePane;
