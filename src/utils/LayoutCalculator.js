/**
 * LayoutCalculator - Geometric calculations for circular calendar layout
 * Inspired by Circalify's architecture but adapted for YearWheel's needs
 * 
 * Handles:
 * - Ring boundary calculations (inner/outer radius)
 * - Date-to-angle conversions
 * - ISO week number generation
 * - Polar/Cartesian coordinate conversions
 * - Month/quarter segment generation
 * 
 * @license MIT
 */

import AngleUtils from './AngleUtils.js';

class LayoutCalculator {
  // ============================================================================
  // CONSTANTS
  // ============================================================================
  
  static FULL_CIRCLE = 2 * Math.PI;
  static HALF_CIRCLE = Math.PI;
  static QUARTER_CIRCLE = Math.PI / 2;
  static ANGLE_OFFSET_TOP = -Math.PI / 2; // -90° (12 o'clock position)
  
  static MS_PER_DAY = 86400000;
  static DAYS_PER_WEEK = 7;
  static MONTHS_PER_YEAR = 12;
  static MONTHS_PER_QUARTER = 3;
  static QUARTERS_PER_YEAR = 4;
  static ISO_WEEK_THURSDAY_OFFSET = 4;
  
  static MONTH_NAMES_SV = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
  ];
  
  static MONTH_NAMES_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // ============================================================================
  // RING BOUNDARY CALCULATIONS
  // ============================================================================

  /**
   * Calculate ring boundaries for all rings
   * @param {Array} rings - Array of ring configurations
   * @param {number} minRadius - Innermost radius (center circle)
   * @param {number} maxRadius - Outermost radius (before outer rings)
   * @param {number} size - Canvas size
   * @param {Object} options - Additional options (showWeekRing, showMonthRing)
   * @returns {Object} { innerRingBoundaries, monthRingBounds, weekRingBounds, outerRingBoundaries }
   */
  static calculateRingBoundaries(rings, minRadius, maxRadius, size, options = {}) {
    const standardGap = size / 150;
    const { showWeekRing = true, showMonthRing = true } = options;
    
    // Filter visible rings by type
    const visibleInnerRings = rings.filter(r => r.visible && r.type === 'inner');
    const visibleOuterRings = rings.filter(r => r.visible && r.type === 'outer');
    
    // Calculate month and week ring dimensions
    const monthRingWidth = showMonthRing ? size / 25 : 0;
    const weekRingWidth = showWeekRing ? size / 35 : 0;
    
    const monthRingStart = maxRadius - monthRingWidth - standardGap;
    const weekRingStart = monthRingStart - weekRingWidth - standardGap;
    
    const monthRingBounds = showMonthRing 
      ? { startRadius: monthRingStart, endRadius: maxRadius - standardGap }
      : null;
      
    const weekRingBounds = showWeekRing
      ? { startRadius: weekRingStart, endRadius: monthRingStart - standardGap }
      : null;
    
    // Calculate available space for inner rings
    const innerRingEnd = weekRingStart - standardGap;
    const availableSpaceForInnerRings = innerRingEnd - minRadius;
    
    // Calculate inner ring boundaries (proportional distribution)
    const innerRingBoundaries = [];
    if (visibleInnerRings.length > 0) {
      const spacePerRing = availableSpaceForInnerRings / visibleInnerRings.length;
      
      visibleInnerRings.forEach((ring, index) => {
        const startRadius = minRadius + (index * spacePerRing);
        const endRadius = minRadius + ((index + 1) * spacePerRing) - standardGap;
        
        innerRingBoundaries.push({
          ring,
          startRadius,
          endRadius,
          center: (startRadius + endRadius) / 2,
          index
        });
      });
    }
    
    // Calculate outer ring boundaries (fixed width, extending outward)
    const outerRingBoundaries = [];
    if (visibleOuterRings.length > 0) {
      const outerRingWidth = size / 23;
      
      visibleOuterRings.forEach((ring, index) => {
        const startRadius = maxRadius + standardGap + (index * (outerRingWidth + standardGap));
        const endRadius = startRadius + outerRingWidth;
        
        outerRingBoundaries.push({
          ring,
          startRadius,
          endRadius,
          center: (startRadius + endRadius) / 2,
          index
        });
      });
    }
    
    return {
      innerRingBoundaries,
      monthRingBounds,
      weekRingBounds,
      outerRingBoundaries,
      standardGap
    };
  }

  /**
   * Calculate maximum radius dynamically based on outer rings
   * @param {number} size - Canvas size
   * @param {Array} rings - Array of ring configurations
   * @returns {number} Maximum radius for inner content
   */
  static calculateMaxRadius(size, rings) {
    const visibleOuterRings = rings.filter(r => r.visible && r.type === 'outer');
    
    if (visibleOuterRings.length === 0) {
      // No outer rings: maximize space
      return size / 2 - size / 50;
    } else {
      // Has outer rings: shrink slightly to make room
      const outerRingSpace = visibleOuterRings.length * (size / 23);
      const shrinkAmount = outerRingSpace * 0.6;
      const padding = size / 60;
      
      return size / 2 - padding - shrinkAmount;
    }
  }

  // ============================================================================
  // DATE-TO-ANGLE CONVERSIONS
  // ============================================================================

  /**
   * Convert a date to an angle (0-360°) within a year
   * Uses proportional month-day calculation for accurate positioning
   * @param {Date} date - Date object
   * @param {number} rotationOffset - Additional rotation offset in degrees (default: -105)
   * @returns {number} Angle in degrees (0-360)
   */
  static dateToAngle(date, rotationOffset = -105) {
    const month = date.getMonth(); // 0-11
    const dayOfMonth = date.getDate();
    const daysInMonth = this.getDaysInMonth(date.getFullYear(), month);
    
    // Proportional angle within the year (30° per month)
    const angleInDegrees = month * 30 + ((dayOfMonth - 1) / daysInMonth) * 30;
    
    // Apply rotation offset
    return angleInDegrees + rotationOffset;
  }

  /**
   * Convert angle (degrees) to approximate date
   * @param {number} angleDegrees - Angle in degrees
   * @param {number} year - Year
   * @param {number} rotationOffset - Rotation offset in degrees (default: -105)
   * @returns {Date} Approximate date
   */
  static angleToDate(angleDegrees, year, rotationOffset = -105) {
    // Remove rotation offset
    const normalizedAngle = angleDegrees - rotationOffset;
    
    // Calculate month (0-11)
    const monthFloat = normalizedAngle / 30;
    const month = Math.floor(monthFloat) % 12;
    
    // Calculate day within month
    const monthProgress = monthFloat - Math.floor(monthFloat);
    const daysInMonth = this.getDaysInMonth(year, month);
    const dayOfMonth = Math.max(1, Math.min(daysInMonth, Math.ceil(monthProgress * daysInMonth)));
    
    return new Date(year, month, dayOfMonth);
  }

  /**
   * Get number of days in a specific month
   * @param {number} year - Year
   * @param {number} month - Month (0-11)
   * @returns {number} Days in month
   */
  static getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Get total days in a year
   * @param {number} year - Year
   * @returns {number} 365 or 366 for leap years
   */
  static getDaysInYear(year) {
    return this.isLeapYear(year) ? 366 : 365;
  }

  /**
   * Check if a year is a leap year
   * @param {number} year - Year
   * @returns {boolean} True if leap year
   */
  static isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Get day of year (1-365/366)
   * @param {Date} date - Date object
   * @returns {number} Day number within year
   */
  static getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = this.MS_PER_DAY;
    return Math.floor(diff / oneDay);
  }

  // ============================================================================
  // ISO WEEK NUMBER CALCULATIONS
  // ============================================================================

  /**
   * Get ISO week number for a date
   * Returns { year, week }
   * @param {Date} date - Date object
   * @returns {Object} { year, week }
   */
  static getISOWeek(date) {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    tempDate.setDate(tempDate.getDate() + this.ISO_WEEK_THURSDAY_OFFSET - (tempDate.getDay() || 7));
    
    // Get first day of year
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil(((tempDate - yearStart) / this.MS_PER_DAY + 1) / 7);
    
    return { year: tempDate.getFullYear(), week: weekNo };
  }

  /**
   * Get the Monday (start) of a given ISO week
   * @param {number} year - Year
   * @param {number} week - ISO week number
   * @returns {Date} Monday of the week
   */
  static getWeekStart(year, week) {
    // January 4th is always in week 1
    const jan4 = new Date(year, 0, 4);
    
    // Get the Monday of week 1
    const dayOffset = (jan4.getDay() || 7) - 1; // 0=Mon, 6=Sun
    const week1Monday = new Date(jan4.getTime() - dayOffset * this.MS_PER_DAY);
    
    // Add (week - 1) weeks
    const weekStart = new Date(week1Monday.getTime() + (week - 1) * 7 * this.MS_PER_DAY);
    
    return weekStart;
  }

  /**
   * Generate all ISO weeks for a given year
   * @param {number} year - Year
   * @returns {Array<string>} Array of week numbers as strings
   */
  static generateWeeks(year) {
    const weeks = [];
    
    // Helper function to get ISO week number
    const getISOWeek = (date) => {
      const tempDate = new Date(date.getTime());
      tempDate.setHours(0, 0, 0, 0);
      tempDate.setDate(tempDate.getDate() + this.ISO_WEEK_THURSDAY_OFFSET - (tempDate.getDay() || 7));
      const yearStart = new Date(tempDate.getFullYear(), 0, 1);
      const weekNo = Math.ceil(((tempDate - yearStart) / this.MS_PER_DAY + 1) / 7);
      return weekNo;
    };
    
    // Helper function to get the year that the ISO week belongs to
    const getISOWeekYear = (date) => {
      const tempDate = new Date(date.getTime());
      tempDate.setDate(tempDate.getDate() + this.ISO_WEEK_THURSDAY_OFFSET - (tempDate.getDay() || 7));
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
        if (!seenWeeks.has(isoWeek) && weeks.length < 53) {
          seenWeeks.add(isoWeek);
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

  // ============================================================================
  // MONTH/QUARTER SEGMENT GENERATION
  // ============================================================================

  /**
   * Get month segments with start/end days
   * @param {number} year - Year
   * @returns {Array<Object>} Array of { month, name, startDay, endDay, daysInMonth }
   */
  static getMonthSegments(year, locale = 'sv') {
    const monthNames = locale === 'en' ? this.MONTH_NAMES_EN : this.MONTH_NAMES_SV;
    const segments = [];
    let dayCounter = 1;
    
    for (let month = 0; month < this.MONTHS_PER_YEAR; month++) {
      const daysInMonth = this.getDaysInMonth(year, month);
      const startDay = dayCounter;
      const endDay = dayCounter + daysInMonth - 1;
      
      segments.push({
        month,
        name: monthNames[month],
        startDay,
        endDay,
        daysInMonth
      });
      
      dayCounter += daysInMonth;
    }
    
    return segments;
  }

  /**
   * Get quarter segments with start/end days
   * @param {number} year - Year
   * @returns {Array<Object>} Array of { quarter, startDay, endDay, months, daysInQuarter }
   */
  static getQuarterSegments(year) {
    const segments = [];
    const monthSegments = this.getMonthSegments(year);
    
    for (let quarter = 0; quarter < this.QUARTERS_PER_YEAR; quarter++) {
      const quarterMonthStart = quarter * this.MONTHS_PER_QUARTER;
      const quarterMonths = monthSegments.slice(quarterMonthStart, quarterMonthStart + this.MONTHS_PER_QUARTER);
      
      const startDay = quarterMonths[0].startDay;
      const endDay = quarterMonths[quarterMonths.length - 1].endDay;
      const daysInQuarter = endDay - startDay + 1;
      
      segments.push({
        quarter: quarter + 1, // 1-4
        startDay,
        endDay,
        months: quarterMonths.map(m => m.month),
        daysInQuarter
      });
    }
    
    return segments;
  }

  /**
   * Get week segments with start/end days
   * @param {number} year - Year
   * @returns {Array<Object>} Array of { week, startDay, endDay, days }
   */
  static getWeekSegments(year) {
    const segments = [];
    const weeks = this.generateWeeks(year);
    
    weeks.forEach((weekStr, index) => {
      const weekNumber = parseInt(weekStr);
      const weekStart = this.getWeekStart(year, weekNumber);
      const weekEnd = new Date(weekStart.getTime() + 6 * this.MS_PER_DAY);
      
      const startDay = this.getDayOfYear(weekStart);
      const endDay = this.getDayOfYear(weekEnd);
      
      segments.push({
        week: weekNumber,
        startDay,
        endDay,
        days: 7
      });
    });
    
    return segments;
  }

  // ============================================================================
  // POLAR/CARTESIAN CONVERSIONS
  // ============================================================================

  /**
   * Convert polar coordinates to Cartesian
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} radius - Distance from center
   * @param {number} angleRadians - Angle in radians
   * @returns {Object} { x, y }
   */
  static polarToCartesian(cx, cy, radius, angleRadians) {
    return {
      x: cx + radius * Math.cos(angleRadians),
      y: cy + radius * Math.sin(angleRadians)
    };
  }

  /**
   * Convert Cartesian coordinates to polar
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} x - Point X
   * @param {number} y - Point Y
   * @returns {Object} { radius, angle }
   */
  static cartesianToPolar(cx, cy, x, y) {
    const dx = x - cx;
    const dy = y - cy;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    return { radius, angle };
  }

  /**
   * Normalize angle to 0-360 range
   * @param {number} degrees - Angle in degrees
   * @returns {number} Normalized angle (0-360)
   */
  static normalizeAngle(degrees) {
    return AngleUtils.normalizeDegrees(degrees);
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  static degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   * @param {number} radians - Angle in radians
   * @returns {number} Angle in degrees
   */
  static radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  // ============================================================================
  // ARC PATH GENERATION
  // ============================================================================

  /**
   * Create SVG arc path
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} innerRadius - Inner radius
   * @param {number} outerRadius - Outer radius
   * @param {number} startAngle - Start angle in radians
   * @param {number} endAngle - End angle in radians
   * @returns {string} SVG path string
   */
  static createArcPath(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    
    const innerStart = this.polarToCartesian(cx, cy, innerRadius, startAngle);
    const innerEnd = this.polarToCartesian(cx, cy, innerRadius, endAngle);
    const outerStart = this.polarToCartesian(cx, cy, outerRadius, startAngle);
    const outerEnd = this.polarToCartesian(cx, cy, outerRadius, endAngle);
    
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      'Z'
    ].join(' ');
  }

  /**
   * Calculate center point coordinates
   * @param {number} outerRadius - Outermost radius
   * @param {number} viewBoxPadding - Padding around visualization
   * @returns {Object} { cx, cy, viewBoxSize }
   */
  static calculateCenter(outerRadius, viewBoxPadding = 20) {
    const viewBoxSize = (outerRadius + viewBoxPadding) * 2;
    const cx = viewBoxSize / 2;
    const cy = viewBoxSize / 2;
    
    return { cx, cy, viewBoxSize };
  }
}

// ES6 export
export default LayoutCalculator;
