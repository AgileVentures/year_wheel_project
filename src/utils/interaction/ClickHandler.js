/**
 * ClickHandler - Manages click detection and item selection
 * 
 * Extracted from InteractionHandler.js
 * Distinguishes clicks from drags and handles item click events
 * 
 * Created: 2024-12-24
 */

class ClickHandler {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
    
    // Click detection state
    this.mouseDownPos = null;
    this.mouseDownTime = 0;
    this.mouseDownItem = null;
    this.mouseDownDragMode = null;
    this.dragJustCompleted = false;
    
    // Thresholds
    this.CLICK_THRESHOLD_PX = options.clickThresholdPx || 5;
    this.CLICK_TIMEOUT_MS = options.clickTimeoutMs || 300;
    
    // Callbacks
    this.onItemClick = options.onItemClick || null;
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
   * Record mouse down for click detection
   * @param {MouseEvent} event - Mouse event
   * @param {Object|null} item - Item at mouse down position
   * @param {string|null} dragMode - Detected drag mode
   */
  recordMouseDown(event, item, dragMode) {
    this.mouseDownPos = { x: event.clientX, y: event.clientY };
    this.mouseDownTime = Date.now();
    this.mouseDownItem = item;
    this.mouseDownDragMode = dragMode;
    this.dragJustCompleted = false;
  }

  /**
   * Check if mouse movement qualifies as a drag (not a click)
   * @param {MouseEvent} event - Current mouse event
   * @returns {boolean} True if movement exceeds click threshold
   */
  isDragMovement(event) {
    if (!this.mouseDownPos) return false;
    
    const dx = event.clientX - this.mouseDownPos.x;
    const dy = event.clientY - this.mouseDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance > this.CLICK_THRESHOLD_PX;
  }

  /**
   * Mark that a drag just completed (prevent click)
   */
  markDragCompleted() {
    this.dragJustCompleted = true;
  }

  /**
   * Handle click event
   * @param {MouseEvent} event - Mouse event
   * @param {Object} context - Context object with:
   *   - getCanvasCoordinates: Function to convert event to canvas coords
   *   - clickableItems: Array of clickable item regions
   *   - wheelStructure: Wheel structure data
   *   - pendingItemUpdates: Map of pending updates
   *   - center: Canvas center {x, y}
   *   - rotationAngle: Current wheel rotation
   *   - hadDragInCurrentCycle: Flag if drag happened in cycle
   *   - skipNextClick: Flag to skip click
   *   - justFinishedDrag: Flag if drag just finished
   * @returns {boolean} True if click was handled
   */
  handleClick(event, context) {
    // Block click if drag happened
    if (context.hadDragInCurrentCycle || this.dragJustCompleted) {
      return false;
    }
    
    if (context.skipNextClick) {
      context.skipNextClick = false;
      return false;
    }

    if (context.justFinishedDrag) {
      return false;
    }

    // Handle item click
    if (this.onItemClick) {
      const { x, y } = context.getCanvasCoordinates(event);
      
      if (context.clickableItems) {
        for (const itemRegion of context.clickableItems) {
          if (this.isPointInItemRegion(x, y, itemRegion, context.center, context.rotationAngle)) {
            // Handle cluster click
            if (itemRegion.clusterData) {
              this.onItemClick(itemRegion.clusterData, {
                x: event.clientX,
                y: event.clientY
              }, event);
              return true;
            }
            
            // Look up item data
            const pendingEntry = context.pendingItemUpdates.get(itemRegion.itemId);
            const freshItemFromData = context.wheelStructure.items.find(
              (i) => i.id === itemRegion.itemId
            );
            const freshItem = pendingEntry ? pendingEntry.item : freshItemFromData;
            
            if (freshItem) {
              this.onItemClick(freshItem, {
                x: event.clientX,
                y: event.clientY
              }, event);
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Clear click detection state
   */
  clear() {
    this.mouseDownPos = null;
    this.mouseDownTime = 0;
    this.mouseDownItem = null;
    this.mouseDownDragMode = null;
    this.dragJustCompleted = false;
  }

  /**
   * Reset click handler state
   */
  reset() {
    this.clear();
  }

  /**
   * Get mouse down item
   * @returns {Object|null}
   */
  getMouseDownItem() {
    return this.mouseDownItem;
  }

  /**
   * Get detected drag mode from mouse down
   * @returns {string|null}
   */
  getMouseDownDragMode() {
    return this.mouseDownDragMode;
  }
}

export default ClickHandler;
