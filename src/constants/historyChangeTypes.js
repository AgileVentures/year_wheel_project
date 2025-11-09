/**
 * History change type constants
 * These are used to label undo/redo history entries
 * Each constant maps to a translation key in common:history.*
 */

export const CHANGE_TYPES = {
  // Title and year
  CHANGE_TITLE: 'changeTitle',
  CHANGE_YEAR: 'changeYear',
  CHANGE_COLORS: 'changeColors',
  
  // Rings
  ADD_RING: 'addRing',
  REMOVE_RING: 'removeRing',
  CHANGE_RING_NAME: 'changeRingName',
  CHANGE_RING_COLOR: 'changeRingColor',
  TOGGLE_RING_VISIBILITY: 'toggleRingVisibility',
  
  // Activity Groups
  ADD_ACTIVITY_GROUP: 'addActivityGroup',
  REMOVE_ACTIVITY_GROUP: 'removeActivityGroup',
  CHANGE_ACTIVITY_GROUP_NAME: 'changeActivityGroupName',
  CHANGE_ACTIVITY_GROUP_COLOR: 'changeActivityGroupColor',
  TOGGLE_ACTIVITY_VISIBILITY: 'toggleActivityVisibility',
  
  // Labels
  ADD_LABEL: 'addLabel',
  REMOVE_LABEL: 'removeLabel',
  CHANGE_LABEL_NAME: 'changeLabelName',
  CHANGE_LABEL_COLOR: 'changeLabelColor',
  
  // Items/Activities
  ADD_ACTIVITY: 'addActivity',
  REMOVE_ACTIVITY: 'removeActivity',
  UPDATE_ACTIVITY: 'updateActivity',
  DRAG_ACTIVITY: 'dragActivity',
  DRAG_ITEM: 'dragItem',
  MOVE_ACTIVITY: 'moveActivity',
  CHANGE_ACTIVITY_DATES: 'changeDates',
  EDIT_ACTIVITY: 'editItem',
  
  // Generic fallbacks
  CHANGE_ORGANIZATION: 'changeOrganization',
  CHANGE: 'change'
};

/**
 * Get translated history label for a change type
 * Can handle both new object-based labels and legacy string labels
 * 
 * @param {Function} t - i18n translation function
 * @param {string|Object} changeTypeOrLabel - Either a CHANGE_TYPES constant, or a label object { type, params, text }
 * @param {Object} params - Optional parameters for interpolation (only used if first arg is string)
 * @returns {string} Translated label
 */
export const getHistoryLabel = (t, changeTypeOrLabel, params = {}) => {
  // Handle object-based labels (new system)
  if (typeof changeTypeOrLabel === 'object' && changeTypeOrLabel !== null) {
    // Legacy string wrapped in object
    if (changeTypeOrLabel.type === 'legacyString') {
      return changeTypeOrLabel.text;
    }
    
    // New dynamic label system
    const { type, params: labelParams = {} } = changeTypeOrLabel;
    return getHistoryLabel(t, type, labelParams);
  }
  
  // Handle string-based change types
  const changeType = changeTypeOrLabel;
  
  // Default values for fallback (Swedish originals)
  const defaultValues = {
    changeTitle: 'Ändra titel',
    changeYear: 'Ändra år',
    changeColors: 'Ändra färger',
    addRing: 'Lägg till ring',
    removeRing: 'Ta bort ring',
    changeRingName: 'Ändra ringnamn',
    changeRingColor: 'Ändra ringfärg',
    toggleRingVisibility: 'Växla ringsynlighet',
    addActivityGroup: 'Lägg till aktivitetsgrupp',
    removeActivityGroup: 'Ta bort aktivitetsgrupp',
    changeActivityGroupName: 'Ändra aktivitetsgruppnamn',
    changeActivityGroupColor: 'Ändra aktivitetsgruppfärg',
    toggleActivityVisibility: 'Växla aktivitetssynlighet',
    addLabel: 'Lägg till etikett',
    removeLabel: 'Ta bort etikett',
    changeLabelName: 'Ändra etikettnamn',
    changeLabelColor: 'Ändra etikettfärg',
    addActivity: 'Lägg till aktivitet',
    removeActivity: 'Ta bort aktivitet',
    updateActivity: 'Uppdatera aktivitet',
    dragActivity: 'Dra aktivitet',
    dragItem: 'Dra {{name}}',
    moveActivity: 'Flytta {{name}}',
    changeDates: 'Ändra datum för {{name}}',
    editItem: 'Redigera {{name}}',
    changeOrganization: 'Ändra organisationsdata',
    change: 'Ändra'
  };
  
  const defaultValue = defaultValues[changeType] || defaultValues.change;
  
  return t(`history.${changeType}`, { ...params, defaultValue });
};

/**
 * Detect what changed between old and new organization data
 * @param {Object} oldData - Previous organization data
 * @param {Object} newData - New organization data
 * @returns {string} Change type constant
 */
export const detectOrganizationChange = (oldData, newData) => {
  if (!oldData) return CHANGE_TYPES.CHANGE_ORGANIZATION;
  
  // Check length changes first (add/remove)
  if (newData.rings?.length !== oldData.rings?.length) {
    return newData.rings.length > oldData.rings.length 
      ? CHANGE_TYPES.ADD_RING 
      : CHANGE_TYPES.REMOVE_RING;
  }
  
  if (newData.activityGroups?.length !== oldData.activityGroups?.length) {
    return newData.activityGroups.length > oldData.activityGroups.length 
      ? CHANGE_TYPES.ADD_ACTIVITY_GROUP 
      : CHANGE_TYPES.REMOVE_ACTIVITY_GROUP;
  }
  
  if (newData.labels?.length !== oldData.labels?.length) {
    return newData.labels.length > oldData.labels.length 
      ? CHANGE_TYPES.ADD_LABEL 
      : CHANGE_TYPES.REMOVE_LABEL;
  }
  
  if (newData.items?.length !== oldData.items?.length) {
    return newData.items.length > oldData.items.length 
      ? CHANGE_TYPES.ADD_ACTIVITY 
      : CHANGE_TYPES.REMOVE_ACTIVITY;
  }
  
  // Check for property changes in items
  const itemChanged = newData.items?.some(item => {
    const oldItem = oldData.items?.find(old => old.id === item.id);
    if (!oldItem) return true;
    return item.name !== oldItem.name || 
           item.startDate !== oldItem.startDate || 
           item.endDate !== oldItem.endDate ||
           item.ringId !== oldItem.ringId ||
           item.activityId !== oldItem.activityId;
  });
  
  if (itemChanged) {
    return CHANGE_TYPES.UPDATE_ACTIVITY;
  }
  
  // Check for visibility changes
  const ringVisChanged = newData.rings?.some((r, i) => 
    r.visible !== oldData.rings?.[i]?.visible
  );
  if (ringVisChanged) return CHANGE_TYPES.TOGGLE_RING_VISIBILITY;
  
  const agVisChanged = newData.activityGroups?.some((ag, i) => 
    ag.visible !== oldData.activityGroups?.[i]?.visible
  );
  if (agVisChanged) return CHANGE_TYPES.TOGGLE_ACTIVITY_VISIBILITY;
  
  // Check for name changes
  const ringNameChanged = newData.rings?.some(ring => {
    const oldRing = oldData.rings?.find(old => old.id === ring.id);
    return oldRing && ring.name !== oldRing.name;
  });
  if (ringNameChanged) return CHANGE_TYPES.CHANGE_RING_NAME;
  
  const agNameChanged = newData.activityGroups?.some(ag => {
    const oldAg = oldData.activityGroups?.find(old => old.id === ag.id);
    return oldAg && ag.name !== oldAg.name;
  });
  if (agNameChanged) return CHANGE_TYPES.CHANGE_ACTIVITY_GROUP_NAME;
  
  const labelNameChanged = newData.labels?.some(label => {
    const oldLabel = oldData.labels?.find(old => old.id === label.id);
    return oldLabel && label.name !== oldLabel.name;
  });
  if (labelNameChanged) return CHANGE_TYPES.CHANGE_LABEL_NAME;
  
  // Check for color changes
  const ringColorChanged = newData.rings?.some(ring => {
    const oldRing = oldData.rings?.find(old => old.id === ring.id);
    return oldRing && ring.color !== oldRing.color;
  });
  if (ringColorChanged) return CHANGE_TYPES.CHANGE_RING_COLOR;
  
  const agColorChanged = newData.activityGroups?.some(ag => {
    const oldAg = oldData.activityGroups?.find(old => old.id === ag.id);
    return oldAg && ag.color !== oldAg.color;
  });
  if (agColorChanged) return CHANGE_TYPES.CHANGE_ACTIVITY_GROUP_COLOR;
  
  const labelColorChanged = newData.labels?.some(label => {
    const oldLabel = oldData.labels?.find(old => old.id === label.id);
    return oldLabel && label.color !== oldLabel.color;
  });
  if (labelColorChanged) return CHANGE_TYPES.CHANGE_LABEL_COLOR;
  
  // Generic fallback
  return CHANGE_TYPES.CHANGE_ORGANIZATION;
};
