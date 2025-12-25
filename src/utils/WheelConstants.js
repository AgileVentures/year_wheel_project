/**
 * WheelConstants.js
 * 
 * Centralized constants for YearWheel visualization.
 * Eliminates magic numbers like `this.size / 70`, `this.size / 150` throughout the codebase.
 * 
 * Usage:
 *   const constants = new WheelConstants(size);
 *   const gap = constants.get('STANDARD_GAP');
 *   const bandWidth = constants.get('RING_NAME_BAND');
 * 
 * @created December 2025
 */

class WheelConstants {
  constructor(size) {
    this.size = size;
    
    /**
     * Proportional values (fractions of size)
     * Usage: this.size * PROPORTIONS[key]
     */
    this.PROPORTIONS = {
      // Core geometry
      MIN_RADIUS: 1/12,              // size / 12 - center circle radius
      STANDARD_GAP: 1/150,           // size / 150 - gap between elements
      
      // Ring dimensions
      MONTH_RING_WIDTH: 1/25,        // size / 25 - month ring thickness
      WEEK_RING_WIDTH: 1/35,         // size / 35 - week ring thickness
      OUTER_RING_WIDTH: 1/23,        // size / 23 - outer ring thickness (total height)
      RING_NAME_BAND: 1/70,          // size / 70 - ring name label band width
      TRACK_GAP: 1/2000,             // size / 2000 - gap between overlapping tracks
      
      // Font sizes (base values - may be scaled by zoom)
      FONT_SIZE_BASE: 1/75,          // size / 75 - base font size
      FONT_SIZE_MONTH: 1/40,         // size / 40 - month name font
      FONT_SIZE_WEEK: 1/70,          // size / 70 - week number font
      FONT_SIZE_YEAR: 1/30,          // size / 30 - center year font (base)
      FONT_SIZE_TITLE: 1/35,         // size / 35 - center title font
      FONT_SIZE_SMALL: 1/80,         // size / 80 - small labels
      FONT_SIZE_TINY: 1/120,         // size / 120 - tiny text (minimum readable)
      FONT_SIZE_DEPENDENCY: 1/70,    // size / 70 - dependency arrow labels
      
      // Line widths
      LINE_WIDTH_THIN: 1/400,        // size / 400 - thin lines (dependency arrows)
      LINE_WIDTH_MEDIUM: 1/200,      // size / 200 - medium lines
      LINE_WIDTH_THICK: 1/100,       // size / 100 - thick lines
      
      // Dashed line patterns
      DASH_LENGTH: 1/150,            // size / 150 - dash segment length
      DASH_GAP_SHORT: 1/200,         // size / 200 - short gap between dashes
      DASH_GAP_LONG: 1/250,          // size / 250 - longer gap for varied patterns
      
      // Arrows and icons
      ARROW_SIZE: 1/100,             // size / 100 - arrowhead size
      ICON_SIZE: 1/140,              // size / 140 - icon dimensions
      
      // Curve and arc modifiers
      CURVE_OFFSET: 1/20,            // size / 20 - bezier curve depth for dependency lines
    };

    /**
     * Text rendering thresholds
     * Values relative to size for determining text visibility/behavior
     */
    this.TEXT = {
      MIN_ARC_THRESHOLD: 0.003,      // Minimum arc length as fraction of size
      MIN_RADIAL_THRESHOLD: 0.002,   // Minimum radial height as fraction of size
      MAX_FONT_DISPLAY: 50,          // Maximum font size in pixels
      MIN_FONT_DISPLAY: 8,           // Minimum font size in pixels
      WRAP_THRESHOLD: 0.85,          // 85% of available width before wrapping
      TRUNCATION_SUFFIX: '...',      // Suffix for truncated text
    };

    /**
     * Animation settings (not size-dependent)
     */
    this.ANIMATION = {
      DEFAULT_SPEED: 0.15,           // rad/s - rotation animation speed
      HOVER_THROTTLE_MS: 16,         // ~60fps max for hover checks
      ROTATION_CALLBACK_THROTTLE: 100, // ms between rotation broadcasts
    };

    /**
     * Interaction settings
     */
    this.INTERACTION = {
      DRAG_ZONE_PIXELS: 15,          // Pixel distance for resize zone detection
      MIN_ITEM_ANGLE: (7 / 365) * 360, // Minimum 1 week width in degrees (~5.75°)
      CLICK_TOLERANCE_MS: 200,       // Max time for click vs drag detection
    };

    /**
     * Color defaults
     */
    this.COLORS = {
      TEXT_DEFAULT: '#374151',       // Dark gray for readability
      RING_NAME_BACKGROUND: '#FFFFFF',
      RING_NAME_TEXT: '#0F172A',     // Very dark for contrast
      MONTH_RING: ['#334155', '#3B4252'], // Alternating dark grays
      WEEK_RING: '#94A3B8',          // Lighter gray
    };

    /**
     * Binary search iterations for font sizing
     */
    this.FONT_SEARCH_ITERATIONS = 10;
  }

  /**
   * Get a proportional value (size * proportion)
   * @param {string} key - Key from PROPORTIONS
   * @returns {number} Calculated value
   */
  get(key) {
    if (!(key in this.PROPORTIONS)) {
      console.warn(`WheelConstants: Unknown proportion key "${key}"`);
      return 0;
    }
    return this.size * this.PROPORTIONS[key];
  }

  /**
   * Get a text-related constant
   * @param {string} key - Key from TEXT
   * @returns {number|string} Constant value
   */
  getText(key) {
    if (!(key in this.TEXT)) {
      console.warn(`WheelConstants: Unknown text key "${key}"`);
      return 0;
    }
    return this.TEXT[key];
  }

  /**
   * Get text threshold as actual size value
   * @param {string} key - Threshold key (MIN_ARC_THRESHOLD, MIN_RADIAL_THRESHOLD)
   * @returns {number} Threshold in pixels
   */
  getTextThreshold(key) {
    const value = this.TEXT[key];
    if (typeof value !== 'number') return 0;
    return this.size * value;
  }

  /**
   * Get an animation constant
   * @param {string} key - Key from ANIMATION
   * @returns {number} Constant value
   */
  getAnimation(key) {
    return this.ANIMATION[key];
  }

  /**
   * Get an interaction constant
   * @param {string} key - Key from INTERACTION
   * @returns {number} Constant value
   */
  getInteraction(key) {
    return this.INTERACTION[key];
  }

  /**
   * Get a color constant
   * @param {string} key - Key from COLORS
   * @returns {string|Array} Color value
   */
  getColor(key) {
    return this.COLORS[key];
  }

  /**
   * Calculate font size with zoom applied
   * @param {string} key - Proportion key for base font size
   * @param {number} zoomLevel - Zoom percentage (50-200)
   * @returns {number} Scaled font size
   */
  getFontSize(key, zoomLevel = 100) {
    const baseFontSize = this.get(key);
    // At lower zoom, text should be proportionally larger on canvas
    // to remain readable at smaller display sizes
    const zoomFactor = 100 / zoomLevel;
    let scaledSize = baseFontSize * zoomFactor;
    
    // Clamp to min/max
    scaledSize = Math.max(this.TEXT.MIN_FONT_DISPLAY, scaledSize);
    scaledSize = Math.min(this.TEXT.MAX_FONT_DISPLAY, scaledSize);
    
    return scaledSize;
  }

  /**
   * Get dash pattern array for dashed lines
   * @param {string} pattern - 'short', 'medium', 'long'
   * @returns {Array<number>} Dash pattern for setLineDash
   */
  getDashPattern(pattern = 'medium') {
    const dash = this.get('DASH_LENGTH');
    const shortGap = this.get('DASH_GAP_SHORT');
    const longGap = this.get('DASH_GAP_LONG');
    
    switch (pattern) {
      case 'short':
        return [dash / 2, shortGap];
      case 'long':
        return [dash * 1.5, longGap];
      case 'medium':
      default:
        return [dash, shortGap];
    }
  }

  /**
   * Update size and recalculate all values
   * @param {number} newSize - New canvas size
   */
  updateSize(newSize) {
    this.size = newSize;
  }

  /**
   * Debug helper: log all calculated values
   */
  debug() {
    console.group('WheelConstants (size: ' + this.size + ')');
    console.log('=== Proportional Values ===');
    Object.keys(this.PROPORTIONS).forEach(key => {
      console.log(`${key}: ${this.get(key).toFixed(2)}px`);
    });
    console.log('=== Text Settings ===');
    Object.entries(this.TEXT).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.groupEnd();
  }
}

export default WheelConstants;
