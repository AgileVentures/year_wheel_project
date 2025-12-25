/**
 * UUID validation regex
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Default structure for a page
 */
export const defaultPageStructure = Object.freeze({
  rings: [],
  activityGroups: [],
  labels: [],
  items: [],
});

/**
 * Normalize a page-like object to ensure it has all required structure fields
 */
export const normalizePageStructure = (pageLike) => {
  if (!pageLike) {
    return { ...defaultPageStructure };
  }

  const source = pageLike.structure ?? {};
  return {
    rings: Array.isArray(source.rings) ? source.rings : [],
    activityGroups: Array.isArray(source.activityGroups) ? source.activityGroups : [],
    labels: Array.isArray(source.labels) ? source.labels : [],
    items: Array.isArray(source.items) ? source.items : [],
  };
};
