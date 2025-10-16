/* eslint-disable no-unused-vars */
// Based on the original/legacy from kirkby's year-wheel project
// See the YearWheelClassRedefined.js file for an attempt to make this more concise and readable
import C2S from "canvas2svg";

class YearWheel {
  constructor(canvas, year, title, colors, size, events, options) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.year = year;
    this.title = title;
    this.outerRingColor = colors[0]; 
    this.sectionColors = colors; 
    this.size = size;
    this.events = events;
    this.options = options;
    this.organizationData = options.organizationData || { items: [], rings: [], activityGroups: [], labels: [] };
    // Backward compatibility: convert old 'activities' to 'activityGroups'
    if (this.organizationData.activities && !this.organizationData.activityGroups) {
      this.organizationData.activityGroups = this.organizationData.activities;
      delete this.organizationData.activities;
    }
    // For backward compatibility: merge old ringsData into organizationData.rings if needed
    if (options.ringsData && options.ringsData.length > 0 && !this.organizationData.rings.some(r => r.type === 'inner')) {
      // Convert old ringsData format to new ring structure
      const innerRingsFromOldData = options.ringsData.map((ring, index) => ({
        id: ring.id || `inner-ring-${index + 1}`,
        name: ring.name || `Ring ${index + 1}`,
        type: 'inner',
        visible: true,
        data: ring.data,
        orientation: ring.orientation || 'vertical'
      }));
      this.organizationData.rings = [...innerRingsFromOldData, ...this.organizationData.rings];
    }
    this.showWeekRing = options.showWeekRing !== undefined ? options.showWeekRing : true;
    this.showMonthRing = options.showMonthRing !== undefined ? options.showMonthRing : true;
    this.showRingNames = options.showRingNames !== undefined ? options.showRingNames : true;
    this.showLabels = options.showLabels !== undefined ? options.showLabels : true;
    this.weekRingDisplayMode = options.weekRingDisplayMode || 'week-numbers'; // 'week-numbers' or 'dates'
    this.zoomedMonth = options.zoomedMonth !== undefined && options.zoomedMonth !== null ? options.zoomedMonth : null;
    this.zoomedQuarter = options.zoomedQuarter !== undefined && options.zoomedQuarter !== null ? options.zoomedQuarter : null;
    this.zoomLevel = options.zoomLevel !== undefined ? options.zoomLevel : 100; // Zoom percentage (50-200), default 100%
    this.textColor = "#374151"; // Darker gray for better readability
    this.center = { x: size / 2, y: size / 2 }; // Center vertically (title removed)
    this.initAngle = -15 - 90;
    this.minRadius = size / 12; // Smaller center circle for better proportions
    
    // Dynamic maxRadius calculation based on outer rings
    this.calculateMaxRadius();
    
    this.hoveredItem = null; // Track currently hovered activity
    this.hoverRedrawPending = false; // Prevent excessive redraws on hover
    
    // Drag state for activity manipulation
    this.dragState = {
      isDragging: false,
      dragMode: null, // 'move', 'resize-start', 'resize-end'
      draggedItem: null,
      draggedItemRegion: null,
      startMouseAngle: 0,
      currentMouseAngle: 0,
      initialStartAngle: 0,
      initialEndAngle: 0,
      previewStartAngle: 0,
      previewEndAngle: 0,
      targetRing: null, // Track which ring we're dragging over (for ring switching)
      targetRingInfo: null, // Stores { ring, startRadius, endRadius, type }
    };
    
    // Use month names from options if provided, otherwise fallback to Swedish
    this.monthNames = options.monthNames || [
      "Januari",
      "Februari",
      "Mars",
      "April",
      "Maj",
      "Juni",
      "Juli",
      "Augusti",
      "September",
      "Oktober",
      "November",
      "December",
    ];
    this.rotationAngle = 0;
    this.isAnimating = false;
    this.isDragging = false;
    this.lastMouseAngle = 0;
    this.dragStartAngle = 0;
    this.clickableItems = []; // Store clickable item regions

    // Performance optimization: Offscreen canvas for caching static elements
    this.backgroundCache = document.createElement('canvas');
    this.backgroundCacheContext = this.backgroundCache.getContext('2d');
    this.cacheValid = false; // Track if cache needs regeneration
    this.lastCacheKey = ''; // Track what's cached to detect changes
    
    // Performance optimization: Text measurement cache
    this.textMeasurementCache = new Map();
    
    // Performance optimization: Throttle hover detection
    this.lastHoverCheck = 0;
    this.hoverThrottleMs = 16; // ~60fps max for hover checks

    // Store bound event handlers for cleanup
    this.boundHandlers = {
      startDrag: this.startDrag.bind(this),
      handleMouseMove: this.handleMouseMove.bind(this),
      stopDrag: this.stopDrag.bind(this),
      handleMouseLeave: this.handleMouseLeave.bind(this),
      handleClick: this.handleClick.bind(this),
    };

    // Add event listeners
    this.canvas.addEventListener("mousedown", this.boundHandlers.startDrag);
    this.canvas.addEventListener("mousemove", this.boundHandlers.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.boundHandlers.stopDrag);
    this.canvas.addEventListener("mouseleave", this.boundHandlers.handleMouseLeave);
    this.canvas.addEventListener("click", this.boundHandlers.handleClick);
  }

  /**
   * Calculate maximum radius dynamically based on outer rings
   * Makes wheel larger when no outer rings exist, shrinks when outer rings are added
   */
  calculateMaxRadius() {
    const visibleOuterRings = this.organizationData.rings.filter(r => r.visible && r.type === 'outer');
    
    if (visibleOuterRings.length === 0) {
      // No outer rings: maximize space (use more of the canvas)
      // Reduce padding from size/30 to size/50 for more space
      this.maxRadius = this.size / 2 - this.size / 50;
    } else {
      // Has outer rings: only shrink slightly to maintain good proportions
      // Outer rings will be drawn OUTSIDE this radius, extending toward the edge
      // We only need a small reduction to ensure proper spacing
      const outerRingSpace = visibleOuterRings.length * (this.size / 23);
      
      // Instead of subtracting full outer ring space, only shrink by 60% of it
      // This keeps the inner wheel larger while still making room for outer rings
      const shrinkAmount = outerRingSpace * 0.6;
      const padding = this.size / 60; // Minimal padding
      
      this.maxRadius = (this.size / 2) - padding - shrinkAmount;
    }
  }

  // Generate cache key to detect when background needs redrawing
  getCacheKey() {
    const ringCount = this.organizationData.rings.filter(r => r.visible).length;
    const visibilityState = `m${this.showMonthRing}w${this.showWeekRing}r${this.showRingNames}`;
    const zoomState = `z${this.zoomedMonth}-${this.zoomedQuarter}`;
    return `${this.year}-${ringCount}-${visibilityState}-${zoomState}-${this.size}`;
  }

  // Invalidate cache when structure changes
  invalidateCache() {
    this.cacheValid = false;
    this.textMeasurementCache.clear();
  }

  // Update organization data without recreating the wheel
  updateOrganizationData(newOrganizationData) {
    this.organizationData = newOrganizationData;
    
    // Recalculate maxRadius in case outer rings were added/removed/toggled
    this.calculateMaxRadius();
    
    // Invalidate cache if ring structure changed
    this.invalidateCache();
    // DON'T redraw during drag - it will cause wheel to go blank
    // The drag handler (dragActivity) already calls create() to show preview
    if (!this.dragState || !this.dragState.isDragging) {
      this.create();
    }
  }

  // Update zoom level and redraw (for smart text scaling)
  updateZoomLevel(newZoomLevel) {
    if (this.zoomLevel !== newZoomLevel) {
      this.zoomLevel = newZoomLevel;
      // Invalidate cache since text rendering will change
      this.invalidateCache();
      // Redraw with new zoom-adjusted text
      if (!this.dragState || !this.dragState.isDragging) {
        this.create();
      }
    }
  }

  // Cleanup method to remove event listeners
  cleanup() {
    if (this.canvas && this.boundHandlers) {
      this.canvas.removeEventListener("mousedown", this.boundHandlers.startDrag);
      this.canvas.removeEventListener("mousemove", this.boundHandlers.handleMouseMove);
      this.canvas.removeEventListener("mouseup", this.boundHandlers.stopDrag);
      this.canvas.removeEventListener("mouseleave", this.boundHandlers.handleMouseLeave);
      this.canvas.removeEventListener("click", this.boundHandlers.handleClick);
    }
    
    // Stop any animations
    this.isAnimating = false;
    this.isDragging = false;
    if (this.dragState) {
      this.dragState.isDragging = false;
    }
  }

  // Generate date ranges for each week (DD-DD format)
  generateWeekDateRanges() {
    const dateRanges = [];
    const year = parseInt(this.year);
    
    // Start from January 1st
    let currentDate = new Date(year, 0, 1);
    
    // Find the first Monday of the calendar
    while (currentDate.getDay() !== 1) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // Iterate through all weeks
    while (currentDate.getFullYear() <= year && dateRanges.length < 53) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
      
      // Only include weeks that overlap with the current year
      if (weekStart.getFullYear() === year || weekEnd.getFullYear() === year) {
        const startDay = weekStart.getDate();
        const endDay = weekEnd.getDate();
        
        // Format: "DD-DD" - handle month boundaries gracefully
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          // Same month: simple format
          dateRanges.push(`${startDay}-${endDay}`);
        } else {
          // Different months: show both dates
          dateRanges.push(`${startDay}-${endDay}`);
        }
      }
      
      // Move to next Monday
      currentDate.setDate(currentDate.getDate() + 7);
      
      // Stop if we've moved too far into the next year
      if (currentDate.getFullYear() > year && currentDate.getMonth() > 0) {
        break;
      }
    }
    
    return dateRanges;
  }

  generateWeeks() {
    const weeks = [];
    const year = parseInt(this.year);

    // Helper function to get ISO week number
    const getISOWeek = (date) => {
      const tempDate = new Date(date.getTime());
      tempDate.setHours(0, 0, 0, 0);
      // Set to nearest Thursday: current date + 4 - current day number
      // Make Sunday's day number 7
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      // Get first day of year
      const yearStart = new Date(tempDate.getFullYear(), 0, 1);
      // Calculate full weeks to nearest Thursday
      const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
      return weekNo;
    };

    // Helper function to get the year that the ISO week belongs to
    const getISOWeekYear = (date) => {
      const tempDate = new Date(date.getTime());
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      return tempDate.getFullYear();
    };

    // Start from January 1st
    let currentDate = new Date(year, 0, 1);
    
    // Find the first Monday of the calendar (might be in previous year)
    while (currentDate.getDay() !== 1) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    const seenWeeks = new Set();
    
    // Iterate through all Mondays in the year
    while (currentDate.getFullYear() <= year) {
      const isoWeek = getISOWeek(currentDate);
      const isoYear = getISOWeekYear(currentDate);
      
      // Only include weeks that belong to the current year or overlap significantly
      if (isoYear === year || currentDate.getFullYear() === year) {
        // Use just the week number for uniqueness check
        if (!seenWeeks.has(isoWeek) && weeks.length < 53) {
          seenWeeks.add(isoWeek);
          // Return just the number without "W" prefix (Swedish interface)
          weeks.push(isoWeek.toString());
        }
      }
      
      // Move to next Monday
      currentDate.setDate(currentDate.getDate() + 7);
      
      // Stop if we've moved too far into the next year
      if (currentDate.getFullYear() > year && currentDate.getMonth() > 0) {
        break;
      }
    }

    return weeks;
  }

  // Get month names for the current zoom level
  getMonthsForZoom() {
    if (this.zoomedMonth !== null) {
      // Single month view - return just that month
      return [this.monthNames[this.zoomedMonth]];
    } else if (this.zoomedQuarter !== null) {
      // Quarter view - return 3 months for that quarter
      const quarterStartMonth = this.zoomedQuarter * 3;
      return [
        this.monthNames[quarterStartMonth],
        this.monthNames[quarterStartMonth + 1],
        this.monthNames[quarterStartMonth + 2],
      ];
    } else {
      // Full year view - return all 12 months
      return this.monthNames;
    }
  }

  // Get the date range for current zoom level
  getDateRangeForZoom() {
    const year = parseInt(this.year);
    
    if (this.zoomedMonth !== null) {
      // Single month view
      const startDate = new Date(year, this.zoomedMonth, 1);
      const endDate = new Date(year, this.zoomedMonth + 1, 0, 23, 59, 59);
      return { startDate, endDate, months: [this.zoomedMonth] };
    } else if (this.zoomedQuarter !== null) {
      // Quarter view (Q1: 0-2, Q2: 3-5, Q3: 6-8, Q4: 9-11)
      const quarterStartMonth = this.zoomedQuarter * 3;
      const startDate = new Date(year, quarterStartMonth, 1);
      const endDate = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59);
      return { 
        startDate, 
        endDate, 
        months: [quarterStartMonth, quarterStartMonth + 1, quarterStartMonth + 2] 
      };
    } else {
      // Full year view
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      return { 
        startDate, 
        endDate, 
        months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] 
      };
    }
  }

  // Get weeks for the current zoom level
  getWeeksForZoom() {
    const year = parseInt(this.year);
    const { startDate, endDate } = this.getDateRangeForZoom();
    
    // Generate all weeks for the year
    const allWeeks = this.generateWeeks();
    
    // If not zoomed, return all weeks
    if (this.zoomedMonth === null && this.zoomedQuarter === null) {
      return allWeeks;
    }
    
    // Filter weeks that fall within the zoomed date range
    const filteredWeeks = [];
    const weekIndices = [];
    
    // For each week, check if it overlaps with the zoomed range
    let currentDate = new Date(year, 0, 1);
    while (currentDate.getDay() !== 1) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    let weekIndex = 0;
    while (weekIndex < allWeeks.length) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Check if week overlaps with zoomed range
      if (weekEnd >= startDate && weekStart <= endDate) {
        filteredWeeks.push(allWeeks[weekIndex]);
        weekIndices.push(weekIndex);
      }
      
      currentDate.setDate(currentDate.getDate() + 7);
      weekIndex++;
      
      if (currentDate.getFullYear() > year && currentDate.getMonth() > 0) {
        break;
      }
    }
    
    return filteredWeeks;
  }

  // Check if two date ranges overlap
  dateRangesOverlap(start1, end1, start2, end2) {
    return start1 <= end2 && start2 <= end1;
  }

  // Check if dragged activity would collide with existing items in target ring
  checkDragCollision(startDate, endDate, targetRingId, excludeItemId) {
    if (!targetRingId) return { hasCollision: false, collidingItems: [] };

    const visibleActivityGroups = this.organizationData.activityGroups.filter(a => a.visible);
    const visibleLabels = this.organizationData.labels.filter(l => l.visible);

    // Get all items in the target ring (excluding the dragged item)
    const ringItems = this.organizationData.items.filter(item => {
      if (item.id === excludeItemId) return false;
      if (item.ringId !== targetRingId) return false;
      
      const hasVisibleActivityGroup = visibleActivityGroups.some(a => a.id === item.activityId);
      const labelOk = !item.labelId || visibleLabels.some(l => l.id === item.labelId);
      return hasVisibleActivityGroup && labelOk;
    });

    // Check for overlaps
    const collidingItems = ringItems.filter(item => {
      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);
      return this.dateRangesOverlap(startDate, endDate, itemStart, itemEnd);
    });

    return {
      hasCollision: collidingItems.length > 0,
      collidingItems
    };
  }

  // Snap angle to nearest week boundary for cleaner placement
  snapToWeek(angle) {
    const weekAngle = (7 / 365) * 360; // One week in degrees
    const rawAngle = this.toDegrees(angle) - this.initAngle;
    const normalizedAngle = ((rawAngle % 360) + 360) % 360;
    const snappedAngle = Math.round(normalizedAngle / weekAngle) * weekAngle;
    return this.toRadians(snappedAngle + this.initAngle);
  }

  // Assign activities to non-overlapping tracks using greedy interval scheduling
  assignActivitiesToTracks(items) {
    if (items.length === 0) return { tracks: [], maxTracks: 0 };

    // Sort items by start date
    const sortedItems = [...items].sort((a, b) => 
      new Date(a.startDate) - new Date(b.startDate)
    );

    // Track assignment: tracks[trackIndex] = array of items in that track
    const tracks = [];
    const itemToTrack = new Map(); // Store which track each item is assigned to

    sortedItems.forEach(item => {
      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);
      
      // Find the first available track for this item
      let assignedTrack = -1;
      for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
        const track = tracks[trackIndex];
        
        // Check if this track has space (no overlaps with existing items)
        const hasOverlap = track.some(existingItem => {
          const existingStart = new Date(existingItem.startDate);
          const existingEnd = new Date(existingItem.endDate);
          return this.dateRangesOverlap(itemStart, itemEnd, existingStart, existingEnd);
        });
        
        if (!hasOverlap) {
          assignedTrack = trackIndex;
          break;
        }
      }
      
      // If no available track found, create a new one
      if (assignedTrack === -1) {
        assignedTrack = tracks.length;
        tracks.push([]);
      }
      
      // Assign item to track
      tracks[assignedTrack].push(item);
      itemToTrack.set(item.id, assignedTrack);
    });

    return {
      tracks,
      maxTracks: tracks.length,
      itemToTrack
    };
  }

  toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  toDegrees(rad) {
    return (rad * 180) / Math.PI;
  }

  moveToAngle(radius, angle) {
    const x = this.center.x + radius * Math.cos(angle);
    const y = this.center.y + radius * Math.sin(angle);
    return { x, y };
  }

  // Convert angle (in degrees, adjusted for initAngle) to date
  angleToDate(angle) {
    // Remove the initAngle offset to get raw angle
    let rawAngle = angle - this.initAngle;
    
    // Normalize to 0-360 range
    while (rawAngle < 0) rawAngle += 360;
    while (rawAngle >= 360) rawAngle -= 360;
    
    // Each month is 30 degrees (360 / 12)
    const monthFloat = rawAngle / 30;
    const month = Math.floor(monthFloat);
    const dayFloat = (monthFloat - month) * 30; // 0-30 range
    
    // Calculate actual day considering days in month
    const daysInMonth = new Date(this.year, month + 1, 0).getDate();
    const day = Math.max(1, Math.min(daysInMonth, Math.round((dayFloat / 30) * daysInMonth + 1)));
    
    // Create date (months are 0-indexed in JavaScript Date)
    const date = new Date(this.year, month, day);
    return date;
  }

  // Detect which part of activity is clicked: 'resize-start', 'move', or 'resize-end'
  detectDragZone(x, y, itemRegion) {
    // Get angle of click relative to center
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    let clickAngle = Math.atan2(dy, dx);
    
    // Account for rotation
    clickAngle -= this.rotationAngle;
    
    // Normalize to match item angles
    while (clickAngle < 0) clickAngle += Math.PI * 2;
    while (clickAngle >= Math.PI * 2) clickAngle -= Math.PI * 2;
    
    const startAngle = itemRegion.startAngle;
    const endAngle = itemRegion.endAngle;
    const angleSpan = endAngle - startAngle;
    
    // Calculate relative position within activity (0 to 1)
    let relativeAngle = clickAngle - startAngle;
    if (relativeAngle < 0) relativeAngle += Math.PI * 2;
    const relativePosition = relativeAngle / angleSpan;
    
    // Zones: left 10%, middle 80%, right 10%
    if (relativePosition < 0.1) {
      return 'resize-start';
    } else if (relativePosition > 0.9) {
      return 'resize-end';
    } else {
      return 'move';
    }
  }

  // Calculate text color based on background luminance for better contrast
  getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate relative luminance (ITU-R BT.709)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, dark gray for light backgrounds
    return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
  }

  // Create very light background color from template color for ring backgrounds
  getLightBackgroundColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Mix with white (75% white, 25% original color) for visible but subtle tint
    const newR = Math.floor(r * 0.25 + 255 * 0.75);
    const newG = Math.floor(g * 0.25 + 255 * 0.75);
    const newB = Math.floor(b * 0.25 + 255 * 0.75);
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  // Detect which ring a point (x, y) is within based on radius
  // Returns { ring, startRadius, endRadius, type } or null
  detectTargetRing(x, y) {
    // Calculate distance from center
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const radius = Math.sqrt(dx * dx + dy * dy);

    // Get visible rings
    const visibleOuterRings = this.organizationData.rings.filter(r => r.visible && r.type === 'outer');
    const visibleInnerRings = this.organizationData.rings.filter(r => r.visible && r.type === 'inner');

    const ringNameBandWidth = this.size / 70;
    const standardGap = 0;

    // Check outer rings first (they're drawn from maxRadius downward)
    if (visibleOuterRings.length > 0) {
      const outerRingTotalHeight = this.size / 23;
      let currentRadius = this.maxRadius;

      for (const ring of visibleOuterRings) {
        currentRadius -= outerRingTotalHeight;
        const ringStartRadius = currentRadius;
        const ringEndRadius = currentRadius + outerRingTotalHeight;

        if (radius >= ringStartRadius && radius <= ringEndRadius) {
          return {
            ring: ring,
            startRadius: ringStartRadius,
            endRadius: ringEndRadius,
            type: 'outer'
          };
        }
      }

      currentRadius -= standardGap;
    }

    // Check inner rings (they expand to fill available space)
    if (visibleInnerRings.length > 0) {
      // Show ALL visible inner rings, even if empty (no items)
      const innerRings = this.organizationData.rings.filter(r => {
        return r.type === 'inner' && r.visible;
      });

      const numberOfInnerRings = innerRings.length;
      let currentMaxRadius = this.maxRadius;
      
      if (visibleOuterRings.length > 0) {
        currentMaxRadius -= (visibleOuterRings.length * (this.size / 23)) + standardGap;
      }

      const totalAvailableSpace = currentMaxRadius - this.minRadius - this.size / 1000;
      const totalGapSpacing = numberOfInnerRings > 1 ? (numberOfInnerRings - 1) * standardGap : 0;
      const totalRingSpace = totalAvailableSpace - totalGapSpacing;
      const equalRingHeight = totalRingSpace / numberOfInnerRings;

      let eventRadius = this.minRadius;

      for (const ring of innerRings) {
        const ringStartRadius = eventRadius;
        const ringEndRadius = eventRadius + equalRingHeight;

        if (radius >= ringStartRadius && radius <= ringEndRadius) {
          return {
            ring: ring,
            startRadius: ringStartRadius,
            endRadius: ringEndRadius,
            type: 'inner'
          };
        }

        eventRadius += equalRingHeight + standardGap;
      }
    }

    return null; // Not in any ring
  }

  // Adjust color on hover: darken light colors, lighten dark colors
  getHoverColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    let newR, newG, newB;
    if (luminance > 0.5) {
      // Light color - darken by 20%
      newR = Math.max(0, Math.floor(r * 0.8));
      newG = Math.max(0, Math.floor(g * 0.8));
      newB = Math.max(0, Math.floor(b * 0.8));
    } else {
      // Dark color - lighten by 30%
      newR = Math.min(255, Math.floor(r * 1.3));
      newG = Math.min(255, Math.floor(g * 1.3));
      newB = Math.min(255, Math.floor(b * 1.3));
    }
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  drawTextOnCircle(
    text,
    radius,
    angle,
    fontSize,
    color,
    textAlign = "center",
    rotationDivider = 2
  ) {
    const coord = this.moveToAngle(radius, angle);
    this.context.save();
    this.context.font = `600 ${fontSize}px Arial, sans-serif`;
    this.context.fillStyle = color;
    this.context.textAlign = textAlign;
    this.context.textBaseline = "middle";
    this.context.translate(coord.x, coord.y);
    this.context.rotate(angle + Math.PI / rotationDivider);
    // Use original case for better readability (not all uppercase)
    this.context.fillText(text, 0, 0);
    this.context.restore();
  }

  setCircleSectionHTML({
    startRadius,
    width,
    startAngle,
    endAngle,
    color,
    textFunction,
    text,
    fontSize,
    isVertical,
    opacity,
    highlight,
    renderDecision,
  }) {
    const endRadius = startRadius + width; // Properly define endRadius
    const calculatedStartAngle = this.toRadians(startAngle);
    const calculatedEndAngle = this.toRadians(endAngle);

    const outerStartCoords = this.moveToAngle(endRadius, calculatedStartAngle);
    const outerEndCoords = this.moveToAngle(endRadius, calculatedEndAngle);
    const angleLength = Math.abs(calculatedEndAngle - calculatedStartAngle);

    // Apply opacity if provided
    if (opacity !== undefined && opacity < 1) {
      this.context.save();
      this.context.globalAlpha = opacity;
    }

    this.context.beginPath();
    this.context.fillStyle = color;
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius,
      calculatedStartAngle,
      calculatedEndAngle,
      false
    );
    this.context.lineTo(outerEndCoords.x, outerEndCoords.y);
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius + width,
      calculatedEndAngle,
      calculatedStartAngle,
      true
    );
    this.context.lineTo(outerStartCoords.x, outerStartCoords.y);
    this.context.fill();
    this.context.closePath();

    // Drawing the separating lines (from minRadius outward, not from center)
    const innerStartCoords = this.moveToAngle(this.minRadius, calculatedStartAngle);
    const innerEndCoords = this.moveToAngle(this.minRadius, calculatedEndAngle);
    
    this.context.beginPath();
    this.context.moveTo(innerStartCoords.x, innerStartCoords.y);
    this.context.lineTo(outerStartCoords.x, outerStartCoords.y);
    this.context.lineWidth = 0.5; // Ultra-thin lines for minimal visual noise
    this.context.strokeStyle = "rgba(255, 255, 255, 0.15)"; // Very subtle dividers
    this.context.stroke();

    this.context.beginPath();
    this.context.moveTo(innerEndCoords.x, innerEndCoords.y);
    this.context.lineTo(outerEndCoords.x, outerEndCoords.y);
    this.context.lineWidth = 0.5; // Ultra-thin lines for minimal visual noise
    this.context.strokeStyle = "rgba(255, 255, 255, 0.15)"; // Very subtle dividers
    this.context.stroke();

    // Draw highlight border if this section is highlighted (zoomed month)
    if (highlight) {
      this.context.beginPath();
      this.context.arc(
        this.center.x,
        this.center.y,
        startRadius,
        calculatedStartAngle,
        calculatedEndAngle,
        false
      );
      this.context.arc(
        this.center.x,
        this.center.y,
        startRadius + width,
        calculatedEndAngle,
        calculatedStartAngle,
        true
      );
      this.context.lineWidth = 1.5; // Subtle highlight
      this.context.strokeStyle = "rgba(59, 130, 246, 0.4)"; // Very subtle blue
      this.context.stroke();
      this.context.closePath();
    }

    if (text !== undefined) {
      textFunction.call(
        this,
        text,
        startRadius,
        width,
        calculatedStartAngle,
        calculatedEndAngle,
        angleLength,
        fontSize,
        isVertical, // Pass isVertical as it is, don't default it to true
        color, // Pass background color for contrast calculation
        renderDecision // Pass the pre-calculated rendering decision
      );
    }

    // Restore opacity if it was changed
    if (opacity !== undefined && opacity < 1) {
      this.context.restore();
    }
  }

  // Cached text measurement to avoid repeated measureText calls
  cachedMeasureText(text, font) {
    const cacheKey = `${font}:${text}`;
    if (this.textMeasurementCache.has(cacheKey)) {
      return this.textMeasurementCache.get(cacheKey);
    }
    const width = this.context.measureText(text).width;
    this.textMeasurementCache.set(cacheKey, width);
    return width;
  }

  setCircleSectionSmallTitle(
    text,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    fontSize,
    isVertical
  ) {
    const angle = (startAngle + endAngle) / 2;
    const middleRadius = startRadius + width / 2; // Properly center text vertically
    const color = "#ffffff";

    // Always use consistent positioning - text should be centered in the ring
    this.drawTextOnCircle(
      text,
      middleRadius, // Always use middle radius for consistent centering
      angle,
      fontSize,
      color,
      "center", // Center alignment for better positioning
      2 // Standard rotation (perpendicular to arc)
    );
  }

  setCircleSectionTitle(
    text,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    fontSize,
    isVertical
  ) {
    // NATURAL letter spacing - no stretching, just center the text
    const middleRadius = startRadius + width / 2;
    const color = "#ffffff";
    
    this.context.save();
    this.context.font = `600 ${fontSize}px Arial, sans-serif`;
    this.context.fillStyle = color;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    
    // Measure each character's natural width
    const charWidths = [];
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
      const charWidth = this.context.measureText(text[i]).width;
      charWidths.push(charWidth);
      totalWidth += charWidth;
    }
    
    // Add natural spacing between characters (10% of average char width)
    const avgCharWidth = totalWidth / text.length;
    const letterSpacing = avgCharWidth * 0.1;
    const totalSpacing = letterSpacing * (text.length - 1);
    const totalTextWidth = totalWidth + totalSpacing;
    
    // Calculate the angular span this text would naturally occupy
    const textAngleSpan = totalTextWidth / middleRadius;
    
    // Center the text within the available angle
    const startOffset = (angleLength - textAngleSpan) / 2;
    let currentAngle = startAngle + startOffset;
    
    // Draw each character with natural spacing
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = charWidths[i];
      const charAngleSpan = charWidth / middleRadius;
      
      // Position at center of character's arc span
      const charAngle = currentAngle + charAngleSpan / 2;
      const coord = this.moveToAngle(middleRadius, charAngle);
      
      this.context.save();
      this.context.translate(coord.x, coord.y);
      this.context.rotate(charAngle + Math.PI / 2);
      this.context.fillText(char, 0, 0);
      this.context.restore();
      
      // Move to next character (char width + spacing)
      currentAngle += charAngleSpan + (letterSpacing / middleRadius);
    }
    
    this.context.restore();
  }

  /**
   * COMPLETELY REWRITTEN TEXT RENDERING
   * Renders activity text perpendicular to the arc (radial direction)
   * with proper word wrapping, truncation, and size constraints
   * 
   * @param {object} renderDecision - Optional: Pre-calculated rendering decision from evaluateRenderingSolution
   */
  setCircleSectionAktivitetTitle(
    text,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    fontSize,
    isVertical,
    backgroundColor,
    renderDecision = null
  ) {
    // Angles are already in radians from setCircleSectionHTML
    const startRad = startAngle;
    const endRad = endAngle;
    const centerAngle = (startRad + endRad) / 2;
    const middleRadius = startRadius + width / 2;
    
    // Calculate available space in pixels
    const arcLength = middleRadius * Math.abs(angleLength); // Length along the arc
    const radialWidth = width; // Width perpendicular to arc
    
    // Smart zoom: MUCH lower thresholds to show more items when zoomed
    const zoomFactor = this.zoomLevel / 100;
    
    // Very aggressive thresholds - allow tiny segments to show text when zoomed
    let arcLengthThreshold = this.size * 0.003;  // Was 0.008 - much lower now!
    let radialWidthThreshold = this.size * 0.002; // Was 0.005 - much lower now!
    
    // Adjust thresholds inversely with zoom
    arcLengthThreshold = arcLengthThreshold / zoomFactor;
    radialWidthThreshold = radialWidthThreshold / zoomFactor;
    
    if (arcLength < arcLengthThreshold || radialWidth < radialWidthThreshold) {
      // Too small to render readable text - skip it
      return;
    }
    
    // Get text color with proper contrast
    const textColor = backgroundColor ? this.getContrastColor(backgroundColor) : "#FFFFFF";
    
    // INTELLIGENT DISPLAY-AWARE FONT SIZING WITH PROPORTIONAL SCALING
    const effectiveDisplaySize = this.size * zoomFactor;
    
    // STRICTER MINIMUM - Never go below readable size, prefer truncation
    const absoluteMinFont = Math.max(12, effectiveDisplaySize / 200); // Raised from 8
    const minDisplayFont = Math.max(14, effectiveDisplaySize / 180);  // Comfortable minimum
    const maxDisplayFont = Math.min(50, effectiveDisplaySize / 45);
    const reasonableMaxFont = Math.min(35, effectiveDisplaySize / 60);
    
    // TEXT CONTENT ANALYSIS
    const textLength = text.length;
    const hasSpaces = text.includes(' ');
    const wordCount = hasSpaces ? text.split(/\s+/).length : 1;
    
    // Length penalty (more moderate - won't force too-small fonts)
    let lengthPenalty = 1.0;
    if (textLength > 15) lengthPenalty = 0.90;  // Was 0.85
    else if (textLength > 10) lengthPenalty = 0.93; // Was 0.90
    else if (textLength > 6) lengthPenalty = 0.96;  // Was 0.95
    
    // CONTAINER PROPORTIONALITY
    const segmentArea = radialWidth * arcLength;
    const wheelArea = this.size * this.size;
    const areaRatio = segmentArea / wheelArea;
    
    // Size penalty for large segments (more moderate)
    let sizePenalty = 1.0;
    if (areaRatio > 0.15) sizePenalty = 0.88;      // Was 0.85
    else if (areaRatio > 0.10) sizePenalty = 0.92; // Was 0.90
    else if (areaRatio > 0.06) sizePenalty = 0.96; // Was 0.95
    
    // SPACE ANALYSIS
    const maxTextWidth = radialWidth * 0.80;
    const maxTextHeight = arcLength * 0.85;
    
    // Calculate initial font from space constraints
    let testFontSize = Math.min(
      maxTextWidth * 0.45,
      maxTextHeight * 0.25,
      reasonableMaxFont
    );
    
    // Apply penalties
    testFontSize = testFontSize * lengthPenalty * sizePenalty;
    
    // Enforce limits with stricter minimum
    testFontSize = Math.max(testFontSize, minDisplayFont);
    testFontSize = Math.min(testFontSize, maxDisplayFont);
    
    // If still below absolute minimum, use absolute minimum and truncate text instead
    if (testFontSize < absoluteMinFont) {
      testFontSize = absoluteMinFont;
    }
    
    // Now try to fit the text at this font size
    this.context.save();
    this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
    this.context.fillStyle = textColor;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    
    const textWidth = this.context.measureText(text).width;
    
    // TRUNCATION STRATEGY: Don't scale below readable size
    let displayText = text;
    
    if (textWidth > maxTextWidth) {
      // Check if scaling would go below minimum
      const scaleFactor = (maxTextWidth / textWidth) * 0.95;
      const scaledFont = testFontSize * scaleFactor;
      
      if (scaledFont >= absoluteMinFont) {
        // Scaling keeps us above minimum - safe to scale
        testFontSize = scaledFont;
        this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
      } else {
        // Scaling would be too small - keep minimum font and truncate instead
        testFontSize = absoluteMinFont;
        this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
        
        // Truncate text to fit width
        let truncated = text;
        let truncatedWidth = this.context.measureText(truncated + '…').width;
        
        while (truncatedWidth > maxTextWidth && truncated.length > 1) {
          truncated = truncated.substring(0, truncated.length - 1);
          truncatedWidth = this.context.measureText(truncated + '…').width;
        }
        
        if (truncated.length < text.length) {
          displayText = truncated + '…';
        }
      }
    }
    
    // MULTI-LINE RENDERING SUPPORT
    // If renderDecision indicates multi-line (lineCount > 1), wrap the text
    let linesToRender = [displayText];
    
    if (renderDecision && renderDecision.allowWrapping && renderDecision.lineCount > 1) {
      // Use the pre-calculated decision to render multi-line text
      const words = text.split(/\s+/);
      linesToRender = [];
      let currentLine = '';
      
      this.context.save();
      this.context.font = `500 ${renderDecision.fontSize}px Arial, sans-serif`;
      
      for (let word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = this.context.measureText(testLine).width;
        
        if (testWidth > maxTextWidth && currentLine) {
          linesToRender.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) linesToRender.push(currentLine);
      this.context.restore();
      
      // Update font size from decision
      testFontSize = renderDecision.fontSize;
      this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
    } else if (!renderDecision && text.includes(' ') && testFontSize >= 14) {
      // Fallback: attempt basic wrapping if no decision provided
      const words = text.split(/\s+/);
      linesToRender = [];
      let currentLine = '';
      
      for (let word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = this.context.measureText(testLine).width;
        
        if (testWidth > maxTextWidth && currentLine) {
          linesToRender.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) linesToRender.push(currentLine);
      
      // If wrapping creates more lines than fit, use single truncated line
      const lineHeight = testFontSize * 1.2;
      if (linesToRender.length * lineHeight > maxTextHeight) {
        linesToRender = [displayText];
      }
    }
    
    // Position at center of segment
    const coord = this.moveToAngle(middleRadius, centerAngle);
    this.context.translate(coord.x, coord.y);
    
    // Determine rotation for perpendicular text
    let normalizedAngle = centerAngle % (Math.PI * 2);
    if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
    
    // Check if we're on left side (flip text to keep readable)
    const isLeftSide = normalizedAngle > Math.PI / 2 && normalizedAngle < Math.PI * 1.5;
    let rotation = centerAngle;
    if (isLeftSide) {
      rotation += Math.PI;  // Flip 180° so text reads outward
    }
    
    this.context.rotate(rotation);
    
    // Draw text (single or multi-line)
    if (linesToRender.length === 1) {
      // Single line - center it
      this.context.fillText(linesToRender[0], 0, 0);
    } else {
      // Multi-line - stack vertically with proper spacing
      const lineHeight = testFontSize * 1.2;
      const totalHeight = linesToRender.length * lineHeight;
      let startY = -totalHeight / 2 + lineHeight / 2;
      
      for (let line of linesToRender) {
        this.context.fillText(line, 0, startY);
        startY += lineHeight;
      }
    }
    
    this.context.restore();
  }
  
  /**
   * Calculate optimal font size for text along an arc
   * Binary search to find largest font where text fits within arc length
   */
  calculateOptimalFontSizeForArc(text, availableArcLength, minSize, maxSize) {
    const testFontSize = (size) => {
      this.context.font = `500 ${size}px Arial, sans-serif`;
      const textWidth = this.context.measureText(text).width;
      return textWidth <= availableArcLength;
    };
    
    // Quick check: does it fit at max size?
    if (testFontSize(maxSize)) {
      return maxSize;
    }
    
    // Quick check: does it fit at min size?
    if (!testFontSize(minSize)) {
      return minSize; // Use min even if it doesn't fit
    }
    
    // Binary search for optimal size
    let left = minSize;
    let right = maxSize;
    let bestSize = minSize;
    
    while (right - left > 0.5) {
      const mid = (left + right) / 2;
      
      if (testFontSize(mid)) {
        bestSize = mid;
        left = mid;
      } else {
        right = mid;
      }
    }
    
    return bestSize;
  }
  
  /**
   * Calculate optimal font size to fit text in available space WITHOUT truncation
   * Binary search to find largest font that allows full text to fit
   */
  calculateOptimalFontSize(text, maxWidth, maxHeight, minSize, maxSize) {
    const testFontSize = (size) => {
      this.context.font = `500 ${size}px Arial, sans-serif`;
      const lineHeight = size * 1.2;
      const maxLines = Math.floor(maxHeight / lineHeight);
      
      if (maxLines < 1) return false;
      
      // Try to wrap text at this font size
      const lines = this.wrapTextNoTruncation(text, maxWidth, maxLines);
      
      // Check if all words fit
      const allWordsFit = lines.join(' ').replace(/\s+/g, ' ') === text.replace(/\s+/g, ' ');
      
      // Check if total height fits
      const totalHeight = lines.length * lineHeight;
      const fits = allWordsFit && totalHeight <= maxHeight;
      
      return fits;
    };
    
    // Binary search for optimal font size
    let left = minSize;
    let right = maxSize;
    let bestSize = minSize;
    
    // Quick check: does it fit at max size?
    if (testFontSize(maxSize)) {
      return maxSize;
    }
    
    // Quick check: does it fit at min size?
    if (!testFontSize(minSize)) {
      return minSize; // Even min size doesn't fit, but use it anyway
    }
    
    // Binary search
    while (right - left > 0.5) { // 0.5px precision
      const mid = (left + right) / 2;
      
      if (testFontSize(mid)) {
        bestSize = mid;
        left = mid;
      } else {
        right = mid;
      }
    }
    
    return bestSize;
  }
  
  /**
   * Wrap text across multiple lines WITHOUT truncation
   * Returns array of lines that fit within maxWidth
   */
  wrapTextNoTruncation(text, maxWidth, maxLines) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = this.context.measureText(testLine).width;
      
      if (testWidth > maxWidth && currentLine) {
        // Line is full, save current line and start new one
        lines.push(currentLine);
        
        // If we've reached max lines, stop here (rest won't fit)
        if (lines.length >= maxLines) {
          return lines;
        }
        
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    // Add the last line
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [];
  }
  
  /**
   * Smart text wrapping with word boundaries and ellipsis (legacy, for fallback)
   * Returns array of lines that fit within maxWidth and maxLines constraints
   */
  wrapText(text, maxWidth, maxLines) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordWidth = this.context.measureText(word).width;
      
      // If a single word is too long, truncate it immediately
      if (wordWidth > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          if (lines.length >= maxLines) {
            return lines;
          }
        }
        lines.push(this.truncateWithEllipsis(word, maxWidth));
        if (lines.length >= maxLines) {
          return lines;
        }
        currentLine = '';
        continue;
      }
      
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = this.context.measureText(testLine).width;
      
      if (testWidth > maxWidth && currentLine) {
        // Line is full, save current line and start new one
        lines.push(currentLine);
        
        // If we've reached the line limit, truncate remaining text
        if (lines.length >= maxLines) {
          // Collect all remaining words including current word
          const remaining = words.slice(i).join(' ');
          const truncated = this.truncateWithEllipsis(remaining, maxWidth);
          lines.push(truncated);
          return lines;
        }
        
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    // Add the last line if there's content
    if (currentLine) {
      if (lines.length < maxLines) {
        lines.push(currentLine);
      } else if (lines.length === maxLines) {
        // Replace the last line with truncated version if we're at limit
        lines[lines.length - 1] = this.truncateWithEllipsis(lines[lines.length - 1] + ' ' + currentLine, maxWidth);
      }
    }
    
    return lines.length > 0 ? lines : [this.truncateWithEllipsis(text, maxWidth)];
  }
  
  /**
   * Truncate text to fit width, adding ellipsis
   */
  truncateWithEllipsis(text, maxWidth) {
    const ellipsis = '…';
    const ellipsisWidth = this.context.measureText(ellipsis).width;
    
    if (this.context.measureText(text).width <= maxWidth) {
      return text;
    }
    
    // Binary search for optimal length
    let left = 0;
    let right = text.length;
    let bestFit = '';
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const candidate = text.substring(0, mid) + ellipsis;
      const width = this.context.measureText(candidate).width;
      
      if (width <= maxWidth) {
        bestFit = candidate;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return bestFit || ellipsis;
  }

  /**
   * HOLISTIC RENDERING EVALUATION v3
   * Simulates complete rendering with real-world circular layout considerations
   * Now supports multi-line wrapping for vertical text
   * 
   * Returns: {
   *   fontSize: number,
   *   truncated: boolean,
   *   truncationPercent: number (0-100),
   *   displayedText: string,
   *   lineCount: number,
   *   readabilityScore: number (0-100, higher is better),
   *   details: { font, space, natural, penalty } - score breakdown
   * }
   */
  evaluateRenderingSolution(text, orientation, arcLengthPx, radialHeight, middleRadius, allowWrapping = false) {
    const zoomFactor = this.zoomLevel / 100;
    
    // Debug flag for specific text patterns
    const debugThisText = text && (text.includes('Kampanj') || text.includes('planering'));
    
    // CRITICAL: Use ORIGINAL pixel dimensions for font calculations, NOT zoom-adjusted!
    // The canvas will scale with zoom, but the font size should be consistent
    // based on the actual segment geometry, not the displayed size
    // This ensures text that fits at 100% zoom doesn't suddenly get vertical at 150% zoom!
    
    // ABSOLUTE font size thresholds (for scoring only, not for calculation)
    const absoluteMinFont = 12;  // Absolute minimum - anything smaller is unreadable
    const minDisplayFont = 14;   // Comfortable minimum for body text
    const sweetSpotMin = 16;     // Start of ideal reading range
    const sweetSpotMax = 28;     // End of ideal reading range
    const reasonableMaxFont = 35; // Maximum before looking too large
    const maxDisplayFont = 50;    // Absolute maximum
    
    // Text analysis
    const textLength = text.length;
    const hasSpaces = text.includes(' ');
    const wordCount = hasSpaces ? text.split(/\s+/).length : 1;
    
    let lengthPenalty = 1.0;
    if (textLength > 15) lengthPenalty = 0.90;
    else if (textLength > 10) lengthPenalty = 0.93;
    else if (textLength > 6) lengthPenalty = 0.96;
    
    // Container proportionality
    const segmentArea = radialHeight * arcLengthPx;
    const wheelArea = this.size * this.size;
    const areaRatio = segmentArea / wheelArea;
    
    // SMART SIZE PENALTY: 
    // - Multi-line wrapping gets less penalty (we WANT multiline to use the space!)
    // - Single-word short text gets less penalty (should be allowed to grow)
    // - Long single-line text keeps penalty (to encourage wrapping instead)
    let sizePenalty = 1.0;
    
    const isShortSingleWord = textLength <= 12 && wordCount === 1;
    const isMultiLine = allowWrapping && hasSpaces;
    
    if (isMultiLine) {
      // VERY lenient for multi-line - we WANT it to use available space!
      if (areaRatio > 0.15) sizePenalty = 0.96;      // was 0.88 - much more favorable
      else if (areaRatio > 0.10) sizePenalty = 0.98; // was 0.92 - much more favorable
      else if (areaRatio > 0.06) sizePenalty = 0.99; // was 0.96 - barely any penalty
    } else if (isShortSingleWord) {
      // Lenient for short single words (like "Höstnyheter")
      if (areaRatio > 0.15) sizePenalty = 0.94;      // was 0.88 - less harsh
      else if (areaRatio > 0.10) sizePenalty = 0.96; // was 0.92 - less harsh
      else if (areaRatio > 0.06) sizePenalty = 0.98; // was 0.96 - less harsh
    } else {
      // Keep stricter penalties for long single-line text (encourages wrapping)
      if (areaRatio > 0.15) sizePenalty = 0.88;
      else if (areaRatio > 0.10) sizePenalty = 0.92;
      else if (areaRatio > 0.06) sizePenalty = 0.96;
    }
    
    let fontSize, availableSpace, needsTruncation, truncationPercent, lineCount = 1;
    
    if (orientation === 'vertical') {
      // VERTICAL: Text width limited by radial height, text height by arc length
      const maxTextWidth = radialHeight * 0.80;
      const maxTextHeight = arcLengthPx * 0.85;
      
      // MULTI-LINE WRAPPING SUPPORT
      if (allowWrapping && text.includes(' ')) {
        // Calculate font size for multi-line text
        const words = text.split(/\s+/);
        const wordCount = words.length;
        
        // Try to fit text in 2-3 lines depending on word count
        const targetLines = wordCount >= 4 ? 3 : 2;
        const lineHeight = maxTextHeight / (targetLines + 0.5); // +0.5 for spacing
        
        fontSize = Math.min(
          maxTextWidth * 0.45,
          lineHeight * 0.8, // Height per line
          reasonableMaxFont
        );
        
        fontSize = fontSize * lengthPenalty * sizePenalty;
        fontSize = Math.max(fontSize, minDisplayFont);
        fontSize = Math.min(fontSize, maxDisplayFont);
        
        if (fontSize < absoluteMinFont) fontSize = absoluteMinFont;
        
        // Simulate word wrapping
        this.context.save();
        this.context.font = `500 ${fontSize}px Arial, sans-serif`;
        
        let lines = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
          const testWidth = this.context.measureText(testLine).width;
          
          if (testWidth > maxTextWidth && currentLine) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        
        this.context.restore();
        
        lineCount = lines.length;
        const totalHeight = lineCount * fontSize * 1.2; // 1.2 line height
        
        needsTruncation = totalHeight > maxTextHeight;
        truncationPercent = needsTruncation ? 
          ((totalHeight - maxTextHeight) / totalHeight) * 100 : 0;
        
        // Check if any line is too wide (overflow)
        this.context.save();
        this.context.font = `500 ${fontSize}px Arial, sans-serif`;
        const maxLineWidth = Math.max(...lines.map(line => this.context.measureText(line).width));
        this.context.restore();
        
        if (maxLineWidth > maxTextWidth) {
          // Lines overflow - partial truncation
          truncationPercent = Math.max(truncationPercent, 
            ((maxLineWidth - maxTextWidth) / maxLineWidth) * 100);
        }
        
        availableSpace = maxTextHeight; // For scoring purposes
        
      } else {
        // SINGLE LINE (original logic)
        fontSize = Math.min(
          maxTextWidth * 0.45,
          maxTextHeight * 0.25,
          reasonableMaxFont
        );
        
        fontSize = fontSize * lengthPenalty * sizePenalty;
        fontSize = Math.max(fontSize, minDisplayFont);
        fontSize = Math.min(fontSize, maxDisplayFont);
        
        if (fontSize < absoluteMinFont) fontSize = absoluteMinFont;
        
        // Check if truncation needed
        this.context.save();
        this.context.font = `500 ${fontSize}px Arial, sans-serif`;
        const textWidth = this.context.measureText(text).width;
        this.context.restore();
        
        availableSpace = maxTextWidth;
        needsTruncation = textWidth > availableSpace;
        
        if (needsTruncation) {
          // Calculate how much we'd need to truncate
          const charsNeeded = text.length;
          const charsFit = Math.floor((availableSpace / textWidth) * text.length) - 1;
          truncationPercent = ((charsNeeded - charsFit) / charsNeeded) * 100;
        } else {
          truncationPercent = 0;
        }
      }
      
    } else {
      // HORIZONTAL: Text follows arc
      const availableArcLength = middleRadius * (arcLengthPx / middleRadius) * 0.85;
      const maxRadialHeight = radialHeight * 0.85;
      
      // MULTI-LINE HORIZONTAL SUPPORT (stacked arcs)
      if (allowWrapping && text.includes(' ')) {
        const words = text.split(/\s+/);
        const wordCount = words.length;
        
        // DECISION: Text has spaces, so we WANT multi-line rendering
        // Determine target lines based on word count
        const targetLines = wordCount >= 4 ? 3 : 2;
        const lineHeight = maxRadialHeight / (targetLines + 0.3); // +0.3 for spacing between arcs
        
        // Calculate font size that achieves multi-line wrapping with readability
        // Strategy: Find largest readable font where text wraps to targetLines
        // Constraints: 14px min, 28px max for readability
        let minFontSize = minDisplayFont; // 14px
        let maxFontSize = Math.min(
          lineHeight * 0.7,  // From radial height (conservative)
          sweetSpotMax,      // 28px max for readability
          reasonableMaxFont  // 35px absolute max
        );
        let bestFontSize = minFontSize;
        let bestLineCount = 1;
        
        // Binary search for optimal font that achieves targetLines wrapping
        for (let iteration = 0; iteration < 10; iteration++) {
          const testFontSize = (minFontSize + maxFontSize) / 2;
          
          this.context.save();
          this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
          
          // Simulate wrapping at this font size
          let testLines = [];
          let currentLine = '';
          
          for (let word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const testWidth = this.context.measureText(testLine).width;
            
            if (testWidth > availableArcLength && currentLine) {
              testLines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) testLines.push(currentLine);
          
          const testLineCount = testLines.length;
          const totalHeight = testLineCount * testFontSize * 1.3;
          const fitsVertically = totalHeight <= maxRadialHeight;
          
          this.context.restore();
          
          // Check max line width to ensure it fits horizontally
          const maxLineWidth = Math.max(...testLines.map(line => this.context.measureText(line).width));
          const fitsHorizontally = maxLineWidth <= availableArcLength * 0.98; // 98% to add small margin
          
          // Check if this achieves our target AND fits the container
          if (testLineCount >= targetLines && fitsVertically && fitsHorizontally) {
            // Good! Multi-line wrapping that fits container
            bestFontSize = testFontSize;
            bestLineCount = testLineCount;
            minFontSize = testFontSize; // Try even larger
          } else if (testLineCount < targetLines && fitsVertically) {
            // Font too small, fits on fewer lines - try larger to force wrapping
            minFontSize = testFontSize;
          } else {
            // Doesn't fit (too many lines, lines too wide, or too tall)
            maxFontSize = testFontSize; // Try smaller
          }
        }
        
        // Use the font size found by binary search - it's already optimal for THIS container!
        // Don't apply generic penalties that ignore container geometry
        fontSize = bestFontSize;
        
        // Only enforce absolute minimums/maximums
        fontSize = Math.max(fontSize, absoluteMinFont);
        fontSize = Math.min(fontSize, reasonableMaxFont);
        
        // Final wrapping simulation with chosen font
        this.context.save();
        this.context.font = `500 ${fontSize}px Arial, sans-serif`;
        
        let lines = [];
        let currentLine = '';
        
        for (let word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const testWidth = this.context.measureText(testLine).width;
          
          if (testWidth > availableArcLength && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        
        this.context.restore();
        
        lineCount = lines.length;
        const totalRadialHeight = lineCount * fontSize * 1.3; // 1.3 spacing for arc stacking
        
        // STRICT VALIDATION: Check if any line is too long for arc
        this.context.save();
        this.context.font = `500 ${fontSize}px Arial, sans-serif`;
        const maxLineWidth = Math.max(...lines.map(line => this.context.measureText(line).width));
        this.context.restore();
        
        // LENIENT VALIDATION: Check if text fits with generous margins
        const fitsVertically = totalRadialHeight <= maxRadialHeight * 1.05; // 5% tolerance
        const fitsHorizontally = maxLineWidth <= availableArcLength * 1.02; // 2% tolerance (was 0.98)
        
        if (!fitsVertically || !fitsHorizontally) {
          // Solution doesn't fit - mark as failed but be lenient
          needsTruncation = true;
          truncationPercent = !fitsHorizontally ? 
            ((maxLineWidth - availableArcLength) / maxLineWidth) * 100 : 
            ((totalRadialHeight - maxRadialHeight) / totalRadialHeight) * 100;
          
          // Only reject if overflow is VERY significant (was 5%, now 15%)
          if (truncationPercent > 15) {
            // Debug logging silenced for production
            // if (debugThisText) {
            //   console.log(`  ❌ REJECTED: ${!fitsHorizontally ? 'Horizontal' : 'Vertical'} overflow ${truncationPercent.toFixed(1)}%`);
            //   console.log(`     Max line width: ${maxLineWidth.toFixed(1)}px, Available: ${(availableArcLength * 0.98).toFixed(1)}px`);
            //   console.log(`     Total height: ${totalRadialHeight.toFixed(1)}px, Max: ${maxRadialHeight.toFixed(1)}px`);
            // }
          }
        } else {
          needsTruncation = false;
          truncationPercent = 0;
        }
        
        availableSpace = availableArcLength; // For scoring
        
      } else {
        // SINGLE LINE HORIZONTAL (original logic)
        fontSize = Math.min(
          radialHeight * 0.45,
          availableArcLength / text.length * 0.9,
          reasonableMaxFont
        );
        
        fontSize = fontSize * lengthPenalty * sizePenalty;
        fontSize = Math.max(fontSize, minDisplayFont);
        fontSize = Math.min(fontSize, maxDisplayFont);
        
        if (fontSize < absoluteMinFont) fontSize = absoluteMinFont;
        
        // Check if truncation needed
        this.context.save();
        this.context.font = `500 ${fontSize}px Arial, sans-serif`;
        const textWidth = this.context.measureText(text).width;
        this.context.restore();
        
        availableSpace = availableArcLength;
        needsTruncation = textWidth > availableSpace;
        
        if (needsTruncation) {
          const charsNeeded = text.length;
          const charsFit = Math.floor((availableSpace / textWidth) * text.length) - 1;
          truncationPercent = ((charsNeeded - charsFit) / charsNeeded) * 100;
        } else {
          truncationPercent = 0;
        }
      }
    }
    
    // Determine actual displayed text
    let displayedText = text;
    if (needsTruncation && truncationPercent > 5) {
      const charsNeeded = text.length;
      const charsFit = Math.max(1, Math.floor((availableSpace / (needsTruncation ? this.context.measureText(text).width : 1)) * text.length) - 1);
      displayedText = text.substring(0, charsFit) + '…';
    }
    
    // ADVANCED SCORING SYSTEM
    let fontScore = 0;
    let spaceScore = 0;
    let naturalScore = 0;
    let penaltyScore = 0;
    
    // 1. FONT SIZE QUALITY (0-35 points) - CRITICAL FOR READABILITY
    // Font size is MORE important than previously thought
    // User preference: "horizontal multi-line with readable font preferable over horizontal single-line in small font"
    // 
    // Use the absolute font size constants defined at function start
    // sweetSpotMin = 16, sweetSpotMax = 28 (regardless of zoom)
    
    if (fontSize >= sweetSpotMin && fontSize <= sweetSpotMax) {
      // In sweet spot - full points
      fontScore = 35;
    } else if (fontSize >= minDisplayFont && fontSize < sweetSpotMin) {
      // Below sweet spot - HARSH PENALTY for small fonts
      // User: "truncation should win over too small font, especially on small containers"
      // Small fonts are hard to read - truncation is better!
      const ratio = (fontSize - minDisplayFont) / (sweetSpotMin - minDisplayFont);
      if (ratio > 0.9) {
        fontScore = 28 + (ratio * 7); // Very close to sweet spot: 28-35
      } else if (ratio > 0.75) {
        fontScore = 20 + (ratio * 8); // Readable but small: 20-28
      } else if (ratio > 0.5) {
        fontScore = 10 + (ratio * 10); // Getting small: 10-20
      } else {
        fontScore = 0 + (ratio * 10); // Very small font: 0-10 (almost as bad as truncation!)
      }
    } else if (fontSize > sweetSpotMax && fontSize <= reasonableMaxFont) {
      // Above sweet spot - penalty varies with zoom
      const ratio = (fontSize - sweetSpotMax) / (reasonableMaxFont - sweetSpotMax);
      if (zoomFactor >= 1.5) {
        // High zoom: smaller penalty for large fonts (they look better)
        fontScore = 35 - (ratio * 3);
      } else {
        // Normal/low zoom: moderate penalty
        fontScore = 35 - (ratio * 6);
      }
    } else if (fontSize < minDisplayFont) {
      // Below minimum - EXTREME penalty (basically unreadable)
      fontScore = 0; // Was 5, now 0 - truncation is better than this!
    }
    
    // 2. SPACE UTILIZATION (0-25 points)
    // Reward efficient use of available space without cramming
    const utilizationRatio = needsTruncation ? 1.0 : 
      (orientation === 'vertical' ? 
        (this.context.measureText(text).width / availableSpace) : 
        (this.context.measureText(text).width / availableSpace));
    
    if (utilizationRatio >= 0.5 && utilizationRatio <= 0.85) {
      // Good utilization - not too cramped, not too sparse
      spaceScore = 25;
    } else if (utilizationRatio >= 0.35 && utilizationRatio < 0.5) {
      // Sparse but acceptable
      spaceScore = 20;
    } else if (utilizationRatio > 0.85 && utilizationRatio < 1.0) {
      // Tight but fits
      spaceScore = 22;
    } else if (utilizationRatio >= 1.0) {
      // Doesn't fit - truncation needed
      spaceScore = 10;
    } else {
      // Very sparse
      spaceScore = 15;
    }
    
    // 3. NATURAL FIT BONUS (0-50 points) - FAVOR COMPLETENESS **WITH READABLE FONT**
    // User: "truncation should win over too small font, especially on small containers"
    // Completeness is only valuable if the text is actually readable!
    if (!needsTruncation) {
      // No truncation - bonus depends on font readability
      let baseCompleteness;
      if (zoomFactor >= 1.5) {
        baseCompleteness = 50; // Huge bonus at high zoom for full text
      } else if (zoomFactor >= 1.0) {
        baseCompleteness = 45; // Big bonus at normal zoom
      } else {
        baseCompleteness = 40; // Still big bonus at low zoom
      }
      
      // PENALTY: If font is too small, completeness doesn't matter!
      // Small unreadable text with no truncation is worse than larger truncated text
      if (fontSize < minDisplayFont) {
        // Unreadable font - completeness is worthless
        naturalScore = 0;
      } else if (fontSize < sweetSpotMin) {
        // Below sweet spot - scale completeness bonus down
        const fontQualityRatio = (fontSize - minDisplayFont) / (sweetSpotMin - minDisplayFont);
        if (fontQualityRatio < 0.5) {
          // Very small font (50% of range) - completeness barely matters
          naturalScore = baseCompleteness * 0.2; // Only 20% of completeness bonus
        } else if (fontQualityRatio < 0.75) {
          // Small font (50-75%) - reduced completeness value
          naturalScore = baseCompleteness * 0.5; // 50% of completeness bonus
        } else {
          // Close to sweet spot (75-100%) - most of completeness value
          naturalScore = baseCompleteness * 0.85; // 85% of completeness bonus
        }
      } else {
        // Font in sweet spot or above - full completeness bonus!
        naturalScore = baseCompleteness;
      }
      
      // MULTI-LINE BONUS: Successfully wrapped text is elegant and more readable
      if (allowWrapping && lineCount >= 2) {
        // Bonus scales with how well it wraps
        if (orientation === 'horizontal') {
          // HORIZONTAL MULTI-LINE: MASSIVE bonus for preferred orientation with wrapping!
          if (lineCount === 2) {
            naturalScore += 35; // Perfect horizontal 2-line (was 25 - HUGE preference!)
          } else if (lineCount === 3) {
            naturalScore += 30; // Great horizontal 3-line (was 20 - VERY preferred!)
          } else if (lineCount === 4) {
            naturalScore += 18; // Horizontal 4-line (still good)
          } else {
            naturalScore += 10; // Horizontal 5+ lines (acceptable)
          }
        } else {
          // Vertical multi-line: good but not as preferred
          if (lineCount === 2) {
            naturalScore += 12; // Perfect 2-line split (can go to 62!)
          } else if (lineCount === 3) {
            naturalScore += 10; // Good 3-line split (can go to 60!)
          } else {
            naturalScore += 6;  // 4+ lines getting crowded
          }
        }
      }
    } else if (truncationPercent < 5) {
      // Tiny truncation (< 5%) - barely noticeable, still good
      if (zoomFactor >= 1.5) {
        naturalScore = 25; // Acceptable at high zoom
      } else if (zoomFactor < 0.8) {
        naturalScore = 35; // More OK at low zoom
      } else {
        naturalScore = 30; // Normal zoom
      }
    } else if (truncationPercent < 10) {
      // Minor truncation - noticeable, prefer to avoid
      if (zoomFactor >= 1.5) {
        naturalScore = 12; // Bad at high zoom
      } else if (zoomFactor < 0.8) {
        naturalScore = 25; // Tolerable at low zoom
      } else {
        naturalScore = 18; // Normal zoom
      }
    } else if (truncationPercent < 25) {
      // Moderate truncation - poor readability
      if (zoomFactor >= 1.5) {
        naturalScore = 3;  // Really bad at high zoom
      } else if (zoomFactor < 0.8) {
        naturalScore = 15; // Acceptable at low zoom
      } else {
        naturalScore = 8; // Normal
      }
    } else if (truncationPercent < 40) {
      // Heavy truncation - very poor
      if (zoomFactor >= 1.5) {
        naturalScore = 0;  // Unacceptable at high zoom
      } else if (zoomFactor < 0.8) {
        naturalScore = 10; // Tolerable at low zoom
      } else {
        naturalScore = 3;
      }
    } else {
      // Severe truncation - terrible
      if (zoomFactor < 0.8) {
        naturalScore = 5;  // Last resort at low zoom
      } else {
        naturalScore = 0;  // Never acceptable otherwise
      }
    }
    
    // 4. ORIENTATION-SPECIFIC ADJUSTMENT (-50 to +70 points)
    // 
    // PRIORITY HIERARCHY (from best to worst):
    // 1. Horizontal multi-line + readable font (16-28px) → +55 to +70 points
    // 2. Horizontal single-line + readable font (16-28px) → +30 to +40 points  
    // 3. Horizontal + smaller font (14-16px) or minor truncation → +15 to +25 points
    // 4. Horizontal + tiny font (<14px) or heavy truncation → +5 to +10 points
    // 5. Vertical (any configuration) → -20 to -50 points (AVOID!)
    //
    // RULE: "for readability we prefer horizontal multi line if it is possible. always."
    
    // Use NORMALIZED dimensions (geometry-based) to determine container shape
    // This ensures zoom doesn't affect aspect ratio calculation
    const normalizedArcLength = arcLengthPx / zoomFactor;
    const normalizedRadialHeight = radialHeight / zoomFactor;
    const aspectRatio = normalizedArcLength / normalizedRadialHeight;
    const isWideContainer = aspectRatio > 1.5;
    const isNarrowContainer = aspectRatio < 0.8;
    
    if (orientation === 'vertical') {
      // VERTICAL: ALWAYS HEAVILY PENALIZED
      // Vertical is only acceptable when horizontal is literally impossible
      
      if (isWideContainer) {
        penaltyScore -= 50; // Massive penalty - never use vertical in wide containers
      } else if (isNarrowContainer) {
        penaltyScore -= 20; // Heavy penalty even in narrow - horizontal multi-line preferred
      } else {
        penaltyScore -= 35; // Very heavy penalty in medium containers
      }
      
    } else {
      // HORIZONTAL: ALWAYS PREFERRED!
      // Bonus increases dramatically with ACTUAL multi-line rendering + good font
      
      // MULTI-LINE HORIZONTAL = TOP PRIORITY (only if actually wraps to 2+ lines)
      if (allowWrapping && lineCount >= 2) {
        if (fontSize >= sweetSpotMin && fontSize <= sweetSpotMax) {
          // BEST: Multi-line horizontal with ideal font
          penaltyScore += 60; // Maximum bonus!
        } else if (fontSize >= minDisplayFont) {
          // VERY GOOD: Multi-line horizontal with acceptable font
          penaltyScore += 50;
        } else {
          // GOOD: Multi-line horizontal even with small font
          penaltyScore += 40;
        }
      } 
      // SINGLE-LINE (including wrapping-enabled but fits on one line)
      else {
        if (fontSize >= sweetSpotMin && fontSize <= sweetSpotMax && !needsTruncation) {
          // EXCELLENT: Single-line horizontal with ideal font, no truncation
          penaltyScore += 40;
        } else if (fontSize >= minDisplayFont && !needsTruncation) {
          // GOOD: Single-line horizontal with acceptable font, no truncation
          penaltyScore += 30;
        } else if (fontSize >= minDisplayFont && truncationPercent < 10) {
          // ACCEPTABLE: Readable font with minor truncation
          penaltyScore += 20;
        } else if (fontSize >= 12) {
          // OK: Small font but still horizontal
          penaltyScore += 15;
        } else {
          // LAST RESORT: Tiny font or heavy truncation, but still better than vertical
          penaltyScore += 10;
        }
      }
      
      // Extra bonus for wide containers (natural fit)
      if (isWideContainer) {
        penaltyScore += 10;
      }
    }
    
    // TOTAL SCORE (0-190 scale)
    // Font: 35, Space: 25, Natural: 50+15, Orientation: -50 to +70
    // 
    // PRIORITY HIERARCHY:
    // 1. Horizontal multi-line + readable font → ~180 points
    // 2. Horizontal single-line + readable font → ~140 points  
    // 3. Horizontal + smaller font/truncation → ~100 points
    // 4. Vertical (any) → ~60 points (heavily penalized)
    //
    // Example scores:
    // - Horizontal multi-line + 18px font: 35 + 25 + 65 + 60 = 185 ✅ BEST
    // - Horizontal single-line + 20px font: 35 + 25 + 50 + 40 = 150 ✅ EXCELLENT
    // - Horizontal single-line + 14px font: 28 + 25 + 50 + 30 = 133 ✅ GOOD
    // - Horizontal truncated + 16px font: 35 + 10 + 20 + 20 = 85 ✅ ACCEPTABLE
    // - Vertical multi-line + 20px font: 35 + 25 + 65 - 20 = 105 ❌ AVOID
    // - Vertical single-line + 20px font: 35 + 25 + 50 - 35 = 75 ❌ AVOID
    
    // CRITICAL OVERFLOW PENALTY
    // User requirement: "text is out of bounds. That can never happen"
    // Apply massive penalty to ensure overflow solutions never win
    let overflowPenalty = 0;
    if (truncationPercent > 5) {
      // Logarithmic penalty that grows with overflow severity
      overflowPenalty = 80 + Math.min(60, truncationPercent * 2); // 80-140 point penalty
      // Debug logging silenced for production
      // if (debugThisText) {
      //   console.log(`  💥 OVERFLOW PENALTY: -${overflowPenalty.toFixed(1)} points for ${truncationPercent.toFixed(1)}% overflow`);
      // }
    }
    
    const totalScore = Math.max(0, Math.min(190, fontScore + spaceScore + naturalScore + penaltyScore - overflowPenalty));
    
    return {
      fontSize,
      truncated: needsTruncation,
      truncationPercent,
      displayedText,
      lineCount,
      allowWrapping,
      readabilityScore: totalScore,
      details: {
        font: fontScore,
        space: spaceScore,
        natural: naturalScore,
        penalty: penaltyScore
      }
    };
  }

  /**
   * ITERATIVE OPTIMIZATION TEXT RENDERING DECISION v5
   * Tests multiple strategies (full text + orientations, progressive truncation)
   * Returns the best overall solution based on container dimensions
   * 
   * @param {number} angularWidth - Angle span in radians
   * @param {number} radialHeight - Radial height in pixels
   * @param {string} text - The actual text to render
   * @param {number} middleRadius - Radius at center of segment for arc calculations
   * @returns {string} 'vertical' or 'horizontal'
   */
  chooseTextOrientation(angularWidth, radialHeight, text, middleRadius) {
    // Convert angular width to actual arc length in pixels
    const arcLengthPx = middleRadius * angularWidth;
    
    const zoomFactor = this.zoomLevel / 100;
    
    // CRITICAL FIX: Normalize dimensions by zoom to get GEOMETRY-BASED sizes
    // The canvas scales with zoom, but we want decisions based on the segment's
    // intrinsic proportions, not its displayed size!
    // At 100% zoom: arcLengthPx = 100, radialHeight = 50
    // At 150% zoom: arcLengthPx = 150, radialHeight = 75
    // But the segment SHAPE is the same! So normalize back to 100% zoom.
    const normalizedArcLength = arcLengthPx / zoomFactor;
    const normalizedRadialHeight = radialHeight / zoomFactor;
    
    // ITERATIVE STRATEGY TESTING
    // Test full text in both orientations, with and without line wrapping, then truncated versions
    const strategies = [];
    
    const hasSpaces = text.includes(' ');
    const wordCount = hasSpaces ? text.split(/\s+/).length : 1;
    const textLength = text.length;
    
    // PRIORITY ORDER:
    // NOTE: "Horizontal" = text follows arc (supports stacked multi-arc!)
    //       "Vertical" = text perpendicular to arc (also supports multiline)
    // 1. HORIZONTAL multi-line (BEST - readable stacked arcs for multi-word phrases)
    // 2. Vertical multi-line (GOOD - readable stacked perpendicular text)
    // 3. Horizontal single-line (OK - single curved arc)
    // 4. Vertical single-line (OK - single perpendicular line)
    
    // Strategy 1: Full text, HORIZONTAL multi-line (TOP PRIORITY for multi-word text!)
    if (hasSpaces) {
      strategies.push({
        text: text,
        orientation: 'horizontal',
        truncationLevel: 0,
        allowWrapping: true,
        description: 'Full horizontal multi-line'
      });
    }
    
    // Strategy 2: Full text, vertical multi-line (GOOD alternative)
    if (hasSpaces) {
      strategies.push({
        text: text,
        orientation: 'vertical',
        truncationLevel: 0,
        allowWrapping: true,
        description: 'Full vertical multi-line'
      });
    }
    
    // Strategy 3: Full text, horizontal single-line
    strategies.push({
      text: text,
      orientation: 'horizontal',
      truncationLevel: 0,
      allowWrapping: false,
      description: 'Full horizontal single-line'
    });
    
    // Strategy 4: Full text, vertical single-line
    strategies.push({
      text: text,
      orientation: 'vertical',
      truncationLevel: 0,
      allowWrapping: false,
      description: 'Full vertical single-line'
    });
    
    // If text is long OR multi-word, test truncated versions as fallback
    if (text.length > 8 || wordCount >= 3) {
      // Try 90% length
      const truncated90 = text.substring(0, Math.floor(text.length * 0.9)) + '…';
      const has90Spaces = truncated90.includes(' ');
      
      // Horizontal multi-line first (PREFERRED)
      if (has90Spaces) {
        strategies.push({
          text: truncated90,
          orientation: 'horizontal',
          truncationLevel: 10,
          allowWrapping: true,
          description: '90% horizontal multi-line'
        });
      }
      
      // Vertical multi-line
      if (has90Spaces) {
        strategies.push({
          text: truncated90,
          orientation: 'vertical',
          truncationLevel: 10,
          allowWrapping: true,
          description: '90% vertical multi-line'
        });
      }
      
      // Horizontal single-line
      strategies.push({
        text: truncated90,
        orientation: 'horizontal',
        truncationLevel: 10,
        allowWrapping: false,
        description: '90% horizontal single-line'
      });
      
      // Vertical single-line
      strategies.push({
        text: truncated90,
        orientation: 'vertical',
        truncationLevel: 10,
        allowWrapping: false,
        description: '90% vertical single-line'
      });
      
      // Try 75% length for longer text
      if (text.length > 12 || wordCount >= 4) {
        const truncated75 = text.substring(0, Math.floor(text.length * 0.75)) + '…';
        const has75Spaces = truncated75.includes(' ');
        
        // Horizontal multi-line first (PREFERRED)
        if (has75Spaces) {
          strategies.push({
            text: truncated75,
            orientation: 'horizontal',
            truncationLevel: 25,
            allowWrapping: true,
            description: '75% horizontal multi-line'
          });
        }
        
        // Vertical multi-line
        if (has75Spaces) {
          strategies.push({
            text: truncated75,
            orientation: 'vertical',
            truncationLevel: 25,
            allowWrapping: true,
            description: '75% vertical multi-line'
          });
        }
        
        // Horizontal single-line
        strategies.push({
          text: truncated75,
          orientation: 'horizontal',
          truncationLevel: 25,
          allowWrapping: false,
          description: '75% horizontal single-line'
        });
        
        // Vertical single-line
        strategies.push({
          text: truncated75,
          orientation: 'vertical',
          truncationLevel: 25,
          allowWrapping: false,
          description: '75% vertical single-line'
        });
      }
      
      // Try 60% length only for very long text
      if (text.length > 16) {
        const truncated60 = text.substring(0, Math.floor(text.length * 0.6)) + '…';
        const has60Spaces = truncated60.includes(' ');
        
        // Horizontal multi-line first (PREFERRED)
        if (has60Spaces) {
          strategies.push({
            text: truncated60,
            orientation: 'horizontal',
            truncationLevel: 40,
            allowWrapping: true,
            description: '60% horizontal multi-line'
          });
        }
        
        // Vertical multi-line
        if (has60Spaces) {
          strategies.push({
            text: truncated60,
            orientation: 'vertical',
            truncationLevel: 40,
            allowWrapping: true,
            description: '60% vertical multi-line'
          });
        }
        
        // Horizontal single-line
        strategies.push({
          text: truncated60,
          orientation: 'horizontal',
          truncationLevel: 40,
          allowWrapping: false,
          description: '60% horizontal single-line'
        });
        
        // Vertical single-line
        strategies.push({
          text: truncated60,
          orientation: 'vertical',
          truncationLevel: 40,
          allowWrapping: false,
          description: '60% vertical single-line'
        });
      }
    }
    
    // Calculate container geometry using NORMALIZED dimensions
    // This ensures the same segment has the same aspect ratio at all zoom levels
    const aspectRatio = normalizedArcLength / normalizedRadialHeight;
    const isWideContainer = aspectRatio > 1.5;
    const isNarrowContainer = aspectRatio < 0.8;
    
    // Evaluate all strategies using NORMALIZED dimensions
    // This ensures consistent decisions regardless of zoom level
    const evaluations = strategies.map(strategy => {
      const evaluation = this.evaluateRenderingSolution(
        strategy.text,
        strategy.orientation,
        normalizedArcLength,
        normalizedRadialHeight,
        middleRadius / zoomFactor, // Also normalize middleRadius
        strategy.allowWrapping
      );
      
      // ZOOM-AWARE TRUNCATION PENALTY
      // Higher zoom = more space = much stronger penalty for truncation
      let adjustedScore = evaluation.readabilityScore;
      let zoomMultiplier = 0; // Initialize outside if block
      
      if (strategy.truncationLevel > 0) {
        // AGGRESSIVE PENALTY - heavily discourage pre-truncation
        // Base penalty: 5 points per 10% truncation (was 3)
        let basePenalty = strategy.truncationLevel * 0.5;
        
        // ZOOM MULTIPLIER - dramatic increase at high zoom
        if (zoomFactor >= 2.0) {
          // 200% zoom: 4× penalty (we have 4× the space!)
          zoomMultiplier = 4.0;
        } else if (zoomFactor >= 1.75) {
          // 175% zoom: 3.5× penalty
          zoomMultiplier = 3.5;
        } else if (zoomFactor >= 1.5) {
          // 150% zoom: 3× penalty
          zoomMultiplier = 3.0;
        } else if (zoomFactor >= 1.25) {
          // 125% zoom: 2.5× penalty
          zoomMultiplier = 2.5;
        } else if (zoomFactor >= 1.0) {
          // 100% zoom: 2× penalty (much stricter)
          zoomMultiplier = 2.0;
        } else if (zoomFactor >= 0.75) {
          // 75% zoom: 1.2× penalty (still prefer full text)
          zoomMultiplier = 1.2;
        } else {
          // 50% zoom: 0.8× penalty (truncation more acceptable when cramped)
          zoomMultiplier = 0.8;
        }
        
        adjustedScore -= basePenalty * zoomMultiplier;
      }
      
      return {
        ...evaluation,
        orientation: strategy.orientation,
        originalScore: evaluation.readabilityScore,
        adjustedScore: adjustedScore,
        pretruncated: strategy.truncationLevel > 0,
        truncationLevel: strategy.truncationLevel,
        zoomPenaltyMultiplier: zoomMultiplier,
        allowWrapping: strategy.allowWrapping,
        lineCount: evaluation.lineCount,
        description: strategy.description
      };
    });
    
    // Find best solution
    let bestSolution = evaluations[0];
    for (let i = 1; i < evaluations.length; i++) {
      if (evaluations[i].adjustedScore > bestSolution.adjustedScore) {
        bestSolution = evaluations[i];
      }
    }
    
    // CRITICAL OVERFLOW REJECTION
    // If the winner has significant overflow (>5%), reject it and find next best
    // User requirement: "text is out of bounds. That can never happen"
    if (bestSolution.truncationPercent > 5 && !bestSolution.pretruncated) {
      // Try to find an alternative that actually fits
      const alternatives = evaluations.filter(e => 
        e !== bestSolution && 
        (e.truncationPercent <= 5 || e.pretruncated)
      ).sort((a, b) => b.adjustedScore - a.adjustedScore);
      
      if (alternatives.length > 0) {
        const originalWinner = bestSolution;
        bestSolution = alternatives[0];
        
        // Debug logging silenced for production
        // if (text.includes('Kampanj') || text.includes('planering') || text.includes('Q1')) {
        //   console.log(`\n⚠️ OVERFLOW REJECTION: "${originalWinner.description}" rejected (${originalWinner.truncationPercent.toFixed(1)}% overflow)`);
        //   console.log(`   Switching to: "${bestSolution.description}" (${bestSolution.truncationPercent.toFixed(1)}% overflow)`);
        // }
      }
    }
    
    // DEBUG: Enable to see decision details for specific texts
    // Uncomment the block below to debug text rendering decisions
    // const debugText = text.includes('Q4 Kampanj') || text.includes('planering');
    // if (debugText) {
    //   console.log(`\n=== DECISION FOR: "${text}" (zoom: ${this.zoomLevel}%) ===`);
    //   console.log(`Canvas dimensions: ${arcLengthPx.toFixed(1)}px × ${radialHeight.toFixed(1)}px`);
    //   console.log(`Normalized (geometry): ${normalizedArcLength.toFixed(1)}px × ${normalizedRadialHeight.toFixed(1)}px`);
    //   console.log(`Aspect ratio: ${aspectRatio.toFixed(2)} - Wide: ${isWideContainer}, Narrow: ${isNarrowContainer}`);
    //   console.log('\nTop 5 strategies:');
    //   evaluations.slice(0, 5).forEach((e, i) => {
    //     console.log(`${i+1}. ${e.description}`);
    //     console.log(`   Font: ${e.fontSize.toFixed(1)}px, Lines: ${e.lineCount}, Wrapping: ${e.allowWrapping}`);
    //     console.log(`   Truncated: ${e.truncated} (${e.truncationPercent.toFixed(1)}%)`);
    //     console.log(`   Scores: Font=${e.details.font.toFixed(1)}, Space=${e.details.space.toFixed(1)}, Natural=${e.details.natural.toFixed(1)}, Penalty=${e.details.penalty.toFixed(1)}`);
    //     console.log(`   ORIGINAL: ${e.originalScore.toFixed(1)}, ADJUSTED: ${e.adjustedScore.toFixed(1)} ${e === bestSolution ? '← WINNER' : ''}`);
    //   });
    //   console.log(`\nChosen: ${bestSolution.orientation} (${bestSolution.description})`);
    //   console.log(`Will render: ${bestSolution.lineCount} line(s), Font: ${bestSolution.fontSize.toFixed(1)}px`);
    // }
    
    // Store best solution for potential use in rendering
    // (This allows renderer to know if it should use wrapping, pre-truncated text, etc.)
    this._lastOrientationDecision = bestSolution;
    
    // EXTREME GEOMETRY OVERRIDE - Use normalized aspect ratio for consistent behavior
    const isVeryTall = aspectRatio < 0.35;
    const isVeryWide = aspectRatio > 5.0;
    
    if (isVeryTall && bestSolution.adjustedScore < 40) {
      // Extremely tall + poor score: force vertical as only viable option
      // console.log('   OVERRIDE: Forcing vertical for very tall container');
      return 'vertical';
    }
    
    if (isVeryWide && bestSolution.orientation === 'horizontal' && bestSolution.adjustedScore > 50) {
      // Extremely wide + good horizontal solution: clear choice
      // console.log('   OVERRIDE: Forcing horizontal for very wide container');
      return 'horizontal';
    }
    
    // QUALITY THRESHOLD CHECKING (adjusted for new scoring scale)
    const MIN_ACCEPTABLE_SCORE = 40; // Slightly higher threshold
    const GOOD_SCORE = 70; // Higher threshold for "good"
    
    // If best solution is actually good, use it confidently
    if (bestSolution.adjustedScore >= GOOD_SCORE) {
      return bestSolution.orientation;
    }
    
    // If best solution is acceptable but not great, do sanity checks
    if (bestSolution.adjustedScore >= MIN_ACCEPTABLE_SCORE) {
      // Check if there's a close runner-up with opposite orientation
      const runnerUp = evaluations
        .filter(e => e.orientation !== bestSolution.orientation)
        .sort((a, b) => b.adjustedScore - a.adjustedScore)[0];
      
      // Zoom-aware closeness threshold
      const closenessThreshold = zoomFactor >= 1.5 ? 10 : 8;
      
      if (runnerUp && Math.abs(runnerUp.adjustedScore - bestSolution.adjustedScore) < closenessThreshold) {
        // Very close - apply tiebreaker heuristics
        
        // AT HIGH ZOOM: Strongly prefer non-truncated
        if (zoomFactor >= 1.5) {
          if (!bestSolution.pretruncated && runnerUp.pretruncated) {
            return bestSolution.orientation;
          }
          if (bestSolution.pretruncated && !runnerUp.pretruncated) {
            return runnerUp.orientation;
          }
          
          // Also check natural truncation at high zoom
          if (!bestSolution.truncated && runnerUp.truncated && runnerUp.truncationPercent > 5) {
            return bestSolution.orientation;
          }
          if (bestSolution.truncated && !runnerUp.truncated) {
            return runnerUp.orientation;
          }
        } else {
          // Normal/low zoom: standard truncation preference
          if (!bestSolution.pretruncated && runnerUp.pretruncated) {
            return bestSolution.orientation;
          }
          if (bestSolution.pretruncated && !runnerUp.pretruncated) {
            return runnerUp.orientation;
          }
        }
        
        // Prefer larger font if both similar quality
        if (runnerUp.fontSize > bestSolution.fontSize * 1.2) {
          return runnerUp.orientation;
        }
        
        // Zoom-aware truncation preference
        const truncDiffThreshold = zoomFactor >= 1.5 ? 10 : 15;
        if (runnerUp.truncationPercent < bestSolution.truncationPercent - truncDiffThreshold) {
          return runnerUp.orientation;
        }
      }
      
      // No close runner-up, use best solution
      return bestSolution.orientation;
    }
    
    // ALL SOLUTIONS POOR (< 35 points) - Choose lesser evil with container awareness
    // At this point, container is too small for text - find best compromise
    
    // Group by orientation to find best of each type
    const verticalBest = evaluations
      .filter(e => e.orientation === 'vertical')
      .sort((a, b) => b.adjustedScore - a.adjustedScore)[0];
    
    const horizontalBest = evaluations
      .filter(e => e.orientation === 'horizontal')
      .sort((a, b) => b.adjustedScore - a.adjustedScore)[0];
    
    // Compare best of each orientation
    if (!verticalBest) return 'horizontal';
    if (!horizontalBest) return 'vertical';
    
    const scoreDiff = horizontalBest.adjustedScore - verticalBest.adjustedScore;
    
    // Significant difference (>8 points) when both poor - choose clearly better one
    if (scoreDiff > 8) return 'horizontal';
    if (scoreDiff < -8) return 'vertical';
    
    // Very close when both poor - use container geometry
    // Prioritize: 1) Larger font, 2) Less truncation, 3) Aspect ratio fit
    
    // 1. Font size priority
    const fontDiff = horizontalBest.fontSize - verticalBest.fontSize;
    
    if (fontDiff > 2) {
      // Horizontal gives significantly larger font (>2px difference)
      return 'horizontal';
    }
    if (fontDiff < -2) {
      // Vertical gives significantly larger font (should rarely happen with new bonuses)
      return 'vertical';
    }
    
    // 2. Truncation priority
    const truncDiff = verticalBest.truncationPercent - horizontalBest.truncationPercent;
    if (truncDiff > 20) return 'horizontal'; // Much less truncation
    if (truncDiff < -20) return 'vertical';   // Much less truncation
    
    // 3. Aspect ratio fit - match orientation to container shape
    if (aspectRatio > 2.5) {
      return 'horizontal'; // Wide container - always horizontal
    } else if (aspectRatio < 0.5) {
      return 'vertical'; // Very tall container - vertical might be only option
    } else {
      // Balanced container - with new bonuses, horizontal should always win
      return 'horizontal'; // Default to horizontal per user preference
    }
  }

  // Wrapper to adapt drawTextAlongArc to match setCircleSectionAktivitetTitle signature
  // This allows both functions to be called the same way from setCircleSectionHTML
  /**
   * @param {object} renderDecision - Optional: Pre-calculated rendering decision from evaluateRenderingSolution
   */
  drawTextAlongArcAdapter(
    text,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    fontSize,
    isVertical,
    backgroundColor,
    renderDecision = null
  ) {
    // Calculate middle radius for text placement
    const middleRadius = startRadius + width / 2;
    
    // Get text color with contrast
    const textColor = backgroundColor ? this.getContrastColor(backgroundColor) : "#FFFFFF";
    
    // INTELLIGENT DISPLAY-AWARE FONT SIZING - match vertical logic
    const zoomFactor = this.zoomLevel / 100;
    const effectiveDisplaySize = this.size * zoomFactor;
    
    // STRICTER MINIMUM - Match vertical text logic
    const absoluteMinFont = Math.max(12, effectiveDisplaySize / 200);
    const minDisplayFont = Math.max(14, effectiveDisplaySize / 180);
    const maxDisplayFont = Math.min(50, effectiveDisplaySize / 45);
    const reasonableMaxFont = Math.min(35, effectiveDisplaySize / 60);
    
    // TEXT CONTENT ANALYSIS
    const textLength = text.length;
    const hasSpaces = text.includes(' ');
    
    // Length penalty (more moderate)
    let lengthPenalty = 1.0;
    if (textLength > 15) lengthPenalty = 0.90;
    else if (textLength > 10) lengthPenalty = 0.93;
    else if (textLength > 6) lengthPenalty = 0.96;
    
    // CONTAINER PROPORTIONALITY (matching vertical text logic)
    const arcLength = middleRadius * angleLength;
    const radialWidth = width;
    const segmentArea = radialWidth * arcLength;
    const wheelArea = this.size * this.size;
    const areaRatio = segmentArea / wheelArea;
    
    // Size penalty for large segments (more moderate)
    let sizePenalty = 1.0;
    if (areaRatio > 0.15) sizePenalty = 0.88;
    else if (areaRatio > 0.10) sizePenalty = 0.92;
    else if (areaRatio > 0.06) sizePenalty = 0.96;
    
    // Calculate available arc length
    const availableArcLength = middleRadius * angleLength * 0.85;
    
    // Calculate font size to fit text in arc
    let testFontSize = Math.min(
      width * 0.45,
      availableArcLength / text.length * 0.9,
      reasonableMaxFont
    );
    
    // Apply penalties
    testFontSize = testFontSize * lengthPenalty * sizePenalty;
    
    // Enforce limits with stricter minimum
    testFontSize = Math.max(testFontSize, minDisplayFont);
    testFontSize = Math.min(testFontSize, maxDisplayFont);
    
    // If still below absolute minimum, use absolute minimum and truncate text instead
    if (testFontSize < absoluteMinFont) {
      testFontSize = absoluteMinFont;
    }
    
    // Test if text fits at this size
    this.context.save();
    this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
    const textWidth = this.context.measureText(text).width;
    this.context.restore();
    
    // TRUNCATION STRATEGY: Don't scale below readable size
    let displayText = text;
    
    if (textWidth > availableArcLength) {
      // Check if scaling would go below minimum
      const scaleFactor = (availableArcLength / textWidth) * 0.95;
      const scaledFont = testFontSize * scaleFactor;
      
      if (scaledFont >= absoluteMinFont) {
        // Scaling keeps us above minimum - safe to scale
        testFontSize = scaledFont;
      } else {
        // Scaling would be too small - keep minimum font and truncate instead
        testFontSize = absoluteMinFont;
        this.context.save();
        this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
        
        // Truncate text to fit arc
        let truncated = text;
        let truncatedWidth = this.context.measureText(truncated + '…').width;
        
        while (truncatedWidth > availableArcLength && truncated.length > 1) {
          truncated = truncated.substring(0, truncated.length - 1);
          truncatedWidth = this.context.measureText(truncated + '…').width;
        }
        
        if (truncated.length < text.length) {
          displayText = truncated + '…';
        }
        
        this.context.restore();
      }
    }
    
    // MULTI-LINE RENDERING SUPPORT FOR HORIZONTAL TEXT
    // If renderDecision indicates multi-line, render stacked arcs
    if (renderDecision && renderDecision.allowWrapping && renderDecision.lineCount > 1) {
      // Use pre-calculated decision for multi-line stacked arcs
      const words = text.split(/\s+/);
      const lines = [];
      let currentLine = '';
      
      this.context.save();
      this.context.font = `500 ${renderDecision.fontSize}px Arial, sans-serif`;
      
      // Wrap text into lines
      for (let word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = this.context.measureText(testLine).width;
        
        if (testWidth > availableArcLength && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      this.context.restore();
      
      // Render each line on its own arc, stacked radially
      // Lines read OUTWARD (outer = first line, inner = last line)
      const lineHeight = renderDecision.fontSize * 1.3; // Spacing between arc lines
      const totalHeight = lines.length * lineHeight;
      let currentRadius = middleRadius + totalHeight / 2 - lineHeight / 2; // Start OUTER
      
      for (let line of lines) {
        this.drawTextAlongArc(line, currentRadius, startAngle, endAngle, renderDecision.fontSize, textColor);
        currentRadius -= lineHeight; // Move INWARD for next line
      }
    } else if (!renderDecision && hasSpaces && testFontSize >= 14 && textWidth > availableArcLength * 1.3) {
      // Fallback: attempt basic multi-line if text is significantly too long
      const words = text.split(/\s+/);
      const lines = [];
      let currentLine = '';
      
      this.context.save();
      this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
      
      for (let word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = this.context.measureText(testLine).width;
        
        if (testWidth > availableArcLength && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      this.context.restore();
      
      // Only use multi-line if it fits radially
      const lineHeight = testFontSize * 1.3;
      const totalHeight = lines.length * lineHeight;
      
      if (totalHeight <= width * 0.85 && lines.length >= 2 && lines.length <= 3) {
        // Render stacked arcs - outer to inner (natural reading order)
        let currentRadius = middleRadius + totalHeight / 2 - lineHeight / 2; // Start OUTER
        
        for (let line of lines) {
          this.drawTextAlongArc(line, currentRadius, startAngle, endAngle, testFontSize, textColor);
          currentRadius -= lineHeight; // Move INWARD
        }
      } else {
        // Single line with truncation (original behavior)
        this.drawTextAlongArc(displayText, middleRadius, startAngle, endAngle, testFontSize, textColor);
      }
    } else {
      // Single line rendering (original behavior)
      this.drawTextAlongArc(displayText, middleRadius, startAngle, endAngle, testFontSize, textColor);
    }
  }

  // Draw text following the arc character by character with natural spacing
  drawTextAlongArc(text, radius, startAngle, endAngle, fontSize, color) {
    this.context.save();
    this.context.font = `500 ${fontSize}px Arial, sans-serif`; // Medium weight, modern font
    this.context.fillStyle = color;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    
    const angleSpan = endAngle - startAngle;
    
    // Measure each character's natural width
    const charWidths = [];
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
      const charWidth = this.context.measureText(text[i]).width;
      charWidths.push(charWidth);
      totalWidth += charWidth;
    }
    
    // Add natural spacing between characters (10% of average char width)
    const avgCharWidth = totalWidth / text.length;
    const letterSpacing = avgCharWidth * 0.1;
    const totalSpacing = letterSpacing * (text.length - 1);
    const totalTextWidth = totalWidth + totalSpacing;
    
    // Calculate the angular span this text would naturally occupy
    const textAngleSpan = totalTextWidth / radius;
    
    // Center the text within the available angle
    const startOffset = (angleSpan - textAngleSpan) / 2;
    let currentAngle = startAngle + startOffset;
    
    // Draw each character with natural spacing
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = charWidths[i];
      const charAngleSpan = charWidth / radius;
      
      // Position at the center of this character's arc span
      const charAngle = currentAngle + charAngleSpan / 2;
      const coord = this.moveToAngle(radius, charAngle);
      
      this.context.save();
      this.context.translate(coord.x, coord.y);
      this.context.rotate(charAngle + Math.PI / 2); // Rotate to follow arc
      this.context.fillText(char, 0, 0);
      this.context.restore();
      
      // Move to next character (char width + spacing)
      currentAngle += charAngleSpan + (letterSpacing / radius);
    }
    
    this.context.restore();
  }

  // Draw ring name in a separator band with light background and text repeated 4 times
  drawRingNameBand(ringName, startRadius, bandWidth) {
    if (!ringName) return bandWidth;
    
    // Draw the separator ring with PROMINENT background
    this.context.beginPath();
    this.context.arc(this.center.x, this.center.y, startRadius, 0, Math.PI * 2);
    this.context.arc(this.center.x, this.center.y, startRadius + bandWidth, 0, Math.PI * 2, true);
    this.context.fillStyle = '#FFFFFF'; // White background for maximum visibility
    this.context.fill();
    this.context.closePath();
    
    // No border - clean look
    
    // Draw ring name 4 times around the circle (at quarters)
    const textToShow = ringName;
    const fontSize = this.size / 75; // Much smaller as requested
    const textRadius = startRadius + bandWidth / 2;
    
    this.context.save();
    this.context.font = `400 ${fontSize}px Arial, sans-serif`; // Normal weight (not bold)
    this.context.fillStyle = '#0F172A'; // Very dark for maximum contrast
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    
    // Draw at 4 positions: 0°, 90°, 180°, 270° (top, right, bottom, left)
    const positions = [0, 90, 180, 270];
    
    for (let position of positions) {
      const centerAngle = this.toRadians(position);
      const displayText = textToShow;
      
      // Measure each character's natural width
      const charWidths = [];
      let totalWidth = 0;
      for (let i = 0; i < displayText.length; i++) {
        const charWidth = this.context.measureText(displayText[i]).width;
        charWidths.push(charWidth);
        totalWidth += charWidth;
      }
      
      // Add natural spacing between characters (10% of average char width)
      const avgCharWidth = totalWidth / displayText.length;
      const letterSpacing = avgCharWidth * 0.1;
      const totalSpacing = letterSpacing * (displayText.length - 1);
      const totalTextWidth = totalWidth + totalSpacing;
      
      // Calculate the angular span this text would naturally occupy
      const totalAngleSpan = totalTextWidth / textRadius;
      
      // Start angle for text (centered at position)
      let currentAngle = centerAngle - totalAngleSpan / 2;
      
      for (let i = 0; i < displayText.length; i++) {
        const char = displayText[i];
        const charWidth = charWidths[i];
        const charAngleSpan = charWidth / textRadius;
        
        const charAngle = currentAngle + charAngleSpan / 2;
        const coord = this.moveToAngle(textRadius, charAngle);
        
        this.context.save();
        this.context.translate(coord.x, coord.y);
        
        // ALL characters point TOWARD center (inward)
        // Rotation: perpendicular to radius, pointing inward
        const rotation = charAngle + Math.PI / 2;
        
        this.context.rotate(rotation);
        this.context.fillText(char, 0, 0);
        this.context.restore();
        
        // Move to next character (char width + spacing)
        currentAngle += charAngleSpan + (letterSpacing / textRadius);
      }
    }
    
    this.context.restore();
    
    return bandWidth;
  }

  setCircleSectionTexts(
    texts,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    initAngle,
    isVertical,
    lineHeight = 24
  ) {
    const radius = startRadius + width / 2;
    const angleDifference = angleLength / (texts.length + 1);

    this.context.fillStyle = "#ffffff";
    const fontSize = 20; // Fixed font size

    if (isVertical) {
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const angle = startAngle + angleDifference + i * angleDifference;
        // Position text in the middle of the ring, not at the outer edge
        const textRadius = startRadius + width / 2;
        const coord = this.moveToAngle(textRadius, angle);
        this.context.save();
        this.context.font = `bold ${fontSize}px Arial`;
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.translate(coord.x, coord.y);
        this.context.rotate(angle);
        this.context.fillText(text, 0, 0, width * 0.8);
        this.context.restore();
      }
    } else {
      const angle = (startAngle + endAngle) / 2;
      const coord = this.moveToAngle(radius, angle);

      this.context.save();
      this.context.translate(coord.x, coord.y);
      this.context.rotate(angle + Math.PI / 2); // Align text horizontally to the section's angle
      this.context.font = ` ${fontSize}px Arial`; // Re-apply the font size after transformation
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      let currentY = (-(texts.length - 1) * lineHeight) / 2; // Center the text vertically
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        this.context.fillText(text, 0, currentY);
        currentY += lineHeight;
      }

      this.context.restore();
    }
  }

  addCircleSection({
    spacingAngle,
    startRadius,
    width,
    startAngle,
    endAngle,
    color, // The color will be passed here from the calling function
    textFunction,
    text,
    fontSize,
    isVertical,
    opacity,
    highlight,
  }) {
    const newStartAngle = this.initAngle + startAngle;
    const newEndAngle = this.initAngle + endAngle;

    // Pass the color down to setCircleSectionHTML to ensure it's applied
    this.setCircleSectionHTML({
      startRadius,
      width,
      startAngle: newStartAngle,
      endAngle: newEndAngle,
      color,
      textFunction,
      text,
      fontSize,
      isVertical,
      opacity,
      highlight,
    });
  }

  addRegularCircleSections({
    numberOfIntervals,
    spacingAngle = 0, // No gaps
    startRadius,
    width,
    color,
    textFunction,
    texts = [],
    fontSize,
    colors = [],
    isVertical,
  }) {
    const intervalAngle = 360 / numberOfIntervals;
    for (let i = 0; i < numberOfIntervals; i++) {
      const text = texts[i] || ""; // Default to an empty string if undefined
      const sectionColor = color
        ? color
        : colors[i % colors.length] || "#000000"; // Default to black if undefined

      this.addCircleSection({
        spacingAngle, // This should now be 0 to avoid gaps
        startRadius,
        width,
        startAngle: i * intervalAngle,
        endAngle: (i + 1) * intervalAngle,
        highlight: false,
        color: sectionColor,
        textFunction,
        text,
        fontSize,
        isVertical,
        opacity: 1,
      });
    }
  }

  addMonthlyCircleSection({
    startRadius,
    width,
    spacingAngle,
    color,
    textFunction,
    texts,
    fontSize,
    colors,
    isVertical,
    lineHeight,
    numberOfIntervals = 12,
  }) {
    this.addRegularCircleSections({
      numberOfIntervals,
      spacingAngle,
      startRadius,
      width,
      color,
      textFunction,
      texts,
      fontSize,
      colors,
      isVertical, // Pass the correct orientation
      lineHeight,
    });
  }

  animateWheel() {
    if (!this.isAnimating) return; // If animation is stopped, don't animate

    this.rotationAngle -= 0.01; // Adjust rotation speed (counter-clockwise)
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the canvas

    // Redraw everything
    this.drawStaticElements();
    this.drawRotatingElements();

    requestAnimationFrame(this.animateWheel.bind(this)); // Loop the animation
  }

  startSpinning() {
    if (this.isAnimating) return; // Prevent multiple animations

    this.isAnimating = true;
    this.animateWheel(); // Start the animation loop
  }

  stopSpinning() {
    this.isAnimating = false; // Stop the animation
  }

  startDrag(event) {
    // Check if clicking on an activity
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check if click is on any activity
    for (const itemRegion of this.clickableItems) {
      if (this.isPointInItemRegion(x, y, itemRegion)) {
        // Start activity drag
        const dragMode = this.detectDragZone(x, y, itemRegion);
        const freshItem = this.organizationData.items.find(i => i.id === itemRegion.item.id);
        
        this.dragState = {
          isDragging: true,
          dragMode: dragMode,
          draggedItem: freshItem,
          draggedItemRegion: itemRegion,
          startMouseAngle: this.getMouseAngle(event),
          currentMouseAngle: this.getMouseAngle(event),
          initialStartAngle: itemRegion.startAngle,
          initialEndAngle: itemRegion.endAngle,
          previewStartAngle: itemRegion.startAngle,
          previewEndAngle: itemRegion.endAngle,
        };
        
        // Set cursor based on drag mode
        if (dragMode === 'resize-start' || dragMode === 'resize-end') {
          this.canvas.style.cursor = 'ew-resize';
        } else {
          this.canvas.style.cursor = 'move';
        }
        
        return; // Don't start wheel rotation
      }
    }

    // If not clicking on activity, start wheel rotation drag
    this.isDragging = true;
    this.lastMouseAngle = this.getMouseAngle(event);
    this.dragStartAngle = this.rotationAngle;
  }

  drag(event) {
    if (!this.isDragging) return;

    const currentMouseAngle = this.getMouseAngle(event);
    const angleDifference = currentMouseAngle - this.lastMouseAngle;

    // Update the rotation angle based on the difference in angles
    this.rotationAngle = this.dragStartAngle + angleDifference;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawRotatingElements();
    this.drawStaticElements();
  }

  dragActivity(event) {
    if (!this.dragState.isDragging) return;

    const currentMouseAngle = this.getMouseAngle(event);
    this.dragState.currentMouseAngle = currentMouseAngle;
    
    // Calculate angle difference (this is relative to the rotated coordinate system)
    const angleDiff = currentMouseAngle - this.dragState.startMouseAngle;
    
    // Detect target ring if in move mode (allow ring switching)
    if (this.dragState.dragMode === 'move') {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      
      const targetRingInfo = this.detectTargetRing(x, y);
      this.dragState.targetRingInfo = targetRingInfo;
      this.dragState.targetRing = targetRingInfo ? targetRingInfo.ring : null;
    }
    
    // Update preview angles based on drag mode - NO CLAMPING during drag for smooth UX
    if (this.dragState.dragMode === 'move') {
      // Move entire activity - follow mouse freely
      this.dragState.previewStartAngle = this.dragState.initialStartAngle + angleDiff;
      this.dragState.previewEndAngle = this.dragState.initialEndAngle + angleDiff;
    } else if (this.dragState.dragMode === 'resize-start') {
      // Resize start (left edge) - keep end fixed
      const newStartAngle = this.dragState.initialStartAngle + angleDiff;
      const minWeekAngle = this.toRadians((7 / 365) * 360); // 1 week minimum
      
      // Keep end angle fixed at initial position
      this.dragState.previewEndAngle = this.dragState.initialEndAngle;
      
      // Don't allow start to go past end (maintain minimum width)
      if (newStartAngle < this.dragState.initialEndAngle - minWeekAngle) {
        this.dragState.previewStartAngle = newStartAngle;
      } else {
        // Clamp to minimum width
        this.dragState.previewStartAngle = this.dragState.initialEndAngle - minWeekAngle;
      }
    } else if (this.dragState.dragMode === 'resize-end') {
      // Resize end (right edge) - keep start fixed
      const newEndAngle = this.dragState.initialEndAngle + angleDiff;
      const minWeekAngle = this.toRadians((7 / 365) * 360); // 1 week minimum
      
      // Keep start angle fixed at initial position
      this.dragState.previewStartAngle = this.dragState.initialStartAngle;
      
      // Don't allow end to go before start (maintain minimum width)
      if (newEndAngle > this.dragState.initialStartAngle + minWeekAngle) {
        this.dragState.previewEndAngle = newEndAngle;
      } else {
        // Clamp to minimum width
        this.dragState.previewEndAngle = this.dragState.initialStartAngle + minWeekAngle;
      }
    }
    
    // Redraw with preview immediately for responsive dragging
    this.create();
  }

  stopDrag(event) {
    // Handle activity drag end
    if (this.dragState.isDragging) {
      this.stopActivityDrag();
      return;
    }

    // Handle wheel rotation drag end
    if (!this.isDragging) return;
    this.isDragging = false;
  }

  stopActivityDrag() {
    if (!this.dragState.isDragging) return;

    // Convert preview angles to dates
    let newStartDate = this.angleToDate(this.toDegrees(this.dragState.previewStartAngle));
    let newEndDate = this.angleToDate(this.toDegrees(this.dragState.previewEndAngle));
    
    // Clamp dates to current year (Jan 1 - Dec 31)
    const yearStart = new Date(this.year, 0, 1);
    const yearEnd = new Date(this.year, 11, 31);
    
    if (newStartDate < yearStart) newStartDate = yearStart;
    if (newStartDate > yearEnd) newStartDate = yearEnd;
    if (newEndDate > yearEnd) newEndDate = yearEnd;
    if (newEndDate < yearStart) newEndDate = yearStart;
    
    // Ensure end date is not before start date
    if (newEndDate < newStartDate) newEndDate = new Date(newStartDate);
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Create updated item with new dates and potentially new ring
    const updatedItem = {
      ...this.dragState.draggedItem,
      startDate: formatDate(newStartDate),
      endDate: formatDate(newEndDate),
    };

    // If target ring changed (only in move mode), update ringId
    if (this.dragState.targetRing && this.dragState.targetRing.id !== this.dragState.draggedItem.ringId) {
      updatedItem.ringId = this.dragState.targetRing.id;
    }
    
    // CRITICAL: Reset drag state BEFORE calling callback
    // This ensures updateOrganizationData can call create() to redraw
    this.dragState = {
      isDragging: false,
      dragMode: null,
      draggedItem: null,
      draggedItemRegion: null,
      startMouseAngle: 0,
      currentMouseAngle: 0,
      initialStartAngle: 0,
      initialEndAngle: 0,
      previewStartAngle: 0,
      previewEndAngle: 0,
      targetRing: null,
      targetRingInfo: null,
    };
    
    this.canvas.style.cursor = 'default';
    
    // Call update callback AFTER resetting drag state
    if (this.options.onUpdateAktivitet) {
      this.options.onUpdateAktivitet(updatedItem);
    }
  }

  getMouseAngle(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - this.center.x;
    const y = event.clientY - rect.top - this.center.y;
    return Math.atan2(y, x);
  }

  handleMouseMove(event) {
    // Handle activity dragging
    if (this.dragState.isDragging) {
      this.dragActivity(event);
      return;
    }

    // Handle wheel rotation dragging
    if (this.isDragging) {
      this.drag(event);
      return;
    }

    // Handle hover detection for activities (throttled to prevent excessive redraws)
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastHoverCheck;
    
    // Throttle hover checks to ~60fps max
    if (timeSinceLastCheck < this.hoverThrottleMs) {
      return; // Skip this hover check
    }
    this.lastHoverCheck = now;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    let hoveredItemRegion = null;
    let hoverZone = null;
    for (const itemRegion of this.clickableItems) {
      if (this.isPointInItemRegion(x, y, itemRegion)) {
        hoveredItemRegion = itemRegion;
        // Detect which zone we're hovering over
        hoverZone = this.detectDragZone(x, y, itemRegion);
        break;
      }
    }

    // Only update if hover state actually changed
    // Look up fresh item data from organizationData instead of using cached item
    const newHoveredItem = hoveredItemRegion 
      ? this.organizationData.items.find(i => i.id === hoveredItemRegion.item.id) || hoveredItemRegion.item
      : null;
    const hoveredItemId = this.hoveredItem ? this.hoveredItem.id : null;
    const newHoveredItemId = newHoveredItem ? newHoveredItem.id : null;

    // Set cursor based on hover zone
    let newCursor = 'default';
    if (newHoveredItem) {
      if (hoverZone === 'resize-start' || hoverZone === 'resize-end') {
        newCursor = 'ew-resize'; // East-west resize cursor for edges
      } else {
        newCursor = 'move'; // Move cursor for middle
      }
    }

    if (hoveredItemId !== newHoveredItemId || this.canvas.style.cursor !== newCursor) {
      this.hoveredItem = newHoveredItem;
      this.canvas.style.cursor = newCursor;
      
      // Use requestAnimationFrame to prevent excessive redraws
      if (!this.hoverRedrawPending) {
        this.hoverRedrawPending = true;
        requestAnimationFrame(() => {
          this.create();
          this.hoverRedrawPending = false;
        });
      }
    }
  }

  handleMouseLeave() {
    // Cancel activity drag if mouse leaves canvas
    if (this.dragState.isDragging) {
      this.dragState = {
        isDragging: false,
        dragMode: null,
        draggedItem: null,
        draggedItemRegion: null,
        startMouseAngle: 0,
        currentMouseAngle: 0,
        initialStartAngle: 0,
        initialEndAngle: 0,
        previewStartAngle: 0,
        previewEndAngle: 0,
        targetRing: null,
        targetRingInfo: null,
      };
      this.canvas.style.cursor = 'default';
      this.create(); // Redraw without preview
    }
    
    this.stopDrag();
    if (this.hoveredItem) {
      this.hoveredItem = null;
      this.canvas.style.cursor = 'default';
      this.create(); // Redraw without hover state
    }
  }

  handleClick(event) {
    // Don't handle clicks if we were dragging
    if (this.isDragging || this.dragState.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check if click is on any item
    for (const itemRegion of this.clickableItems) {
      if (this.isPointInItemRegion(x, y, itemRegion)) {
        if (this.options.onItemClick) {
          // Look up fresh item data from organizationData instead of using cached snapshot
          const freshItem = this.organizationData.items.find(i => i.id === itemRegion.item.id);
          // Pass client coordinates for tooltip positioning
          this.options.onItemClick(freshItem || itemRegion.item, {
            x: event.clientX,
            y: event.clientY
          });
        }
        break;
      }
    }
  }

  isPointInItemRegion(x, y, region) {
    // Calculate distance from center
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if within radius range
    if (distance < region.startRadius || distance > region.endRadius) {
      return false;
    }

    // Calculate angle (accounting for rotation)
    // this.rotationAngle is already in radians, no need to convert
    let angle = Math.atan2(dy, dx) - this.rotationAngle;
    
    // Normalize angle to 0-2π range
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;

    // Check if within angle range
    let startAngle = region.startAngle;
    let endAngle = region.endAngle;
    
    // Normalize angles
    while (startAngle < 0) startAngle += Math.PI * 2;
    while (endAngle < 0) endAngle += Math.PI * 2;
    while (startAngle >= Math.PI * 2) startAngle -= Math.PI * 2;
    while (endAngle >= Math.PI * 2) endAngle -= Math.PI * 2;

    // Handle wraparound
    if (startAngle < endAngle) {
      return angle >= startAngle && angle <= endAngle;
    } else {
      return angle >= startAngle || angle <= endAngle;
    }
  }

  create() {
    // Set canvas internal dimensions (for drawing resolution)
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    // Note: DO NOT set canvas.style here - let React component control display size for zoom

    // Apply rotation and draw rotating elements (months, events)
    this.drawRotatingElements();
    // Draw static elements (title and year)
    this.drawStaticElements();
    // Draw drag preview if dragging
    this.drawDragPreview();
  }

  drawDragPreview() {
    if (!this.dragState.isDragging || !this.dragState.draggedItemRegion) return;

    const region = this.dragState.draggedItemRegion;
    const item = this.dragState.draggedItem;
    
    // Get activity group color
    const activityGroup = this.organizationData.activityGroups.find(a => a.id === item.activityId);
    const itemColor = activityGroup ? activityGroup.color : '#B8D4E8';
    
    // Draw semi-transparent preview
    this.context.save();
    this.context.globalAlpha = 0.5;
    
    // Clip preview angles to year boundaries for visual display
    // Year boundaries in angles (initAngle offset already applied)
    const yearStartAngle = this.toRadians(this.initAngle); // January 1st
    const yearEndAngle = this.toRadians(this.initAngle + 360); // December 31st
    
    let startAngle = this.dragState.previewStartAngle;
    let endAngle = this.dragState.previewEndAngle;
    
    // Clip to year boundaries for visual display only
    if (startAngle < yearStartAngle) startAngle = yearStartAngle;
    if (endAngle > yearEndAngle) endAngle = yearEndAngle;
    
    // Only draw if there's visible range within the year
    if (startAngle < yearEndAngle && endAngle > yearStartAngle) {
      // Use target ring radius if dragging to a different ring, otherwise use original
      let startRadius = region.startRadius;
      let endRadius = region.endRadius;
      
      if (this.dragState.targetRingInfo && this.dragState.targetRing) {
        // Show preview in target ring location
        startRadius = this.dragState.targetRingInfo.startRadius;
        endRadius = this.dragState.targetRingInfo.endRadius;
      }
      
      // Draw preview arc
      this.context.beginPath();
      this.context.arc(this.center.x, this.center.y, startRadius, startAngle, endAngle, false);
      this.context.arc(this.center.x, this.center.y, endRadius, endAngle, startAngle, true);
      this.context.closePath();
      this.context.fillStyle = itemColor;
      this.context.fill();
      
      // Draw dashed border to indicate preview
      this.context.globalAlpha = 0.8;
      this.context.strokeStyle = '#3B82F6'; // Blue border
      this.context.lineWidth = 2;
      this.context.setLineDash([5, 5]);
      this.context.stroke();
      this.context.setLineDash([]);
      
      // If dragging to a different ring, highlight the target ring
      if (this.dragState.targetRing && this.dragState.targetRing.id !== this.dragState.draggedItem.ringId) {
        this.context.globalAlpha = 0.3;
        this.context.strokeStyle = '#10B981'; // Green to indicate valid drop zone
        this.context.lineWidth = 3;
        this.context.setLineDash([]);
        
        // Draw ring outline
        this.context.beginPath();
        this.context.arc(this.center.x, this.center.y, startRadius, 0, Math.PI * 2);
        this.context.stroke();
        this.context.beginPath();
        this.context.arc(this.center.x, this.center.y, endRadius, 0, Math.PI * 2);
        this.context.stroke();
      }
    }
    
    this.context.restore();
  }

  // Function to draw static elements with proper proportions
  drawStaticElements() {
    this.context.save();

    // Draw center circle
    this.context.beginPath();
    this.context.arc(this.center.x, this.center.y, this.minRadius, 0, Math.PI * 2);
    this.context.fillStyle = "#FFFFFF";
    this.context.fill();
    
    // Add subtle border
    this.context.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    this.context.lineWidth = 1.5;
    this.context.stroke();
    this.context.closePath();

    if (this.hoveredItem) {
      // Show hovered activity info - all text must fit inside circle
      const ring = this.organizationData.rings.find(r => r.id === this.hoveredItem.ringId);
      
      // Use smaller fonts and tighter spacing to fit inside circle
      const lineHeight = this.size / 55; // Reduced line height
      const maxWidth = this.minRadius * 1.4; // Keep text well within circle (70% of diameter with padding)
      
      // Activity name (bold) - smaller font
      this.context.fillStyle = '#1E293B';
      this.context.textAlign = "center";
      this.context.font = `700 ${this.size / 65}px Arial, sans-serif`;
      this.context.textBaseline = "middle";
      
      // Text wrapping for activity name - split on spaces and hyphens
      const parts = this.hoveredItem.name.split(/(-|\s+)/); // Split on hyphens and spaces, keep delimiters
      const lines = [];
      let currentLine = '';
      
      for (let part of parts) {
        if (!part) continue; // Skip empty strings
        const testLine = currentLine + part;
        const metrics = this.context.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = part;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      // Limit to 3 lines to prevent overflow
      if (lines.length > 3) {
        lines[2] = lines[2].substring(0, 15) + '...';
        lines.length = 3;
      }
      
      // Calculate total height needed
      const totalHeight = lines.length * lineHeight + lineHeight * 2; // Space for dates and ring
      const startY = this.center.y - totalHeight / 2;
      
      // Draw wrapped activity name
      for (let i = 0; i < lines.length; i++) {
        this.context.fillText(
          lines[i],
          this.center.x,
          startY + i * lineHeight
        );
      }
      
      // Date range (smaller, less prominent)
      this.context.fillStyle = '#F4A896';
      this.context.font = `500 ${this.size / 85}px Arial, sans-serif`;
      const startDate = new Date(this.hoveredItem.startDate).toLocaleDateString('sv-SE');
      const endDate = new Date(this.hoveredItem.endDate).toLocaleDateString('sv-SE');
      this.context.fillText(
        `${startDate} - ${endDate}`,
        this.center.x,
        startY + lines.length * lineHeight + lineHeight * 0.5
      );
      
      // Ring name only (skip activity group - too much info)
      if (ring) {
        this.context.fillText(
          ring.name,
          this.center.x,
          startY + lines.length * lineHeight + lineHeight * 1.2
        );
      }
    } else {
      // Draw year text in center (bold, large)
      this.context.fillStyle = '#1E293B';
      this.context.font = `700 ${this.size / 30}px Arial, sans-serif`;
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.fillText(
        this.year,
        this.center.x,
        this.center.y,
        this.size
      );
    }

    this.context.restore();
  }

  // Draw a label badge with text on an activity item
  drawLabelIndicator(item, startRadius, width, startAngle, endAngle) {
    if (!item.labelId) return; // No label, skip
    
    const label = this.organizationData.labels.find(l => l.id === item.labelId);
    if (!label || !label.visible) return; // Label not found or not visible
    
    // Only show label if:
    // 1. showLabels is true (user wants all labels visible), OR
    // 2. This item is currently being hovered
    const isHovered = this.hoveredItem && this.hoveredItem.id === item.id;
    if (!this.showLabels && !isHovered) return; // Labels hidden and not hovering
    
    this.context.save();
    
    // Calculate badge dimensions
    const fontSize = Math.max(this.size / 120, 8); // Minimum readable size
    const padding = fontSize * 0.4;
    const badgeHeight = fontSize + padding * 2;
    
    // Measure text width
    this.context.font = `600 ${fontSize}px Arial, sans-serif`;
    const textWidth = this.context.measureText(label.name).width;
    const badgeWidth = textWidth + padding * 2;
    
    // Position badge at the END of activity (right edge)
    // Place badge AWAY from ring name band (which is at outer edge)
    // Position at 30% from inner edge to avoid ring name band at outer edge
    const badgeRadius = startRadius + width * 0.3; // Closer to inner edge, away from name band
    const arcLength = badgeWidth;
    const angleOffset = arcLength / badgeRadius; // Arc length to radians
    const badgeAngleRadians = this.toRadians(endAngle) - angleOffset * 0.5; // Center badge at end (in radians)
    const badgeAngleDegrees = endAngle - (angleOffset * 0.5 * 180 / Math.PI); // For rotation (in degrees)
    
    // Draw rounded rectangle badge
    const centerCoord = this.moveToAngle(badgeRadius, badgeAngleRadians);
    
    // Badge background with border
    this.context.translate(centerCoord.x, centerCoord.y);
    this.context.rotate(badgeAngleRadians + Math.PI / 2);
    
    // White border for contrast
    this.context.fillStyle = '#FFFFFF';
    this.context.strokeStyle = '#FFFFFF';
    this.context.lineWidth = 2;
    this.roundRect(-badgeWidth / 2 - 1, -badgeHeight / 2 - 1, badgeWidth + 2, badgeHeight + 2, fontSize * 0.3);
    this.context.fill();
    
    // Colored background
    this.context.fillStyle = label.color || '#94A3B8';
    this.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, fontSize * 0.3);
    this.context.fill();
    
    // Label text
    this.context.fillStyle = this.getContrastColor(label.color || '#94A3B8');
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.fillText(label.name, 0, 0);
    
    this.context.restore();
  }
  
  // Helper to draw rounded rectangle (if not available)
  roundRect(x, y, width, height, radius) {
    if (typeof this.context.roundRect === 'function') {
      this.context.roundRect(x, y, width, height, radius);
    } else {
      // Fallback for older browsers
      this.context.beginPath();
      this.context.moveTo(x + radius, y);
      this.context.lineTo(x + width - radius, y);
      this.context.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.context.lineTo(x + width, y + height - radius);
      this.context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.context.lineTo(x + radius, y + height);
      this.context.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.context.lineTo(x, y + radius);
      this.context.quadraticCurveTo(x, y, x + radius, y);
      this.context.closePath();
    }
  }

  // Function to draw rotating elements
  drawRotatingElements() {
    // Clear clickable items and labels to draw before redrawing
    this.clickableItems = [];
    this.labelsToDraw = [];
    
    this.context.save();
    this.context.translate(this.center.x, this.center.y);
    this.context.rotate(this.rotationAngle);
    this.context.translate(-this.center.x, -this.center.y);

    // Calculate available space based on what rings are visible
    let currentMaxRadius = this.maxRadius;
    
    // Helper function to convert a date to angular position
    // Get date range for current zoom level
    const { startDate: zoomStartDate, endDate: zoomEndDate, months: zoomMonths } = this.getDateRangeForZoom();
    
    // This aligns with the month ring where each month is 30 degrees (360/12)
    // When zoomed, the entire zoomed range spans 360 degrees
    const dateToAngle = (date) => {
      if (this.zoomedMonth !== null) {
        // Single month zoom: Map this month to 360 degrees
        const dayOfMonth = date.getDate(); // 1-31
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        // Day 1 = 0°, last day = 360°
        return ((dayOfMonth - 1) / daysInMonth) * 360;
      } else if (this.zoomedQuarter !== null) {
        // Quarter zoom: Map 3 months to 360 degrees (each month gets 120°)
        const month = date.getMonth();
        const quarterStartMonth = this.zoomedQuarter * 3;
        const monthInQuarter = month - quarterStartMonth; // 0, 1, or 2
        const dayOfMonth = date.getDate();
        const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
        
        // Each of 3 months gets 120 degrees
        const monthAngle = monthInQuarter * 120;
        const dayAngle = ((dayOfMonth - 1) / daysInMonth) * 120;
        return monthAngle + dayAngle;
      } else {
        // Full year view: Each month gets 30 degrees (360/12)
        const month = date.getMonth(); // 0-11
        const dayOfMonth = date.getDate(); // 1-31
        const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
        
        const monthAngle = month * 30;
        const dayAngle = (dayOfMonth - 1) / daysInMonth * 30;
        
        return monthAngle + dayAngle;
      }
    };
    
    // Use zoomed date range or full year
    const minDate = zoomStartDate;
    const maxDate = zoomEndDate;
    
    // Define visibility filters at higher scope for use in both outer and inner ring drawing
    const visibleRings = this.organizationData.rings.filter(r => r.visible && r.type === 'outer');
    const visibleInnerRings = this.organizationData.rings.filter(r => r.visible && r.type === 'inner');
    const visibleActivityGroups = this.organizationData.activityGroups.filter(a => a.visible);
    const visibleLabels = this.organizationData.labels.filter(l => l.visible);
    
    // PERFORMANCE: Create lookup maps to avoid repeated array.find() calls
    const activityGroupMap = new Map(visibleActivityGroups.map(a => [a.id, a]));
    const labelMap = new Map(visibleLabels.map(l => [l.id, l]));
    
    // Draw organization data items (from sidebar) if available
    if (this.organizationData && this.organizationData.items && this.organizationData.items.length > 0) {
      
      if (visibleRings.length > 0) {
        const ringNameBandWidth = this.size / 70; // CONSISTENT ring name band width
        const standardGap = 0; // NO GAP - for testing
        
        // Each outer ring = content area + name band (same as inner rings)
        const outerRingTotalHeight = this.size / 23; // Total height per outer ring
        const outerRingContentHeight = this.showRingNames ? outerRingTotalHeight - ringNameBandWidth : outerRingTotalHeight;
        
        let currentRadius = currentMaxRadius;
        
        visibleRings.forEach((ring, ringIndex) => {
          // Each ring = content area + name band as one unit
          // Start by moving down for the entire ring (content + name band)
          currentRadius -= outerRingTotalHeight; // Reserve space for whole ring
          const ringStartRadius = currentRadius;
          
          // Filter items for this ring that also have visible activity group (label is optional)
          const ringItems = this.organizationData.items.filter(item => {
            const hasVisibleActivityGroup = visibleActivityGroups.some(a => a.id === item.activityId);
            // Label is optional - only filter by label if item has one
            const labelOk = !item.labelId || visibleLabels.some(l => l.id === item.labelId);
            return item.ringId === ring.id && hasVisibleActivityGroup && labelOk;
          });
          
          // Assign items to tracks to handle overlaps
          const { maxTracks, itemToTrack } = this.assignActivitiesToTracks(ringItems);
          const trackGap = this.size / 2000; // Tiny gap between tracks for visual separation
          
          // Calculate which items actually have overlaps (are in tracks > 0)
          const itemsWithOverlaps = new Set();
          itemToTrack.forEach((track, itemId) => {
            if (track > 0) {
              // This item is in a higher track, so it overlaps with something
              itemsWithOverlaps.add(itemId);
              // Also mark items in track 0 that this overlaps with
              const overlappingItem = ringItems.find(i => i.id === itemId);
              if (overlappingItem) {
                ringItems.forEach(otherItem => {
                  if (otherItem.id !== itemId && itemToTrack.get(otherItem.id) === 0) {
                    const overlap = this.dateRangesOverlap(
                      new Date(overlappingItem.startDate),
                      new Date(overlappingItem.endDate),
                      new Date(otherItem.startDate),
                      new Date(otherItem.endDate)
                    );
                    if (overlap) itemsWithOverlaps.add(otherItem.id);
                  }
                });
              }
            }
          });
          
          // Default track height for overlapping items
          const overlapTrackHeight = maxTracks > 0 ? outerRingContentHeight / maxTracks : outerRingContentHeight;
          
          // Always draw background for ALL outer rings using palette colors
          this.context.beginPath();
          this.context.arc(this.center.x, this.center.y, ringStartRadius, 0, Math.PI * 2);
          this.context.arc(this.center.x, this.center.y, ringStartRadius + outerRingContentHeight, 0, Math.PI * 2, true);
          // Use palette color (cycles through palette based on ring index)
          const templateColor = this.sectionColors[ringIndex % this.sectionColors.length];
          this.context.fillStyle = this.getLightBackgroundColor(templateColor);
          this.context.globalAlpha = ringItems.length === 0 ? 0.3 : 0.15; // More subtle for rings with items
          this.context.fill();
          this.context.globalAlpha = 1.0; // Reset alpha
          this.context.closePath();
          
          ringItems.forEach((item) => {
            let itemStartDate = new Date(item.startDate);
            let itemEndDate = new Date(item.endDate);
            
            // VIEWPORT CULLING: Skip items outside the current date range (year or zoom)
            if (itemEndDate < minDate || itemStartDate > maxDate) return;
            
            // Clip item dates to visible boundaries
            if (itemStartDate < minDate) itemStartDate = minDate;
            if (itemEndDate > maxDate) itemEndDate = maxDate;
            
            // Calculate angles
            let startAngle = dateToAngle(itemStartDate);
            let endAngle = dateToAngle(itemEndDate);
            
            // VIEWPORT CULLING: Skip items outside visible angle range (performance optimization)
            // When zoomed, only draw items within the 0-360 degree visible range
            const visibleRangeStart = 0;
            const visibleRangeEnd = 360;
            if (endAngle < visibleRangeStart || startAngle > visibleRangeEnd) return;
            
            // Enforce MINIMUM 1-WEEK WIDTH (7 days = ~5.75 degrees)
            const minWeekAngle = (7 / 365) * 360; // 1 week in degrees
            if (Math.abs(endAngle - startAngle) < minWeekAngle) {
              const center = (startAngle + endAngle) / 2;
              startAngle = center - minWeekAngle / 2;
              endAngle = center + minWeekAngle / 2;
            }
            
            // Apply the initAngle offset to align with the month ring
            const adjustedStartAngle = this.initAngle + startAngle;
            const adjustedEndAngle = this.initAngle + endAngle;
            
            // Get color from activity group (use Map lookup for O(1) instead of array.find O(n))
            const activityGroup = activityGroupMap.get(item.activityId);
            let itemColor = activityGroup ? activityGroup.color : ring.color;
            
            // Check if this item is hovered
            const isHovered = this.hoveredItem && this.hoveredItem.id === item.id;
            if (isHovered) {
              itemColor = this.getHoverColor(itemColor);
            }
            
            // Get track assignment for this item
            const trackIndex = itemToTrack.get(item.id) || 0;
            
            // Determine height: full height if no overlaps, partial height if overlaps
            const hasOverlap = itemsWithOverlaps.has(item.id);
            const itemHeight = hasOverlap ? overlapTrackHeight : outerRingContentHeight;
            const itemStartRadius = hasOverlap 
              ? ringStartRadius + (trackIndex * overlapTrackHeight)
              : ringStartRadius;
            const itemWidth = itemHeight - trackGap; // Subtract tiny gap between tracks
            
            // Decide text orientation based on activity dimensions
            const angularWidth = Math.abs(this.toRadians(adjustedEndAngle) - this.toRadians(adjustedStartAngle));
            const middleRadius = itemStartRadius + itemWidth / 2;
            const textOrientation = this.chooseTextOrientation(angularWidth, itemWidth, item.name, middleRadius);
            
            // Get the pre-calculated rendering decision (stored by chooseTextOrientation)
            const renderDecision = this._lastOrientationDecision;
            
            // Choose appropriate text drawing function (use adapter for horizontal text)
            const textFunction = textOrientation === 'vertical' 
              ? this.setCircleSectionAktivitetTitle.bind(this)
              : this.drawTextAlongArcAdapter.bind(this);
            
            // Draw the item block
            this.setCircleSectionHTML({
              startRadius: itemStartRadius,
              width: itemWidth,
              startAngle: adjustedStartAngle,
              endAngle: adjustedEndAngle,
              color: itemColor,
              textFunction: textFunction,
              text: item.name,
              fontSize: this.size / 48,
              isVertical: textOrientation === 'vertical',
              highlight: isHovered,
              renderDecision: renderDecision, // Pass the decision to renderer
            });
            
            // Collect label indicator to draw last (on top)
            if (item.labelId) {
              this.labelsToDraw.push({
                item,
                startRadius: itemStartRadius,
                width: itemWidth,
                startAngle: adjustedStartAngle,
                endAngle: adjustedEndAngle
              });
            }
            
            // Store clickable region for this item
            this.clickableItems.push({
              item: item,
              startRadius: itemStartRadius,
              endRadius: itemStartRadius + itemWidth,
              startAngle: this.toRadians(adjustedStartAngle),
              endAngle: this.toRadians(adjustedEndAngle)
            });
          });
          
          // Name band is drawn at the outer edge of content area (no gap)
          if (this.showRingNames) {
            const ringNameRadius = ringStartRadius + outerRingContentHeight;
            this.drawRingNameBand(ring.name, ringNameRadius, ringNameBandWidth);
          }
          // currentRadius is already at the correct position (bottom of entire ring including name band)
        });
        
        // Set currentMaxRadius - month ring starts right after outer rings (including name bands)
        currentMaxRadius = currentRadius;
      }
    }
    
    // STANDARDIZED spacing constants - used consistently throughout
    const standardGap = this.size / 1000; // Ultra-minimal gap - 2-3px
    const ringNameBandWidth = this.size / 70; // CONSISTENT ring name band width (same as outer)
    
    // Reserve space for month and week rings (draw them LATER after inner rings)
    const monthNameWidth = this.size / 30;
    const weekRingWidth = this.size / 35;
    
    // Calculate positions with NO gaps between month and week rings (space preservation)
    let monthNameStartRadius = currentMaxRadius - monthNameWidth;
    let weekStartRadius = monthNameStartRadius - weekRingWidth; // NO gap between month and week
    
    // Reduce currentMaxRadius to leave space for rings PLUS a gap before inner rings
    if (this.showMonthRing) {
      currentMaxRadius -= monthNameWidth;
    }
    if (this.showWeekRing) {
      currentMaxRadius -= weekRingWidth;
    }
    // Add gap between week ring and inner rings to prevent overlap
    currentMaxRadius -= standardGap;

    // Draw monthly events (inner sections) - they expand to fill available space
    
    // Show ALL visible inner rings, even if empty (no items)
    const innerRings = this.organizationData.rings.filter(r => {
      return r.type === 'inner' && r.visible;
    });
    const numberOfEvents = innerRings.length;
    
    // Calculate total available space for inner rings
    // Each ring = content area + name band (treated as single unit)
    const totalAvailableSpace =
      currentMaxRadius -
      this.minRadius -
      this.size / 1000; // Minimal buffer space
    
    // Calculate spacing between rings (only gaps, name bands are part of each ring)
    let totalGapSpacing = 0;
    if (numberOfEvents > 1) {
      // Only gaps between rings, no gaps around name bands
      totalGapSpacing = (numberOfEvents - 1) * standardGap;
    }
    
    // Each ring gets equal total height (including its name band)
    const totalRingSpace = totalAvailableSpace - totalGapSpacing;
    const equalRingHeight = totalRingSpace / numberOfEvents;
    
    // Within each ring: content area + name band
    const contentAreaHeight = this.showRingNames ? equalRingHeight - ringNameBandWidth : equalRingHeight;
    
    let eventRadius = this.minRadius;

    for (let i = 0; i < numberOfEvents; i++) {
      const ring = innerRings[i];
      
      // Each ring has two parts: content area (for activities) + name band
      const ringContentHeight = contentAreaHeight;
      
      // Get items for this ring
      const ringItems = this.organizationData.items.filter(item => {
        const hasVisibleActivityGroup = visibleActivityGroups.some(a => a.id === item.activityId);
        const labelOk = !item.labelId || visibleLabels.some(l => l.id === item.labelId);
        return item.ringId === ring.id && hasVisibleActivityGroup && labelOk;
      });
      
      // Draw subtle background for ALL inner rings using palette color
      this.context.beginPath();
      this.context.arc(this.center.x, this.center.y, eventRadius, 0, Math.PI * 2);
      this.context.arc(this.center.x, this.center.y, eventRadius + ringContentHeight, 0, Math.PI * 2, true);
      // Use palette color (cycles through palette based on ring index)
      const templateColor = this.sectionColors[i % this.sectionColors.length];
      this.context.fillStyle = this.getLightBackgroundColor(templateColor);
      this.context.globalAlpha = ringItems.length === 0 ? 0.3 : 0.15; // More subtle for rings with items
      this.context.fill();
      this.context.globalAlpha = 1.0; // Reset alpha
      this.context.closePath();
      
      // Draw activities in the content area
      if (visibleInnerRings.length > 0 && ringItems.length > 0) {
        
        // Assign items to tracks to handle overlaps
        const { maxTracks, itemToTrack } = this.assignActivitiesToTracks(ringItems);
        const trackGap = this.size / 2000; // Tiny gap between tracks for visual separation
        
        // Calculate which items actually have overlaps (are in tracks > 0)
        const itemsWithOverlaps = new Set();
        itemToTrack.forEach((track, itemId) => {
          if (track > 0) {
            // This item is in a higher track, so it overlaps with something
            itemsWithOverlaps.add(itemId);
            // Also mark items in track 0 that this overlaps with
            const overlappingItem = ringItems.find(i => i.id === itemId);
            if (overlappingItem) {
              ringItems.forEach(otherItem => {
                if (otherItem.id !== itemId && itemToTrack.get(otherItem.id) === 0) {
                  const overlap = this.dateRangesOverlap(
                    new Date(overlappingItem.startDate),
                    new Date(overlappingItem.endDate),
                    new Date(otherItem.startDate),
                    new Date(otherItem.endDate)
                  );
                  if (overlap) itemsWithOverlaps.add(otherItem.id);
                }
              });
            }
          }
        });
        
        // Default track height for overlapping items
        const overlapTrackHeight = maxTracks > 0 ? ringContentHeight / maxTracks : ringContentHeight;
        
        ringItems.forEach((item) => {
          let itemStartDate = new Date(item.startDate);
          let itemEndDate = new Date(item.endDate);
          
          // VIEWPORT CULLING: Skip items outside the current date range (year or zoom)
          if (itemEndDate < minDate || itemStartDate > maxDate) return;
          
          // Clip item dates to visible boundaries
          if (itemStartDate < minDate) itemStartDate = minDate;
          if (itemEndDate > maxDate) itemEndDate = maxDate;
          
          // Calculate angles
          let startAngle = dateToAngle(itemStartDate);
          let endAngle = dateToAngle(itemEndDate);
          
          // VIEWPORT CULLING: Skip items outside visible angle range (performance optimization)
          const visibleRangeStart = 0;
          const visibleRangeEnd = 360;
          if (endAngle < visibleRangeStart || startAngle > visibleRangeEnd) return;
          
          // Enforce MINIMUM 1-WEEK WIDTH (7 days = ~5.75 degrees)
          const minWeekAngle = (7 / 365) * 360; // 1 week in degrees
          if (Math.abs(endAngle - startAngle) < minWeekAngle) {
            const center = (startAngle + endAngle) / 2;
            startAngle = center - minWeekAngle / 2;
            endAngle = center + minWeekAngle / 2;
          }
          
          // Apply the initAngle offset to align with the month ring
          const adjustedStartAngle = this.initAngle + startAngle;
          const adjustedEndAngle = this.initAngle + endAngle;
          
          // Get color from activity group (use Map lookup for O(1) instead of array.find O(n))
          const activityGroup = activityGroupMap.get(item.activityId);
          let itemColor = activityGroup ? activityGroup.color : this.sectionColors[0];
          
          // Check if this item is hovered
          const isHovered = this.hoveredItem && this.hoveredItem.id === item.id;
          if (isHovered) {
            itemColor = this.getHoverColor(itemColor);
          }
          
          // Get track assignment for this item
          const trackIndex = itemToTrack.get(item.id) || 0;
          
          // Determine height: full height if no overlaps, partial height if overlaps
          const hasOverlap = itemsWithOverlaps.has(item.id);
          const itemHeight = hasOverlap ? overlapTrackHeight : ringContentHeight;
          const itemStartRadius = hasOverlap 
            ? eventRadius + (trackIndex * overlapTrackHeight)
            : eventRadius;
          const itemWidth = itemHeight - trackGap; // Subtract tiny gap between tracks
          
          // Decide text orientation based on activity dimensions
          const angularWidth = Math.abs(this.toRadians(adjustedEndAngle) - this.toRadians(adjustedStartAngle));
          const middleRadius = itemStartRadius + itemWidth / 2;
          const textOrientation = this.chooseTextOrientation(angularWidth, itemWidth, item.name, middleRadius);
          
          // Get the pre-calculated rendering decision (stored by chooseTextOrientation)
          const renderDecision = this._lastOrientationDecision;
          
          // Choose appropriate text drawing function (use adapter for horizontal text)
          const textFunction = textOrientation === 'vertical' 
            ? this.setCircleSectionAktivitetTitle.bind(this)
            : this.drawTextAlongArcAdapter.bind(this);
          
          // Draw the item block with modern styling
          this.setCircleSectionHTML({
            startRadius: itemStartRadius,
            width: itemWidth,
            startAngle: adjustedStartAngle,
            endAngle: adjustedEndAngle,
            color: itemColor,
            textFunction: textFunction,
            text: item.name,
            fontSize: this.size / 62,
            isVertical: textOrientation === 'vertical',
            highlight: isHovered,
            renderDecision: renderDecision, // Pass the decision to renderer
          });
          
          // Collect label indicator to draw last (on top)
          if (item.labelId) {
            this.labelsToDraw.push({
              item,
              startRadius: itemStartRadius,
              width: itemWidth,
              startAngle: adjustedStartAngle,
              endAngle: adjustedEndAngle
            });
          }
          
          // Store clickable region for this item
          this.clickableItems.push({
            item: item,
            startRadius: itemStartRadius,
            endRadius: itemStartRadius + itemWidth,
            startAngle: this.toRadians(adjustedStartAngle),
            endAngle: this.toRadians(adjustedEndAngle)
          });
        });
      }
      
      // Name band is drawn at the outer edge of the content area (no gap)
      if (this.showRingNames) {
        const ringNameRadius = eventRadius + ringContentHeight;
        if (!this.innerRingNamesToDraw) this.innerRingNamesToDraw = [];
        this.innerRingNamesToDraw.push({
          name: ring.name,
          radius: ringNameRadius,
          width: ringNameBandWidth
        });
      }
      
      // Move to next ring: current position + content area + name band + gap
      eventRadius += ringContentHeight;
      if (this.showRingNames) {
        eventRadius += ringNameBandWidth; // Name band (part of this ring)
      }
      
      // Add gap before next ring (only between rings, not before first or after last)
      if (i < numberOfEvents - 1) {
        eventRadius += standardGap;
      }
    }

    // NOW draw month ring AFTER inner rings (so it's on top)
    if (this.showMonthRing) {
      // Get months for current zoom level
      const monthsToDisplay = this.getMonthsForZoom();
      const numberOfMonths = monthsToDisplay.length;
      
      // Use template colors alternating between first two colors for month ring
      const color1 = this.sectionColors[0];
      const color2 = this.sectionColors[1] || this.sectionColors[0]; // Fallback to first if only one color
      const monthColors = [];
      for (let i = 0; i < numberOfMonths; i++) {
        monthColors.push(i % 2 === 0 ? color1 : color2);
      }
      
      this.addMonthlyCircleSection({
        startRadius: monthNameStartRadius,
        width: monthNameWidth,
        spacingAngle: 0,
        color: null,
        textFunction: this.setCircleSectionTitle.bind(this),
        texts: monthsToDisplay,
        fontSize: this.size / 70, // Much smaller font
        colors: monthColors,
        isVertical: true,
        numberOfIntervals: numberOfMonths,
      });
    }

    // NOW draw week ring AFTER inner rings (so it's on top)
    if (this.showWeekRing) {
      // Get data based on display mode: week numbers or date ranges
      let weekData;
      if (this.weekRingDisplayMode === 'dates') {
        // Generate date ranges (DD-DD format)
        const allDateRanges = this.generateWeekDateRanges();
        // Filter for current zoom level (similar to getWeeksForZoom logic)
        const { startDate, endDate } = this.getDateRangeForZoom();
        const year = parseInt(this.year);
        
        // If zoomed, filter date ranges to match the zoom period
        if (this.zoomedMonth !== null || this.zoomedQuarter !== null) {
          weekData = [];
          let currentDate = new Date(year, 0, 1);
          while (currentDate.getDay() !== 1) currentDate.setDate(currentDate.getDate() - 1);
          
          let rangeIndex = 0;
          while (currentDate.getFullYear() <= year && rangeIndex < allDateRanges.length) {
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            // Check if this week overlaps with the zoomed period
            if (weekEnd >= startDate && weekStart <= endDate) {
              weekData.push(allDateRanges[rangeIndex]);
            }
            
            rangeIndex++;
            currentDate.setDate(currentDate.getDate() + 7);
            if (currentDate.getFullYear() > year && currentDate.getMonth() > 0) break;
          }
        } else {
          weekData = allDateRanges;
        }
      } else {
        // Default: week numbers
        weekData = this.getWeeksForZoom();
      }
      
      const numberOfWeeks = weekData.length;
      
      // Use lighter version of third template color (or second if only 2 colors)
      const weekBaseColor = this.sectionColors[2] || this.sectionColors[1] || this.sectionColors[0];
      const weekColors = Array(numberOfWeeks).fill(weekBaseColor);
      
      this.addMonthlyCircleSection({
        startRadius: weekStartRadius,
        width: weekRingWidth,
        spacingAngle: 0, // Seamless
        color: null,
        textFunction: this.setCircleSectionSmallTitle.bind(this), // Use smaller text function
        texts: weekData,
        fontSize: this.size / 85, // Smaller, more subtle
        colors: weekColors,
        isVertical: true,
        lineHeight: this.lineHeight,
        numberOfIntervals: numberOfWeeks,
      });
    }

    // FIRST draw all label indicators (below ring names)
    if (this.labelsToDraw && this.labelsToDraw.length > 0) {
      for (const labelData of this.labelsToDraw) {
        this.drawLabelIndicator(
          labelData.item,
          labelData.startRadius,
          labelData.width,
          labelData.startAngle,
          labelData.endAngle
        );
      }
    }

    // FINALLY draw inner ring names on top (collected earlier)
    // Ring names should always be visible, even over labels
    if (this.showRingNames && this.innerRingNamesToDraw && this.innerRingNamesToDraw.length > 0) {
      for (const ringName of this.innerRingNamesToDraw) {
        this.drawRingNameBand(ringName.name, ringName.radius, ringName.width);
      }
      // Clear the array for next render
      this.innerRingNamesToDraw = [];
    }

    this.context.restore();
  }

  // DOWNLOAD FUNCTIONALITY

  downloadImage(format, toClipboard = false) {
    if (toClipboard) {
      this.copyToClipboard(format);
    } else {
      switch (format) {
        case "png":
          this.downloadAsPNG(false);
          break;
        case "png-white":
          this.downloadAsPNG(true);
          break;
        case "jpeg":
          this.downloadAsJPEG();
          break;
        case "svg":
          this.downloadAsSVG();
          break;
        case "pdf":
          this.downloadAsPDF();
          break;
        default:
          console.error("Unsupported format");
      }
    }
  }

  async copyToClipboard(format) {
    try {
      switch (format) {
        case "png":
        case "png-white":
          await this.copyPNGToClipboard(format === "png-white");
          break;
        case "jpeg":
          await this.copyJPEGToClipboard();
          break;
        case "svg":
          await this.copySVGToClipboard();
          break;
        default:
          console.error("Unsupported format for clipboard");
      }
      
      // Show success feedback via toast
      const event = new CustomEvent('showToast', {
        detail: { message: 'Bild kopierad till urklipp!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte kopiera till urklipp', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  }

  async copyPNGToClipboard(whiteBackground = false) {
    const pngCanvas = this.copyCanvas(whiteBackground);
    const blob = await new Promise(resolve => pngCanvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
  }

  async copyJPEGToClipboard() {
    const jpegCanvas = this.copyCanvas(true);
    const blob = await new Promise(resolve => jpegCanvas.toBlob(resolve, 'image/jpeg', 1.0));
    // Convert JPEG to PNG for clipboard (clipboard doesn't support JPEG directly)
    const pngBlob = await new Promise(resolve => jpegCanvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);
  }

  async copySVGToClipboard() {
    const svgContext = this.createSVGContext();
    const originalContext = this.context;
    this.context = svgContext;
    this.create();
    const svgData = svgContext.getSerializedSvg();
    
    // Restore original context and re-render to canvas
    this.context = originalContext;
    this.create();
    
    // Copy as text
    await navigator.clipboard.writeText(svgData);
  }

  generateFileName(extension) {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const titlePart = this.title ? `${this.title.replace(/\s+/g, "_")}_` : "";
    return `YearWheel_${titlePart}${dateStr}.${extension}`;
  }

  downloadFile(data, fileName, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  downloadAsPNG(whiteBackground = false) {
    const pngCanvas = this.copyCanvas(whiteBackground);
    pngCanvas.toBlob((blob) => {
      const fileName = this.generateFileName("png");
      this.downloadFile(blob, fileName, "image/png");
    });
  }

  downloadAsJPEG() {
    const jpegCanvas = this.copyCanvas(true); // Always use white background for JPEG
    jpegCanvas.toBlob(
      (blob) => {
        const fileName = this.generateFileName("jpg");
        this.downloadFile(blob, fileName, "image/jpeg");
      },
      "image/jpeg",
      1.0
    );
  }

  downloadAsSVG() {
    const svgContext = this.createSVGContext();
    const originalContext = this.context;
    this.context = svgContext;
    this.create();
    const svgData = svgContext.getSerializedSvg();
    
    // Restore original context and re-render to canvas
    this.context = originalContext;
    this.create();
    
    const fileName = this.generateFileName("svg");
    this.downloadFile(svgData, fileName, "image/svg+xml");
  }

  async downloadAsPDF() {
    // Dynamically import jsPDF only when PDF export is needed
    const { jsPDF } = await import('jspdf');
    
    // Create a high-quality canvas for PDF export
    const pdfCanvas = this.copyCanvas(true); // White background for PDF
    
    // Calculate dimensions for PDF (A4 landscape or custom size based on wheel)
    const imgWidth = this.canvas.width;
    const imgHeight = this.canvas.height;
    
    // Create PDF with dimensions matching the canvas aspect ratio
    // Use A4 landscape as base, or adjust based on canvas size
    const pdfWidth = 297; // A4 landscape width in mm
    const pdfHeight = 210; // A4 landscape height in mm
    
    // If the wheel is square or taller, use portrait or square format
    const aspectRatio = imgWidth / imgHeight;
    let finalWidth, finalHeight;
    
    if (aspectRatio > 1.2) {
      // Landscape
      finalWidth = pdfWidth;
      finalHeight = pdfWidth / aspectRatio;
    } else if (aspectRatio < 0.8) {
      // Portrait
      finalHeight = pdfWidth; // Use full width as height for portrait
      finalWidth = finalHeight * aspectRatio;
    } else {
      // Square-ish, use square format
      finalWidth = finalHeight = Math.min(pdfWidth, pdfHeight);
    }
    
    // Create PDF document
    const pdf = new jsPDF({
      orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [finalWidth, finalHeight]
    });
    
    // Convert canvas to image data
    const imgData = pdfCanvas.toDataURL('image/jpeg', 1.0);
    
    // Add image to PDF (fill the entire page)
    pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight);
    
    // Download the PDF
    const fileName = this.generateFileName("pdf");
    pdf.save(fileName);
  }

  copyCanvas(whiteBackground = false) {
    const copiedCanvas = document.createElement("canvas");
    copiedCanvas.width = this.canvas.width;
    copiedCanvas.height = this.canvas.height;
    const copiedContext = copiedCanvas.getContext("2d");

    if (whiteBackground) {
      copiedContext.fillStyle = "#FFFFFF";
      copiedContext.fillRect(0, 0, copiedCanvas.width, copiedCanvas.height);
    }

    copiedContext.drawImage(this.canvas, 0, 0);
    return copiedCanvas;
  }

  createSVGContext() {
    return new C2S(this.size, this.size / 4 + this.size);
  }
}

export default YearWheel;
