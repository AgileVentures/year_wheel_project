/**
 * Activity Dependency Service
 * Handles cascading updates when items with dependencies are modified
 */

/**
 * Calculate new dates for a dependent item based on its predecessor
 * @param {Object} predecessor - The predecessor item
 * @param {Object} dependent - The dependent item
 * @returns {Object} - New startDate and endDate for the dependent
 */
export function calculateDependentDates(predecessor, dependent) {
  // Use provided lag, but ensure minimum 1 day for finish-to-start to avoid visual stacking
  const dependencyType = dependent.dependencyType || 'finish_to_start';
  const providedLag = dependent.lagDays || 0;
  const lagDays = dependencyType === 'finish_to_start' 
    ? Math.max(1, providedLag)  // Minimum 1 day gap for finish-to-start
    : providedLag;
  
  const duration = Math.floor(
    (new Date(dependent.endDate) - new Date(dependent.startDate)) / (1000 * 60 * 60 * 24)
  );

  let newStartDate, newEndDate;

  switch (dependencyType) {
    case 'finish_to_start':
      // Dependent starts when predecessor finishes (+ lag, minimum 1 day)
      newStartDate = new Date(predecessor.endDate);
      newStartDate.setDate(newStartDate.getDate() + lagDays);
      newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + duration);
      break;

    case 'start_to_start':
      // Dependent starts when predecessor starts (+ lag)
      newStartDate = new Date(predecessor.startDate);
      newStartDate.setDate(newStartDate.getDate() + lagDays);
      newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + duration);
      break;

    case 'finish_to_finish':
      // Dependent finishes when predecessor finishes (+ lag)
      newEndDate = new Date(predecessor.endDate);
      newEndDate.setDate(newEndDate.getDate() + lagDays);
      newStartDate = new Date(newEndDate);
      newStartDate.setDate(newStartDate.getDate() - duration);
      break;

    default:
      return { startDate: dependent.startDate, endDate: dependent.endDate };
  }

  return {
    startDate: newStartDate.toISOString().split('T')[0],
    endDate: newEndDate.toISOString().split('T')[0]
  };
}

/**
 * Find all items that depend on a given item
 * @param {Array} items - All items in the wheel
 * @param {String} itemId - ID of the item to find dependents for
 * @returns {Array} - Array of dependent items
 */
export function findDependentItems(items, itemId) {
  return items.filter(item => item.dependsOn === itemId);
}

/**
 * Recursively update all dependent items when a predecessor changes
 * @param {Array} items - All items in the wheel (immutable - will not be modified)
 * @param {String} changedItemId - ID of the item that was changed
 * @param {Object} updatedDates - New dates for the changed item
 * @returns {Array} - Array of updates: [{ id, oldDates, newDates }]
 */
export function cascadeUpdateDependents(items, changedItemId, updatedDates) {
  const updatedItems = [];
  const visited = new Set(); // Prevent infinite loops

  // Create a lookup map for faster access
  const itemsMap = new Map(items.map(i => [i.id, i]));

  function updateChain(itemId, currentItemDates) {
    if (visited.has(itemId)) return;
    visited.add(itemId);

    const dependents = findDependentItems(items, itemId);

    dependents.forEach(dependent => {
      // Use the current dates (either from items or from previous update)
      const predecessor = {
        ...itemsMap.get(itemId),
        ...currentItemDates
      };
      
      if (!predecessor.id) return;

      const newDates = calculateDependentDates(predecessor, dependent);
      
      // Only update if dates actually changed (avoid unnecessary updates)
      if (
        newDates.startDate !== dependent.startDate ||
        newDates.endDate !== dependent.endDate
      ) {
        const oldDates = {
          startDate: dependent.startDate,
          endDate: dependent.endDate
        };

        updatedItems.push({
          id: dependent.id,
          oldDates,
          newDates
        });

        // Recursively update this item's dependents with the new dates
        updateChain(dependent.id, newDates);
      }
    });
  }

  updateChain(changedItemId, updatedDates);
  return updatedItems;
}

/**
 * Check if creating a dependency would create a circular reference
 * @param {Array} items - All items in the wheel
 * @param {String} itemId - ID of the item that will depend on predecessor
 * @param {String} predecessorId - ID of the proposed predecessor
 * @returns {Boolean} - True if circular dependency would be created
 */
export function wouldCreateCircularDependency(items, itemId, predecessorId) {
  if (itemId === predecessorId) return true; // Self-dependency

  const visited = new Set();
  let currentId = predecessorId;

  // Follow the dependency chain
  while (currentId) {
    if (currentId === itemId) return true; // Loop detected
    if (visited.has(currentId)) return false; // Different loop exists
    
    visited.add(currentId);
    
    const currentItem = items.find(i => i.id === currentId);
    currentId = currentItem?.dependsOn;
  }

  return false;
}

/**
 * Get the full dependency chain for an item (all ancestors)
 * @param {Array} items - All items in the wheel
 * @param {String} itemId - ID of the item
 * @returns {Array} - Array of predecessor items in order (root first)
 */
export function getDependencyChain(items, itemId) {
  const chain = [];
  let currentId = itemId;
  const visited = new Set();

  while (currentId) {
    const item = items.find(i => i.id === currentId);
    if (!item || visited.has(currentId)) break;
    
    visited.add(currentId);
    
    if (item.dependsOn) {
      const predecessor = items.find(i => i.id === item.dependsOn);
      if (predecessor) {
        chain.unshift(predecessor); // Add to beginning
      }
      currentId = item.dependsOn;
    } else {
      break;
    }
  }

  return chain;
}

/**
 * Validate that a proposed date change doesn't violate dependencies
 * @param {Array} items - All items in the wheel
 * @param {String} itemId - ID of the item being modified
 * @param {Object} newDates - Proposed new dates
 * @returns {Object} - { valid: boolean, reason: string }
 */
export function validateDateChange(items, itemId, newDates) {
  const item = items.find(i => i.id === itemId);
  if (!item) return { valid: false, reason: 'Item not found' };

  // Check if this item depends on another (constraint on start date)
  if (item.dependsOn) {
    const predecessor = items.find(i => i.id === item.dependsOn);
    if (predecessor) {
      const lagDays = item.lagDays || 0;
      
      if (item.dependencyType === 'finish_to_start') {
        const minStartDate = new Date(predecessor.endDate);
        minStartDate.setDate(minStartDate.getDate() + lagDays);
        
        if (new Date(newDates.startDate) < minStartDate) {
          return {
            valid: false,
            reason: `Cannot start before predecessor "${predecessor.name}" finishes${lagDays > 0 ? ` + ${lagDays} days` : ''}`
          };
        }
      }
      // Add other dependency type validations as needed
    }
  }

  // Check if any items depend on this one (constraint on end date)
  const dependents = findDependentItems(items, itemId);
  if (dependents.length > 0) {
    // For now, we'll allow changes and cascade - no blocking
    // Could add warning UI here in the future
  }

  return { valid: true };
}
