/**
 * AngleUtils.js
 * 
 * Centralized angle utility functions used across the YearWheel application.
 * Extracted from InteractionHandler.js and LayoutCalculator.js to eliminate code duplication.
 * 
 * Created: 2024-12-24
 */

class AngleUtils {
  /**
   * Normalize angle to 0-2π range (radians)
   * @param {number} angle - Angle in radians
   * @returns {number} Normalized angle (0 to 2π)
   */
  static normalizeRadians(angle) {
    let normalized = angle;
    while (normalized < 0) normalized += Math.PI * 2;
    while (normalized >= Math.PI * 2) normalized -= Math.PI * 2;
    return normalized;
  }

  /**
   * Normalize angle to 0-360 range (degrees)
   * @param {number} degrees - Angle in degrees
   * @returns {number} Normalized angle (0 to 360)
   */
  static normalizeDegrees(degrees) {
    let normalized = degrees % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
  }

  /**
   * Convert radians to degrees
   * @param {number} radians - Angle in radians
   * @returns {number} Angle in degrees
   */
  static radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
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
   * Calculate shortest angular distance between two angles (radians)
   * @param {number} from - Start angle in radians
   * @param {number} to - End angle in radians
   * @returns {number} Shortest angular distance (-π to π)
   */
  static angleDifferenceRadians(from, to) {
    const diff = this.normalizeRadians(to - from);
    return diff > Math.PI ? diff - Math.PI * 2 : diff;
  }

  /**
   * Calculate shortest angular distance between two angles (degrees)
   * @param {number} from - Start angle in degrees
   * @param {number} to - End angle in degrees
   * @returns {number} Shortest angular distance (-180 to 180)
   */
  static angleDifferenceDegrees(from, to) {
    const diff = this.normalizeDegrees(to - from);
    return diff > 180 ? diff - 360 : diff;
  }
}

export default AngleUtils;
