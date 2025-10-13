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
    this.organizationData = options.organizationData || { items: [], rings: [], activityGroups: [] };
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
    this.zoomedMonth = options.zoomedMonth !== undefined && options.zoomedMonth !== null ? options.zoomedMonth : null;
    this.zoomedQuarter = options.zoomedQuarter !== undefined && options.zoomedQuarter !== null ? options.zoomedQuarter : null;
    this.textColor = "#374151"; // Darker gray for better readability
    this.center = { x: size / 2, y: size / 2 }; // Center vertically (title removed)
    this.initAngle = -15 - 90;
    this.minRadius = size / 12; // Smaller center circle for better proportions
    this.maxRadius = size / 2 - size / 30;
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
    
    this.monthNames = [
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
    // Invalidate cache if ring structure changed
    this.invalidateCache();
    // DON'T redraw during drag - it will cause wheel to go blank
    // The drag handler (dragActivity) already calls create() to show preview
    if (!this.dragState || !this.dragState.isDragging) {
      this.create();
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
        color // Pass background color for contrast calculation
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
    const middleRadius = startRadius + width / 2.2;
    const circleSectionLength =
      startRadius * 2 * Math.PI * (angleLength / (Math.PI * 2));
    const textWidth = this.cachedMeasureText(text, this.context.font);

    const radius =
      textWidth < circleSectionLength ? middleRadius : middleRadius + width;
    const rotationDivider = textWidth < circleSectionLength ? 2.06 : 1;
    const color = textWidth < circleSectionLength ? "#ffffff" : this.textColor;

    this.drawTextOnCircle(
      text,
      radius,
      angle,
      fontSize,
      color,
      "right",
      rotationDivider
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
    backgroundColor
  ) {
    // Angles are already in radians from setCircleSectionHTML
    const startRad = startAngle;
    const endRad = endAngle;
    const centerAngle = (startRad + endRad) / 2;
    const middleRadius = startRadius + width / 2;
    
    // Calculate available space
    const arcLength = middleRadius * Math.abs(angleLength); // Length along the arc
    const radialWidth = width; // Width perpendicular to arc
    
    // Minimum thresholds - only skip EXTREMELY tiny segments
    const MIN_ARC_LENGTH = this.size * 0.008; // 0.8% of canvas (very tiny)
    const MIN_RADIAL_WIDTH = this.size * 0.005; // 0.5% of canvas (very tiny)
    
    if (arcLength < MIN_ARC_LENGTH || radialWidth < MIN_RADIAL_WIDTH) {
      // Too small to render readable text - skip it
      return;
    }
    
    // Get text color with proper contrast
    const textColor = backgroundColor ? this.getContrastColor(backgroundColor) : "#FFFFFF";
    
    // Calculate appropriate font size - keep it readable
    // Use 70% of base font as standard, limited by available space
    let activityFontSize = Math.min(
      fontSize * 0.7,  // 70% of base font for good readability
      radialWidth * 0.4,  // Max 40% of radial width
      this.size / 40  // Absolute maximum (slightly larger)
    );
    
    // Set minimum font size - don't make text too tiny
    const minFontSize = this.size / 120;
    activityFontSize = Math.max(activityFontSize, minFontSize);
    
    this.context.save();
    this.context.font = `500 ${activityFontSize}px Arial, sans-serif`;
    this.context.fillStyle = textColor;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    
    // Position at center of segment
    const coord = this.moveToAngle(middleRadius, centerAngle);
    this.context.translate(coord.x, coord.y);
    
    // Determine rotation for perpendicular text
    // Normalize angle to 0-2π
    let normalizedAngle = centerAngle % (Math.PI * 2);
    if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
    
    // Check if we're on left side (flip text to keep readable)
    const isLeftSide = normalizedAngle > Math.PI / 2 && normalizedAngle < Math.PI * 1.5;
    let rotation = centerAngle;
    if (isLeftSide) {
      rotation += Math.PI;  // Flip 180° so text reads outward
    }
    
    this.context.rotate(rotation);
    
    // Calculate constraints
    const maxTextWidth = radialWidth * 0.75; // Use 75% of available width for padding
    const lineHeight = activityFontSize * 1.2;
    const maxLines = Math.max(1, Math.floor((arcLength * 0.9) / lineHeight));
    
    // Measure full text
    const fullTextWidth = this.context.measureText(text).width;
    
    if (fullTextWidth <= maxTextWidth) {
      // Single line, fits completely
      this.context.fillText(text, 0, 0);
    } else {
      // Need to wrap or truncate
      const lines = this.wrapText(text, maxTextWidth, maxLines);
      
      // Calculate vertical centering
      const totalHeight = lines.length * lineHeight;
      const startY = -(totalHeight / 2) + (lineHeight / 2);
      
      // Draw each line
      lines.forEach((line, index) => {
        this.context.fillText(line, 0, startY + (index * lineHeight));
      });
    }
    
    this.context.restore();
  }
  
  /**
   * Smart text wrapping with word boundaries and ellipsis
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
   * Smart text orientation decision based on segment dimensions
   * Chooses between horizontal (along arc) and vertical (perpendicular) 
   * based on what will give the best readability for the available space
   */
  chooseTextOrientation(angularWidth, radialHeight, textLength) {
    // Convert angular width from radians to degrees
    const angularDegrees = (angularWidth * 180) / Math.PI;
    
    // Calculate rough text-to-space ratio
    const arcLengthRatio = textLength / angularDegrees; // chars per degree
    const radialRatio = textLength * 8 / radialHeight; // rough char width estimate
    
    // Decision logic:
    
    // 1. Very wide segments (>60°) - prefer horizontal (along arc)
    //    Text flows naturally around the circle
    if (angularDegrees > 60) {
      return 'horizontal';
    }
    
    // 2. Wide radial height but narrow arc (<15°) - use vertical
    //    Text fits better perpendicular
    if (angularDegrees < 15 && radialHeight > this.size / 20) {
      return 'vertical';
    }
    
    // 3. Medium segments (15-60°) - decide based on text length
    //    Short text: horizontal looks better
    //    Long text: vertical uses space more efficiently
    if (angularDegrees >= 15 && angularDegrees <= 60) {
      // If text is short relative to arc length, use horizontal
      if (textLength < 15 || arcLengthRatio < 0.8) {
        return 'horizontal';
      }
      // Long text in medium segment: use vertical
      return 'vertical';
    }
    
    // 4. Very narrow segments (<15°, small radial) - vertical with truncation
    return 'vertical';
  }

  // Wrapper to adapt drawTextAlongArc to match setCircleSectionAktivitetTitle signature
  // This allows both functions to be called the same way from setCircleSectionHTML
  drawTextAlongArcAdapter(
    text,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    fontSize,
    isVertical,
    backgroundColor
  ) {
    // Calculate middle radius for text placement
    const middleRadius = startRadius + width / 2;
    
    // Get text color with contrast
    const textColor = backgroundColor ? this.getContrastColor(backgroundColor) : "#FFFFFF";
    
    // Use smaller font size for horizontal text (70% like vertical text does)
    const adjustedFontSize = fontSize * 0.7;
    
    // Measure text and truncate if needed to fit available arc length
    this.context.save();
    this.context.font = `500 ${adjustedFontSize}px Arial, sans-serif`;
    
    // Calculate available arc length (use 88% for comfortable spacing)
    const availableArcLength = middleRadius * angleLength * 0.88;
    let displayText = text;
    
    // Try to intelligently truncate at word boundaries if possible
    if (this.context.measureText(displayText).width > availableArcLength) {
      // First, try to fit whole words
      const words = displayText.split(/\s+/);
      let truncated = '';
      let i = 0;
      
      while (i < words.length) {
        const testText = truncated + (truncated ? ' ' : '') + words[i];
        const testWidth = this.context.measureText(testText + '…').width;
        
        if (testWidth <= availableArcLength) {
          truncated = testText;
          i++;
        } else {
          break;
        }
      }
      
      // If we got at least one word, use it
      if (truncated) {
        displayText = truncated + '…';
      } else {
        // Fall back to character-by-character truncation
        truncated = displayText;
        while (truncated.length > 0 && this.context.measureText(truncated + '…').width > availableArcLength) {
          truncated = truncated.slice(0, -1);
        }
        displayText = truncated ? truncated + '…' : '';
      }
    }
    
    this.context.restore();
    
    // Call the actual drawTextAlongArc with adapted parameters
    this.drawTextAlongArc(displayText, middleRadius, startAngle, endAngle, adjustedFontSize, textColor);
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

    this.rotationAngle += 0.01; // Adjust rotation speed
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
          const trackHeight = maxTracks > 0 ? outerRingContentHeight / maxTracks : outerRingContentHeight;
          const trackGap = this.size / 2000; // Tiny gap between tracks for visual separation
          
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
            const itemStartRadius = ringStartRadius + (trackIndex * trackHeight);
            const itemWidth = trackHeight - trackGap; // Subtract tiny gap between tracks
            
            // Decide text orientation based on activity dimensions
            const angularWidth = Math.abs(this.toRadians(adjustedEndAngle) - this.toRadians(adjustedStartAngle));
            const textOrientation = this.chooseTextOrientation(angularWidth, itemWidth, item.name.length);
            
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
        const trackHeight = maxTracks > 0 ? ringContentHeight / maxTracks : ringContentHeight;
        const trackGap = this.size / 2000; // Tiny gap between tracks for visual separation
        
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
          const itemStartRadius = eventRadius + (trackIndex * trackHeight);
          const itemWidth = trackHeight - trackGap; // Subtract tiny gap between tracks
          
          // Decide text orientation based on activity dimensions
          const angularWidth = Math.abs(this.toRadians(adjustedEndAngle) - this.toRadians(adjustedStartAngle));
          const textOrientation = this.chooseTextOrientation(angularWidth, itemWidth, item.name.length);
          
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
      // Get weeks for current zoom level
      const weekData = this.getWeeksForZoom();
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
    this.context = originalContext;
    const svgData = svgContext.getSerializedSvg();
    
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
    this.context = originalContext;
    const svgData = svgContext.getSerializedSvg();
    const fileName = this.generateFileName("svg");
    this.downloadFile(svgData, fileName, "image/svg+xml");
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
