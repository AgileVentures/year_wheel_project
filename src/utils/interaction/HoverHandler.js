/**
 * HoverHandler - Manages hover detection and cursor management
 * 
 * Extracted from InteractionHandler.js
 * Handles item hover detection, cursor updates, and hover state management
 * 
 * Created: 2024-12-24
 */

class HoverHandler {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
    
    // Hover state
    this.hoveredItem = null;
    this.lastHoverCheck = 0;
    this.hoverThrottleMs = options.hoverThrottleMs || 16; // ~60fps
    
    // Callbacks
    this.onHoverChange = options.onHoverChange || null;
    this.requestRedraw = options.requestRedraw || null;
  }

  /**
   * Check if point is inside item region
   * @param {number} x - Canvas X coordinate
   * @param {number} y - Canvas Y coordinate
   * @param {Object} itemRegion - Item region data
   * @param {Object} center - Canvas center {x, y}
   * @param {number} rotationAngle - Current wheel rotation angle
   * @returns {boolean}
   */
  isPointInItemRegion(x, y, itemRegion, center, rotationAngle) {
    const dx = x - center.x;
    const dy = y - center.y;
    const clickRadius = Math.sqrt(dx * dx + dy * dy);
    let clickAngle = Math.atan2(dy, dx);

    // Account for rotation
    clickAngle -= rotationAngle;
    
    // Normalize angles
    const normalizeAngle = (angle) => {
      let normalized = angle;
      while (normalized < 0) normalized += Math.PI * 2;
      while (normalized >= Math.PI * 2) normalized -= Math.PI * 2;
      return normalized;
    };
    
    clickAngle = normalizeAngle(clickAngle);

    // Check radius
    if (clickRadius < itemRegion.startRadius || clickRadius > itemRegion.endRadius) {
      return false;
    }

    // Normalize item angles
    let startAngle = normalizeAngle(itemRegion.startAngle);
    let endAngle = normalizeAngle(itemRegion.endAngle);

    // Check angle (handle wraparound)
    if (startAngle <= endAngle) {
      return clickAngle >= startAngle && clickAngle <= endAngle;
    } else {
      return clickAngle >= startAngle || clickAngle <= endAngle;
    }
  }

  /**
   * Update hover state based on mouse position
   * @param {MouseEvent} event - Mouse event
   * @param {Object} context - Context object with:
   *   - getCanvasCoordinates: Function to convert event to canvas coords
   *   - clickableItems: Array of clickable item regions
   *   - wheelStructure: Wheel structure data
   *   - pendingItemUpdates: Map of pending updates
   *   - center: Canvas center {x, y}
   *   - rotationAngle: Current wheel rotation
   *   - year: Current year
   *   - zoomedMonth: Zoomed month (or null)
   *   - zoomedQuarter: Zoomed quarter (or null)
   *   - detectDragZone: Function to detect drag zone
   * @returns {Object|null} New hovered item or null
   */
  update(event, context) {
    // Throttle hover checks
    const now = Date.now();
    if (now - this.lastHoverCheck < this.hoverThrottleMs) {
      return this.hoveredItem;
    }
    this.lastHoverCheck = now;

    const { x, y } = context.getCanvasCoordinates(event);
    let newHoveredItem = null;
    let hoverZone = null;

    const clickableItems = context.clickableItems || [];
    
    // Find hovered item
    for (const itemRegion of clickableItems) {
      if (this.isPointInItemRegion(x, y, itemRegion, context.center, context.rotationAngle)) {
        const pendingEntry = context.pendingItemUpdates.get(itemRegion.itemId);
        const itemFromData = context.wheelStructure.items.find(
          (i) => i.id === itemRegion.itemId
        );
        const resolvedItem = pendingEntry ? pendingEntry.item : itemFromData;

        if (resolvedItem) {
          const startYear = new Date(resolvedItem.startDate).getFullYear();
          const inViewYear = startYear === parseInt(context.year, 10);
          const zoomActive = context.zoomedMonth !== null || context.zoomedQuarter !== null;

          if ((zoomActive || inViewYear) && !resolvedItem.isCluster) {
            newHoveredItem = resolvedItem;
            hoverZone = context.detectDragZone(x, y, itemRegion);
          }
        }

        break;
      }
    }

    // Update cursor based on hover zone
    this.updateCursor(newHoveredItem, hoverZone);

    // Check if hover changed
    const prevId = this.hoveredItem ? this.hoveredItem.id : null;
    const nextId = newHoveredItem ? newHoveredItem.id : null;

    if (prevId !== nextId) {
      this.hoveredItem = newHoveredItem;

      // Trigger callback
      if (this.onHoverChange) {
        this.onHoverChange(newHoveredItem);
      }

      // Request redraw
      if (this.requestRedraw) {
        this.requestRedraw();
      }
    }

    return newHoveredItem;
  }

  /**
   * Update cursor based on hover state
   * @param {Object|null} hoveredItem - Currently hovered item
   * @param {string|null} hoverZone - Hover zone ('resize-start', 'move', 'resize-end')
   */
  updateCursor(hoveredItem, hoverZone) {
    let newCursor = 'default';
    
    if (hoveredItem) {
      if (hoverZone === 'resize-start' || hoverZone === 'resize-end') {
        newCursor = 'ew-resize';
      } else {
        newCursor = 'grab';
      }
    }

    if (this.canvas.style.cursor !== newCursor) {
      this.canvas.style.cursor = newCursor;
    }
  }

  /**
   * Clear hover state
   */
  clear() {
    if (this.hoveredItem) {
      this.hoveredItem = null;
      this.canvas.style.cursor = 'default';
      
      if (this.onHoverChange) {
        this.onHoverChange(null);
      }
      
      if (this.requestRedraw) {
        this.requestRedraw();
      }
    }
  }

  /**
   * Get current hovered item
   * @returns {Object|null}
   */
  getHoveredItem() {
    return this.hoveredItem;
  }

  /**
   * Reset hover state
   */
  reset() {
    this.hoveredItem = null;
    this.lastHoverCheck = 0;
    this.canvas.style.cursor = 'default';
  }
}

export default HoverHandler;
