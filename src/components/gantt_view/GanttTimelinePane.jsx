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
  onHeaderScroll,
  timeTicks: externalTimeTicks,
  effectiveWidth: externalEffectiveWidth,
  scrollRef,
  contentHeight,
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
  
  // Drag state
  const [dragState, setDragState] = useState(null);
  // dragState = { item, mode: 'move' | 'resize-start' | 'resize-end', startX, originalStartDate, originalEndDate, originalRingId, currentStartDate, currentEndDate, targetRingId }
  
  // Hover state for showing resize handles
  const [hoveredBarId, setHoveredBarId] = useState(null);
  
  // Track if we're dragging to prevent click from firing
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  
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
  
  // Use contentHeight from parent (calculated in GanttView)
  const totalHeight = contentHeight;
  
  // === DRAG AND DROP FUNCTIONALITY ===
  
  // Build a map of Y positions to group IDs for ring detection during drag
  const groupYPositions = useMemo(() => {
    const positions = [];
    let currentY = 0;
    
    Object.entries(groupedItems).forEach(([groupId, items]) => {
      const groupStart = currentY;
      currentY += GROUP_HEADER_HEIGHT;
      
      const isExpanded = expandedGroups[groupId];
      if (isExpanded) {
        currentY += items.length * ITEM_ROW_HEIGHT;
      }
      
      positions.push({
        groupId,
        startY: groupStart,
        endY: currentY,
      });
    });
    
    return positions;
  }, [groupedItems, expandedGroups]);
  
  // Get group at Y position
  const getGroupAtY = (y) => {
    for (const pos of groupYPositions) {
      if (y >= pos.startY && y < pos.endY) {
        return pos.groupId;
      }
    }
    return null;
  };
  
  // Detect drag zone based on mouse position relative to bar
  const getDragZone = (mouseX, barStartX, barWidth) => {
    const RESIZE_ZONE = 10; // pixels from edge to trigger resize
    
    if (mouseX < barStartX + RESIZE_ZONE) {
      return 'resize-start';
    } else if (mouseX > barStartX + barWidth - RESIZE_ZONE) {
      return 'resize-end';
    }
    return 'move';
  };
  
  // Handle drag start on bar
  const handleBarMouseDown = (e, item, barStartX, barWidth, groupId) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();
    
    // Use scrollContainerRef for rect to get correct position relative to scroll viewport
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
    const mode = getDragZone(mouseX, barStartX, barWidth);
    
    // Track start position to detect if it's a click or drag
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    
    setDragState({
      item,
      mode,
      startX: mouseX,
      startY: e.clientY - rect.top + scrollContainerRef.current.scrollTop,
      originalStartDate: new Date(item.startDate),
      originalEndDate: new Date(item.endDate),
      originalRingId: item.ringId,
      currentStartDate: new Date(item.startDate),
      currentEndDate: new Date(item.endDate),
      targetRingId: groupId,
    });
  };
  
  // Handle drag move
  const handleDragMove = (e) => {
    if (!dragState) return;
    
    // Use scrollContainerRef for rect to get correct position relative to scroll viewport
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
    const mouseY = e.clientY - rect.top;
    const deltaX = mouseX - dragState.startX;
    
    // Check if we've moved enough to consider this a drag (not a click)
    const moveThreshold = 3;
    const totalMove = Math.abs(e.clientX - dragStartPosRef.current.x) + Math.abs(e.clientY - dragStartPosRef.current.y);
    if (totalMove > moveThreshold) {
      isDraggingRef.current = true;
    }
    
    // Convert pixel delta to days
    const deltaDays = Math.round(deltaX / timeScale.pixelsPerDay);
    
    let newStartDate = new Date(dragState.originalStartDate);
    let newEndDate = new Date(dragState.originalEndDate);
    
    if (dragState.mode === 'move') {
      // Move both dates by same amount
      newStartDate.setDate(newStartDate.getDate() + deltaDays);
      newEndDate.setDate(newEndDate.getDate() + deltaDays);
      
      // Detect target ring from Y position (only for 'rings' groupBy)
      if (groupBy === 'rings') {
        const targetGroup = getGroupAtY(mouseY);
        if (targetGroup && targetGroup !== dragState.targetRingId) {
          setDragState(prev => ({ ...prev, targetRingId: targetGroup }));
        }
      }
    } else if (dragState.mode === 'resize-start') {
      // Only change start date, but don't go past end date
      newStartDate.setDate(newStartDate.getDate() + deltaDays);
      if (newStartDate >= newEndDate) {
        newStartDate = new Date(newEndDate);
        newStartDate.setDate(newStartDate.getDate() - 1);
      }
    } else if (dragState.mode === 'resize-end') {
      // Only change end date, but don't go before start date
      newEndDate.setDate(newEndDate.getDate() + deltaDays);
      if (newEndDate <= newStartDate) {
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + 1);
      }
    }
    
    setDragState(prev => ({
      ...prev,
      currentStartDate: newStartDate,
      currentEndDate: newEndDate,
    }));
  };
  
  // Handle drag end
  // Handle drag end - also handles click detection
  const handleDragEnd = (e) => {
    if (!dragState) return;
    
    const { item, mode, currentStartDate, currentEndDate, targetRingId, originalStartDate, originalEndDate, originalRingId } = dragState;
    
    // If we didn't actually drag (just clicked), and it was in 'move' zone, show tooltip
    if (!isDraggingRef.current && mode === 'move') {
      // It was a click, not a drag - show tooltip
      if (onItemClick) {
        onItemClick(item, e);
      }
      setDragState(null);
      return;
    }
    
    // Check if anything changed
    const startChanged = currentStartDate.getTime() !== originalStartDate.getTime();
    const endChanged = currentEndDate.getTime() !== originalEndDate.getTime();
    const ringChanged = groupBy === 'rings' && targetRingId !== originalRingId;
    
    if (startChanged || endChanged || ringChanged) {
      // Format dates as ISO strings (date only)
      const formatDate = (d) => d.toISOString().split('T')[0];
      
      const updatedItem = {
        ...item,
        startDate: formatDate(currentStartDate),
        endDate: formatDate(currentEndDate),
      };
      
      // Update ring if moved between rings
      if (ringChanged) {
        updatedItem.ringId = targetRingId;
      }
      
      if (onUpdateItem) {
        onUpdateItem(updatedItem);
      }
    }
    
    setDragState(null);
  };
  
  // Store handlers in refs to avoid stale closures
  const dragMoveRef = useRef(handleDragMove);
  const dragEndRef = useRef(handleDragEnd);
  
  useEffect(() => {
    dragMoveRef.current = handleDragMove;
    dragEndRef.current = handleDragEnd;
  });
  
  // Global mouse move/up handlers for drag
  useEffect(() => {
    if (dragState) {
      const handleMouseMoveGlobal = (e) => dragMoveRef.current(e);
      const handleMouseUpGlobal = (e) => dragEndRef.current(e);
      
      window.addEventListener('mousemove', handleMouseMoveGlobal);
      window.addEventListener('mouseup', handleMouseUpGlobal);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveGlobal);
        window.removeEventListener('mouseup', handleMouseUpGlobal);
      };
    }
  }, [dragState !== null]); // Only re-attach when drag starts/stops
  
  // === END DRAG AND DROP ===
  
  // Render timeline bars
  const renderBars = () => {
    const bars = [];
    let currentY = 0;
    
    Object.entries(groupedItems).forEach(([groupId, items]) => {
      // Add space for group header
      currentY += GROUP_HEADER_HEIGHT;
      
      const isExpanded = expandedGroups[groupId];
      
      if (isExpanded) {
        items.forEach((item, index) => {
          // Skip items without valid dates
          if (!item.startDate || !item.endDate) {
            return;
          }
          
          // Check if this item is being dragged
          const isDragging = dragState && dragState.item.id === item.id;
          
          // Use drag state dates if dragging, otherwise use item dates
          const displayStartDate = isDragging ? dragState.currentStartDate : new Date(item.startDate);
          const displayEndDate = isDragging ? dragState.currentEndDate : new Date(item.endDate);
          
          const startX = timeScale.dateToX(displayStartDate);
          const endX = timeScale.dateToX(displayEndDate);
          const width = Math.max(endX - startX, 20); // Minimum 20px width
          // Y position - center 24px bar within 40px row (8px padding top/bottom)
          const y = currentY + index * ITEM_ROW_HEIGHT + 8;
          
          const color = getActivityGroupColor(item.activityId);
          const isSelected = selectedItemId === item.id;
          const isHovered = hoveredBarId === item.id;
          const showResizeHandles = isHovered && !isDragging;
          
          bars.push(
            <g 
              key={item.id} 
              onMouseDown={(e) => handleBarMouseDown(e, item, startX, width, groupId)}
              onMouseEnter={() => !dragState && setHoveredBarId(item.id)}
              onMouseLeave={() => !dragState && setHoveredBarId(null)}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {/* Bar background (rounded pill) */}
              <rect
                x={startX}
                y={y}
                width={width}
                height={24}
                rx={12}
                ry={12}
                fill={color}
                opacity={isDragging ? 0.7 : (isSelected ? 1 : 0.9)}
                stroke={isDragging ? '#3B82F6' : (isSelected ? '#3B82F6' : (isHovered ? 'rgba(59, 130, 246, 0.5)' : 'none'))}
                strokeWidth={isDragging ? 2 : (isSelected ? 2 : (isHovered ? 1 : 0))}
                strokeDasharray={isDragging ? '4 2' : 'none'}
                className="transition-opacity hover:opacity-100"
              />
              
              {/* Resize handles - visible on hover */}
              {showResizeHandles && (
                <>
                  {/* Left resize handle - visual indicator */}
                  <rect
                    x={startX}
                    y={y}
                    width={10}
                    height={24}
                    rx={12}
                    fill="rgba(255,255,255,0.3)"
                    style={{ cursor: 'ew-resize' }}
                  />
                  <line
                    x1={startX + 4}
                    y1={y + 6}
                    x2={startX + 4}
                    y2={y + 18}
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="pointer-events-none"
                  />
                  {/* Right resize handle - visual indicator */}
                  <rect
                    x={startX + width - 10}
                    y={y}
                    width={10}
                    height={24}
                    rx={12}
                    fill="rgba(255,255,255,0.3)"
                    style={{ cursor: 'ew-resize' }}
                  />
                  <line
                    x1={startX + width - 4}
                    y1={y + 6}
                    x2={startX + width - 4}
                    y2={y + 18}
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="pointer-events-none"
                  />
                </>
              )}
              
              {/* Invisible resize hit areas (always active for cursor change) */}
              <rect
                x={startX}
                y={y}
                width={10}
                height={24}
                fill="transparent"
                style={{ cursor: 'ew-resize' }}
              />
              <rect
                x={startX + width - 10}
                y={y}
                width={10}
                height={24}
                fill="transparent"
                style={{ cursor: 'ew-resize' }}
              />
              
              {/* Item name text */}
              <text
                x={startX + 14}
                y={y + 16}
                fontSize="12"
                fill="white"
                className="pointer-events-none"
                style={{ userSelect: 'none' }}
              >
                {item.name.length > 25 ? item.name.slice(0, 25) + '...' : item.name}
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
  
  // Render drag target indicator when dragging between rings
  const renderDragTargetIndicator = () => {
    if (!dragState || groupBy !== 'rings') return null;
    
    const targetPos = groupYPositions.find(p => p.groupId === dragState.targetRingId);
    if (!targetPos || dragState.targetRingId === dragState.originalRingId) return null;
    
    return (
      <rect
        x={0}
        y={targetPos.startY}
        width={effectiveWidth}
        height={targetPos.endY - targetPos.startY}
        fill="#3B82F6"
        opacity={0.1}
        className="pointer-events-none"
      />
    );
  };
  
  // Today marker
  const todayX = timeScale.dateToX(new Date());
  const showTodayMarker = todayX >= 0 && todayX <= containerWidth;
  
  return (
    <div 
      ref={scrollContainerRef}
      className={`flex-1 overflow-x-auto bg-white min-w-0 ${dragState ? 'cursor-grabbing' : (isPanning ? 'cursor-grabbing' : 'cursor-default')}`}
      style={{ height: `${totalHeight}px` }}
      data-cy="gantt-timeline-pane"
      onMouseDown={!dragState ? handleMouseDown : undefined}
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
          
          {/* Drag target highlight */}
          {renderDragTargetIndicator()}
        </svg>
        
        {/* Item bars */}
        <svg
          className="absolute inset-0"
          width={effectiveWidth}
          height={totalHeight}
          style={{ pointerEvents: dragState ? 'none' : 'auto' }}
        >
          {renderBars()}
        </svg>
      </div>
    </div>
  );
};

export default GanttTimelinePane;
