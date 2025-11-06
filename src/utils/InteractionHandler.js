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

    // Calculate screen angles
    const dx = x - this.wheel.center.x;
    const dy = y - this.wheel.center.y;
    let startMouseAngle = Math.atan2(dy, dx);
    startMouseAngle = this.normalizeAngle(startMouseAngle);

    const screenStartAngle = itemRegion.startAngle + this.wheel.rotationAngle;
    const screenEndAngle = itemRegion.endAngle + this.wheel.rotationAngle;

    this.dragState = {
      isDragging: true,
      dragMode,
      draggedItem: freshItem,
      draggedItemRegion: itemRegion,
      startMouseAngle,
      currentMouseAngle: startMouseAngle,
      initialStartAngle: screenStartAngle,
      initialEndAngle: screenEndAngle,
      previewStartAngle: screenStartAngle,
      previewEndAngle: screenEndAngle,
      targetRing: null,
      targetRingInfo: null,
    };

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
    const mouseAngle = this.normalizeAngle(rawMouseAngle);

    this.dragState.currentMouseAngle = mouseAngle;

    // Minimum activity size (1 week)
    const minWeekAngle = LayoutCalculator.degreesToRadians((7 / 365) * 360);

    if (this.dragState.dragMode === 'move') {
      // Detect target ring for switching
      const targetRingInfo = this.detectTargetRing(x, y);
      this.dragState.targetRingInfo = targetRingInfo;
      this.dragState.targetRing = targetRingInfo ? targetRingInfo.ring : null;

      // Calculate angle delta
      let angleDelta = mouseAngle - this.dragState.startMouseAngle;

      // Apply delta to both start and end
      this.dragState.previewStartAngle = this.normalizeAngle(
        this.dragState.initialStartAngle + angleDelta
      );
      this.dragState.previewEndAngle = this.normalizeAngle(
        this.dragState.initialEndAngle + angleDelta
      );
      
    } else if (this.dragState.dragMode === 'resize-start') {
      // Resize start edge
      let angleDelta = mouseAngle - this.dragState.startMouseAngle;
      let newStartAngle = this.normalizeAngle(this.dragState.initialStartAngle + angleDelta);

      this.dragState.previewEndAngle = this.dragState.initialEndAngle;

      // Enforce minimum span
      let span = this.dragState.previewEndAngle - newStartAngle;
      if (span < 0) span += Math.PI * 2;

      if (span >= minWeekAngle) {
        this.dragState.previewStartAngle = newStartAngle;
      }
      
    } else if (this.dragState.dragMode === 'resize-end') {
      // Resize end edge
      let angleDelta = mouseAngle - this.dragState.startMouseAngle;
      let newEndAngle = this.normalizeAngle(this.dragState.initialEndAngle + angleDelta);

      this.dragState.previewStartAngle = this.dragState.initialStartAngle;

      // Enforce minimum span
      let span = newEndAngle - this.dragState.previewStartAngle;
      if (span < 0) span += Math.PI * 2;

      if (span >= minWeekAngle) {
        this.dragState.previewEndAngle = newEndAngle;
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
  stopActivityDrag() {
    if (!this.dragState.isDragging) return;

    // Convert screen angles back to logical angles
    let logicalStartAngle = this.normalizeAngle(
      this.dragState.previewStartAngle - this.wheel.rotationAngle
    );
    let logicalEndAngle = this.normalizeAngle(
      this.dragState.previewEndAngle - this.wheel.rotationAngle
    );

    // Convert radians to degrees for angleToDate
    const startDegrees = LayoutCalculator.radiansToDegrees(logicalStartAngle);
    const endDegrees = LayoutCalculator.radiansToDegrees(logicalEndAngle);
    
    // Use wheel's angleToDate method which handles zoom levels and initAngle
    let newStartDate = this.wheel.angleToDate(startDegrees);
    let newEndDate = this.wheel.angleToDate(endDegrees);

    // Clamp to year boundaries
    const yearStart = new Date(this.wheel.year, 0, 1);
    const yearEnd = new Date(this.wheel.year, 11, 31);

    if (newStartDate < yearStart) newStartDate = yearStart;
    if (newStartDate > yearEnd) newStartDate = yearEnd;
    if (newEndDate < yearStart) newEndDate = yearStart;
    if (newEndDate > yearEnd) newEndDate = yearEnd;

    // Ensure end is after start
    if (newEndDate < newStartDate) {
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
    // Safety check - if no dragged item, just reset state and return
    if (!this.dragState.draggedItem) {
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
      this.wheel.canvas.style.cursor = 'default';
      this.wheel.create();
      return;
    }
    
    const updates = {
      startDate: formatDate(newStartDate),
      endDate: formatDate(newEndDate)
    };

    // Handle ring switching
    if (this.dragState.targetRing && 
        this.dragState.targetRing.id !== this.dragState.draggedItem.ringId) {
      updates.ringId = this.dragState.targetRing.id;
    }

    // Create updated item with new dates and potentially new ring
    const updatedItem = {
      ...this.dragState.draggedItem,
      ...updates
    };

    // OPTIMISTIC UPDATE: Store pending update so canvas uses new position immediately
    // This prevents phantom rendering at old position while waiting for React state update
    console.log('[InteractionHandler] Setting pending update for item:', updatedItem.id);
    console.log('[InteractionHandler] pendingItemUpdates before:', this.wheel.pendingItemUpdates.size);
    this.wheel.pendingItemUpdates.set(updatedItem.id, { item: updatedItem, renderCount: 0 });
    console.log('[InteractionHandler] pendingItemUpdates after:', this.wheel.pendingItemUpdates.size);
    
    // NOTE: We DON'T clear clickableItems here anymore
    // The rendering will use pending updates and rebuild clickableItems with correct positions

    // Notify parent of changes
    if (this.wheel.options?.onUpdateAktivitet) {
      this.wheel.options.onUpdateAktivitet(updatedItem);
    }

    // Reset drag state
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

    // Reset cursor
    this.canvas.style.cursor = 'default';

    // Trigger redraw
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

    // Handle hover (throttled)
    const now = Date.now();
    if (now - this.lastHoverCheck < this.hoverThrottleMs) {
      return;
    }
    this.lastHoverCheck = now;

    const { x, y } = this.getCanvasCoordinates(event);
    let newHoveredItem = null;
    let hoverZone = null;

    if (this.wheel.clickableItems) {
      for (const itemRegion of this.wheel.clickableItems) {
        if (this.isPointInItemRegion(x, y, itemRegion)) {
          // CRITICAL: Look up fresh item data - check pending updates first, then organizationData
          // This prevents hover from using stale position after drag (optimistic update)
          const itemFromData = this.wheel.organizationData.items.find(
            i => i.id === itemRegion.itemId
          );
          newHoveredItem = this.wheel.pendingItemUpdates.get(itemRegion.itemId) || itemFromData;
          hoverZone = this.detectDragZone(x, y, itemRegion);
          break;
        }
      }
    }

    // Update cursor based on hover zone
    if (hoverZone === 'resize-start' || hoverZone === 'resize-end') {
      this.canvas.style.cursor = 'ew-resize';
    } else if (hoverZone === 'move') {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }

    // Update hovered item if changed
    if (newHoveredItem?.id !== this.hoveredItem?.id) {
      this.hoveredItem = newHoveredItem;
      
      if (this.wheel.onHoverChange) {
        this.wheel.onHoverChange(newHoveredItem);
      }

      // Trigger redraw with throttling
      if (this.wheel.create && !this.wheel.hoverRedrawPending) {
        this.wheel.hoverRedrawPending = true;
        requestAnimationFrame(() => {
          if (this.wheel.create) this.wheel.create();
          this.wheel.hoverRedrawPending = false;
        });
      }
    }
  }

  handleMouseUp(event) {
    if (this.dragState.isDragging) {
      this.stopActivityDrag();
      return;
    }

    if (this.isRotating) {
      this.stopWheelRotation();
    }
  }

  handleMouseLeave(event) {
    if (this.dragState.isDragging) {
      this.stopActivityDrag();
    }

    if (this.isRotating) {
      this.stopWheelRotation();
    }

    this.canvas.style.cursor = 'default';
  }

  handleClick(event) {
    // Handle click events (for item selection, etc.)
    if (this.options.onItemClick) {
      const { x, y } = this.getCanvasCoordinates(event);
      
      if (this.wheel.clickableItems) {
        for (const itemRegion of this.wheel.clickableItems) {
          if (this.isPointInItemRegion(x, y, itemRegion)) {
            // CRITICAL: Look up fresh item data from organizationData (single source of truth)
            const freshItem = this.wheel.organizationData.items.find(
              i => i.id === itemRegion.itemId
            );
            
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
    
    this.isRotating = false;
    this.hoveredItem = null;
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
