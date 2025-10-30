/**
 * RenderEngine - Canvas rendering utilities for YearWheel
 * 
 * Provides reusable rendering functions for:
 * - Ring backgrounds and sections
 * - Text along curved paths
 * - Activity items with labels
 * - Month/week rings
 * - Drag previews
 * 
 * @license MIT
 */

import LayoutCalculator from './LayoutCalculator.js';

class RenderEngine {
  constructor(context, size, center, options = {}) {
    this.context = context;
    this.size = size;
    this.center = center;
    this.options = options;
    
    // Text measurement cache for performance
    this.textMeasurementCache = new Map();
  }

  // ============================================================================
  // COLOR UTILITIES
  // ============================================================================

  /**
   * Get contrasting text color (black/white) for a background color
   * @param {string} hexColor - Background color in hex format
   * @returns {string} '#FFFFFF' or '#0F172A'
   */
  getContrastColor(hexColor) {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate relative luminance (WCAG formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#0F172A' : '#FFFFFF';
  }

  /**
   * Get hover color for an activity (darken light colors, lighten dark colors)
   * @param {string} baseColor - Base color in hex format
   * @returns {string} Hover color
   */
  getHoverColor(baseColor) {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    let newR, newG, newB;
    if (luminance > 0.5) {
      // Light color - darken by 20%
      const darkenFactor = 0.8;
      newR = Math.round(r * darkenFactor);
      newG = Math.round(g * darkenFactor);
      newB = Math.round(b * darkenFactor);
    } else {
      // Dark color - lighten by 30%
      const lightenFactor = 1.3;
      newR = Math.min(255, Math.round(r * lightenFactor));
      newG = Math.min(255, Math.round(g * lightenFactor));
      newB = Math.min(255, Math.round(b * lightenFactor));
    }

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  // ============================================================================
  // BASIC SHAPE RENDERING
  // ============================================================================

  /**
   * Draw a circular ring background
   * @param {number} innerRadius - Inner radius
   * @param {number} outerRadius - Outer radius
   * @param {string} color - Fill color
   * @param {number} startAngle - Start angle in radians (optional, default 0)
   * @param {number} endAngle - End angle in radians (optional, default 2π)
   */
  drawRingBackground(innerRadius, outerRadius, color, startAngle = 0, endAngle = Math.PI * 2) {
    this.context.save();
    this.context.beginPath();
    
    // Outer arc
    this.context.arc(this.center.x, this.center.y, outerRadius, startAngle, endAngle, false);
    
    // Line to inner arc
    const innerStart = LayoutCalculator.polarToCartesian(
      this.center.x, 
      this.center.y, 
      innerRadius, 
      endAngle
    );
    this.context.lineTo(innerStart.x, innerStart.y);
    
    // Inner arc (reverse direction)
    this.context.arc(this.center.x, this.center.y, innerRadius, endAngle, startAngle, true);
    
    this.context.closePath();
    this.context.fillStyle = color;
    this.context.fill();
    
    this.context.restore();
  }

  /**
   * Draw a circular section (arc segment)
   * @param {number} innerRadius - Inner radius
   * @param {number} outerRadius - Outer radius
   * @param {number} startAngle - Start angle in degrees
   * @param {number} endAngle - End angle in degrees
   * @param {string} fillColor - Fill color
   * @param {string} strokeColor - Stroke color (optional)
   * @param {number} strokeWidth - Stroke width (optional)
   */
  drawArcSegment(innerRadius, outerRadius, startAngle, endAngle, fillColor, strokeColor = null, strokeWidth = 1) {
    this.context.save();
    
    const startAngleRad = LayoutCalculator.degreesToRadians(startAngle);
    const endAngleRad = LayoutCalculator.degreesToRadians(endAngle);
    
    this.context.beginPath();
    
    // Outer arc
    this.context.arc(this.center.x, this.center.y, outerRadius, startAngleRad, endAngleRad, false);
    
    // Inner arc (reverse)
    this.context.arc(this.center.x, this.center.y, innerRadius, endAngleRad, startAngleRad, true);
    
    this.context.closePath();
    
    // Fill
    this.context.fillStyle = fillColor;
    this.context.fill();
    
    // Stroke (optional)
    if (strokeColor) {
      this.context.strokeStyle = strokeColor;
      this.context.lineWidth = strokeWidth;
      this.context.stroke();
    }
    
    this.context.restore();
  }

  /**
   * Draw rounded rectangle
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} radius - Corner radius
   */
  roundRect(x, y, width, height, radius) {
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

  // ============================================================================
  // CURVED TEXT RENDERING
  // ============================================================================

  /**
   * Draw text along a circular arc
   * @param {string} text - Text to draw
   * @param {number} radius - Radius for text placement
   * @param {number} startAngle - Start angle in degrees
   * @param {number} endAngle - End angle in degrees
   * @param {Object} style - { fontSize, fontWeight, fontColor, textAlign }
   */
  drawCurvedText(text, radius, startAngle, endAngle, style = {}) {
    const {
      fontSize = this.size / 70,
      fontWeight = 'normal',
      fontColor = '#374151',
      textAlign = 'center'
    } = style;

    this.context.save();
    this.context.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
    this.context.fillStyle = fontColor;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    const angleRange = endAngle - startAngle;
    const midAngle = startAngle + angleRange / 2;

    // For short text, just center it
    if (text.length <= 3) {
      const angleRad = LayoutCalculator.degreesToRadians(midAngle);
      const pos = LayoutCalculator.polarToCartesian(this.center.x, this.center.y, radius, angleRad);
      
      this.context.translate(pos.x, pos.y);
      this.context.rotate(angleRad + Math.PI / 2);
      this.context.fillText(text, 0, 0);
    } else {
      // For longer text, place character by character along arc
      const charAngle = angleRange / text.length;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const angle = startAngle + (i + 0.5) * charAngle;
        const angleRad = LayoutCalculator.degreesToRadians(angle);
        const pos = LayoutCalculator.polarToCartesian(this.center.x, this.center.y, radius, angleRad);
        
        this.context.save();
        this.context.translate(pos.x, pos.y);
        this.context.rotate(angleRad + Math.PI / 2);
        this.context.fillText(char, 0, 0);
        this.context.restore();
      }
    }

    this.context.restore();
  }

  /**
   * Draw text perpendicular to arc (for activity names on inner rings)
   * @param {string} text - Text to draw
   * @param {number} radius - Radius for text placement
   * @param {number} midAngle - Middle angle in degrees
   * @param {Object} style - { fontSize, fontWeight, fontColor }
   */
  drawPerpendicularText(text, radius, midAngle, style = {}) {
    const {
      fontSize = this.size / 80,
      fontWeight = '600',
      fontColor = '#FFFFFF'
    } = style;

    this.context.save();
    this.context.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
    this.context.fillStyle = fontColor;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    const angleRad = LayoutCalculator.degreesToRadians(midAngle);
    const pos = LayoutCalculator.polarToCartesian(this.center.x, this.center.y, radius, angleRad);

    this.context.translate(pos.x, pos.y);
    this.context.rotate(angleRad + Math.PI / 2);

    // Measure text and wrap if needed
    const maxWidth = this.size / 10;
    const metrics = this.context.measureText(text);
    
    if (metrics.width > maxWidth) {
      // Simple truncation with ellipsis
      const truncated = this.truncateText(text, maxWidth);
      this.context.fillText(truncated, 0, 0);
    } else {
      this.context.fillText(text, 0, 0);
    }

    this.context.restore();
  }

  /**
   * Truncate text to fit within max width
   * @param {string} text - Text to truncate
   * @param {number} maxWidth - Maximum width
   * @returns {string} Truncated text
   */
  truncateText(text, maxWidth) {
    let truncated = text;
    let metrics = this.context.measureText(truncated + '...');
    
    while (metrics.width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
      metrics = this.context.measureText(truncated + '...');
    }
    
    return truncated + '...';
  }

  // ============================================================================
  // BADGE/INDICATOR RENDERING
  // ============================================================================

  /**
   * Draw a label badge on an activity
   * @param {Object} label - Label object { name, color }
   * @param {number} radius - Radius for badge placement
   * @param {number} angle - Angle in degrees
   */
  drawLabelBadge(label, radius, angle) {
    this.context.save();

    const fontSize = Math.max(this.size / 120, 8);
    const padding = fontSize * 0.4;
    const badgeHeight = fontSize + padding * 2;

    this.context.font = `600 ${fontSize}px Arial, sans-serif`;
    const textWidth = this.context.measureText(label.name).width;
    const badgeWidth = textWidth + padding * 2;

    const angleRad = LayoutCalculator.degreesToRadians(angle);
    const pos = LayoutCalculator.polarToCartesian(this.center.x, this.center.y, radius, angleRad);

    this.context.translate(pos.x, pos.y);
    this.context.rotate(angleRad + Math.PI / 2);

    // White border
    this.context.fillStyle = '#FFFFFF';
    this.context.strokeStyle = '#FFFFFF';
    this.context.lineWidth = 2;
    this.roundRect(-badgeWidth / 2 - 1, -badgeHeight / 2 - 1, badgeWidth + 2, badgeHeight + 2, fontSize * 0.3);
    this.context.fill();

    // Colored background
    this.context.fillStyle = label.color || '#94A3B8';
    this.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, fontSize * 0.3);
    this.context.fill();

    // Text
    this.context.fillStyle = this.getContrastColor(label.color || '#94A3B8');
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.fillText(label.name, 0, 0);

    this.context.restore();
  }

  /**
   * Draw a linked wheel indicator (chain icon)
   * @param {number} radius - Radius for icon placement
   * @param {number} angle - Angle in degrees
   */
  drawLinkedWheelIcon(radius, angle) {
    this.context.save();

    const iconSize = Math.max(this.size / 140, 10);
    const angleRad = LayoutCalculator.degreesToRadians(angle);
    const pos = LayoutCalculator.polarToCartesian(this.center.x, this.center.y, radius, angleRad);

    this.context.translate(pos.x, pos.y);
    this.context.rotate(angleRad + Math.PI / 2);

    // White circle background
    this.context.fillStyle = '#FFFFFF';
    this.context.beginPath();
    this.context.arc(0, 0, iconSize * 0.7, 0, Math.PI * 2);
    this.context.fill();

    // Blue border
    this.context.strokeStyle = '#3B82F6';
    this.context.lineWidth = 1.5;
    this.context.stroke();

    // Chain link icon
    this.context.strokeStyle = '#3B82F6';
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

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Clear canvas
   */
  clear() {
    this.context.clearRect(0, 0, this.size, this.size);
  }

  /**
   * Clear text measurement cache
   */
  clearCache() {
    this.textMeasurementCache.clear();
  }

  /**
   * Measure text width with caching
   * @param {string} text - Text to measure
   * @param {string} font - Font specification
   * @returns {number} Text width
   */
  measureText(text, font) {
    const cacheKey = `${text}-${font}`;
    
    if (this.textMeasurementCache.has(cacheKey)) {
      return this.textMeasurementCache.get(cacheKey);
    }
    
    this.context.save();
    this.context.font = font;
    const width = this.context.measureText(text).width;
    this.context.restore();
    
    this.textMeasurementCache.set(cacheKey, width);
    return width;
  }
}

// ES6 export
export default RenderEngine;
