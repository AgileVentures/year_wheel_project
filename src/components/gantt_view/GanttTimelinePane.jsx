import { useRef, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addMonths, startOfMonth, endOfMonth, eachWeekOfInterval, eachDayOfInterval, endOfWeek } from 'date-fns';
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
  const { i18n } = useTranslation();
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
  // dragState = { item, mode: 'move' | 'resize-start' | 'resize-end', startX, startY, originalStartDate, originalEndDate, originalRingId, currentStartDate, currentEndDate, targetRingId, currentY }
  
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
  
  // Calculate all bar positions for rendering and dependency arrows
  const barPositions = useMemo(() => {
    const positions = new Map();
    let currentY = 0;
    
    Object.entries(groupedItems).forEach(([groupId, items]) => {
      currentY += GROUP_HEADER_HEIGHT;
      
      const isExpanded = expandedGroups[groupId];
      
      if (isExpanded) {
        items.forEach((item, index) => {
          if (!item.startDate || !item.endDate) return;
          
          const startX = timeScale.dateToX(new Date(item.startDate));
          const endX = timeScale.dateToX(new Date(item.endDate));
          const width = Math.max(endX - startX, 20);
          const y = currentY + index * ITEM_ROW_HEIGHT + 8;
          
          positions.set(item.id, {
            item,
            startX,
            endX,
            width,
            y,
            centerY: y + 12, // Center of 24px bar
          });
        });
        
        currentY += items.length * ITEM_ROW_HEIGHT;
      }
    });
    
    return positions;
  }, [groupedItems, expandedGroups, timeScale]);
  
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
      currentY: mouseY,
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
          
          // Original position (always use item's actual dates)
          const originalStartX = timeScale.dateToX(new Date(item.startDate));
          const originalEndX = timeScale.dateToX(new Date(item.endDate));
          const originalWidth = Math.max(originalEndX - originalStartX, 20);
          
          // Y position - center 24px bar within 40px row (8px padding top/bottom)
          const y = currentY + index * ITEM_ROW_HEIGHT + 8;
          
          const color = getActivityGroupColor(item.activityId);
          const isSelected = selectedItemId === item.id;
          const isHovered = hoveredBarId === item.id;
          const showResizeHandles = isHovered && !isDragging;
          
          // When dragging, render ghost at original position + preview at new position
          if (isDragging) {
            const previewStartX = timeScale.dateToX(dragState.currentStartDate);
            const previewEndX = timeScale.dateToX(dragState.currentEndDate);
            const previewWidth = Math.max(previewEndX - previewStartX, 20);
            
            // Calculate preview Y position - follow cursor Y, centered on bar
            // Use currentY from drag state, offset to center the 24px bar
            let previewY = dragState.currentY !== undefined ? dragState.currentY - 12 : y;
            
            bars.push(
              <g key={`${item.id}-ghost`}>
                {/* Ghost bar at original position */}
                <rect
                  x={originalStartX}
                  y={y}
                  width={originalWidth}
                  height={24}
                  rx={12}
                  ry={12}
                  fill={color}
                  opacity={0.3}
                  stroke="none"
                />
                <text
                  x={originalStartX + 14}
                  y={y + 16}
                  fontSize="12"
                  fill="white"
                  opacity={0.5}
                  className="pointer-events-none"
                  style={{ userSelect: 'none' }}
                >
                  {item.name.length > 25 ? item.name.slice(0, 25) + '...' : item.name}
                </text>
              </g>
            );
            
            bars.push(
              <g key={`${item.id}-preview`} style={{ cursor: 'grabbing' }}>
                {/* Preview bar at new position */}
                <rect
                  x={previewStartX}
                  y={previewY}
                  width={previewWidth}
                  height={24}
                  rx={12}
                  ry={12}
                  fill={color}
                  opacity={0.85}
                  stroke="#3B82F6"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
                <text
                  x={previewStartX + 14}
                  y={previewY + 16}
                  fontSize="12"
                  fill="white"
                  className="pointer-events-none"
                  style={{ userSelect: 'none' }}
                >
                  {item.name.length > 25 ? item.name.slice(0, 25) + '...' : item.name}
                </text>
              </g>
            );
          } else {
            // Normal bar rendering (not dragging)
            bars.push(
              <g 
                key={item.id} 
                onMouseDown={(e) => handleBarMouseDown(e, item, originalStartX, originalWidth, groupId)}
                onMouseEnter={() => !dragState && setHoveredBarId(item.id)}
                onMouseLeave={() => !dragState && setHoveredBarId(null)}
                style={{ cursor: 'grab' }}
              >
                {/* Bar background (rounded pill) */}
                <rect
                  x={originalStartX}
                  y={y}
                  width={originalWidth}
                  height={24}
                  rx={12}
                  ry={12}
                  fill={color}
                  opacity={isSelected ? 1 : 0.9}
                  stroke={isSelected ? '#3B82F6' : (isHovered ? 'rgba(59, 130, 246, 0.5)' : 'none')}
                  strokeWidth={isSelected ? 2 : (isHovered ? 1 : 0)}
                  className="transition-opacity hover:opacity-100"
                />
                
                {/* Resize handles - visible on hover */}
                {showResizeHandles && (
                  <>
                    {/* Left resize handle - visual indicator */}
                    <rect
                      x={originalStartX}
                      y={y}
                      width={10}
                      height={24}
                      rx={12}
                      fill="rgba(255,255,255,0.3)"
                      style={{ cursor: 'ew-resize' }}
                    />
                    <line
                      x1={originalStartX + 4}
                      y1={y + 6}
                      x2={originalStartX + 4}
                      y2={y + 18}
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      className="pointer-events-none"
                    />
                    {/* Right resize handle - visual indicator */}
                    <rect
                      x={originalStartX + originalWidth - 10}
                      y={y}
                      width={10}
                      height={24}
                      rx={12}
                      fill="rgba(255,255,255,0.3)"
                      style={{ cursor: 'ew-resize' }}
                    />
                    <line
                      x1={originalStartX + originalWidth - 4}
                      y1={y + 6}
                      x2={originalStartX + originalWidth - 4}
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
                  x={originalStartX}
                  y={y}
                  width={10}
                  height={24}
                  fill="transparent"
                  style={{ cursor: 'ew-resize' }}
                />
                <rect
                  x={originalStartX + originalWidth - 10}
                  y={y}
                  width={10}
                  height={24}
                  fill="transparent"
                  style={{ cursor: 'ew-resize' }}
                />
                
                {/* Item name text */}
                <text
                  x={originalStartX + 14}
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
          }
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
  
  // Render dependency arrows between linked items
  const renderDependencyArrows = () => {
    const arrows = [];
    
    // Get all items from all groups
    const allItems = Object.values(groupedItems).flat();
    
    allItems.forEach(item => {
      // Skip if no dependency
      if (!item.dependsOn) return;
      
      // Get positions of both items
      const dependentPos = barPositions.get(item.id);
      const predecessorPos = barPositions.get(item.dependsOn);
      
      // Skip if either item is not visible
      if (!dependentPos || !predecessorPos) return;
      
      // Calculate connection points based on dependency type
      let startX, startY, endX, endY;
      const dependencyType = item.dependencyType || 'finish_to_start';
      
      switch (dependencyType) {
        case 'finish_to_start':
          // Arrow from predecessor END to dependent START
          startX = predecessorPos.endX;
          startY = predecessorPos.centerY;
          endX = dependentPos.startX;
          endY = dependentPos.centerY;
          break;
        
        case 'start_to_start':
          // Arrow from predecessor START to dependent START
          startX = predecessorPos.startX;
          startY = predecessorPos.centerY;
          endX = dependentPos.startX;
          endY = dependentPos.centerY;
          break;
        
        case 'finish_to_finish':
          // Arrow from predecessor END to dependent END
          startX = predecessorPos.endX;
          startY = predecessorPos.centerY;
          endX = dependentPos.endX;
          endY = dependentPos.centerY;
          break;
        
        default:
          return;
      }
      
      // Calculate path - use stepped path for cleaner look (like MS Project)
      const midX = startX + 15; // Small horizontal offset from start
      const cornerRadius = 4;
      
      // Create path with rounded corners
      // Path: horizontal from start, then vertical, then horizontal to end
      let pathD;
      
      if (Math.abs(startY - endY) < 5) {
        // Same row - straight horizontal line
        pathD = `M ${startX} ${startY} L ${endX - 8} ${endY}`;
      } else if (endX > startX + 30) {
        // End is to the right - simple path
        pathD = `M ${startX} ${startY} 
                 L ${midX} ${startY} 
                 Q ${midX + cornerRadius} ${startY} ${midX + cornerRadius} ${startY + (endY > startY ? cornerRadius : -cornerRadius)}
                 L ${midX + cornerRadius} ${endY - (endY > startY ? cornerRadius : -cornerRadius)}
                 Q ${midX + cornerRadius} ${endY} ${midX + cornerRadius * 2} ${endY}
                 L ${endX - 8} ${endY}`;
      } else {
        // End is to the left or overlapping - need to go around
        const routeY = Math.max(startY, endY) + 25;
        pathD = `M ${startX} ${startY}
                 L ${startX + 10} ${startY}
                 Q ${startX + 10 + cornerRadius} ${startY} ${startX + 10 + cornerRadius} ${startY + cornerRadius}
                 L ${startX + 10 + cornerRadius} ${routeY - cornerRadius}
                 Q ${startX + 10 + cornerRadius} ${routeY} ${startX + 10} ${routeY}
                 L ${endX - 15} ${routeY}
                 Q ${endX - 15 - cornerRadius} ${routeY} ${endX - 15 - cornerRadius} ${routeY - cornerRadius}
                 L ${endX - 15 - cornerRadius} ${endY + cornerRadius}
                 Q ${endX - 15 - cornerRadius} ${endY} ${endX - 15} ${endY}
                 L ${endX - 8} ${endY}`;
      }
      
      const arrowSize = 6;
      
      arrows.push(
        <g key={`dep-${item.id}`} className="pointer-events-none">
          {/* Dependency line */}
          <path
            d={pathD}
            fill="none"
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
          {/* Arrowhead */}
          <polygon
            points={`
              ${endX - 8},${endY}
              ${endX - 8 - arrowSize * 1.5},${endY - arrowSize}
              ${endX - 8 - arrowSize * 1.5},${endY + arrowSize}
            `}
            fill="rgba(59, 130, 246, 0.7)"
          />
        </g>
      );
    });
    
    return arrows;
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
          
          {/* Dependency arrows */}
          {renderDependencyArrows()}
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
