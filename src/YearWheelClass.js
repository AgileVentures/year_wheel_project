/* eslint-disable no-unused-vars */
// Based on the original/legacy from kirkby's year-wheel project
import C2S from "canvas2svg";
import LayoutCalculator from "./utils/LayoutCalculator.js";
import RenderEngine from "./utils/RenderEngine.js";
import InteractionHandler from "./utils/InteractionHandler.js";
import ExportManager from "./utils/ExportManager.js";
import ConfigValidator from "./utils/ConfigValidator.js";

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
    
    // Validate and normalize organizationData using ConfigValidator
    const rawData = options.organizationData || {
      items: [],
      rings: [],
      activityGroups: [],
      labels: [],
    };
    
    // Migrate and validate data
    const migratedData = ConfigValidator.migrate(rawData);
    this.organizationData = ConfigValidator.validate(migratedData);
    
    // Log validation errors if any (for debugging)
    const errors = ConfigValidator.getErrors(this.organizationData);
    if (errors.length > 0) {
      console.warn('YearWheel organizationData validation warnings:', errors);
    }
    // For backward compatibility: merge old ringsData into organizationData.rings if needed
    if (
      options.ringsData &&
      options.ringsData.length > 0 &&
      !this.organizationData.rings.some((r) => r.type === "inner")
    ) {
      // Convert old ringsData format to new ring structure
      const innerRingsFromOldData = options.ringsData.map((ring, index) => ({
        id: ring.id || `inner-ring-${index + 1}`,
        name: ring.name || `Ring ${index + 1}`,
        type: "inner",
        visible: true,
        data: ring.data,
        orientation: ring.orientation || "vertical",
      }));
      this.organizationData.rings = [
        ...innerRingsFromOldData,
        ...this.organizationData.rings,
      ];
    }
    this.showWeekRing =
      options.showWeekRing !== undefined ? options.showWeekRing : true;
    this.showMonthRing =
      options.showMonthRing !== undefined ? options.showMonthRing : true;
    this.showRingNames =
      options.showRingNames !== undefined ? options.showRingNames : true;
    this.showLabels =
      options.showLabels !== undefined ? options.showLabels : true;
    this.weekRingDisplayMode = options.weekRingDisplayMode || "week-numbers"; // 'week-numbers' or 'dates'
    this.zoomedMonth =
      options.zoomedMonth !== undefined && options.zoomedMonth !== null
        ? options.zoomedMonth
        : null;
    this.zoomedQuarter =
      options.zoomedQuarter !== undefined && options.zoomedQuarter !== null
        ? options.zoomedQuarter
        : null;
    this.zoomLevel = options.zoomLevel !== undefined ? options.zoomLevel : 100; // Zoom percentage (50-200), default 100%
    this.readonly = options.readonly !== undefined ? options.readonly : false; // Disable interactions in readonly mode
    this.activeEditors = options.activeEditors || []; // Real-time collaboration: users editing items
    this.broadcastOperation = options.broadcastOperation || null; // Function to broadcast operations to other users
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
    this.animationFrameId = null;
    this.lastAnimationTime = 0;
    this.isDragging = false;
    this.lastMouseAngle = 0;
    this.dragStartAngle = 0;
    this.clickableItems = []; // Store clickable item regions

    // Selection mode support
    this.selectionMode = options.selectionMode || false;
    this.selectedItems = options.selectedItems || [];

    // Performance optimization: Offscreen canvas for caching static elements
    this.backgroundCache = document.createElement("canvas");
    this.backgroundCacheContext = this.backgroundCache.getContext("2d");
    this.cacheValid = false; // Track if cache needs regeneration
    this.lastCacheKey = ""; // Track what's cached to detect changes

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

    // Bind animateWheel once to avoid creating new functions each frame
    this.boundAnimateWheel = this.animateWheel.bind(this);

    // Initialize utility modules (NEW ARCHITECTURE)
    this.renderEngine = new RenderEngine(this.context, this.size, this.center, {
      readonly: this.readonly
    });
    
    this.interactionHandler = new InteractionHandler(this.canvas, this, {
      readonly: this.readonly,
      selectionMode: this.selectionMode,
      onItemClick: options.onItemClick
    });
    
    this.exportManager = new ExportManager(this);

    // Add event listeners (skip if readonly mode)
    // Note: InteractionHandler now manages event listeners internally
    // We keep the old boundHandlers for backward compatibility but they will be deprecated
    if (!this.readonly) {
      this.canvas.addEventListener("mousedown", this.boundHandlers.startDrag);
      this.canvas.addEventListener(
        "mousemove",
        this.boundHandlers.handleMouseMove
      );
      this.canvas.addEventListener("mouseup", this.boundHandlers.stopDrag);
      this.canvas.addEventListener(
        "mouseleave",
        this.boundHandlers.handleMouseLeave
      );
      this.canvas.addEventListener("click", this.boundHandlers.handleClick);
    }
  }

  /**
   * Calculate maximum radius dynamically based on outer rings
   * Makes wheel larger when no outer rings exist, shrinks when outer rings are added
   * Now uses LayoutCalculator for consistency
   */
  calculateMaxRadius() {
    this.maxRadius = LayoutCalculator.calculateMaxRadius(
      this.size, 
      this.organizationData.rings
    );
  }

  // Generate cache key to detect when background needs redrawing
  getCacheKey() {
    const ringCount = this.organizationData.rings.filter(
      (r) => r.visible
    ).length;
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

  // Update zoomed month/quarter and redraw
  updateZoomState(zoomedMonth, zoomedQuarter) {
    const monthChanged = this.zoomedMonth !== zoomedMonth;
    const quarterChanged = this.zoomedQuarter !== zoomedQuarter;
    
    if (monthChanged || quarterChanged) {
      this.zoomedMonth = zoomedMonth !== undefined && zoomedMonth !== null ? zoomedMonth : null;
      this.zoomedQuarter = zoomedQuarter !== undefined && zoomedQuarter !== null ? zoomedQuarter : null;
      
      // Invalidate cache since zoom state affects rendering
      this.invalidateCache();
      
      // Redraw with new zoom state
      if (!this.dragState || !this.dragState.isDragging) {
        this.create();
      }
    }
  }

  // Update selection mode and selected items
  updateSelection(selectionMode, selectedItems) {
    const changed =
      this.selectionMode !== selectionMode ||
      JSON.stringify(this.selectedItems) !== JSON.stringify(selectedItems);

    if (changed) {
      this.selectionMode = selectionMode;
      this.selectedItems = selectedItems;
      // Redraw to show/hide selection borders
      if (!this.dragState || !this.dragState.isDragging) {
        this.create();
      }
    }
  }

  // Update active editors (real-time collaboration)
  updateActiveEditors(newActiveEditors) {
    const changed = JSON.stringify(this.activeEditors) !== JSON.stringify(newActiveEditors);
    
    if (changed) {
      this.activeEditors = newActiveEditors || [];
      // Redraw to show/hide editor avatars
      if (!this.dragState || !this.dragState.isDragging) {
        this.create();
      }
    }
  }

  // Collect editor avatar data for an item being edited by another user
  // Avatars are drawn later (in rotated context) to ensure proper positioning
  collectEditorAvatar(item, startRadius, itemWidth, adjustedEndAngle) {
    // Check if this item is being edited by someone
    const editor = this.activeEditors.find(e => e.itemId === item.id && e.activity === 'editing');
    if (!editor) {
      return;
    }
    
    // Store avatar data to draw later (in rotated context with other indicators)
    this.avatarsToDraw.push({
      item,
      editor,
      startRadius,
      itemWidth,
      adjustedEndAngle,
    });
  }

  // Actually draw the editor avatar in the rotated context
  drawEditorAvatarInRotatedContext(item, editor, startRadius, itemWidth, adjustedEndAngle) {
    // Avatar size - large and visible
    const avatarSize = 48;
    
    // Position avatar OUTSIDE the item at the end angle (with offset)
    const avatarOffset = 30; // Push avatar outward from item edge
    const avatarRadius = startRadius + itemWidth + avatarOffset;
    const avatarAngle = adjustedEndAngle; // End angle of item (already includes initAngle)
    
    // Convert to cartesian coordinates (in rotated space)
    const angleRad = this.toRadians(avatarAngle);
    const avatarX = this.center.x + Math.cos(angleRad) * avatarRadius;
    const avatarY = this.center.y + Math.sin(angleRad) * avatarRadius;
    
    this.context.save();
    
    // Draw shadow for depth
    this.context.shadowColor = 'rgba(0, 0, 0, 0.4)';
    this.context.shadowBlur = 10;
    this.context.shadowOffsetX = 2;
    this.context.shadowOffsetY = 2;
    
    // Draw outer white border (makes it pop against any background)
    this.context.beginPath();
    this.context.arc(avatarX, avatarY, avatarSize / 2 + 3, 0, Math.PI * 2);
    this.context.fillStyle = '#FFFFFF';
    this.context.fill();
    
    // Remove shadow for inner elements
    this.context.shadowColor = 'transparent';
    this.context.shadowBlur = 0;
    
    // Draw avatar circle with vibrant color
    this.context.beginPath();
    this.context.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    this.context.fillStyle = '#2563EB'; // Darker, more vibrant blue
    this.context.fill();
    
    // Draw user initial
    const initial = (editor.email?.charAt(0) || '?').toUpperCase();
    this.context.fillStyle = '#FFFFFF';
    this.context.font = `bold ${Math.floor(avatarSize * 0.5)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.fillText(initial, avatarX, avatarY);
    
    this.context.restore();
  }

  // Cleanup method to remove event listeners
  cleanup() {
    if (this.canvas && this.boundHandlers) {
      this.canvas.removeEventListener(
        "mousedown",
        this.boundHandlers.startDrag
      );
      this.canvas.removeEventListener(
        "mousemove",
        this.boundHandlers.handleMouseMove
      );
      this.canvas.removeEventListener("mouseup", this.boundHandlers.stopDrag);
      this.canvas.removeEventListener(
        "mouseleave",
        this.boundHandlers.handleMouseLeave
      );
      this.canvas.removeEventListener("click", this.boundHandlers.handleClick);
    }

    // Stop any animations
    this.stopSpinning();
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
    // Now uses LayoutCalculator for consistent ISO week generation
    return LayoutCalculator.generateWeeks(parseInt(this.year));
  }

  /**
   * Get ISO week number for a date
   * Returns { year, week }
   * Now uses LayoutCalculator
   */
  getISOWeek(date) {
    return LayoutCalculator.getISOWeek(date);
  }

  /**
   * Get the Monday (start) of a given ISO week
   * Now uses LayoutCalculator
   */
  getWeekStart(year, week) {
    return LayoutCalculator.getWeekStart(year, week);
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
        months: [
          quarterStartMonth,
          quarterStartMonth + 1,
          quarterStartMonth + 2,
        ],
      };
    } else {
      // Full year view
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      return {
        startDate,
        endDate,
        months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
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

    const visibleActivityGroups = this.organizationData.activityGroups.filter(
      (a) => a.visible
    );
    const visibleLabels = this.organizationData.labels.filter((l) => l.visible);

    // Get all items in the target ring (excluding the dragged item)
    const ringItems = this.organizationData.items.filter((item) => {
      if (item.id === excludeItemId) return false;
      if (item.ringId !== targetRingId) return false;

      const hasVisibleActivityGroup = visibleActivityGroups.some(
        (a) => a.id === item.activityId
      );
      const labelOk =
        !item.labelId || visibleLabels.some((l) => l.id === item.labelId);
      return hasVisibleActivityGroup && labelOk;
    });

    // Check for overlaps
    const collidingItems = ringItems.filter((item) => {
      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);
      return this.dateRangesOverlap(startDate, endDate, itemStart, itemEnd);
    });

    return {
      hasCollision: collidingItems.length > 0,
      collidingItems,
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
    if (items.length === 0)
      return { tracks: [], maxTracks: 0, itemToTrack: new Map() };

    // Sort items by start date
    const sortedItems = [...items].sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );

    // Track assignment: tracks[trackIndex] = array of items in that track
    const tracks = [];
    const itemToTrack = new Map(); // Store which track each item is assigned to

    sortedItems.forEach((item) => {
      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);

      // Find the first available track for this item
      let assignedTrack = -1;
      for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
        const track = tracks[trackIndex];

        // Check if this track has space (no overlaps with existing items)
        const hasOverlap = track.some((existingItem) => {
          const existingStart = new Date(existingItem.startDate);
          const existingEnd = new Date(existingItem.endDate);
          return this.dateRangesOverlap(
            itemStart,
            itemEnd,
            existingStart,
            existingEnd
          );
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
      itemToTrack,
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

    // When zoomed, 360° represents only the visible time period
    if (this.zoomedMonth !== null) {
      // Single month zoom: 360° = 1 month
      const month = this.zoomedMonth;
      const daysInMonth = new Date(this.year, month + 1, 0).getDate();

      // rawAngle (0-360) maps to days 1 to daysInMonth
      const dayFloat = (rawAngle / 360) * daysInMonth;
      const day = Math.max(1, Math.min(daysInMonth, Math.round(dayFloat + 1)));

      return new Date(this.year, month, day);
    } else if (this.zoomedQuarter !== null) {
      // Quarter zoom: 360° = 3 months
      const quarterStartMonth = this.zoomedQuarter * 3; // 0→0, 1→3, 2→6, 3→9

      // rawAngle (0-360) maps to 3 months (120° each)
      const monthFloat = (rawAngle / 360) * 3;
      const monthOffset = Math.floor(monthFloat);
      const month = quarterStartMonth + Math.min(monthOffset, 2); // Clamp to 0-2

      // Fractional part maps to day within that month
      const dayFloat = monthFloat - monthOffset;
      const daysInMonth = new Date(this.year, month + 1, 0).getDate();
      const day = Math.max(
        1,
        Math.min(daysInMonth, Math.round(dayFloat * daysInMonth + 1))
      );

      return new Date(this.year, month, day);
    } else {
      // Full year view: 360° = 12 months (original logic)
      // Each month is 30 degrees (360 / 12)
      const monthFloat = rawAngle / 30;
      const month = Math.floor(monthFloat);
      const dayFloat = (monthFloat - month) * 30; // 0-30 range

      // Calculate actual day considering days in month
      const daysInMonth = new Date(this.year, month + 1, 0).getDate();
      const day = Math.max(
        1,
        Math.min(daysInMonth, Math.round((dayFloat / 30) * daysInMonth + 1))
      );

      // Create date (months are 0-indexed in JavaScript Date)
      return new Date(this.year, month, day);
    }
  }

  // Detect which part of activity is clicked: 'resize-start', 'move', or 'resize-end'
  // Now uses InteractionHandler for consistency
  detectDragZone(x, y, itemRegion) {
    return this.interactionHandler.detectDragZone(x, y, itemRegion);
  }

  // Calculate text color based on background luminance for better contrast
  // Now uses RenderEngine for consistency
  getContrastColor(hexColor) {
    return this.renderEngine.getContrastColor(hexColor);
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

    return `#${newR.toString(16).padStart(2, "0")}${newG
      .toString(16)
      .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
  }

  // Split text into wrappable segments (on spaces AND hyphens)
  // "Verksamhets- & Aktiviteter" → ["Verksamhets-", "&", "Aktiviteter"]
  splitTextForWrapping(text) {
    // Split on spaces first
    const parts = [];
    const spaceSplit = text.split(/\s+/);

    for (let part of spaceSplit) {
      // Check if this part contains a hyphen (but not at the end)
      if (part.includes("-") && !part.endsWith("-")) {
        // Split on hyphen but keep it attached to the first part
        const hyphenIndex = part.indexOf("-");
        parts.push(part.substring(0, hyphenIndex + 1)); // "Verksamhets-"
        const remainder = part.substring(hyphenIndex + 1);
        if (remainder) {
          parts.push(remainder); // Rest after hyphen
        }
      } else {
        parts.push(part);
      }
    }

    return parts.filter((p) => p.length > 0);
  }

  // Detect which ring a point (x, y) is within based on radius
  // Returns { ring, startRadius, endRadius, type } or null
  // Now uses InteractionHandler for consistency
  detectTargetRing(x, y) {
    return this.interactionHandler.detectTargetRing(x, y);
  }

  // Adjust color on hover: darken light colors, lighten dark colors
  // Now uses RenderEngine for consistency
  getHoverColor(hexColor) {
    return this.renderEngine.getHoverColor(hexColor);
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
    const innerStartCoords = this.moveToAngle(
      this.minRadius,
      calculatedStartAngle
    );
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
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

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
      currentAngle += charAngleSpan + letterSpacing / middleRadius;
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
    let arcLengthThreshold = this.size * 0.003; // Was 0.008 - much lower now!
    let radialWidthThreshold = this.size * 0.002; // Was 0.005 - much lower now!

    // Adjust thresholds inversely with zoom
    arcLengthThreshold = arcLengthThreshold / zoomFactor;
    radialWidthThreshold = radialWidthThreshold / zoomFactor;

    if (arcLength < arcLengthThreshold || radialWidth < radialWidthThreshold) {
      // Too small to render readable text - skip it
      return;
    }

    // Get text color with proper contrast
    const textColor = backgroundColor
      ? this.getContrastColor(backgroundColor)
      : "#FFFFFF";

    // INTELLIGENT DISPLAY-AWARE FONT SIZING WITH PROPORTIONAL SCALING
    const effectiveDisplaySize = this.size * zoomFactor;

    // ZOOM-AWARE CONSTRAINTS - Scale with display but cap appropriately
    // At high zoom, don't let fonts grow unbounded - cap based on actual rendered size
    const absoluteMinFont = Math.max(
      12,
      Math.min(effectiveDisplaySize / 200, 16)
    );
    const minDisplayFont = Math.max(
      14,
      Math.min(effectiveDisplaySize / 180, 18)
    );
    const maxDisplayFont = Math.min(
      50,
      Math.max(20, effectiveDisplaySize / 45)
    );
    const reasonableMaxFont = Math.min(
      35,
      Math.max(18, effectiveDisplaySize / 60)
    );

    // TEXT CONTENT ANALYSIS
    const textLength = text.length;
    const hasSpaces = text.includes(" ");
    const wordCount = hasSpaces ? text.split(/\s+/).length : 1;

    // Length penalty (more moderate - won't force too-small fonts)
    let lengthPenalty = 1.0;
    if (textLength > 15) lengthPenalty = 0.9; // Was 0.85
    else if (textLength > 10) lengthPenalty = 0.93; // Was 0.90
    else if (textLength > 6) lengthPenalty = 0.96; // Was 0.95

    // CONTAINER PROPORTIONALITY
    const segmentArea = radialWidth * arcLength;
    const wheelArea = this.size * this.size;
    const areaRatio = segmentArea / wheelArea;

    // Size penalty for large segments (more moderate)
    let sizePenalty = 1.0;
    if (areaRatio > 0.15) sizePenalty = 0.88; // Was 0.85
    else if (areaRatio > 0.1) sizePenalty = 0.92; // Was 0.90
    else if (areaRatio > 0.06) sizePenalty = 0.96; // Was 0.95

    // SPACE ANALYSIS - Use aggressive margins from start
    const maxTextWidth = radialWidth * 0.85; // Match wrapping threshold
    const maxTextHeight = arcLength * 0.85;

    // SMART FONT CALCULATION: Find largest font where text actually fits
    // Don't just use geometry - measure actual text width!
    let testFontSize = reasonableMaxFont; // Start with reasonable max

    // Binary search for optimal font size that fits the text
    let minFont = minDisplayFont;
    let maxFont = reasonableMaxFont;

    this.context.save();

    for (let iteration = 0; iteration < 10; iteration++) {
      testFontSize = (minFont + maxFont) / 2;
      this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
      const measuredWidth = this.context.measureText(text).width;

      if (measuredWidth <= maxTextWidth * 0.95) {
        // Text fits! Try larger
        minFont = testFontSize;
      } else {
        // Too big, go smaller
        maxFont = testFontSize;
      }
    }

    // Use the largest font that fit
    testFontSize = minFont;

    // Apply length penalty only if text is very long
    if (textLength > 15) testFontSize *= 0.95;

    // Enforce absolute limits
    testFontSize = Math.max(testFontSize, absoluteMinFont);
    testFontSize = Math.min(testFontSize, maxDisplayFont);

    // Set final font
    this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
    this.context.fillStyle = textColor;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

    const textWidth = this.context.measureText(text).width;

    // TRUNCATION STRATEGY: Only truncate if absolutely necessary
    let displayText = text;

    if (textWidth > maxTextWidth) {
      // Text still too wide even after font optimization
      // Only now do we truncate
      let truncated = text;
      this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
      let truncatedWidth = this.context.measureText(truncated + "…").width;

      while (truncatedWidth > maxTextWidth * 0.9 && truncated.length > 1) {
        truncated = truncated.substring(0, truncated.length - 1);
        truncatedWidth = this.context.measureText(truncated + "…").width;
      }

      displayText =
        truncated.length < text.length ? truncated + "…" : truncated;
    }

    // MULTI-LINE RENDERING SUPPORT
    // If renderDecision indicates multi-line (lineCount > 1), wrap the text
    let linesToRender = [displayText];

    if (
      renderDecision &&
      renderDecision.allowWrapping &&
      renderDecision.lineCount > 1
    ) {
      // Use the pre-calculated decision to render multi-line text
      // Split on spaces AND hyphens for better wrapping
      const words = this.splitTextForWrapping(text);
      linesToRender = [];
      let currentLine = "";

      this.context.save();
      this.context.font = `500 ${renderDecision.fontSize}px Arial, sans-serif`;

      // Wrap text into lines
      for (let word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        const testWidth = this.context.measureText(testLine).width;

        if (testWidth > maxTextWidth * 0.85 && currentLine) {
          // Use 85% for aggressive containment
          linesToRender.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) linesToRender.push(currentLine);

      // CRITICAL: Check if all lines fit vertically
      const lineHeight = renderDecision.fontSize * 1.2;
      const totalHeight = linesToRender.length * lineHeight;

      if (totalHeight > maxTextHeight * 0.95) {
        // Too many lines! Fall back to single-line with truncation
        this.context.restore();
        linesToRender = [displayText];
        if (textWidth > maxTextWidth) {
          // Truncate to fit
          let truncated = text;
          this.context.save();
          this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
          let truncatedWidth = this.context.measureText(truncated + "…").width;
          while (truncatedWidth > maxTextWidth * 0.9 && truncated.length > 1) {
            truncated = truncated.substring(0, truncated.length - 1);
            truncatedWidth = this.context.measureText(truncated + "…").width;
          }
          this.context.restore();
          linesToRender = [truncated + "…"];
        }
      } else {
        // Lines fit! Validate each line width
        const maxLineWidth = Math.max(
          ...linesToRender.map((line) => this.context.measureText(line).width)
        );
        if (maxLineWidth > maxTextWidth * 0.9) {
          // A line is too wide, truncate longest line
          linesToRender = linesToRender.map((line) => {
            const lineWidth = this.context.measureText(line).width;
            if (lineWidth > maxTextWidth * 0.9) {
              let truncated = line;
              let truncatedWidth = this.context.measureText(
                truncated + "…"
              ).width;
              while (
                truncatedWidth > maxTextWidth * 0.9 &&
                truncated.length > 1
              ) {
                truncated = truncated.substring(0, truncated.length - 1);
                truncatedWidth = this.context.measureText(
                  truncated + "…"
                ).width;
              }
              return truncated + "…";
            }
            return line;
          });
        }
        this.context.restore();

        // Update font size from decision
        testFontSize = renderDecision.fontSize;
        this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
      }
    } else if (!renderDecision && text.includes(" ") && testFontSize >= 14) {
      // Fallback: attempt basic wrapping if no decision provided
      const words = text.split(/\s+/);
      linesToRender = [];
      let currentLine = "";

      for (let word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
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
    const isLeftSide =
      normalizedAngle > Math.PI / 2 && normalizedAngle < Math.PI * 1.5;
    let rotation = centerAngle;
    if (isLeftSide) {
      rotation += Math.PI; // Flip 180° so text reads outward
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
      const allWordsFit =
        lines.join(" ").replace(/\s+/g, " ") === text.replace(/\s+/g, " ");

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
    while (right - left > 0.5) {
      // 0.5px precision
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
    let currentLine = "";

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
    let currentLine = "";

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
        currentLine = "";
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
          const remaining = words.slice(i).join(" ");
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
        lines[lines.length - 1] = this.truncateWithEllipsis(
          lines[lines.length - 1] + " " + currentLine,
          maxWidth
        );
      }
    }

    return lines.length > 0
      ? lines
      : [this.truncateWithEllipsis(text, maxWidth)];
  }

  /**
   * Truncate text to fit width, adding ellipsis
   */
  truncateWithEllipsis(text, maxWidth) {
    const ellipsis = "…";
    const ellipsisWidth = this.context.measureText(ellipsis).width;

    if (this.context.measureText(text).width <= maxWidth) {
      return text;
    }

    // Binary search for optimal length
    let left = 0;
    let right = text.length;
    let bestFit = "";

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
  evaluateRenderingSolution(
    text,
    orientation,
    arcLengthPx,
    radialHeight,
    middleRadius,
    allowWrapping = false
  ) {
    const zoomFactor = this.zoomLevel / 100;

    // Debug flag for specific text patterns
    const debugThisText =
      text && (text.includes("Kampanj") || text.includes("planering"));

    // CRITICAL: Use ORIGINAL pixel dimensions for font calculations, NOT zoom-adjusted!
    // The canvas will scale with zoom, but the font size should be consistent
    // based on the actual segment geometry, not the displayed size
    // This ensures text that fits at 100% zoom doesn't suddenly get vertical at 150% zoom!

    // ZOOM-AWARE font size thresholds - MUST match rendering logic!
    const effectiveDisplaySize = this.size * zoomFactor;
    const absoluteMinFont = Math.max(12, effectiveDisplaySize / 200); // Matches vertical rendering
    const minDisplayFont = Math.max(14, effectiveDisplaySize / 180); // Matches vertical rendering
    const sweetSpotMin = 16; // Start of ideal reading range
    const sweetSpotMax = 28; // End of ideal reading range
    const reasonableMaxFont = Math.min(35, effectiveDisplaySize / 60); // Matches rendering
    const maxDisplayFont = Math.min(50, effectiveDisplaySize / 45); // Matches rendering

    // Text analysis
    const textLength = text.length;
    const hasSpaces = text.includes(" ");
    const wordCount = hasSpaces ? text.split(/\s+/).length : 1;

    let lengthPenalty = 1.0;
    if (textLength > 15) lengthPenalty = 0.9;
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
      if (areaRatio > 0.15)
        sizePenalty = 0.96; // was 0.88 - much more favorable
      else if (areaRatio > 0.1)
        sizePenalty = 0.98; // was 0.92 - much more favorable
      else if (areaRatio > 0.06) sizePenalty = 0.99; // was 0.96 - barely any penalty
    } else if (isShortSingleWord) {
      // Lenient for short single words (like "Höstnyheter")
      if (areaRatio > 0.15) sizePenalty = 0.94; // was 0.88 - less harsh
      else if (areaRatio > 0.1) sizePenalty = 0.96; // was 0.92 - less harsh
      else if (areaRatio > 0.06) sizePenalty = 0.98; // was 0.96 - less harsh
    } else {
      // Keep stricter penalties for long single-line text (encourages wrapping)
      if (areaRatio > 0.15) sizePenalty = 0.88;
      else if (areaRatio > 0.1) sizePenalty = 0.92;
      else if (areaRatio > 0.06) sizePenalty = 0.96;
    }

    let fontSize,
      availableSpace,
      needsTruncation,
      truncationPercent,
      lineCount = 1;

    if (orientation === "vertical") {
      // VERTICAL: Text width limited by radial height, text height by arc length
      const maxTextWidth = radialHeight * 0.8;
      const maxTextHeight = arcLengthPx * 0.85;

      // MULTI-LINE WRAPPING SUPPORT
      if (allowWrapping && text.includes(" ")) {
        // Calculate font size for multi-line text
        // Split on spaces AND hyphens to match rendering
        const words = this.splitTextForWrapping(text);
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

        // Simulate word wrapping - MUST match rendering logic exactly!
        // Use aggressive safety margin (85%) to ensure text stays contained
        const wrappingThreshold = maxTextWidth * 0.85;

        this.context.save();
        this.context.font = `500 ${fontSize}px Arial, sans-serif`;

        let lines = [];
        let currentLine = "";

        // Use words from splitTextForWrapping above
        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine
            ? currentLine + " " + words[i]
            : words[i];
          const testWidth = this.context.measureText(testLine).width;

          // Use same threshold as rendering for consistent line counts
          if (testWidth > wrappingThreshold && currentLine) {
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
        truncationPercent = needsTruncation
          ? ((totalHeight - maxTextHeight) / totalHeight) * 100
          : 0;

        // Check if any line is too wide (overflow)
        this.context.save();
        this.context.font = `500 ${fontSize}px Arial, sans-serif`;
        const maxLineWidth = Math.max(
          ...lines.map((line) => this.context.measureText(line).width)
        );
        this.context.restore();

        if (maxLineWidth > maxTextWidth) {
          // Lines overflow - partial truncation
          truncationPercent = Math.max(
            truncationPercent,
            ((maxLineWidth - maxTextWidth) / maxLineWidth) * 100
          );
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
          const charsFit =
            Math.floor((availableSpace / textWidth) * text.length) - 1;
          truncationPercent = ((charsNeeded - charsFit) / charsNeeded) * 100;
        } else {
          truncationPercent = 0;
        }
      }
    } else {
      // HORIZONTAL: Text follows arc
      const availableArcLength =
        middleRadius * (arcLengthPx / middleRadius) * 0.85;
      const maxRadialHeight = radialHeight * 0.85;

      // MULTI-LINE HORIZONTAL SUPPORT (stacked arcs)
      if (allowWrapping && text.includes(" ")) {
        // Split on spaces AND hyphens to match rendering
        const words = this.splitTextForWrapping(text);
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
          lineHeight * 0.7, // From radial height (conservative)
          sweetSpotMax, // 28px max for readability
          reasonableMaxFont // 35px absolute max
        );
        let bestFontSize = minFontSize;
        let bestLineCount = 1;

        // CRITICAL: Use aggressive safety margin (82%) to ensure text stays contained
        const wrappingThreshold = availableArcLength * 0.82;

        // Binary search for optimal font that achieves targetLines wrapping
        for (let iteration = 0; iteration < 10; iteration++) {
          const testFontSize = (minFontSize + maxFontSize) / 2;

          this.context.save();
          this.context.font = `500 ${testFontSize}px Arial, sans-serif`;

          // Simulate wrapping at this font size - MUST match rendering exactly
          let testLines = [];
          let currentLine = "";

          for (let word of words) {
            const testLine = currentLine ? currentLine + " " + word : word;
            const testWidth = this.context.measureText(testLine).width;

            // Use same threshold as rendering for consistent line counts
            if (testWidth > wrappingThreshold && currentLine) {
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
          const maxLineWidth = Math.max(
            ...testLines.map((line) => this.context.measureText(line).width)
          );
          const fitsHorizontally = maxLineWidth <= availableArcLength * 0.98; // 98% to add small margin

          // Check if this achieves our target AND fits the container
          if (
            testLineCount >= targetLines &&
            fitsVertically &&
            fitsHorizontally
          ) {
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

        // Final wrapping simulation with chosen font - uses same wrappingThreshold from above!
        this.context.save();
        this.context.font = `500 ${fontSize}px Arial, sans-serif`;

        let lines = [];
        let currentLine = "";

        for (let word of words) {
          const testLine = currentLine ? currentLine + " " + word : word;
          const testWidth = this.context.measureText(testLine).width;

          // Use same threshold as binary search and rendering
          if (testWidth > wrappingThreshold && currentLine) {
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
        const maxLineWidth = Math.max(
          ...lines.map((line) => this.context.measureText(line).width)
        );
        this.context.restore();

        // LENIENT VALIDATION: Check if text fits with generous margins
        const fitsVertically = totalRadialHeight <= maxRadialHeight * 1.05; // 5% tolerance
        const fitsHorizontally = maxLineWidth <= availableArcLength * 1.02; // 2% tolerance (was 0.98)

        if (!fitsVertically || !fitsHorizontally) {
          // Solution doesn't fit - mark as failed but be lenient
          needsTruncation = true;
          truncationPercent = !fitsHorizontally
            ? ((maxLineWidth - availableArcLength) / maxLineWidth) * 100
            : ((totalRadialHeight - maxRadialHeight) / totalRadialHeight) * 100;

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
          (availableArcLength / text.length) * 0.9,
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
          const charsFit =
            Math.floor((availableSpace / textWidth) * text.length) - 1;
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
      const charsFit = Math.max(
        1,
        Math.floor(
          (availableSpace /
            (needsTruncation ? this.context.measureText(text).width : 1)) *
            text.length
        ) - 1
      );
      displayedText = text.substring(0, charsFit) + "…";
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
      const ratio =
        (fontSize - minDisplayFont) / (sweetSpotMin - minDisplayFont);
      if (ratio > 0.9) {
        fontScore = 28 + ratio * 7; // Very close to sweet spot: 28-35
      } else if (ratio > 0.75) {
        fontScore = 20 + ratio * 8; // Readable but small: 20-28
      } else if (ratio > 0.5) {
        fontScore = 10 + ratio * 10; // Getting small: 10-20
      } else {
        fontScore = 0 + ratio * 10; // Very small font: 0-10 (almost as bad as truncation!)
      }
    } else if (fontSize > sweetSpotMax && fontSize <= reasonableMaxFont) {
      // Above sweet spot - penalty varies with zoom
      const ratio =
        (fontSize - sweetSpotMax) / (reasonableMaxFont - sweetSpotMax);
      if (zoomFactor >= 1.5) {
        // High zoom: smaller penalty for large fonts (they look better)
        fontScore = 35 - ratio * 3;
      } else {
        // Normal/low zoom: moderate penalty
        fontScore = 35 - ratio * 6;
      }
    } else if (fontSize < minDisplayFont) {
      // Below minimum - EXTREME penalty (basically unreadable)
      fontScore = 0; // Was 5, now 0 - truncation is better than this!
    }

    // 2. SPACE UTILIZATION (0-25 points)
    // Reward efficient use of available space without cramming
    const utilizationRatio = needsTruncation
      ? 1.0
      : orientation === "vertical"
      ? this.context.measureText(text).width / availableSpace
      : this.context.measureText(text).width / availableSpace;

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
        const fontQualityRatio =
          (fontSize - minDisplayFont) / (sweetSpotMin - minDisplayFont);
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
        if (orientation === "horizontal") {
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
            naturalScore += 6; // 4+ lines getting crowded
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
        naturalScore = 3; // Really bad at high zoom
      } else if (zoomFactor < 0.8) {
        naturalScore = 15; // Acceptable at low zoom
      } else {
        naturalScore = 8; // Normal
      }
    } else if (truncationPercent < 40) {
      // Heavy truncation - very poor
      if (zoomFactor >= 1.5) {
        naturalScore = 0; // Unacceptable at high zoom
      } else if (zoomFactor < 0.8) {
        naturalScore = 10; // Tolerable at low zoom
      } else {
        naturalScore = 3;
      }
    } else {
      // Severe truncation - terrible
      if (zoomFactor < 0.8) {
        naturalScore = 5; // Last resort at low zoom
      } else {
        naturalScore = 0; // Never acceptable otherwise
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

    if (orientation === "vertical") {
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
        if (
          fontSize >= sweetSpotMin &&
          fontSize <= sweetSpotMax &&
          !needsTruncation
        ) {
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

    const totalScore = Math.max(
      0,
      Math.min(
        190,
        fontScore + spaceScore + naturalScore + penaltyScore - overflowPenalty
      )
    );

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
        penalty: penaltyScore,
      },
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

    const hasSpaces = text.includes(" ");
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
        orientation: "horizontal",
        truncationLevel: 0,
        allowWrapping: true,
        description: "Full horizontal multi-line",
      });
    }

    // Strategy 2: Full text, vertical multi-line (GOOD alternative)
    if (hasSpaces) {
      strategies.push({
        text: text,
        orientation: "vertical",
        truncationLevel: 0,
        allowWrapping: true,
        description: "Full vertical multi-line",
      });
    }

    // Strategy 3: Full text, horizontal single-line
    strategies.push({
      text: text,
      orientation: "horizontal",
      truncationLevel: 0,
      allowWrapping: false,
      description: "Full horizontal single-line",
    });

    // Strategy 4: Full text, vertical single-line
    strategies.push({
      text: text,
      orientation: "vertical",
      truncationLevel: 0,
      allowWrapping: false,
      description: "Full vertical single-line",
    });

    // If text is long OR multi-word, test truncated versions as fallback
    if (text.length > 8 || wordCount >= 3) {
      // Try 90% length
      const truncated90 =
        text.substring(0, Math.floor(text.length * 0.9)) + "…";
      const has90Spaces = truncated90.includes(" ");

      // Horizontal multi-line first (PREFERRED)
      if (has90Spaces) {
        strategies.push({
          text: truncated90,
          orientation: "horizontal",
          truncationLevel: 10,
          allowWrapping: true,
          description: "90% horizontal multi-line",
        });
      }

      // Vertical multi-line
      if (has90Spaces) {
        strategies.push({
          text: truncated90,
          orientation: "vertical",
          truncationLevel: 10,
          allowWrapping: true,
          description: "90% vertical multi-line",
        });
      }

      // Horizontal single-line
      strategies.push({
        text: truncated90,
        orientation: "horizontal",
        truncationLevel: 10,
        allowWrapping: false,
        description: "90% horizontal single-line",
      });

      // Vertical single-line
      strategies.push({
        text: truncated90,
        orientation: "vertical",
        truncationLevel: 10,
        allowWrapping: false,
        description: "90% vertical single-line",
      });

      // Try 75% length for longer text
      if (text.length > 12 || wordCount >= 4) {
        const truncated75 =
          text.substring(0, Math.floor(text.length * 0.75)) + "…";
        const has75Spaces = truncated75.includes(" ");

        // Horizontal multi-line first (PREFERRED)
        if (has75Spaces) {
          strategies.push({
            text: truncated75,
            orientation: "horizontal",
            truncationLevel: 25,
            allowWrapping: true,
            description: "75% horizontal multi-line",
          });
        }

        // Vertical multi-line
        if (has75Spaces) {
          strategies.push({
            text: truncated75,
            orientation: "vertical",
            truncationLevel: 25,
            allowWrapping: true,
            description: "75% vertical multi-line",
          });
        }

        // Horizontal single-line
        strategies.push({
          text: truncated75,
          orientation: "horizontal",
          truncationLevel: 25,
          allowWrapping: false,
          description: "75% horizontal single-line",
        });

        // Vertical single-line
        strategies.push({
          text: truncated75,
          orientation: "vertical",
          truncationLevel: 25,
          allowWrapping: false,
          description: "75% vertical single-line",
        });
      }

      // Try 60% length only for very long text
      if (text.length > 16) {
        const truncated60 =
          text.substring(0, Math.floor(text.length * 0.6)) + "…";
        const has60Spaces = truncated60.includes(" ");

        // Horizontal multi-line first (PREFERRED)
        if (has60Spaces) {
          strategies.push({
            text: truncated60,
            orientation: "horizontal",
            truncationLevel: 40,
            allowWrapping: true,
            description: "60% horizontal multi-line",
          });
        }

        // Vertical multi-line
        if (has60Spaces) {
          strategies.push({
            text: truncated60,
            orientation: "vertical",
            truncationLevel: 40,
            allowWrapping: true,
            description: "60% vertical multi-line",
          });
        }

        // Horizontal single-line
        strategies.push({
          text: truncated60,
          orientation: "horizontal",
          truncationLevel: 40,
          allowWrapping: false,
          description: "60% horizontal single-line",
        });

        // Vertical single-line
        strategies.push({
          text: truncated60,
          orientation: "vertical",
          truncationLevel: 40,
          allowWrapping: false,
          description: "60% vertical single-line",
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
    const evaluations = strategies.map((strategy) => {
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
        description: strategy.description,
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
      const alternatives = evaluations
        .filter(
          (e) =>
            e !== bestSolution && (e.truncationPercent <= 5 || e.pretruncated)
        )
        .sort((a, b) => b.adjustedScore - a.adjustedScore);

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
      return "vertical";
    }

    if (
      isVeryWide &&
      bestSolution.orientation === "horizontal" &&
      bestSolution.adjustedScore > 50
    ) {
      // Extremely wide + good horizontal solution: clear choice
      // console.log('   OVERRIDE: Forcing horizontal for very wide container');
      return "horizontal";
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
        .filter((e) => e.orientation !== bestSolution.orientation)
        .sort((a, b) => b.adjustedScore - a.adjustedScore)[0];

      // Zoom-aware closeness threshold
      const closenessThreshold = zoomFactor >= 1.5 ? 10 : 8;

      if (
        runnerUp &&
        Math.abs(runnerUp.adjustedScore - bestSolution.adjustedScore) <
          closenessThreshold
      ) {
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
          if (
            !bestSolution.truncated &&
            runnerUp.truncated &&
            runnerUp.truncationPercent > 5
          ) {
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
        if (
          runnerUp.truncationPercent <
          bestSolution.truncationPercent - truncDiffThreshold
        ) {
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
      .filter((e) => e.orientation === "vertical")
      .sort((a, b) => b.adjustedScore - a.adjustedScore)[0];

    const horizontalBest = evaluations
      .filter((e) => e.orientation === "horizontal")
      .sort((a, b) => b.adjustedScore - a.adjustedScore)[0];

    // Compare best of each orientation
    if (!verticalBest) return "horizontal";
    if (!horizontalBest) return "vertical";

    const scoreDiff = horizontalBest.adjustedScore - verticalBest.adjustedScore;

    // Significant difference (>8 points) when both poor - choose clearly better one
    if (scoreDiff > 8) return "horizontal";
    if (scoreDiff < -8) return "vertical";

    // Very close when both poor - use container geometry
    // Prioritize: 1) Larger font, 2) Less truncation, 3) Aspect ratio fit

    // 1. Font size priority
    const fontDiff = horizontalBest.fontSize - verticalBest.fontSize;

    if (fontDiff > 2) {
      // Horizontal gives significantly larger font (>2px difference)
      return "horizontal";
    }
    if (fontDiff < -2) {
      // Vertical gives significantly larger font (should rarely happen with new bonuses)
      return "vertical";
    }

    // 2. Truncation priority
    const truncDiff =
      verticalBest.truncationPercent - horizontalBest.truncationPercent;
    if (truncDiff > 20) return "horizontal"; // Much less truncation
    if (truncDiff < -20) return "vertical"; // Much less truncation

    // 3. Aspect ratio fit - match orientation to container shape
    if (aspectRatio > 2.5) {
      return "horizontal"; // Wide container - always horizontal
    } else if (aspectRatio < 0.5) {
      return "vertical"; // Very tall container - vertical might be only option
    } else {
      // Balanced container - with new bonuses, horizontal should always win
      return "horizontal"; // Default to horizontal per user preference
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
    const textColor = backgroundColor
      ? this.getContrastColor(backgroundColor)
      : "#FFFFFF";

    // INTELLIGENT DISPLAY-AWARE FONT SIZING - match vertical logic
    const zoomFactor = this.zoomLevel / 100;
    const effectiveDisplaySize = this.size * zoomFactor;

    // ZOOM-AWARE CONSTRAINTS - Match vertical rendering, cap growth at high zoom
    const absoluteMinFont = Math.max(
      12,
      Math.min(effectiveDisplaySize / 200, 16)
    );
    const minDisplayFont = Math.max(
      14,
      Math.min(effectiveDisplaySize / 180, 18)
    );
    const maxDisplayFont = Math.min(
      50,
      Math.max(20, effectiveDisplaySize / 45)
    );
    const reasonableMaxFont = Math.min(
      35,
      Math.max(18, effectiveDisplaySize / 60)
    );

    // TEXT CONTENT ANALYSIS
    const textLength = text.length;
    const hasSpaces = text.includes(" ");

    // Calculate available arc length with aggressive margin
    const availableArcLength = middleRadius * angleLength * 0.82; // Match wrapping threshold

    // SMART FONT CALCULATION: Binary search for largest font where text fits
    let testFontSize = reasonableMaxFont;
    let minFont = minDisplayFont;
    let maxFont = reasonableMaxFont;

    this.context.save();

    for (let iteration = 0; iteration < 10; iteration++) {
      testFontSize = (minFont + maxFont) / 2;
      this.context.font = `500 ${testFontSize}px Arial, sans-serif`;
      const measuredWidth = this.context.measureText(text).width;

      if (measuredWidth <= availableArcLength * 0.95) {
        // Text fits! Try larger
        minFont = testFontSize;
      } else {
        // Too big, go smaller
        maxFont = testFontSize;
      }
    }

    // Use the largest font that fit
    testFontSize = minFont;

    // Apply length penalty only if text is very long
    if (textLength > 15) testFontSize *= 0.95;

    // Enforce absolute limits
    testFontSize = Math.max(testFontSize, absoluteMinFont);
    testFontSize = Math.min(testFontSize, maxDisplayFont);

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
        let truncatedWidth = this.context.measureText(truncated + "…").width;

        while (truncatedWidth > availableArcLength && truncated.length > 1) {
          truncated = truncated.substring(0, truncated.length - 1);
          truncatedWidth = this.context.measureText(truncated + "…").width;
        }

        if (truncated.length < text.length) {
          displayText = truncated + "…";
        }

        this.context.restore();
      }
    }

    // MULTI-LINE RENDERING SUPPORT FOR HORIZONTAL TEXT
    // If renderDecision indicates multi-line, render stacked arcs
    if (
      renderDecision &&
      renderDecision.allowWrapping &&
      renderDecision.lineCount > 1
    ) {
      // Use pre-calculated decision for multi-line stacked arcs
      // Split on spaces AND hyphens for better wrapping
      const words = this.splitTextForWrapping(text);
      const lines = [];
      let currentLine = "";

      this.context.save();
      this.context.font = `500 ${renderDecision.fontSize}px Arial, sans-serif`;

      // Wrap text into lines with aggressive safety margin to prevent overflow
      for (let word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        const testWidth = this.context.measureText(testLine).width;

        // Use 82% of available width to ensure text stays contained
        if (testWidth > availableArcLength * 0.82 && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      // VALIDATE MULTI-LINE FIT BEFORE RENDERING
      const lineHeight = renderDecision.fontSize * 1.3;
      const totalHeight = lines.length * lineHeight;
      const maxRadialHeight = width * 0.95; // 95% safety margin

      // Check if multi-line fits radially
      if (totalHeight > maxRadialHeight) {
        // Too many lines - fall back to single-line with truncation
        this.context.restore();

        // Truncate text to fit
        let truncated = text;
        let truncatedWidth = this.context.measureText(truncated + "…").width;

        while (
          truncatedWidth > availableArcLength * 0.85 &&
          truncated.length > 1
        ) {
          truncated = truncated.substring(0, truncated.length - 1);
          truncatedWidth = this.context.measureText(truncated + "…").width;
        }

        const finalText =
          truncated.length < text.length ? truncated + "…" : truncated;
        this.drawTextAlongArc(
          finalText,
          middleRadius,
          startAngle,
          endAngle,
          renderDecision.fontSize,
          textColor
        );
      } else {
        // Validate and truncate individual lines if needed
        const validatedLines = lines.map((line) => {
          const lineWidth = this.context.measureText(line).width;

          if (lineWidth > availableArcLength * 0.82) {
            // Line too wide - truncate it
            let truncated = line;
            let truncatedWidth = this.context.measureText(
              truncated + "…"
            ).width;

            while (
              truncatedWidth > availableArcLength * 0.82 &&
              truncated.length > 1
            ) {
              truncated = truncated.substring(0, truncated.length - 1);
              truncatedWidth = this.context.measureText(truncated + "…").width;
            }

            return truncated.length < line.length ? truncated + "…" : truncated;
          }

          return line;
        });

        this.context.restore();

        // Render validated lines on stacked arcs
        // Lines read OUTWARD (outer = first line, inner = last line)
        let currentRadius = middleRadius + totalHeight / 2 - lineHeight / 2; // Start OUTER

        for (let line of validatedLines) {
          this.drawTextAlongArc(
            line,
            currentRadius,
            startAngle,
            endAngle,
            renderDecision.fontSize,
            textColor
          );
          currentRadius -= lineHeight; // Move INWARD for next line
        }
      }
    } else if (
      !renderDecision &&
      hasSpaces &&
      testFontSize >= 14 &&
      textWidth > availableArcLength * 1.3
    ) {
      // Fallback: attempt basic multi-line if text is significantly too long
      const words = text.split(/\s+/);
      const lines = [];
      let currentLine = "";

      this.context.save();
      this.context.font = `500 ${testFontSize}px Arial, sans-serif`;

      for (let word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
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

      if (
        totalHeight <= width * 0.85 &&
        lines.length >= 2 &&
        lines.length <= 3
      ) {
        // Render stacked arcs - outer to inner (natural reading order)
        let currentRadius = middleRadius + totalHeight / 2 - lineHeight / 2; // Start OUTER

        for (let line of lines) {
          this.drawTextAlongArc(
            line,
            currentRadius,
            startAngle,
            endAngle,
            testFontSize,
            textColor
          );
          currentRadius -= lineHeight; // Move INWARD
        }
      } else {
        // Single line with truncation (original behavior)
        this.drawTextAlongArc(
          displayText,
          middleRadius,
          startAngle,
          endAngle,
          testFontSize,
          textColor
        );
      }
    } else {
      // Single line rendering (original behavior)
      this.drawTextAlongArc(
        displayText,
        middleRadius,
        startAngle,
        endAngle,
        testFontSize,
        textColor
      );
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
      currentAngle += charAngleSpan + letterSpacing / radius;
    }

    this.context.restore();
  }

  // Draw ring name in a separator band with light background and text repeated 4 times
  drawRingNameBand(ringName, startRadius, bandWidth) {
    if (!ringName) return bandWidth;

    // Draw the separator ring with PROMINENT background
    this.context.beginPath();
    this.context.arc(this.center.x, this.center.y, startRadius, 0, Math.PI * 2);
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius + bandWidth,
      0,
      Math.PI * 2,
      true
    );
    this.context.fillStyle = "#FFFFFF"; // White background for maximum visibility
    this.context.fill();
    this.context.closePath();

    // No border - clean look

    // Draw ring name 4 times around the circle (at quarters)
    const textToShow = ringName;
    const fontSize = this.size / 75; // Much smaller as requested
    const textRadius = startRadius + bandWidth / 2;

    this.context.save();
    this.context.font = `400 ${fontSize}px Arial, sans-serif`; // Normal weight (not bold)
    this.context.fillStyle = "#0F172A"; // Very dark for maximum contrast
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

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
        currentAngle += charAngleSpan + letterSpacing / textRadius;
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
    if (!this.isAnimating) return;

    // Time-based rotation to keep visual speed consistent regardless of frame rate
    const now = performance.now();
    
    // First frame - just set the time and request next frame
    if (!this.lastAnimationTime) {
      this.lastAnimationTime = now;
      this.animationFrameId = requestAnimationFrame(this.boundAnimateWheel);
      return;
    }
    
    const delta = now - this.lastAnimationTime;
    
    // Cap delta to prevent huge jumps when tab is inactive or computer sleeps
    // Max 100ms per frame (roughly 10fps minimum)
    const cappedDelta = Math.min(delta, 100);
    
    this.lastAnimationTime = now;

    // Smooth rotation: 0.15 radians per second (~8.6°/s, full rotation in ~42 seconds)
    const rotationPerSecond = 0.15;
    const rotationThisFrame = (rotationPerSecond * cappedDelta) / 1000;
    this.rotationAngle -= rotationThisFrame;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawRotatingElements();
    this.drawStaticElements();

    this.animationFrameId = requestAnimationFrame(this.boundAnimateWheel);
  }

  startSpinning() {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.lastAnimationTime = 0;
    this.animationFrameId = requestAnimationFrame(this.boundAnimateWheel);
  }

  stopSpinning() {
    this.isAnimating = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastAnimationTime = 0;
  }

  startDrag(event) {
    // In selection mode, disable drag entirely (only allow clicks)
    if (this.selectionMode) {
      return;
    }

    // Check if clicking on an activity
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Calculate distance from center to check if we're in the activity ring area
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

    // Don't allow ANY interaction if clicking in the center circle
    if (distanceFromCenter <= this.minRadius) {
      return; // Early exit - no rotation, no activity drag
    }

    // Only check activities if we're outside the center circle (minRadius)
    if (distanceFromCenter > this.minRadius) {
      // Check if click is on any activity
      for (const itemRegion of this.clickableItems) {
        if (this.isPointInItemRegion(x, y, itemRegion)) {
          // Start activity drag
          const dragMode = this.detectDragZone(x, y, itemRegion);
          const freshItem = this.organizationData.items.find(
            (i) => i.id === itemRegion.item.id
          );

          // Calculate mouse angle at drag start in SCREEN coordinates
          // We'll draw the preview in rotated context, so use raw screen angle
          let startMouseAngle = Math.atan2(dy, dx);

          // Normalize to 0-2π
          while (startMouseAngle < 0) startMouseAngle += Math.PI * 2;
          while (startMouseAngle >= Math.PI * 2) startMouseAngle -= Math.PI * 2;

          // Convert stored angles (non-rotated) to screen angles (rotated) for preview
          const screenStartAngle = itemRegion.startAngle + this.rotationAngle;
          const screenEndAngle = itemRegion.endAngle + this.rotationAngle;

          this.dragState = {
            isDragging: true,
            dragMode: dragMode,
            draggedItem: freshItem,
            draggedItemRegion: itemRegion,
            startMouseAngle: startMouseAngle,
            currentMouseAngle: startMouseAngle,
            initialStartAngle: screenStartAngle, // Screen coordinates
            initialEndAngle: screenEndAngle, // Screen coordinates
            previewStartAngle: screenStartAngle, // Screen coordinates
            previewEndAngle: screenEndAngle, // Screen coordinates
          };

          // Notify parent that drag has started (for undo/redo batch mode)
          if (this.onDragStart) {
            this.onDragStart();
          }

          // Set cursor based on drag mode
          if (dragMode === "resize-start" || dragMode === "resize-end") {
            this.canvas.style.cursor = "ew-resize";
          } else {
            this.canvas.style.cursor = "grabbing"; // Use grabbing cursor for better UX
          }

          // Immediate visual feedback - redraw with drag state active
          this.create();

          return; // Don't start wheel rotation
        }
      }
      
      // If not clicking on an activity but outside center, start wheel rotation drag
      // This allows rotating the wheel by dragging the month/week rings or empty spaces
      // Stop auto-rotation if it's running
      if (this.isAnimating) {
        this.stopSpinning();
      }
      
      this.isDragging = true;
      this.lastMouseAngle = this.getMouseAngle(event);
      this.canvas.style.cursor = "grabbing"; // Show grabbing cursor during wheel rotation
    }
    // If clicking inside center circle (minRadius), do nothing - don't rotate
  }

  drag(event) {
    if (!this.isDragging) return;

    const currentMouseAngle = this.getMouseAngle(event);
    // Calculate the difference from last mouse position (not from drag start)
    // This makes rotation follow the cursor smoothly without acceleration
    let angleDifference = currentMouseAngle - this.lastMouseAngle;
    
    // Normalize difference to shortest path to avoid jumps across the 0/2π boundary
    while (angleDifference <= -Math.PI) angleDifference += Math.PI * 2;
    while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;

    // Update rotation by the incremental difference
    this.rotationAngle += angleDifference;
    
    // Update lastMouseAngle for next frame
    this.lastMouseAngle = currentMouseAngle;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawRotatingElements();
    this.drawStaticElements();
  }

  dragActivity(event) {
    if (!this.dragState.isDragging) return;

    // Get current mouse position and convert to angle
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Calculate mouse angle relative to center
    // Since we now draw preview in rotated context, we DON'T subtract rotation here
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const rawMouseAngle = Math.atan2(dy, dx);

    // DON'T subtract rotationAngle - the preview will be drawn in rotated context
    let mouseAngle = rawMouseAngle;

    // Normalize angle to 0-2π range
    while (mouseAngle < 0) mouseAngle += Math.PI * 2;
    while (mouseAngle >= Math.PI * 2) mouseAngle -= Math.PI * 2;

    // Store for reference
    this.dragState.currentMouseAngle = mouseAngle;

    // Minimum activity size (1 week)
    const minWeekAngle = this.toRadians((7 / 365) * 360);

    // Update preview angles based on drag mode
    if (this.dragState.dragMode === "move") {
      // Detect target ring for ring switching
      const targetRingInfo = this.detectTargetRing(x, y);
      this.dragState.targetRingInfo = targetRingInfo;
      this.dragState.targetRing = targetRingInfo ? targetRingInfo.ring : null;

      // Calculate the angle difference from start to current mouse position
      // DON'T normalize to shortest path - we want to follow the actual drag direction
      let angleDelta = mouseAngle - this.dragState.startMouseAngle;

      // Apply the delta directly to both start and end angles
      this.dragState.previewStartAngle =
        this.dragState.initialStartAngle + angleDelta;
      this.dragState.previewEndAngle =
        this.dragState.initialEndAngle + angleDelta;

      // Normalize both angles to 0-2π for consistent rendering
      while (this.dragState.previewStartAngle < 0)
        this.dragState.previewStartAngle += Math.PI * 2;
      while (this.dragState.previewStartAngle >= Math.PI * 2)
        this.dragState.previewStartAngle -= Math.PI * 2;
      while (this.dragState.previewEndAngle < 0)
        this.dragState.previewEndAngle += Math.PI * 2;
      while (this.dragState.previewEndAngle >= Math.PI * 2)
        this.dragState.previewEndAngle -= Math.PI * 2;
    } else if (this.dragState.dragMode === "resize-start") {
      // Resize start - calculate delta and apply to start angle only
      let angleDelta = mouseAngle - this.dragState.startMouseAngle;
      let newStartAngle = this.dragState.initialStartAngle + angleDelta;

      // Normalize
      while (newStartAngle < 0) newStartAngle += Math.PI * 2;
      while (newStartAngle >= Math.PI * 2) newStartAngle -= Math.PI * 2;

      // Keep end fixed
      this.dragState.previewEndAngle = this.dragState.initialEndAngle;

      // Calculate span and enforce minimum
      let span = this.dragState.previewEndAngle - newStartAngle;
      if (span < 0) span += Math.PI * 2;

      if (span >= minWeekAngle) {
        this.dragState.previewStartAngle = newStartAngle;
      }
    } else if (this.dragState.dragMode === "resize-end") {
      // Resize end - calculate delta and apply to end angle only
      let angleDelta = mouseAngle - this.dragState.startMouseAngle;
      let newEndAngle = this.dragState.initialEndAngle + angleDelta;

      // Normalize
      while (newEndAngle < 0) newEndAngle += Math.PI * 2;
      while (newEndAngle >= Math.PI * 2) newEndAngle -= Math.PI * 2;

      // Keep start fixed
      this.dragState.previewStartAngle = this.dragState.initialStartAngle;

      // Calculate span and enforce minimum
      let span = newEndAngle - this.dragState.previewStartAngle;
      if (span < 0) span += Math.PI * 2;

      if (span >= minWeekAngle) {
        this.dragState.previewEndAngle = newEndAngle;
      }
    }

    // Redraw with new preview position
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
    this.canvas.style.cursor = "default"; // Reset cursor to default
  }

  stopActivityDrag() {
    if (!this.dragState.isDragging) return;

    // Convert screen angles back to logical angles by subtracting rotation
    let logicalStartAngle =
      this.dragState.previewStartAngle - this.rotationAngle;
    let logicalEndAngle = this.dragState.previewEndAngle - this.rotationAngle;

    // Normalize logical angles
    while (logicalStartAngle < 0) logicalStartAngle += Math.PI * 2;
    while (logicalStartAngle >= Math.PI * 2) logicalStartAngle -= Math.PI * 2;
    while (logicalEndAngle < 0) logicalEndAngle += Math.PI * 2;
    while (logicalEndAngle >= Math.PI * 2) logicalEndAngle -= Math.PI * 2;

    // Convert logical angles to dates
    let newStartDate = this.angleToDate(this.toDegrees(logicalStartAngle));
    let newEndDate = this.angleToDate(this.toDegrees(logicalEndAngle));

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
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Create updated item with new dates and potentially new ring
    const updatedItem = {
      ...this.dragState.draggedItem,
      startDate: formatDate(newStartDate),
      endDate: formatDate(newEndDate),
    };

    // If target ring changed (only in move mode), update ringId
    if (
      this.dragState.targetRing &&
      this.dragState.targetRing.id !== this.dragState.draggedItem.ringId
    ) {
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

    this.canvas.style.cursor = "default";

    // Broadcast the drag operation to other users (real-time collaboration)
    if (this.broadcastOperation) {
      this.broadcastOperation('drag', updatedItem.id, {
        startDate: updatedItem.startDate,
        endDate: updatedItem.endDate,
        ringId: updatedItem.ringId,
      });
    }

    // Call update callback AFTER resetting drag state
    if (this.options.onUpdateAktivitet) {
      this.options.onUpdateAktivitet(updatedItem);
    }
  }

  getMouseAngle(event) {
    const rect = this.canvas.getBoundingClientRect();
    // Convert screen coordinates to canvas coordinates accounting for scaling
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
    
    // Calculate angle from center
    const dx = canvasX - this.center.x;
    const dy = canvasY - this.center.y;
    return Math.atan2(dy, dx);
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
      ? this.organizationData.items.find(
          (i) => i.id === hoveredItemRegion.item.id
        ) || hoveredItemRegion.item
      : null;
    const hoveredItemId = this.hoveredItem ? this.hoveredItem.id : null;
    const newHoveredItemId = newHoveredItem ? newHoveredItem.id : null;

    // Set cursor based on hover zone
    let newCursor = "default";
    if (newHoveredItem) {
      if (hoverZone === "resize-start" || hoverZone === "resize-end") {
        newCursor = "ew-resize"; // East-west resize cursor for edges
      } else {
        newCursor = "move"; // Move cursor for middle
      }
    }

    if (
      hoveredItemId !== newHoveredItemId ||
      this.canvas.style.cursor !== newCursor
    ) {
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
      this.canvas.style.cursor = "default";
      this.create(); // Redraw without preview
    }

    this.stopDrag();
    if (this.hoveredItem) {
      this.hoveredItem = null;
      this.canvas.style.cursor = "default";
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
          const freshItem = this.organizationData.items.find(
            (i) => i.id === itemRegion.item.id
          );
          // Pass client coordinates for tooltip positioning
          this.options.onItemClick(freshItem || itemRegion.item, {
            x: event.clientX,
            y: event.clientY,
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

    // Explicitly clear canvas to prevent ghosting artifacts
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply rotation and draw rotating elements (months, events)
    this.drawRotatingElements();
    // Draw static elements (title and year)
    this.drawStaticElements();
    // Drag preview is now drawn inside drawRotatingElements()
  }

  drawDragPreview() {
    // This function is kept for compatibility but does nothing
    // Preview is now drawn inside drawRotatingElements() via drawDragPreviewInRotatedContext()
  }

  // Draw drag preview in the already-rotated context
  drawDragPreviewInRotatedContext() {
    if (!this.dragState.isDragging || !this.dragState.draggedItemRegion) return;

    const region = this.dragState.draggedItemRegion;
    const item = this.dragState.draggedItem;

    // Get activity group color
    const activityGroup = this.organizationData.activityGroups.find(
      (a) => a.id === item.activityId
    );
    const itemColor = activityGroup ? activityGroup.color : "#B8D4E8";

    // Get preview angles
    let startAngle = this.dragState.previewStartAngle;
    let endAngle = this.dragState.previewEndAngle;

    // Normalize angles to 0-2π
    while (startAngle < 0) startAngle += Math.PI * 2;
    while (startAngle >= Math.PI * 2) startAngle -= Math.PI * 2;
    while (endAngle < 0) endAngle += Math.PI * 2;
    while (endAngle >= Math.PI * 2) endAngle -= Math.PI * 2;

    // Calculate span - handle wraparound
    let angleSpan = endAngle - startAngle;
    if (angleSpan < 0) {
      angleSpan += Math.PI * 2;
    }

    // Validate angle span
    if (angleSpan > Math.PI * 1.95 || angleSpan < 0.01) {
      return;
    }

    // Ensure endAngle is properly set for drawing
    if (endAngle < startAngle) {
      endAngle = startAngle + angleSpan;
    }

    // Use the item's actual dimensions
    let startRadius = region.startRadius;
    let endRadius = region.endRadius;
    const itemWidth = endRadius - startRadius;

    // If switching to a different ring, use the STORED rendered position
    if (
      this.dragState.targetRing &&
      this.dragState.targetRing.id !== item.ringId
    ) {
      const targetRingPosition = this.renderedRingPositions.get(
        this.dragState.targetRing.id
      );
      if (targetRingPosition) {
        // Use the target ring's position
        startRadius = targetRingPosition.startRadius;
        endRadius = startRadius + itemWidth;
      }
    }

    // Draw preview (we're already in the rotated context - no transform needed!)
    this.context.save();
    this.context.globalAlpha = 0.6;

    this.context.beginPath();
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius,
      startAngle,
      endAngle,
      false
    );
    this.context.arc(
      this.center.x,
      this.center.y,
      endRadius,
      endAngle,
      startAngle,
      true
    );
    this.context.closePath();
    this.context.fillStyle = itemColor;
    this.context.fill();

    // Dashed border
    this.context.globalAlpha = 0.9;
    this.context.strokeStyle = "#3B82F6";
    this.context.lineWidth = 2;
    this.context.setLineDash([5, 5]);
    this.context.stroke();
    this.context.setLineDash([]);

    this.context.restore();
  }

  // Function to draw static elements with proper proportions
  drawStaticElements() {
    // CRITICAL: Reset transform to identity matrix to ensure no rotation is applied
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    
    this.context.save();

    // Draw center circle
    this.context.beginPath();
    this.context.arc(
      this.center.x,
      this.center.y,
      this.minRadius,
      0,
      Math.PI * 2
    );
    this.context.fillStyle = "#FFFFFF";
    this.context.fill();

    // Add subtle border
    this.context.strokeStyle = "rgba(0, 0, 0, 0.06)";
    this.context.lineWidth = 1.5;
    this.context.stroke();
    this.context.closePath();

    if (this.hoveredItem) {
      // Show hovered activity info - all text must fit inside circle
      const ring = this.organizationData.rings.find(
        (r) => r.id === this.hoveredItem.ringId
      );

      // Use smaller fonts and tighter spacing to fit inside circle
      const lineHeight = this.size / 55; // Reduced line height
      const maxWidth = this.minRadius * 1.4; // Keep text well within circle (70% of diameter with padding)

      // Activity name (bold) - smaller font
      this.context.fillStyle = "#1E293B";
      this.context.textAlign = "center";
      this.context.font = `700 ${this.size / 65}px Arial, sans-serif`;
      this.context.textBaseline = "middle";

      // Text wrapping for activity name - split on spaces and hyphens
      const parts = this.hoveredItem.name.split(/(-|\s+)/); // Split on hyphens and spaces, keep delimiters
      const lines = [];
      let currentLine = "";

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
        lines[2] = lines[2].substring(0, 15) + "...";
        lines.length = 3;
      }

      // Calculate total height needed
      const totalHeight = lines.length * lineHeight + lineHeight * 2; // Space for dates and ring
      const startY = this.center.y - totalHeight / 2;

      // Draw wrapped activity name
      for (let i = 0; i < lines.length; i++) {
        this.context.fillText(lines[i], this.center.x, startY + i * lineHeight);
      }

      // Date range (smaller, less prominent)
      this.context.fillStyle = "#F4A896";
      this.context.font = `500 ${this.size / 85}px Arial, sans-serif`;
      const startDate = new Date(this.hoveredItem.startDate).toLocaleDateString(
        "sv-SE"
      );
      const endDate = new Date(this.hoveredItem.endDate).toLocaleDateString(
        "sv-SE"
      );
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
      // Draw year or filtered period text in center (bold, large)
      this.context.fillStyle = "#1E293B";
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";

      let centerText = this.year;
      let fontSize = this.size / 30;

      // Show filtered period when zoomed
      if (this.zoomedMonth !== null) {
        // Single month view: "April 2026"
        const monthName = this.monthNames[this.zoomedMonth];
        centerText = `${monthName} ${this.year}`;
        fontSize = this.size / 40; // Slightly smaller for longer text
      } else if (this.zoomedQuarter !== null) {
        // Quarter view: "Q3 2026"
        const quarterNum = this.zoomedQuarter + 1;
        centerText = `Q${quarterNum} ${this.year}`;
        fontSize = this.size / 35; // Slightly smaller
      }

      this.context.font = `700 ${fontSize}px Arial, sans-serif`;
      this.context.fillText(
        centerText,
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

    const label = this.organizationData.labels.find(
      (l) => l.id === item.labelId
    );
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
    const badgeAngleDegrees = endAngle - (angleOffset * 0.5 * 180) / Math.PI; // For rotation (in degrees)

    // Draw rounded rectangle badge
    const centerCoord = this.moveToAngle(badgeRadius, badgeAngleRadians);

    // Badge background with border
    this.context.translate(centerCoord.x, centerCoord.y);
    this.context.rotate(badgeAngleRadians + Math.PI / 2);

    // White border for contrast
    this.context.fillStyle = "#FFFFFF";
    this.context.strokeStyle = "#FFFFFF";
    this.context.lineWidth = 2;
    this.roundRect(
      -badgeWidth / 2 - 1,
      -badgeHeight / 2 - 1,
      badgeWidth + 2,
      badgeHeight + 2,
      fontSize * 0.3
    );
    this.context.fill();

    // Colored background
    this.context.fillStyle = label.color || "#94A3B8";
    this.roundRect(
      -badgeWidth / 2,
      -badgeHeight / 2,
      badgeWidth,
      badgeHeight,
      fontSize * 0.3
    );
    this.context.fill();

    // Label text
    this.context.fillStyle = this.getContrastColor(label.color || "#94A3B8");
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText(label.name, 0, 0);

    this.context.restore();
  }

  /**
   * Draw linked wheel indicator (chain link icon) on items with linkedWheelId
   */
  drawLinkedWheelIndicator(item, startRadius, width, startAngle, endAngle) {
    if (!item.linkedWheelId) return; // No linked wheel

    this.context.save();

    // Calculate icon size based on available space
    const iconSize = Math.max(this.size / 140, 10); // Minimum 10px, scales with wheel size
    const padding = iconSize * 0.3;

    // Position icon at START of activity (left edge)
    // Place near inner edge to avoid conflicts with ring names
    const iconRadius = startRadius + width * 0.25; // 25% from inner edge
    
    // Calculate angle for icon placement (slight offset from start for visibility)
    const arcLength = iconSize + padding * 2;
    const angleOffset = arcLength / iconRadius; // Arc length to radians
    const iconAngleRadians = this.toRadians(startAngle) + angleOffset * 0.5;
    
    // Get position coordinates
    const centerCoord = this.moveToAngle(iconRadius, iconAngleRadians);
    
    // Draw circular background
    this.context.translate(centerCoord.x, centerCoord.y);
    this.context.rotate(iconAngleRadians + Math.PI / 2);
    
    // White circle background for contrast
    this.context.fillStyle = '#FFFFFF';
    this.context.beginPath();
    this.context.arc(0, 0, iconSize * 0.7, 0, Math.PI * 2);
    this.context.fill();
    
    // Blue border
    this.context.strokeStyle = '#3B82F6'; // Blue-500
    this.context.lineWidth = 1.5;
    this.context.stroke();
    
    // Draw chain link icon (simple 🔗 representation)
    // Two small circles connected by lines
    this.context.strokeStyle = '#3B82F6'; // Blue-500
    this.context.lineWidth = 1.5;
    this.context.lineCap = 'round';
    
    const linkSize = iconSize * 0.4;
    
    // Left circle
    this.context.beginPath();
    this.context.arc(-linkSize * 0.4, -linkSize * 0.2, linkSize * 0.25, 0, Math.PI * 2);
    this.context.stroke();
    
    // Right circle
    this.context.beginPath();
    this.context.arc(linkSize * 0.4, linkSize * 0.2, linkSize * 0.25, 0, Math.PI * 2);
    this.context.stroke();
    
    // Connecting lines
    this.context.beginPath();
    this.context.moveTo(-linkSize * 0.25, -linkSize * 0.35);
    this.context.lineTo(linkSize * 0.25, linkSize * 0.05);
    this.context.stroke();
    
    this.context.beginPath();
    this.context.moveTo(-linkSize * 0.25, -linkSize * 0.05);
    this.context.lineTo(linkSize * 0.25, linkSize * 0.35);
    this.context.stroke();

    this.context.restore();
  }

  /**
   * Draw selection border around a selected item
   */
  drawSelectionBorder(startRadius, width, startAngle, endAngle) {
    this.context.save();

    // Convert angles to radians
    const startAngleRad = this.toRadians(startAngle);
    const endAngleRad = this.toRadians(endAngle);

    // Draw thick border with green color
    this.context.strokeStyle = "#10B981"; // Green-500
    this.context.lineWidth = this.size / 400; // Proportional to canvas size
    this.context.setLineDash([this.size / 300, this.size / 400]); // Dashed line

    // Draw outer arc
    this.context.beginPath();
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius + width,
      startAngleRad,
      endAngleRad,
      false
    );
    this.context.stroke();

    // Draw inner arc
    this.context.beginPath();
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius,
      startAngleRad,
      endAngleRad,
      false
    );
    this.context.stroke();

    // Draw radial lines
    const startCoord = this.moveToAngle(startRadius, startAngleRad);
    const startCoordOuter = this.moveToAngle(
      startRadius + width,
      startAngleRad
    );
    this.context.beginPath();
    this.context.moveTo(startCoord.x, startCoord.y);
    this.context.lineTo(startCoordOuter.x, startCoordOuter.y);
    this.context.stroke();

    const endCoord = this.moveToAngle(startRadius, endAngleRad);
    const endCoordOuter = this.moveToAngle(startRadius + width, endAngleRad);
    this.context.beginPath();
    this.context.moveTo(endCoord.x, endCoord.y);
    this.context.lineTo(endCoordOuter.x, endCoordOuter.y);
    this.context.stroke();

    this.context.restore();
  }

  drawResizeHandles(startRadius, width, startAngle, endAngle, itemColor) {
    this.context.save();

    // Convert angles to radians
    const startAngleRad = this.toRadians(startAngle);
    const endAngleRad = this.toRadians(endAngle);

    // Calculate handle size based on zoom level and canvas size
    let handleRadius = this.size / 100; // Base size: ~20-30px

    // Make handles larger in zoom mode for easier interaction
    if (this.zoomedMonth !== null) {
      handleRadius = this.size / 80; // Larger in month zoom
    } else if (this.zoomedQuarter !== null) {
      handleRadius = this.size / 90; // Slightly larger in quarter zoom
    }

    // Calculate middle radius for handle placement
    const middleRadius = startRadius + width / 2;

    // Draw start handle (left edge)
    const startCoord = this.moveToAngle(middleRadius, startAngleRad);
    this.context.beginPath();
    this.context.arc(startCoord.x, startCoord.y, handleRadius, 0, Math.PI * 2);
    this.context.fillStyle = "#FFFFFF"; // White fill
    this.context.fill();
    this.context.strokeStyle = itemColor; // Border matches item color
    this.context.lineWidth = this.size / 500;
    this.context.stroke();

    // Add inner dot for better visibility
    this.context.beginPath();
    this.context.arc(
      startCoord.x,
      startCoord.y,
      handleRadius / 3,
      0,
      Math.PI * 2
    );
    this.context.fillStyle = itemColor;
    this.context.fill();

    // Draw end handle (right edge)
    const endCoord = this.moveToAngle(middleRadius, endAngleRad);
    this.context.beginPath();
    this.context.arc(endCoord.x, endCoord.y, handleRadius, 0, Math.PI * 2);
    this.context.fillStyle = "#FFFFFF"; // White fill
    this.context.fill();
    this.context.strokeStyle = itemColor; // Border matches item color
    this.context.lineWidth = this.size / 500;
    this.context.stroke();

    // Add inner dot for better visibility
    this.context.beginPath();
    this.context.arc(endCoord.x, endCoord.y, handleRadius / 3, 0, Math.PI * 2);
    this.context.fillStyle = itemColor;
    this.context.fill();

    this.context.restore();
  }

  // Helper to draw rounded rectangle (if not available)
  roundRect(x, y, width, height, radius) {
    if (typeof this.context.roundRect === "function") {
      this.context.roundRect(x, y, width, height, radius);
    } else {
      // Fallback for older browsers
      this.context.beginPath();
      this.context.moveTo(x + radius, y);
      this.context.lineTo(x + width - radius, y);
      this.context.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.context.lineTo(x + width, y + height - radius);
      this.context.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
      );
      this.context.lineTo(x + radius, y + height);
      this.context.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.context.lineTo(x, y + radius);
      this.context.quadraticCurveTo(x, y, x + radius, y);
      this.context.closePath();
    }
  }

  /**
   * Cluster items by ISO week for year view
   * Groups all items within the same week into a single visual block
   */
  clusterItemsByWeek(items, draggedItemId = null) {
    // If only one item or less, or if we're dragging, don't cluster
    if (items.length <= 1 || draggedItemId) {
      return items;
    }

    const weekGroups = new Map(); // Key: "YYYY-WW-ringId", Value: { items[], weekStart, weekEnd, ringId, activityId }

    items.forEach((item) => {
      const startDate = new Date(item.startDate);
      const { year, week } = this.getISOWeek(startDate);
      // Include ringId in key to cluster per ring
      const key = `${year}-${String(week).padStart(2, "0")}-${item.ringId}`;

      if (!weekGroups.has(key)) {
        const weekStart = this.getWeekStart(year, week);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

        weekGroups.set(key, {
          id: `week-${key}`,
          ringId: item.ringId,
          activityId: item.activityId, // Use first item's activity for coloring
          labelId: item.labelId || null,
          name: item.name, // Use first item's name
          startDate: weekStart.toISOString().split("T")[0],
          endDate: weekEnd.toISOString().split("T")[0],
          items: [],
          isCluster: true,
        });
      }

      weekGroups.get(key).items.push(item);
    });

    // Convert to array of cluster objects with count in name
    // Use language from document or default to Swedish
    const lang = document.documentElement.lang || "sv";
    const moreText = lang === "en" ? "more" : "mer";

    return Array.from(weekGroups.values()).map((cluster) => {
      // If only one item in cluster, return the original item instead
      if (cluster.items.length === 1) {
        return cluster.items[0];
      }

      const additionalCount = cluster.items.length - 1;
      const displayName =
        additionalCount > 0
          ? `${cluster.name} (${additionalCount} ${moreText})`
          : cluster.name;

      return {
        ...cluster,
        name: displayName,
      };
    });
  }

  // Function to draw rotating elements
  drawRotatingElements() {
    // Clear clickable items, labels, and linked wheels to draw before redrawing
    this.clickableItems = [];
    this.labelsToDraw = [];
    this.linkedWheelsToDraw = [];
    this.avatarsToDraw = []; // Editor avatars for real-time collaboration
    // Store actual rendered ring positions for accurate drag target detection
    this.renderedRingPositions = new Map(); // ringId -> {startRadius, endRadius}

    this.context.save();
    this.context.translate(this.center.x, this.center.y);
    this.context.rotate(this.rotationAngle);
    this.context.translate(-this.center.x, -this.center.y);

    // Calculate available space based on what rings are visible
    let currentMaxRadius = this.maxRadius;

    // Helper function to convert a date to angular position
    // Get date range for current zoom level
    const {
      startDate: zoomStartDate,
      endDate: zoomEndDate,
      months: zoomMonths,
    } = this.getDateRangeForZoom();

    // This aligns with the month ring where each month is 30 degrees (360/12)
    // When zoomed, the entire zoomed range spans 360 degrees
    const dateToAngle = (date) => {
      if (this.zoomedMonth !== null) {
        // Single month zoom: Map this month to 360 degrees
        const dayOfMonth = date.getDate(); // 1-31
        const daysInMonth = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0
        ).getDate();
        // Day 1 = 0°, last day = 360°
        return ((dayOfMonth - 1) / daysInMonth) * 360;
      } else if (this.zoomedQuarter !== null) {
        // Quarter zoom: Map 3 months to 360 degrees (each month gets 120°)
        const month = date.getMonth();
        const quarterStartMonth = this.zoomedQuarter * 3;
        const monthInQuarter = month - quarterStartMonth; // 0, 1, or 2
        const dayOfMonth = date.getDate();
        const daysInMonth = new Date(
          date.getFullYear(),
          month + 1,
          0
        ).getDate();

        // Each of 3 months gets 120 degrees
        const monthAngle = monthInQuarter * 120;
        const dayAngle = ((dayOfMonth - 1) / daysInMonth) * 120;
        return monthAngle + dayAngle;
      } else {
        // Full year view: Each month gets 30 degrees (360/12)
        const month = date.getMonth(); // 0-11
        const dayOfMonth = date.getDate(); // 1-31
        const daysInMonth = new Date(
          date.getFullYear(),
          month + 1,
          0
        ).getDate();

        const monthAngle = month * 30;
        const dayAngle = ((dayOfMonth - 1) / daysInMonth) * 30;

        return monthAngle + dayAngle;
      }
    };

    // Use zoomed date range or full year
    const minDate = zoomStartDate;
    const maxDate = zoomEndDate;

    // Define visibility filters at higher scope for use in both outer and inner ring drawing
    const visibleRings = this.organizationData.rings.filter(
      (r) => r.visible && r.type === "outer"
    );
    const visibleInnerRings = this.organizationData.rings.filter(
      (r) => r.visible && r.type === "inner"
    );
    const visibleActivityGroups = this.organizationData.activityGroups.filter(
      (a) => a.visible
    );
    const visibleLabels = this.organizationData.labels.filter((l) => l.visible);

    // PERFORMANCE: Create lookup maps to avoid repeated array.find() calls
    const activityGroupMap = new Map(
      visibleActivityGroups.map((a) => [a.id, a])
    );
    const labelMap = new Map(visibleLabels.map((l) => [l.id, l]));

    // Draw organization data items (from sidebar) if available
    if (
      this.organizationData &&
      this.organizationData.items &&
      this.organizationData.items.length > 0
    ) {
      if (visibleRings.length > 0) {
        const ringNameBandWidth = this.size / 70; // CONSISTENT ring name band width
        const standardGap = 0; // NO GAP - for testing

        // Each outer ring = content area + name band (same as inner rings)
        const outerRingTotalHeight = this.size / 23; // Total height per outer ring
        const outerRingContentHeight = this.showRingNames
          ? outerRingTotalHeight - ringNameBandWidth
          : outerRingTotalHeight;

        let currentRadius = currentMaxRadius;

        visibleRings.forEach((ring, ringIndex) => {
          // Each ring = content area + name band as one unit
          // Start by moving down for the entire ring (content + name band)
          currentRadius -= outerRingTotalHeight; // Reserve space for whole ring
          const ringStartRadius = currentRadius;

          // Store the ACTUAL rendered position for this ring
          this.renderedRingPositions.set(ring.id, {
            startRadius: ringStartRadius,
            endRadius: ringStartRadius + outerRingContentHeight,
            type: "outer",
          });

          // Filter items for this ring that also have visible activity group (label is optional)
          let ringItems = this.organizationData.items.filter((item) => {
            const hasVisibleActivityGroup = visibleActivityGroups.some(
              (a) => a.id === item.activityId
            );
            // Label is optional - only filter by label if item has one
            const labelOk =
              !item.labelId || visibleLabels.some((l) => l.id === item.labelId);
            return (
              item.ringId === ring.id && hasVisibleActivityGroup && labelOk
            );
          });

          // Cluster by week if in full year view (not zoomed) and not dragging
          if (this.zoomedMonth === null && this.zoomedQuarter === null) {
            const draggedItemId = this.dragState?.draggedItem?.id || null;
            ringItems = this.clusterItemsByWeek(ringItems, draggedItemId);
          }

          // Assign items to tracks to handle overlaps
          const { maxTracks, itemToTrack } =
            this.assignActivitiesToTracks(ringItems);
          const trackGap = this.size / 2000; // Tiny gap between tracks for visual separation

          // Calculate which items actually have overlaps (are in tracks > 0)
          const itemsWithOverlaps = new Set();
          itemToTrack.forEach((track, itemId) => {
            if (track > 0) {
              // This item is in a higher track, so it overlaps with something
              itemsWithOverlaps.add(itemId);
              // Also mark items in track 0 that this overlaps with
              const overlappingItem = ringItems.find((i) => i.id === itemId);
              if (overlappingItem) {
                ringItems.forEach((otherItem) => {
                  if (
                    otherItem.id !== itemId &&
                    itemToTrack.get(otherItem.id) === 0
                  ) {
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

          // Calculate overlap groups and their maximum overlap counts
          // For each item, find the maximum number of simultaneous overlaps in its time range
          const itemOverlapInfo = new Map();

          ringItems.forEach((item) => {
            const itemStart = new Date(item.startDate);
            const itemEnd = new Date(item.endDate);

            // Find all items that overlap with this one
            const overlappingItems = ringItems.filter((otherItem) => {
              if (otherItem.id === item.id) return true; // Include self
              const otherStart = new Date(otherItem.startDate);
              const otherEnd = new Date(otherItem.endDate);
              return this.dateRangesOverlap(
                itemStart,
                itemEnd,
                otherStart,
                otherEnd
              );
            });

            // Find the maximum overlap count for this group
            // Use the highest track index + 1 as the definitive overlap count
            const tracksUsed = overlappingItems.map(
              (i) => itemToTrack.get(i.id) || 0
            );
            const highestTrack = Math.max(...tracksUsed);
            const maxOverlapInGroup = highestTrack + 1; // Number of tracks = highest index + 1

            itemOverlapInfo.set(item.id, {
              overlapCount: maxOverlapInGroup,
              overlappingItems: overlappingItems,
            });
          });

          // Always draw background for ALL outer rings using palette colors
          this.context.beginPath();
          this.context.arc(
            this.center.x,
            this.center.y,
            ringStartRadius,
            0,
            Math.PI * 2
          );
          this.context.arc(
            this.center.x,
            this.center.y,
            ringStartRadius + outerRingContentHeight,
            0,
            Math.PI * 2,
            true
          );
          // Use palette color (cycles through palette based on ring index)
          const templateColor =
            this.sectionColors[ringIndex % this.sectionColors.length];
          this.context.fillStyle = this.getLightBackgroundColor(templateColor);
          this.context.globalAlpha = ringItems.length === 0 ? 0.3 : 0.15; // More subtle for rings with items
          this.context.fill();
          this.context.globalAlpha = 1.0; // Reset alpha
          this.context.closePath();

          ringItems.forEach((item) => {
            // Skip the item being dragged - it will be drawn as a preview instead
            if (
              this.dragState.isDragging &&
              this.dragState.draggedItem &&
              item.id === this.dragState.draggedItem.id
            ) {
              return;
            }

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
            if (endAngle < visibleRangeStart || startAngle > visibleRangeEnd)
              return;

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
            const isHovered =
              this.hoveredItem && this.hoveredItem.id === item.id;
            if (isHovered) {
              itemColor = this.getHoverColor(itemColor);
            }

            // Get track assignment for this item
            const trackIndex = itemToTrack.get(item.id) || 0;

            // Get pre-calculated overlap info for this item
            const overlapInfo = itemOverlapInfo.get(item.id);
            const localOverlapCount = overlapInfo
              ? overlapInfo.overlapCount
              : 1;

            // Determine height based on LOCAL overlaps in this specific region
            const hasOverlap = localOverlapCount > 1;
            const localTrackHeight = hasOverlap
              ? outerRingContentHeight / localOverlapCount
              : outerRingContentHeight;
            const itemHeight = localTrackHeight;
            const itemStartRadius = hasOverlap
              ? ringStartRadius + trackIndex * localTrackHeight
              : ringStartRadius;
            const itemWidth = itemHeight - trackGap; // Subtract tiny gap between tracks

            // Decide text orientation based on activity dimensions
            const angularWidth = Math.abs(
              this.toRadians(adjustedEndAngle) -
                this.toRadians(adjustedStartAngle)
            );
            const middleRadius = itemStartRadius + itemWidth / 2;
            const textOrientation = this.chooseTextOrientation(
              angularWidth,
              itemWidth,
              item.name,
              middleRadius
            );

            // Get the pre-calculated rendering decision (stored by chooseTextOrientation)
            const renderDecision = this._lastOrientationDecision;

            // Choose appropriate text drawing function (use adapter for horizontal text)
            const textFunction =
              textOrientation === "vertical"
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
              isVertical: textOrientation === "vertical",
              highlight: isHovered,
              renderDecision: renderDecision, // Pass the decision to renderer
            });
            
            // Collect editor avatar if someone is editing this item (real-time collaboration)
            this.collectEditorAvatar(item, itemStartRadius, itemWidth, adjustedEndAngle);

            // Collect label indicator to draw last (on top)
            if (item.labelId) {
              this.labelsToDraw.push({
                item,
                startRadius: itemStartRadius,
                width: itemWidth,
                startAngle: adjustedStartAngle,
                endAngle: adjustedEndAngle,
              });
            }

            // Collect linked wheel indicator to draw last (on top)
            if (item.linkedWheelId) {
              this.linkedWheelsToDraw.push({
                item,
                startRadius: itemStartRadius,
                width: itemWidth,
                startAngle: adjustedStartAngle,
                endAngle: adjustedEndAngle,
              });
            }

            // Store clickable region for this item
            this.clickableItems.push({
              item: item,
              startRadius: itemStartRadius,
              endRadius: itemStartRadius + itemWidth,
              startAngle: this.toRadians(adjustedStartAngle),
              endAngle: this.toRadians(adjustedEndAngle),
            });

            // Draw selection border if item is selected
            if (this.selectedItems.includes(item.id)) {
              this.drawSelectionBorder(
                itemStartRadius,
                itemWidth,
                adjustedStartAngle,
                adjustedEndAngle
              );
            }

            // Draw resize handles on hover
            if (isHovered) {
              this.drawResizeHandles(
                itemStartRadius,
                itemWidth,
                adjustedStartAngle,
                adjustedEndAngle,
                itemColor
              );
            }
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
    const innerRings = this.organizationData.rings.filter((r) => {
      return r.type === "inner" && r.visible;
    });
    const numberOfEvents = innerRings.length;

    // Calculate total available space for inner rings
    // Each ring = content area + name band (treated as single unit)
    const totalAvailableSpace =
      currentMaxRadius - this.minRadius - this.size / 1000; // Minimal buffer space

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
    const contentAreaHeight = this.showRingNames
      ? equalRingHeight - ringNameBandWidth
      : equalRingHeight;

    let eventRadius = this.minRadius;

    for (let i = 0; i < numberOfEvents; i++) {
      const ring = innerRings[i];

      // Each ring has two parts: content area (for activities) + name band
      const ringContentHeight = contentAreaHeight;

      // Store the ACTUAL rendered position for this ring
      this.renderedRingPositions.set(ring.id, {
        startRadius: eventRadius,
        endRadius: eventRadius + ringContentHeight,
        type: "inner",
      });

      // Get items for this ring
      let ringItems = this.organizationData.items.filter((item) => {
        const hasVisibleActivityGroup = visibleActivityGroups.some(
          (a) => a.id === item.activityId
        );
        const labelOk =
          !item.labelId || visibleLabels.some((l) => l.id === item.labelId);
        return item.ringId === ring.id && hasVisibleActivityGroup && labelOk;
      });

      // Cluster by week if in full year view (not zoomed) and not dragging
      if (this.zoomedMonth === null && this.zoomedQuarter === null) {
        const draggedItemId = this.dragState?.draggedItem?.id || null;
        ringItems = this.clusterItemsByWeek(ringItems, draggedItemId);
      }

      // Draw subtle background for ALL inner rings using palette color
      this.context.beginPath();
      this.context.arc(
        this.center.x,
        this.center.y,
        eventRadius,
        0,
        Math.PI * 2
      );
      this.context.arc(
        this.center.x,
        this.center.y,
        eventRadius + ringContentHeight,
        0,
        Math.PI * 2,
        true
      );
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
        const { maxTracks, itemToTrack } =
          this.assignActivitiesToTracks(ringItems);
        const trackGap = this.size / 2000; // Tiny gap between tracks for visual separation

        // Calculate overlap groups and their maximum overlap counts (INNER RINGS)
        const itemOverlapInfo = new Map();

        ringItems.forEach((item) => {
          const itemStart = new Date(item.startDate);
          const itemEnd = new Date(item.endDate);

          // Find all items that overlap with this one
          const overlappingItems = ringItems.filter((otherItem) => {
            if (otherItem.id === item.id) return true; // Include self
            const otherStart = new Date(otherItem.startDate);
            const otherEnd = new Date(otherItem.endDate);
            return this.dateRangesOverlap(
              itemStart,
              itemEnd,
              otherStart,
              otherEnd
            );
          });

          // Find the maximum overlap count for this group
          // Use the highest track index + 1 as the definitive overlap count
          const tracksUsed = overlappingItems.map(
            (i) => itemToTrack.get(i.id) || 0
          );
          const highestTrack = Math.max(...tracksUsed);
          const maxOverlapInGroup = highestTrack + 1; // Number of tracks = highest index + 1

          itemOverlapInfo.set(item.id, {
            overlapCount: maxOverlapInGroup,
            overlappingItems: overlappingItems,
          });
        });

        ringItems.forEach((item) => {
          // Skip the item being dragged - it will be drawn as a preview instead
          if (
            this.dragState.isDragging &&
            this.dragState.draggedItem &&
            item.id === this.dragState.draggedItem.id
          ) {
            return;
          }

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
          if (endAngle < visibleRangeStart || startAngle > visibleRangeEnd)
            return;

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
          let itemColor = activityGroup
            ? activityGroup.color
            : this.sectionColors[0];

          // Check if this item is hovered
          const isHovered = this.hoveredItem && this.hoveredItem.id === item.id;
          if (isHovered) {
            itemColor = this.getHoverColor(itemColor);
          }

          // Get track assignment for this item
          const trackIndex = itemToTrack.get(item.id) || 0;

          // Get pre-calculated overlap info for this item (INNER RINGS)
          const overlapInfo = itemOverlapInfo.get(item.id);
          const localOverlapCount = overlapInfo ? overlapInfo.overlapCount : 1;

          // Determine height based on LOCAL overlaps in this specific region
          const hasOverlap = localOverlapCount > 1;
          const localTrackHeight = hasOverlap
            ? ringContentHeight / localOverlapCount
            : ringContentHeight;
          const itemHeight = localTrackHeight;
          const itemStartRadius = hasOverlap
            ? eventRadius + trackIndex * localTrackHeight
            : eventRadius;
          const itemWidth = itemHeight - trackGap; // Subtract tiny gap between tracks

          // Decide text orientation based on activity dimensions
          const angularWidth = Math.abs(
            this.toRadians(adjustedEndAngle) -
              this.toRadians(adjustedStartAngle)
          );
          const middleRadius = itemStartRadius + itemWidth / 2;
          const textOrientation = this.chooseTextOrientation(
            angularWidth,
            itemWidth,
            item.name,
            middleRadius
          );

          // Get the pre-calculated rendering decision (stored by chooseTextOrientation)
          const renderDecision = this._lastOrientationDecision;

          // Choose appropriate text drawing function (use adapter for horizontal text)
          const textFunction =
            textOrientation === "vertical"
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
            isVertical: textOrientation === "vertical",
            highlight: isHovered,
            renderDecision: renderDecision, // Pass the decision to renderer
          });
          
          // Collect editor avatar if someone is editing this item (real-time collaboration)
          this.collectEditorAvatar(item, itemStartRadius, itemWidth, adjustedEndAngle);

          // Collect label indicator to draw last (on top)
          if (item.labelId) {
            this.labelsToDraw.push({
              item,
              startRadius: itemStartRadius,
              width: itemWidth,
              startAngle: adjustedStartAngle,
              endAngle: adjustedEndAngle,
            });
          }

          // Collect linked wheel indicator to draw last (on top)
          if (item.linkedWheelId) {
            this.linkedWheelsToDraw.push({
              item,
              startRadius: itemStartRadius,
              width: itemWidth,
              startAngle: adjustedStartAngle,
              endAngle: adjustedEndAngle,
            });
          }

          // Store clickable region for this item
          this.clickableItems.push({
            item: item,
            startRadius: itemStartRadius,
            endRadius: itemStartRadius + itemWidth,
            startAngle: this.toRadians(adjustedStartAngle),
            endAngle: this.toRadians(adjustedEndAngle),
          });

          // Draw selection border if item is selected
          if (this.selectedItems.includes(item.id)) {
            this.drawSelectionBorder(
              itemStartRadius,
              itemWidth,
              adjustedStartAngle,
              adjustedEndAngle
            );
          }

          // Draw resize handles on hover
          if (isHovered) {
            this.drawResizeHandles(
              itemStartRadius,
              itemWidth,
              adjustedStartAngle,
              adjustedEndAngle,
              itemColor
            );
          }
        });
      }

      // Name band is drawn at the outer edge of the content area (no gap)
      if (this.showRingNames) {
        const ringNameRadius = eventRadius + ringContentHeight;
        if (!this.innerRingNamesToDraw) this.innerRingNamesToDraw = [];
        this.innerRingNamesToDraw.push({
          name: ring.name,
          radius: ringNameRadius,
          width: ringNameBandWidth,
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
      // Determine if we're in a filtered view (month or quarter)
      const isFiltered =
        this.zoomedMonth !== null || this.zoomedQuarter !== null;

      // Use the display mode as-is (respect user's toggle choice)
      const effectiveDisplayMode = this.weekRingDisplayMode;

      // Special mode for month filter with dates: show individual days instead of weeks
      const showDays =
        this.zoomedMonth !== null && effectiveDisplayMode === "dates";

      // Get data based on display mode and filter state
      let weekData;
      let numberOfIntervals;

      if (showDays) {
        // Month filter with dates mode: show individual days (1-31)
        const year = parseInt(this.year);
        const daysInMonth = new Date(year, this.zoomedMonth + 1, 0).getDate();
        weekData = Array.from({ length: daysInMonth }, (_, i) =>
          (i + 1).toString()
        );
        numberOfIntervals = daysInMonth;
      } else if (effectiveDisplayMode === "dates") {
        // Generate date ranges (DD-DD format)
        const allDateRanges = this.generateWeekDateRanges();
        // Filter for current zoom level (similar to getWeeksForZoom logic)
        const { startDate, endDate } = this.getDateRangeForZoom();
        const year = parseInt(this.year);

        // If zoomed, filter date ranges to match the zoom period
        if (this.zoomedMonth !== null || this.zoomedQuarter !== null) {
          weekData = [];
          let currentDate = new Date(year, 0, 1);
          while (currentDate.getDay() !== 1)
            currentDate.setDate(currentDate.getDate() - 1);

          let rangeIndex = 0;
          while (
            currentDate.getFullYear() <= year &&
            rangeIndex < allDateRanges.length
          ) {
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 6);

            // Check if this week overlaps with the zoomed period
            if (weekEnd >= startDate && weekStart <= endDate) {
              weekData.push(allDateRanges[rangeIndex]);
            }

            rangeIndex++;
            currentDate.setDate(currentDate.getDate() + 7);
            if (currentDate.getFullYear() > year && currentDate.getMonth() > 0)
              break;
          }
        } else {
          weekData = allDateRanges;
        }
        numberOfIntervals = weekData.length;
      } else {
        // Default: week numbers
        weekData = this.getWeeksForZoom();
        numberOfIntervals = weekData.length;
      }

      // Use lighter version of third template color (or second if only 2 colors)
      const weekBaseColor =
        this.sectionColors[2] || this.sectionColors[1] || this.sectionColors[0];
      const weekColors = Array(numberOfIntervals).fill(weekBaseColor);

      // Adaptive font size: larger when filtered (more space per week/day)
      // Full year: size/85, Month view (days): size/55, Quarter (weeks): size/60
      let adaptiveFontSize;
      if (showDays) {
        // Single month with daily divisions: moderate size
        adaptiveFontSize = this.size / 55;
      } else if (this.zoomedMonth !== null) {
        // Single month with weekly divisions: larger
        adaptiveFontSize = this.size / 45;
      } else if (this.zoomedQuarter !== null) {
        // Quarter: moderately larger
        adaptiveFontSize = this.size / 60;
      } else {
        // Full year: standard size
        adaptiveFontSize = this.size / 85;
      }

      // Adaptive spacing: add visible gaps between segments when filtered
      // Full year: no gaps (too cluttered), Quarter: visible gaps, Month: more visible gaps
      let segmentSpacing = 0;
      if (showDays) {
        // Month filter with days: clear visible gaps (1 degree = clear separation)
        segmentSpacing = 1.0; // degrees
      } else if (this.zoomedMonth !== null) {
        // Month filter with weeks: visible gaps
        segmentSpacing = 0.8; // degrees
      } else if (this.zoomedQuarter !== null) {
        // Quarter filter with weeks: subtle but visible gaps
        segmentSpacing = 0.5; // degrees
      }
      // Full year: 0 (no gaps)

      this.addMonthlyCircleSection({
        startRadius: weekStartRadius,
        width: weekRingWidth,
        spacingAngle: segmentSpacing, // Adaptive spacing for visual segmentation
        color: null,
        textFunction: this.setCircleSectionSmallTitle.bind(this), // Use smaller text function
        texts: weekData,
        fontSize: adaptiveFontSize, // Adaptive based on filter state
        colors: weekColors,
        isVertical: true,
        lineHeight: this.lineHeight,
        numberOfIntervals: numberOfIntervals,
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

    // SECOND draw all editor avatars (real-time collaboration indicators)
    if (this.avatarsToDraw && this.avatarsToDraw.length > 0) {
      for (const avatarData of this.avatarsToDraw) {
        this.drawEditorAvatarInRotatedContext(
          avatarData.item,
          avatarData.editor,
          avatarData.startRadius,
          avatarData.itemWidth,
          avatarData.adjustedEndAngle
        );
      }
    }

    // THIRD draw all linked wheel indicators (chain link icons)
    if (this.linkedWheelsToDraw && this.linkedWheelsToDraw.length > 0) {
      for (const linkData of this.linkedWheelsToDraw) {
        this.drawLinkedWheelIndicator(
          linkData.item,
          linkData.startRadius,
          linkData.width,
          linkData.startAngle,
          linkData.endAngle
        );
      }
    }

    // FINALLY draw inner ring names on top (collected earlier)
    // Ring names should always be visible, even over labels
    if (
      this.showRingNames &&
      this.innerRingNamesToDraw &&
      this.innerRingNamesToDraw.length > 0
    ) {
      for (const ringName of this.innerRingNamesToDraw) {
        this.drawRingNameBand(ringName.name, ringName.radius, ringName.width);
      }
      // Clear the array for next render
      this.innerRingNamesToDraw = [];
    }

    // Draw drag preview INSIDE the rotated context
    this.drawDragPreviewInRotatedContext();

    this.context.restore();
  }

  // DOWNLOAD FUNCTIONALITY (now delegated to ExportManager)

  downloadImage(format, toClipboard = false) {
    if (toClipboard) {
      return this.exportManager.copyToClipboard(format);
    } else {
      return this.exportManager.exportImage(format);
    }
  }

  async copyToClipboard(format) {
    return this.exportManager.copyToClipboard(format);
  }

  // Legacy methods - delegated to ExportManager for backward compatibility
  downloadAsPNG(whiteBackground = false) {
    return this.exportManager.downloadAsPNG(whiteBackground);
  }

  downloadAsJPEG() {
    return this.exportManager.downloadAsJPEG();
  }

  downloadAsSVG() {
    return this.exportManager.downloadAsSVG();
  }

  async downloadAsPDF() {
    return this.exportManager.downloadAsPDF();
  }

  async copyPNGToClipboard(whiteBackground = false) {
    return this.exportManager.copyPNGToClipboard(whiteBackground);
  }

  async copyJPEGToClipboard() {
    return this.exportManager.copyJPEGToClipboard();
  }

  async copySVGToClipboard() {
    return this.exportManager.copySVGToClipboard();
  }

  // Helper methods needed by ExportManager (keep in YearWheelClass)
  copyCanvas(whiteBackground = false) {
    return this.exportManager.copyCanvas(whiteBackground);
  }

  createSVGContext() {
    return this.exportManager.createSVGContext();
  }

  generateFileName(extension) {
    return this.exportManager.generateFileName(extension);
  }

  downloadFile(data, fileName, mimeType) {
    return this.exportManager.downloadFile(data, fileName, mimeType);
  }

}

export default YearWheel;
