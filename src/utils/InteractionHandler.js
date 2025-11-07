/**
 * InteractionHandler - Manages drag & drop interactions for YearWheel
 * 
 * Handles:
 * - Activity drag and drop (move)
 * - Activity resize (start/end edges)
 * - Ring switching during drag
 * - Wheel rotation
 * - Hover detection
 * - Click detection
 * 
 * Maintains pixel-perfect drag accuracy with screen coordinate system
 * 
 * @license MIT
 */

import LayoutCalculator from './LayoutCalculator.js';

class InteractionHandler {
  constructor(canvas, wheelInstance, options = {}) {
    this.canvas = canvas;
    this.wheel = wheelInstance;
    this.options = options;
    
    // Drag state
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
      currentAngleDelta: 0,
      targetRing: null,
      targetRingInfo: null,
    };
    
    // Wheel rotation state
    this.isRotating = false;
    this.lastMouseAngle = 0;
    
    // Hover state
    this.hoveredItem = null;
    this.lastHoverCheck = 0;
    this.hoverThrottleMs = 16; // ~60fps
    
    // Bind event handlers
    this.boundHandlers = {
      mouseDown: this.handleMouseDown.bind(this),
      mouseMove: this.handleMouseMove.bind(this),
      mouseUp: this.handleMouseUp.bind(this),
      mouseLeave: this.handleMouseLeave.bind(this),
      click: this.handleClick.bind(this),
    };
    
    // Attach event listeners
    this.attachListeners();
  }

  // ============================================================================
  // EVENT LISTENER MANAGEMENT
  // ============================================================================

  attachListeners() {
    // In readonly mode, only attach click listener if onItemClick callback provided
    // This allows readonly wheels to respond to item clicks (e.g., for casting to TV)
    if (this.options.readonly) {
      if (this.options.onItemClick) {
        this.canvas.addEventListener('click', this.boundHandlers.click);
        // Also add touch support for mobile devices
        this.canvas.addEventListener("touchend", (e) => {
          // Prevent the click event from firing (avoid double trigger)
          e.preventDefault();
          // Convert touch to click-like event
          if (e.changedTouches && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const clickEvent = {
              clientX: touch.clientX,
              clientY: touch.clientY
            };
            this.boundHandlers.click(clickEvent);
          }
        });
      }
      return;
    }
    
    // Full interaction mode (not readonly)
    this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
    this.canvas.addEventListener('mouseup', this.boundHandlers.mouseUp);
    this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseLeave);
    this.canvas.addEventListener('click', this.boundHandlers.click);
  }

  detachListeners() {
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseLeave);
    this.canvas.removeEventListener('click', this.boundHandlers.click);
  }

  // ============================================================================
  // COORDINATE CONVERSION
  // ============================================================================

  /**
   * Get canvas coordinates from mouse event
   * @param {MouseEvent} event - Mouse event
   * @returns {Object} { x, y }
   */
  getCanvasCoordinates(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  /**
   * Get mouse angle relative to center
   * @param {MouseEvent} event - Mouse event
   * @returns {number} Angle in radians
   */
  getMouseAngle(event) {
    const { x, y } = this.getCanvasCoordinates(event);
    const dx = x - this.wheel.center.x;
    const dy = y - this.wheel.center.y;
    
    return Math.atan2(dy, dx);
  }

  /**
   * Normalize angle to 0-2π range
   * @param {number} angle - Angle in radians
   * @returns {number} Normalized angle
   */
  normalizeAngle(angle) {
    let normalized = angle;
    while (normalized < 0) normalized += Math.PI * 2;
    while (normalized >= Math.PI * 2) normalized -= Math.PI * 2;
    return normalized;
  }

  // ============================================================================
  // DRAG ZONE DETECTION
  // ============================================================================

  /**
   * Detect which part of an activity is clicked
   * Uses pixel-based detection for accurate resize zone targeting
   * @param {number} x - Canvas X coordinate
   * @param {number} y - Canvas Y coordinate
   * @param {Object} itemRegion - Item region { startAngle, endAngle, startRadius, endRadius }
   * @returns {string} 'resize-start', 'move', or 'resize-end'
   */
  detectDragZone(x, y, itemRegion) {
    const dx = x - this.wheel.center.x;
    const dy = y - this.wheel.center.y;
    const clickRadius = Math.sqrt(dx * dx + dy * dy);
    let clickAngle = Math.atan2(dy, dx);

    // Account for rotation
    clickAngle -= this.wheel.rotationAngle;
    clickAngle = this.normalizeAngle(clickAngle);

    // Normalize item angles
    let startAngle = this.normalizeAngle(itemRegion.startAngle);
    let endAngle = this.normalizeAngle(itemRegion.endAngle);

    // Calculate angle span, handling wraparound
    let angleSpan = endAngle - startAngle;
    if (angleSpan < 0) angleSpan += Math.PI * 2;

    // Calculate relative position within activity
    let relativeAngle = clickAngle - startAngle;
    if (relativeAngle < 0) relativeAngle += Math.PI * 2;

    // Handle wraparound case
    if (relativeAngle > angleSpan) {
      relativeAngle = angleSpan / 2; // Default to middle
    }

    // Pixel-based detection with zoom awareness
    const avgRadius = (itemRegion.startRadius + itemRegion.endRadius) / 2;
    const totalArcLength = angleSpan * avgRadius;

    // Adaptive resize zone based on zoom level
    let resizeZonePixels = 20;

    if (this.wheel.zoomedMonth !== null) {
      resizeZonePixels = 30; // Larger in month zoom
    } else if (this.wheel.zoomedQuarter !== null) {
      resizeZonePixels = 25; // Medium in quarter zoom
    }

    // For very small activities, use proportional threshold
    if (totalArcLength < 80) {
      resizeZonePixels = Math.min(resizeZonePixels, totalArcLength * 0.3);
    }

    const currentArcPosition = relativeAngle * avgRadius;

    // Determine zone
    if (totalArcLength < resizeZonePixels * 2.2) {
      return 'move'; // Too small for resize
    } else if (currentArcPosition < resizeZonePixels) {
      return 'resize-start';
    } else if (totalArcLength - currentArcPosition < resizeZonePixels) {
      return 'resize-end';
    } else {
      return 'move';
    }
  }

  /**
   * Detect target ring at coordinates (for ring switching)
   * @param {number} x - Canvas X coordinate
   * @param {number} y - Canvas Y coordinate
   * @returns {Object|null} { ring, startRadius, endRadius, type } or null
   */
  detectTargetRing(x, y) {
    const dx = x - this.wheel.center.x;
    const dy = y - this.wheel.center.y;
    const radius = Math.sqrt(dx * dx + dy * dy);

    const visibleOuterRings = this.wheel.organizationData.rings.filter(
      r => r.visible && r.type === 'outer'
    );
    const visibleInnerRings = this.wheel.organizationData.rings.filter(
      r => r.visible && r.type === 'inner'
    );

    const standardGap = 0;
    const outerRingHeight = this.wheel.size / 23;

    // Check outer rings
    if (visibleOuterRings.length > 0) {
      let currentRadius = this.wheel.maxRadius;

      for (const ring of visibleOuterRings) {
        currentRadius -= outerRingHeight;
        const ringStartRadius = currentRadius;
        const ringEndRadius = currentRadius + outerRingHeight;

        if (radius >= ringStartRadius && radius <= ringEndRadius) {
          return {
            ring,
            startRadius: ringStartRadius,
            endRadius: ringEndRadius,
            type: 'outer'
          };
        }
      }
    }

    // Check inner rings
    if (visibleInnerRings.length > 0) {
      const numberOfInnerRings = visibleInnerRings.length;
      let currentMaxRadius = this.wheel.maxRadius;

      if (visibleOuterRings.length > 0) {
        currentMaxRadius -= visibleOuterRings.length * outerRingHeight + standardGap;
      }

      const totalAvailableSpace = currentMaxRadius - this.wheel.minRadius - this.wheel.size / 1000;
      const totalGapSpacing = numberOfInnerRings > 1 ? (numberOfInnerRings - 1) * standardGap : 0;
      const totalRingSpace = totalAvailableSpace - totalGapSpacing;
      const equalRingHeight = totalRingSpace / numberOfInnerRings;

      let eventRadius = this.wheel.minRadius;

      for (const ring of visibleInnerRings) {
        const ringStartRadius = eventRadius;
        const ringEndRadius = eventRadius + equalRingHeight;

        if (radius >= ringStartRadius && radius <= ringEndRadius) {
          return {
            ring,
            startRadius: ringStartRadius,
            endRadius: ringEndRadius,
            type: 'inner'
          };
        }

        eventRadius += equalRingHeight + standardGap;
      }
    }

    return null;
  }

  /**
   * Check if point is within an item region
   * @param {number} x - Canvas X coordinate
   * @param {number} y - Canvas Y coordinate
   * @param {Object} itemRegion - Item region
   * @returns {boolean} True if point is in region
   */
  isPointInItemRegion(x, y, itemRegion) {
    const dx = x - this.wheel.center.x;
    const dy = y - this.wheel.center.y;
    const clickRadius = Math.sqrt(dx * dx + dy * dy);
    let clickAngle = Math.atan2(dy, dx);

    // Account for rotation
    clickAngle -= this.wheel.rotationAngle;
    clickAngle = this.normalizeAngle(clickAngle);

    // Check radius
    if (clickRadius < itemRegion.startRadius || clickRadius > itemRegion.endRadius) {
      return false;
    }

    // Check angle
    let startAngle = this.normalizeAngle(itemRegion.startAngle);
    let endAngle = this.normalizeAngle(itemRegion.endAngle);

    // Handle wraparound
    if (endAngle < startAngle) {
      return clickAngle >= startAngle || clickAngle <= endAngle;
    } else {
      return clickAngle >= startAngle && clickAngle <= endAngle;
    }
  }

  // ============================================================================
  // DRAG OPERATIONS
  // ============================================================================

  /**
   * Start activity drag
   * @param {MouseEvent} event - Mouse event
   * @param {Object} itemRegion - Item region that was clicked
   */
  startActivityDrag(event, itemRegion) {
    const { x, y } = this.getCanvasCoordinates(event);
    const dragMode = this.detectDragZone(x, y, itemRegion);
    
    // CRITICAL: Look up fresh item data from organizationData (single source of truth)
    const freshItem = this.wheel.organizationData.items.find(
      i => i.id === itemRegion.itemId
    );
    
    // If item not found in current organizationData, skip (year filtered out)
    if (!freshItem) {
      return;
    }

    // Clustered items require special handling and cannot be dragged directly
    if (freshItem.isCluster) {
      return;
    }

    // Calculate screen angles
    const dx = x - this.wheel.center.x;
    const dy = y - this.wheel.center.y;
    const rawStartMouseAngle = Math.atan2(dy, dx);
    let startMouseAngle = this.normalizeAngle(rawStartMouseAngle);

    const screenStartAngle = itemRegion.startAngle + this.wheel.rotationAngle;
    const screenEndAngle = itemRegion.endAngle + this.wheel.rotationAngle;
    const normalizedStartAngle = this.normalizeAngle(screenStartAngle);
    const normalizedEndAngle = this.normalizeAngle(screenEndAngle);

    this.dragState = {
      isDragging: true,
      dragMode,
      draggedItem: freshItem,
      draggedItemRegion: itemRegion,
      startMouseAngle,
      currentMouseAngle: startMouseAngle,
      rawStartMouseAngle,
      lastRawMouseAngle: rawStartMouseAngle,
      angleWrapOffset: 0,
      initialStartAngle: normalizedStartAngle,
      initialEndAngle: normalizedEndAngle,
      previewStartAngle: normalizedStartAngle,
      previewEndAngle: normalizedEndAngle,
      rawInitialStartAngle: screenStartAngle,
      rawInitialEndAngle: screenEndAngle,
      rawPreviewStartAngle: screenStartAngle,
      rawPreviewEndAngle: screenEndAngle,
      currentAngleDelta: 0,
      targetRing: null,
      targetRingInfo: null,
    };

    if (this.wheel.updateDragStateFromHandler) {
      this.wheel.updateDragStateFromHandler(this.dragState);
    }

    // Notify parent
    if (this.wheel.onDragStart) {
      this.wheel.onDragStart();
    }

    // Set cursor
    if (dragMode === 'resize-start' || dragMode === 'resize-end') {
      this.canvas.style.cursor = 'ew-resize';
    } else {
      this.canvas.style.cursor = 'grabbing';
    }

    if (this.wheel.updateDragStateFromHandler) {
      this.wheel.updateDragStateFromHandler(this.dragState);
    }

    if (this.wheel.updateDragStateFromHandler) {
      this.wheel.updateDragStateFromHandler(this.dragState);
    }

    // Trigger redraw
    if (this.wheel.create) {
      this.wheel.create();
    }
  }

  /**
   * Update activity drag position
   * @param {MouseEvent} event - Mouse event
   */
  updateActivityDrag(event) {
    if (!this.dragState.isDragging) return;

    const { x, y } = this.getCanvasCoordinates(event);
    const dx = x - this.wheel.center.x;
    const dy = y - this.wheel.center.y;
    const rawMouseAngle = Math.atan2(dy, dx);
    const lastRawMouseAngle = this.dragState.lastRawMouseAngle ?? rawMouseAngle;
    let wrapOffset = this.dragState.angleWrapOffset ?? 0;

    const rawDifference = rawMouseAngle - lastRawMouseAngle;
    if (rawDifference > Math.PI) {
      wrapOffset -= Math.PI * 2;
    } else if (rawDifference < -Math.PI) {
      wrapOffset += Math.PI * 2;
    }

  const cumulativeMouseAngle = rawMouseAngle + wrapOffset;
  const cumulativeStartAngle = this.dragState.rawStartMouseAngle;
  const angleDelta = cumulativeMouseAngle - cumulativeStartAngle;

    const mouseAngle = this.normalizeAngle(cumulativeMouseAngle);

    this.dragState.angleWrapOffset = wrapOffset;
    this.dragState.lastRawMouseAngle = rawMouseAngle;
    this.dragState.currentMouseAngle = mouseAngle;
  this.dragState.currentAngleDelta = angleDelta;

    // Minimum activity size (1 week)
    const minWeekAngle = LayoutCalculator.degreesToRadians((7 / 365) * 360);

    if (this.dragState.dragMode === 'move') {
      // Detect target ring for switching
      const targetRingInfo = this.detectTargetRing(x, y);
      this.dragState.targetRingInfo = targetRingInfo;
      this.dragState.targetRing = targetRingInfo ? targetRingInfo.ring : null;

      // Calculate angle delta
      // Apply delta to both start and end
      const rawStart = this.dragState.rawInitialStartAngle + angleDelta;
      const rawEnd = this.dragState.rawInitialEndAngle + angleDelta;

      this.dragState.rawPreviewStartAngle = rawStart;
      this.dragState.rawPreviewEndAngle = rawEnd;

      this.dragState.previewStartAngle = this.normalizeAngle(rawStart);
      this.dragState.previewEndAngle = this.normalizeAngle(rawEnd);
      
    } else if (this.dragState.dragMode === 'resize-start') {
      // Resize start edge
      const rawStart = this.dragState.rawInitialStartAngle + angleDelta;
      let newStartAngle = this.normalizeAngle(rawStart);

      this.dragState.previewEndAngle = this.dragState.initialEndAngle;

      // Enforce minimum span
      let span = this.dragState.previewEndAngle - newStartAngle;
      if (span < 0) span += Math.PI * 2;

      if (span >= minWeekAngle) {
        this.dragState.previewStartAngle = newStartAngle;
        this.dragState.rawPreviewStartAngle = rawStart;
      }
      
    } else if (this.dragState.dragMode === 'resize-end') {
      // Resize end edge
      const rawEnd = this.dragState.rawInitialEndAngle + angleDelta;
      let newEndAngle = this.normalizeAngle(rawEnd);

      this.dragState.previewStartAngle = this.dragState.initialStartAngle;

      // Enforce minimum span
      let span = newEndAngle - this.dragState.previewStartAngle;
      if (span < 0) span += Math.PI * 2;

      if (span >= minWeekAngle) {
        this.dragState.previewEndAngle = newEndAngle;
        this.dragState.rawPreviewEndAngle = rawEnd;
      }
    }

    // Trigger redraw
    if (this.wheel.create) {
      this.wheel.create();
    }
  }

  /**
   * Stop activity drag and commit changes
   */
  async stopActivityDrag() {
    if (!this.dragState.isDragging) return;

    const originalItem = this.dragState.draggedItem;

    const rawStartAngle = this.dragState.rawPreviewStartAngle ?? this.dragState.previewStartAngle;
    const rawEndAngle = this.dragState.rawPreviewEndAngle ?? this.dragState.previewEndAngle;

    const logicalStartAngleRaw = rawStartAngle - this.wheel.rotationAngle;
    const logicalEndAngleRaw = rawEndAngle - this.wheel.rotationAngle;

    const normalizedStartAngle = this.normalizeAngle(logicalStartAngleRaw);
    const normalizedEndAngle = this.normalizeAngle(logicalEndAngleRaw);

    const unwrappedStartDegrees =
      LayoutCalculator.radiansToDegrees(logicalStartAngleRaw) - this.wheel.initAngle;
    const unwrappedEndDegrees =
      LayoutCalculator.radiansToDegrees(logicalEndAngleRaw) - this.wheel.initAngle;

    const CROSS_EPSILON = 0.0001;

    let forwardWrapCount = 0;
    if (this.dragState.dragMode === 'resize-end') {
      const candidate = unwrappedEndDegrees;
      if (candidate > 360 + CROSS_EPSILON) {
        forwardWrapCount = Math.floor((candidate + CROSS_EPSILON) / 360);
      }
    }

    // Convert radians to degrees for angleToDate
    const startDegrees = LayoutCalculator.radiansToDegrees(normalizedStartAngle);
    const endDegrees = LayoutCalculator.radiansToDegrees(normalizedEndAngle);

    // Use wheel's angleToDate method which handles zoom levels and initAngle
    let newStartDate = this.wheel.angleToDate(startDegrees);
    let newEndDate = this.wheel.angleToDate(endDegrees);

    const yearStart = new Date(this.wheel.year, 0, 1);
    const yearEnd = new Date(this.wheel.year, 11, 31);

    if (newStartDate < yearStart) newStartDate = yearStart;
    if (newStartDate > yearEnd) newStartDate = yearEnd;

    const angleDelta = this.dragState.currentAngleDelta ?? 0;

    const wrappedForward =
      this.dragState.dragMode === 'resize-end' &&
      (forwardWrapCount > 0 || (angleDelta > 0 && normalizedEndAngle < normalizedStartAngle));

    if (wrappedForward) {
      const wrappedEnd = new Date(newEndDate.getTime());
      if (forwardWrapCount > 0) {
        wrappedEnd.setFullYear(wrappedEnd.getFullYear() + forwardWrapCount);
      } else {
        wrappedEnd.setFullYear(wrappedEnd.getFullYear() + 1);
      }
      newEndDate = wrappedEnd;
    }

    if (newEndDate < yearStart) newEndDate = yearStart;

    let overflowEndDate = null;

    if (newEndDate > yearEnd) {
      overflowEndDate = new Date(newEndDate.getTime());
      
      console.log(`[InteractionHandler] Item extends past year end: ${formatDate(newEndDate)} > ${formatDate(yearEnd)}`);

      if (
        originalItem &&
        this.dragState.dragMode === 'resize-end' &&
        this.options.onExtendActivityToNextYear
      ) {
        try {
          console.log(`[InteractionHandler] Calling onExtendActivityToNextYear for "${originalItem.name}"`);
          await this.options.onExtendActivityToNextYear({
            item: originalItem,
            overflowEndDate,
            currentYearEnd: yearEnd,
            dragMode: this.dragState.dragMode,
          });
          console.log(`[InteractionHandler] onExtendActivityToNextYear completed`);
        } catch (extensionError) {
          console.error('[InteractionHandler] Failed to extend activity across years:', extensionError);
        }
      }

      // Always clamp current year's item to December 31
      console.log(`[InteractionHandler] Clamping "${originalItem?.name}" endDate from ${formatDate(newEndDate)} to ${formatDate(yearEnd)}`);
      newEndDate = yearEnd;
    }

    // Ensure end is after start when not intentionally wrapping forward
    if (newEndDate < newStartDate && !wrappedForward) {
      const temp = newStartDate;
      newStartDate = newEndDate;
      newEndDate = temp;
    }

    // Format dates
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Prepare update object
    if (!originalItem) {
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
        currentAngleDelta: 0,
        targetRing: null,
        targetRingInfo: null,
      };
      if (this.wheel.updateDragStateFromHandler) {
        this.wheel.updateDragStateFromHandler(this.dragState);
      }
      this.wheel.canvas.style.cursor = 'default';
      if (this.wheel.create) {
        this.wheel.create();
      }
      return;
    }

    const updates = {
      startDate: formatDate(newStartDate),
      endDate: formatDate(newEndDate),
    };

    console.log(`[InteractionHandler] Updating item "${originalItem.name}" with dates: ${updates.startDate} to ${updates.endDate}`);

    if (
      this.dragState.targetRing &&
      this.dragState.targetRing.id !== originalItem.ringId
    ) {
      updates.ringId = this.dragState.targetRing.id;
      console.log(`[InteractionHandler] Also moving to ring: ${this.dragState.targetRing.id}`);
    }

    const updatedItem = {
      ...originalItem,
      ...updates,
    };

    const hasChanges =
      originalItem.startDate !== updatedItem.startDate ||
      originalItem.endDate !== updatedItem.endDate ||
      originalItem.ringId !== updatedItem.ringId;

    console.log(`[InteractionHandler] hasChanges: ${hasChanges}`);

    if (hasChanges) {
      this.wheel.pendingItemUpdates.set(updatedItem.id, {
        item: updatedItem,
        timestamp: Date.now(),
      });

      if (this.wheel.invalidateCache) {
        this.wheel.invalidateCache();
      }

      if (this.wheel.broadcastOperation) {
        this.wheel.broadcastOperation('drag', updatedItem.id, {
          startDate: updatedItem.startDate,
          endDate: updatedItem.endDate,
          ringId: updatedItem.ringId,
        });
      }

      if (this.wheel.options?.onUpdateAktivitet) {
        this.wheel.options.onUpdateAktivitet(updatedItem);
      }
    }

    this.wheel.justFinishedDrag = true;
    this.wheel.skipNextClick = true;
    setTimeout(() => {
      this.wheel.justFinishedDrag = false;
      this.wheel.skipNextClick = false;
    }, 300);

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
      currentAngleDelta: 0,
      targetRing: null,
      targetRingInfo: null,
    };

    if (this.wheel.updateDragStateFromHandler) {
      this.wheel.updateDragStateFromHandler(this.dragState);
    }

    this.canvas.style.cursor = 'default';
    this.hoveredItem = null;
    this.wheel.hoveredItem = null;

    if (this.wheel.create) {
      this.wheel.create();
    }
  }

  /**
   * Start wheel rotation
   * @param {MouseEvent} event - Mouse event
   */
  startWheelRotation(event) {
    if (this.wheel.isAnimating) {
      this.wheel.stopSpinning();
    }

    this.isRotating = true;
    this.lastMouseAngle = this.getMouseAngle(event);
    this.canvas.style.cursor = 'grabbing';
  }

  /**
   * Update wheel rotation
   * @param {MouseEvent} event - Mouse event
   */
  updateWheelRotation(event) {
    if (!this.isRotating) return;

    const currentMouseAngle = this.getMouseAngle(event);
    let angleDifference = currentMouseAngle - this.lastMouseAngle;

    // Normalize to shortest path
    while (angleDifference <= -Math.PI) angleDifference += Math.PI * 2;
    while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;

    this.wheel.rotationAngle += angleDifference;
    this.lastMouseAngle = currentMouseAngle;

    if (this.wheel.onRotationChange) {
      this.wheel.onRotationChange(this.wheel.rotationAngle);
    }

    // Trigger redraw
    if (this.wheel.create) {
      this.wheel.create();
    }
  }

  /**
   * Stop wheel rotation
   */
  stopWheelRotation() {
    if (!this.isRotating) return;

    this.isRotating = false;
    this.canvas.style.cursor = 'default';

    if (this.wheel.onRotationChange) {
      this.wheel.onRotationChange(this.wheel.rotationAngle);
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  handleMouseDown(event) {
    if (this.options.selectionMode) return;

    const { x, y } = this.getCanvasCoordinates(event);
    const dx = x - this.wheel.center.x;
    const dy = y - this.wheel.center.y;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

    // Don't interact with center circle
    if (distanceFromCenter <= this.wheel.minRadius) {
      return;
    }

    // Check for activity click
    if (this.wheel.clickableItems && distanceFromCenter > this.wheel.minRadius) {
      for (const itemRegion of this.wheel.clickableItems) {
        if (this.isPointInItemRegion(x, y, itemRegion)) {
          this.startActivityDrag(event, itemRegion);
          return;
        }
      }
    }

    // No activity clicked - start wheel rotation
    this.startWheelRotation(event);
  }

  handleMouseMove(event) {
    // Handle active drags
    if (this.dragState.isDragging) {
      this.updateActivityDrag(event);
      return;
    }

    if (this.isRotating) {
      this.updateWheelRotation(event);
      return;
    }

    if (this.options.selectionMode) {
      if (this.hoveredItem || this.wheel.hoveredItem) {
        this.hoveredItem = null;
        this.wheel.hoveredItem = null;
        if (this.wheel.create && !this.wheel.hoverRedrawPending) {
          this.wheel.hoverRedrawPending = true;
          requestAnimationFrame(() => {
            if (this.wheel.create) this.wheel.create();
            this.wheel.hoverRedrawPending = false;
          });
        }
      }
      if (this.canvas.style.cursor !== 'default') {
        this.canvas.style.cursor = 'default';
      }
      return;
    }

    // Handle hover (throttled)
    const now = Date.now();
    if (now - this.lastHoverCheck < this.hoverThrottleMs) {
      return;
    }
    this.lastHoverCheck = now;

    const { x, y } = this.getCanvasCoordinates(event);
    let newHoveredItem = null;
    let hoverZone = null;

    const clickableItems = this.wheel.clickableItems;
    if (!clickableItems || clickableItems.length === 0) {
      if (this.hoveredItem || this.wheel.hoveredItem) {
        this.hoveredItem = null;
        this.wheel.hoveredItem = null;
        if (this.wheel.create && !this.wheel.hoverRedrawPending) {
          this.wheel.hoverRedrawPending = true;
          requestAnimationFrame(() => {
            if (this.wheel.create) this.wheel.create();
            this.wheel.hoverRedrawPending = false;
          });
        }
      }
      if (this.canvas.style.cursor !== 'default') {
        this.canvas.style.cursor = 'default';
      }
      return;
    }

    for (const itemRegion of clickableItems) {
      if (this.isPointInItemRegion(x, y, itemRegion)) {
        const pendingEntry = this.wheel.pendingItemUpdates.get(itemRegion.itemId);
        const itemFromData = this.wheel.organizationData.items.find(
          (i) => i.id === itemRegion.itemId
        );
        const resolvedItem = pendingEntry ? pendingEntry.item : itemFromData;

        if (resolvedItem) {
          const startYear = new Date(resolvedItem.startDate).getFullYear();
          const inViewYear = startYear === parseInt(this.wheel.year, 10);
          const zoomActive = this.wheel.zoomedMonth !== null || this.wheel.zoomedQuarter !== null;

          if ((zoomActive || inViewYear) && !resolvedItem.isCluster) {
            newHoveredItem = resolvedItem;
            hoverZone = this.detectDragZone(x, y, itemRegion);
          }
        }

        break;
      }
    }

    let newCursor = 'default';
    if (newHoveredItem) {
      if (hoverZone === 'resize-start' || hoverZone === 'resize-end') {
        newCursor = 'ew-resize';
      } else {
        newCursor = 'grab';
      }
    }

    if (this.canvas.style.cursor !== newCursor) {
      this.canvas.style.cursor = newCursor;
    }

    const prevId = this.hoveredItem ? this.hoveredItem.id : null;
    const nextId = newHoveredItem ? newHoveredItem.id : null;

    if (prevId !== nextId) {
      this.hoveredItem = newHoveredItem;
      this.wheel.hoveredItem = newHoveredItem;

      if (this.wheel.onHoverChange) {
        this.wheel.onHoverChange(newHoveredItem);
      }

      if (this.wheel.create && !this.wheel.hoverRedrawPending) {
        this.wheel.hoverRedrawPending = true;
        requestAnimationFrame(() => {
          if (this.wheel.create) this.wheel.create();
          this.wheel.hoverRedrawPending = false;
        });
      }
    }
  }

  async handleMouseUp(event) {
    if (this.dragState.isDragging) {
      await this.stopActivityDrag();
      return;
    }

    if (this.isRotating) {
      this.stopWheelRotation();
    }
  }

  async handleMouseLeave(event) {
    if (this.dragState.isDragging) {
      await this.stopActivityDrag();
    }

    if (this.isRotating) {
      this.stopWheelRotation();
    }

    this.canvas.style.cursor = 'default';

    if (this.hoveredItem || this.wheel.hoveredItem) {
      this.hoveredItem = null;
      this.wheel.hoveredItem = null;
      if (this.wheel.create && !this.wheel.hoverRedrawPending) {
        this.wheel.hoverRedrawPending = true;
        requestAnimationFrame(() => {
          if (this.wheel.create) this.wheel.create();
          this.wheel.hoverRedrawPending = false;
        });
      }
    }
  }

  handleClick(event) {
    if (this.wheel.skipNextClick) {
      this.wheel.skipNextClick = false;
      return;
    }

    if (this.wheel.justFinishedDrag) {
      return;
    }

    if (this.dragState.isDragging || this.isRotating) {
      return;
    }

    // Handle click events (for item selection, etc.)
    if (this.options.onItemClick) {
      const { x, y } = this.getCanvasCoordinates(event);
      
      if (this.wheel.clickableItems) {
        for (const itemRegion of this.wheel.clickableItems) {
          if (this.isPointInItemRegion(x, y, itemRegion)) {
            // CRITICAL: Look up fresh item data from organizationData (single source of truth)
            const pendingEntry = this.wheel.pendingItemUpdates.get(itemRegion.itemId);
            const freshItemFromData = this.wheel.organizationData.items.find(
              (i) => i.id === itemRegion.itemId
            );
            const freshItem = pendingEntry ? pendingEntry.item : freshItemFromData;
            
            // If item not found in current organizationData, skip (year filtered out)
            if (freshItem) {
              // Pass item, position, and original event (for modifier keys)
              this.options.onItemClick(freshItem, {
                x: event.clientX,
                y: event.clientY
              }, event);
            }
            return;
          }
        }
      }
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get current drag state
   * @returns {Object} Drag state
   */
  getDragState() {
    return { ...this.dragState };
  }

  /**
   * Get current hovered item
   * @returns {Object|null} Hovered item
   */
  getHoveredItem() {
    return this.hoveredItem;
  }

  /**
   * Reset all interaction state
   */
  reset() {
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
    if (this.wheel.updateDragStateFromHandler) {
      this.wheel.updateDragStateFromHandler(this.dragState);
    }
    
    this.isRotating = false;
    this.hoveredItem = null;
    this.wheel.hoveredItem = null;
    this.canvas.style.cursor = 'default';
  }

  /**
   * Clean up and detach event listeners
   */
  destroy() {
    this.detachListeners();
    this.reset();
  }
}

// ES6 export
export default InteractionHandler;
