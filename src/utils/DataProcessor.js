/**
 * DataProcessor.js
 * 
 * Memoized data processing for YearWheel visualization.
 * Eliminates redundant array operations during animation/rendering.
 * 
 * Problem solved: Filter operations were running 60,000 times per second during animation.
 * Solution: Cache filtered results and only recalculate when data actually changes.
 * 
 * @created December 2025
 */

class DataProcessor {
  constructor(wheelStructure) {
    this.wheelStructure = wheelStructure;
    this.cache = new Map();
    this.cacheVersion = 0;
    this.lastStructureHash = this.computeStructureHash(wheelStructure);
  }

  /**
   * Compute a simple hash of the structure to detect changes
   * Uses JSON.stringify for simplicity - could be optimized if needed
   */
  computeStructureHash(structure) {
    if (!structure) return '';
    
    // Create a lightweight fingerprint of the structure
    const ringIds = structure.rings?.map(r => `${r.id}:${r.visible}`).join(',') || '';
    const activityIds = structure.activityGroups?.map(a => `${a.id}:${a.visible}`).join(',') || '';
    const labelIds = structure.labels?.map(l => `${l.id}:${l.visible}`).join(',') || '';
    const itemCount = structure.items?.length || 0;
    
    return `${ringIds}|${activityIds}|${labelIds}|${itemCount}`;
  }

  /**
   * Update the wheel structure and invalidate cache if changed
   */
  updateStructure(newWheelStructure) {
    const newHash = this.computeStructureHash(newWheelStructure);
    
    if (newHash !== this.lastStructureHash) {
      this.wheelStructure = newWheelStructure;
      this.lastStructureHash = newHash;
      this.invalidate();
    }
  }

  /**
   * Invalidate all cached data
   */
  invalidate() {
    this.cacheVersion++;
    this.cache.clear();
  }

  /**
   * Get visible rings, optionally filtered by type
   * @param {string|null} type - 'inner', 'outer', or null for all
   * @returns {Array} Filtered rings
   */
  getVisibleRings(type = null) {
    const key = `rings-${type}-${this.cacheVersion}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const rings = this.wheelStructure?.rings || [];
    const result = rings.filter(r => 
      r.visible && (!type || r.type === type)
    );
    
    this.cache.set(key, result);
    return result;
  }

  /**
   * Get all visible inner rings
   */
  getVisibleInnerRings() {
    return this.getVisibleRings('inner');
  }

  /**
   * Get all visible outer rings
   */
  getVisibleOuterRings() {
    return this.getVisibleRings('outer');
  }

  /**
   * Get visible activity groups
   * @returns {Array} Filtered activity groups
   */
  getVisibleActivityGroups() {
    const key = `activityGroups-${this.cacheVersion}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const groups = this.wheelStructure?.activityGroups || [];
    const result = groups.filter(a => a.visible);
    
    this.cache.set(key, result);
    return result;
  }

  /**
   * Get visible labels
   * @returns {Array} Filtered labels
   */
  getVisibleLabels() {
    const key = `labels-${this.cacheVersion}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const labels = this.wheelStructure?.labels || [];
    const result = labels.filter(l => l.visible);
    
    this.cache.set(key, result);
    return result;
  }

  /**
   * Build a lookup map for activity groups (id -> activityGroup)
   * Avoids O(n) .find() calls during rendering
   * @returns {Map} Activity group lookup map
   */
  getActivityGroupMap() {
    const key = `activityGroupMap-${this.cacheVersion}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const result = new Map(
      this.getVisibleActivityGroups().map(a => [a.id, a])
    );
    
    this.cache.set(key, result);
    return result;
  }

  /**
   * Build a lookup map for labels (id -> label)
   * @returns {Map} Label lookup map
   */
  getLabelMap() {
    const key = `labelMap-${this.cacheVersion}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const result = new Map(
      this.getVisibleLabels().map(l => [l.id, l])
    );
    
    this.cache.set(key, result);
    return result;
  }

  /**
   * Build a lookup map for all rings (id -> ring)
   * @returns {Map} Ring lookup map
   */
  getRingMap() {
    const key = `ringMap-${this.cacheVersion}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const rings = this.wheelStructure?.rings || [];
    const result = new Map(rings.map(r => [r.id, r]));
    
    this.cache.set(key, result);
    return result;
  }

  /**
   * Get items for a specific ring, filtered by visibility of activity group and label
   * @param {string} ringId - The ring ID to filter by
   * @returns {Array} Filtered items for the ring
   */
  getItemsForRing(ringId) {
    const key = `ringItems-${ringId}-${this.cacheVersion}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const items = this.wheelStructure?.items || [];
    const activityGroupMap = this.getActivityGroupMap();
    const labelMap = this.getLabelMap();
    
    const result = items.filter(item => {
      if (item.ringId !== ringId) return false;
      
      // Must have visible activity group
      const hasVisibleActivityGroup = activityGroupMap.has(item.activityId);
      if (!hasVisibleActivityGroup) return false;
      
      // Label is optional - only filter by label if item has one
      const labelOk = !item.labelId || labelMap.has(item.labelId);
      
      return labelOk;
    });
    
    this.cache.set(key, result);
    return result;
  }

  /**
   * Get all items that should be rendered (have visible ring, activity group, and label)
   * @returns {Array} All renderable items
   */
  getAllRenderableItems() {
    const key = `renderableItems-${this.cacheVersion}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const items = this.wheelStructure?.items || [];
    const activityGroupMap = this.getActivityGroupMap();
    const labelMap = this.getLabelMap();
    const visibleRingIds = new Set([
      ...this.getVisibleInnerRings().map(r => r.id),
      ...this.getVisibleOuterRings().map(r => r.id)
    ]);
    
    const result = items.filter(item => {
      // Ring must be visible
      if (!visibleRingIds.has(item.ringId)) return false;
      
      // Must have visible activity group
      if (!activityGroupMap.has(item.activityId)) return false;
      
      // Label is optional
      if (item.labelId && !labelMap.has(item.labelId)) return false;
      
      return true;
    });
    
    this.cache.set(key, result);
    return result;
  }

  /**
   * Get count of visible outer rings (used for maxRadius calculation)
   * @returns {number} Count of visible outer rings
   */
  getVisibleOuterRingCount() {
    return this.getVisibleOuterRings().length;
  }

  /**
   * Get count of visible inner rings
   * @returns {number} Count of visible inner rings
   */
  getVisibleInnerRingCount() {
    return this.getVisibleInnerRings().length;
  }

  /**
   * Check if a specific item should be rendered
   * @param {Object} item - The item to check
   * @returns {boolean} Whether the item should be rendered
   */
  isItemRenderable(item) {
    if (!item) return false;
    
    const activityGroupMap = this.getActivityGroupMap();
    const labelMap = this.getLabelMap();
    const visibleRingIds = new Set([
      ...this.getVisibleInnerRings().map(r => r.id),
      ...this.getVisibleOuterRings().map(r => r.id)
    ]);
    
    // Ring must be visible
    if (!visibleRingIds.has(item.ringId)) return false;
    
    // Must have visible activity group
    if (!activityGroupMap.has(item.activityId)) return false;
    
    // Label is optional
    if (item.labelId && !labelMap.has(item.labelId)) return false;
    
    return true;
  }

  /**
   * Get activity group by ID (fast lookup)
   * @param {string} id - Activity group ID
   * @returns {Object|undefined} Activity group or undefined
   */
  getActivityGroup(id) {
    return this.getActivityGroupMap().get(id);
  }

  /**
   * Get label by ID (fast lookup)
   * @param {string} id - Label ID
   * @returns {Object|undefined} Label or undefined
   */
  getLabel(id) {
    return this.getLabelMap().get(id);
  }

  /**
   * Get ring by ID (fast lookup)
   * @param {string} id - Ring ID
   * @returns {Object|undefined} Ring or undefined
   */
  getRing(id) {
    return this.getRingMap().get(id);
  }
}

export default DataProcessor;
