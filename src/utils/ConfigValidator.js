/**
 * ConfigValidator.js
 * 
 * Validates and normalizes organizationData structure for YearWheel.
 * Ensures data integrity and provides sensible defaults.
 * 
 * Expected Structure:
 * {
 *   rings: [{ id, name, type: 'inner'|'outer', visible, orientation }],
 *   activityGroups: [{ id, name, color, visible }],
 *   labels: [{ id, name, color, visible }],
 *   items: [{ id, name, startDate, endDate, ringId, activityId, labelId }]
 * }
 * 
 * Created: 2025-10-30
 */

class ConfigValidator {
  /**
   * Validate and normalize organizationData
   * @param {Object} data - Raw organizationData from database or file
   * @returns {Object} Validated and normalized data
   */
  static validate(data) {
    if (!data || typeof data !== 'object') {
      return this.getDefaults();
    }

    const validated = {
      rings: this.validateRings(data.rings),
      activityGroups: this.validateActivityGroups(data.activityGroups || data.activities), // Backward compatibility
      labels: this.validateLabels(data.labels),
      items: this.validateItems(data.items)
    };

    return validated;
  }

  /**
   * Get default empty structure
   * @returns {Object} Default organizationData
   */
  static getDefaults() {
    return {
      rings: [],
      activityGroups: [],
      labels: [],
      items: []
    };
  }

  /**
   * Validate rings array
   * @param {Array} rings - Raw rings data
   * @returns {Array} Validated rings
   */
  static validateRings(rings) {
    if (!Array.isArray(rings)) {
      return [];
    }

    return rings.map((ring, index) => {
      // Ensure required fields
      if (!ring.id) {
        console.warn(`Ring at index ${index} missing id, skipping`);
        return null;
      }

      return {
        id: ring.id,
        name: ring.name || `Ring ${index + 1}`,
        type: ['inner', 'outer'].includes(ring.type) ? ring.type : 'inner',
        visible: typeof ring.visible === 'boolean' ? ring.visible : true,
        orientation: ['vertical', 'horizontal'].includes(ring.orientation) 
          ? ring.orientation 
          : 'vertical',
        color: this.validateColor(ring.color),
        ring_order: typeof ring.ring_order === 'number' ? ring.ring_order : index
      };
    }).filter(Boolean); // Remove null entries
  }

  /**
   * Validate activity groups array
   * @param {Array} activityGroups - Raw activity groups data
   * @returns {Array} Validated activity groups
   */
  static validateActivityGroups(activityGroups) {
    if (!Array.isArray(activityGroups)) {
      return [];
    }

    return activityGroups.map((group, index) => {
      // Ensure required fields
      if (!group.id) {
        console.warn(`Activity group at index ${index} missing id, skipping`);
        return null;
      }

      return {
        id: group.id,
        name: group.name || `Activity Group ${index + 1}`,
        color: this.validateColor(group.color) || this.getDefaultColor(index),
        visible: typeof group.visible === 'boolean' ? group.visible : true
      };
    }).filter(Boolean);
  }

  /**
   * Validate labels array
   * @param {Array} labels - Raw labels data
   * @returns {Array} Validated labels
   */
  static validateLabels(labels) {
    if (!Array.isArray(labels)) {
      return [];
    }

    return labels.map((label, index) => {
      // Ensure required fields
      if (!label.id) {
        console.warn(`Label at index ${index} missing id, skipping`);
        return null;
      }

      return {
        id: label.id,
        name: label.name || `Label ${index + 1}`,
        color: this.validateColor(label.color) || this.getDefaultColor(index),
        visible: typeof label.visible === 'boolean' ? label.visible : true
      };
    }).filter(Boolean);
  }

  /**
   * Validate items array
   * @param {Array} items - Raw items data
   * @returns {Array} Validated items
   */
  static validateItems(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item, index) => {
      // Ensure required fields
      if (!item.id || !item.ringId || !item.activityId) {
        console.warn(`Item at index ${index} missing required fields (id, ringId, activityId), skipping`);
        return null;
      }

      // Validate dates
      const startDate = this.validateDate(item.startDate);
      const endDate = this.validateDate(item.endDate);

      if (!startDate || !endDate) {
        console.warn(`Item ${item.id} has invalid dates, skipping`);
        return null;
      }

      return {
        id: item.id,
        name: item.name || 'Untitled',
        startDate: startDate,
        endDate: endDate,
        ringId: item.ringId,
        activityId: item.activityId,
        labelId: item.labelId || null, // Optional
        time: item.time || null,
        description: item.description || '',
        source: item.source || 'manual',
        external_id: item.external_id || null,
        sync_metadata: item.sync_metadata || null
      };
    }).filter(Boolean);
  }

  /**
   * Validate color hex string
   * @param {string} color - Hex color string
   * @returns {string|null} Valid hex color or null
   */
  static validateColor(color) {
    if (typeof color !== 'string') {
      return null;
    }

    // Ensure # prefix
    const hexColor = color.startsWith('#') ? color : `#${color}`;

    // Check valid hex format (#RGB or #RRGGBB)
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(hexColor) ? hexColor : null;
  }

  /**
   * Validate date string or Date object
   * @param {string|Date} date - Date to validate
   * @returns {string|null} ISO date string or null
   */
  static validateDate(date) {
    if (!date) {
      return null;
    }

    // If already a valid Date object
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // If string, try to parse
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }

    return null;
  }

  /**
   * Get default color for index (cycle through palette)
   * @param {number} index - Index in array
   * @returns {string} Hex color
   */
  static getDefaultColor(index) {
    const palette = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F97316', // Orange
      '#6366F1', // Indigo
      '#84CC16'  // Lime
    ];
    return palette[index % palette.length];
  }

  /**
   * Check if organizationData is valid (has all required fields)
   * @param {Object} data - Data to check
   * @returns {boolean} True if valid
   */
  static isValid(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    return (
      Array.isArray(data.rings) &&
      Array.isArray(data.activityGroups) &&
      Array.isArray(data.labels) &&
      Array.isArray(data.items)
    );
  }

  /**
   * Get validation errors for organizationData
   * @param {Object} data - Data to check
   * @returns {Array<string>} Array of error messages
   */
  static getErrors(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      errors.push('organizationData must be an object');
      return errors;
    }

    if (!Array.isArray(data.rings)) {
      errors.push('rings must be an array');
    }

    if (!Array.isArray(data.activityGroups) && !Array.isArray(data.activities)) {
      errors.push('activityGroups (or activities) must be an array');
    }

    if (!Array.isArray(data.labels)) {
      errors.push('labels must be an array');
    }

    if (!Array.isArray(data.items)) {
      errors.push('items must be an array');
    }

    // Check for items with missing references
    if (Array.isArray(data.items)) {
      const ringIds = new Set((data.rings || []).map(r => r.id));
      const activityIds = new Set((data.activityGroups || data.activities || []).map(a => a.id));

      data.items.forEach((item, index) => {
        if (!item.ringId || !ringIds.has(item.ringId)) {
          errors.push(`Item ${index} references non-existent ring: ${item.ringId}`);
        }
        if (!item.activityId || !activityIds.has(item.activityId)) {
          errors.push(`Item ${index} references non-existent activity: ${item.activityId}`);
        }
      });
    }

    return errors;
  }

  /**
   * Migrate legacy 'activities' to 'activityGroups'
   * @param {Object} data - Data with potentially old structure
   * @returns {Object} Migrated data
   */
  static migrate(data) {
    if (!data || typeof data !== 'object') {
      return this.getDefaults();
    }

    const migrated = { ...data };

    // Rename 'activities' to 'activityGroups'
    if (migrated.activities && !migrated.activityGroups) {
      migrated.activityGroups = migrated.activities;
      delete migrated.activities;
    }

    return migrated;
  }
}

export default ConfigValidator;
