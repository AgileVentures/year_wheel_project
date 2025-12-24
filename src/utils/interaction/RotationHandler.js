/**
 * RotationHandler - Manages wheel rotation interactions
 * 
 * Extracted from InteractionHandler.js
 * Handles wheel rotation via mouse drag on empty space
 * 
 * Created: 2024-12-24
 */

import AngleUtils from '../AngleUtils.js';

class RotationHandler {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
    
    // Rotation state
    this.isRotating = false;
    this.lastMouseAngle = 0;
    
    // Callbacks
    this.onRotationChange = options.onRotationChange || null;
    this.requestRedraw = options.requestRedraw || null;
  }

  /**
   * Get mouse angle relative to center
   * @param {MouseEvent} event - Mouse event
   * @param {Object} center - Canvas center {x, y}
   * @param {Function} getCanvasCoordinates - Function to convert event to canvas coords
   * @returns {number} Angle in radians
   */
  getMouseAngle(event, center, getCanvasCoordinates) {
    const { x, y } = getCanvasCoordinates(event);
    const dx = x - center.x;
    const dy = y - center.y;
    return Math.atan2(dy, dx);
  }

  /**
   * Start wheel rotation
   * @param {MouseEvent} event - Mouse event
   * @param {Object} center - Canvas center {x, y}
   * @param {Function} getCanvasCoordinates - Function to convert event to canvas coords
   * @param {boolean} isAnimating - Whether wheel is currently animating
   * @param {Function} stopSpinning - Function to stop animation
   */
  start(event, center, getCanvasCoordinates, isAnimating, stopSpinning) {
    if (isAnimating && stopSpinning) {
      stopSpinning();
    }

    this.isRotating = true;
    this.lastMouseAngle = this.getMouseAngle(event, center, getCanvasCoordinates);
    this.canvas.style.cursor = 'grabbing';
  }

  /**
   * Update wheel rotation
   * @param {MouseEvent} event - Mouse event
   * @param {Object} center - Canvas center {x, y}
   * @param {Function} getCanvasCoordinates - Function to convert event to canvas coords
   * @param {number} currentRotationAngle - Current wheel rotation angle
   * @returns {number|null} New rotation angle, or null if not rotating
   */
  update(event, center, getCanvasCoordinates, currentRotationAngle) {
    if (!this.isRotating) return null;

    const currentMouseAngle = this.getMouseAngle(event, center, getCanvasCoordinates);
    let angleDifference = currentMouseAngle - this.lastMouseAngle;

    // Normalize to shortest path
    while (angleDifference <= -Math.PI) angleDifference += Math.PI * 2;
    while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;

    const newRotationAngle = currentRotationAngle + angleDifference;
    this.lastMouseAngle = currentMouseAngle;

    // Trigger callback
    if (this.onRotationChange) {
      this.onRotationChange(newRotationAngle);
    }

    // Request redraw
    if (this.requestRedraw) {
      this.requestRedraw();
    }

    return newRotationAngle;
  }

  /**
   * Stop wheel rotation
   * @param {number} finalRotationAngle - Final rotation angle
   */
  stop(finalRotationAngle) {
    if (!this.isRotating) return;

    this.isRotating = false;
    this.canvas.style.cursor = 'default';

    // Trigger callback with final angle
    if (this.onRotationChange) {
      this.onRotationChange(finalRotationAngle);
    }
  }

  /**
   * Check if currently rotating
   * @returns {boolean}
   */
  isActive() {
    return this.isRotating;
  }

  /**
   * Reset rotation state
   */
  reset() {
    this.isRotating = false;
    this.lastMouseAngle = 0;
    this.canvas.style.cursor = 'default';
  }
}

export default RotationHandler;
