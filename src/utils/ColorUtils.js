/**
 * ColorUtils.js
 * 
 * Centralized color utility functions used across the YearWheel application.
 * Extracted from RenderEngine.js and YearWheelClass.js to eliminate code duplication.
 * 
 * Created: 2024-12-24
 */

class ColorUtils {
  /**
   * Get contrasting text color (black/white) for a background color
   * @param {string} hexColor - Background color in hex format
   * @returns {string} '#FFFFFF' or '#0F172A'
   */
  static getContrastColor(hexColor) {
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
   * @returns {string} Hover color in hex format
   */
  static getHoverColor(baseColor) {
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

  /**
   * Convert hex color to RGB object
   * @param {string} hexColor - Hex color string
   * @returns {{r: number, g: number, b: number}} RGB values (0-255)
   */
  static hexToRgb(hexColor) {
    const hex = hexColor.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }

  /**
   * Convert RGB values to hex color
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {string} Hex color string
   */
  static rgbToHex(r, g, b) {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Get relative luminance of a color (WCAG formula)
   * @param {string} hexColor - Hex color string
   * @returns {number} Luminance value (0-1)
   */
  static getLuminance(hexColor) {
    const { r, g, b } = this.hexToRgb(hexColor);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
}

export default ColorUtils;
