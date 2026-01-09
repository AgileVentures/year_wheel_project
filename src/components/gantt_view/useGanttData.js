import { useMemo } from 'react';

/**
 * useGanttData Hook
 * 
 * Transforms wheel structure data into Gantt-ready format
 * Groups items by rings, labels, or activityGroups
 * Filters by year if specified
 * Consolidates cross-year items (same crossYearGroupId) into single entries
 * 
 * @param {Object} wheelStructure - Rings, activityGroups, labels, items
 * @param {Array} pages - All pages with their items
 * @param {string} yearFilter - 'all' or specific year
 * @param {string} groupBy - 'rings' | 'labels' | 'activityGroups'
 * @returns {Object} { groupedItems, allItems }
 */
export const useGanttData = ({
  wheelStructure,
  pages = [],
  yearFilter,
  groupBy,
}) => {
  const { rings = [], activityGroups = [], labels = [] } = wheelStructure || {};
  
  // Get all items, consolidating cross-year items
  const allItems = useMemo(() => {
    // Collect items from all pages
    const rawItems = pages.flatMap(page => {
      const pageYear = parseInt(page.year, 10);
      return (page.items || []).map(item => ({
        ...item,
        _pageYear: pageYear,
      }));
    });
    
    // Build a map of all cross-year groups with their full item list
    const allCrossYearGroups = new Map();
    rawItems.forEach(item => {
      if (item.crossYearGroupId) {
        if (!allCrossYearGroups.has(item.crossYearGroupId)) {
          allCrossYearGroups.set(item.crossYearGroupId, []);
        }
        allCrossYearGroups.get(item.crossYearGroupId).push(item);
      }
    });
    
    // Filter items based on yearFilter
    let filteredItems;
    if (yearFilter === 'all') {
      filteredItems = rawItems;
    } else {
      const filterYear = parseInt(yearFilter, 10);
      filteredItems = rawItems.filter(item => {
        const startYear = new Date(item.startDate).getFullYear();
        const endYear = new Date(item.endDate).getFullYear();
        // Include if item overlaps with the filtered year
        return startYear <= filterYear && endYear >= filterYear;
      });
    }
    
    // Consolidate cross-year items into single entries
    const crossYearGroupsInView = new Set();
    const standaloneItems = [];
    
    filteredItems.forEach(item => {
      if (item.crossYearGroupId) {
        // Track which cross-year groups are represented
        crossYearGroupsInView.add(item.crossYearGroupId);
      } else {
        standaloneItems.push(item);
      }
    });
    
    // Create consolidated entries for cross-year groups
    const consolidatedCrossYear = [];
    crossYearGroupsInView.forEach(groupId => {
      // Get ALL segments of this group to show full date range
      const allGroupItems = allCrossYearGroups.get(groupId) || [];
      if (allGroupItems.length === 0) return;
      
      // Sort by start date to find the earliest start and latest end
      const sorted = allGroupItems.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      const earliest = sorted[0];
      const latest = sorted.reduce((a, b) => new Date(a.endDate) > new Date(b.endDate) ? a : b);
      
      // Use the first segment as the base, but with full date range
      consolidatedCrossYear.push({
        ...earliest,
        startDate: earliest.startDate,
        endDate: latest.endDate,
        _crossYearSegmentIds: allGroupItems.map(i => i.id),
        _isCrossYearConsolidated: true,
      });
    });
    
    return [...standaloneItems, ...consolidatedCrossYear];
  }, [pages, yearFilter]);
  
  // Group items
  const groupedItems = useMemo(() => {
    const grouped = {};
    
    // Initialize groups
    if (groupBy === 'rings') {
      rings.filter(r => r.visible).forEach(ring => {
        grouped[ring.id] = [];
      });
    } else if (groupBy === 'labels') {
      labels.filter(l => l.visible).forEach(label => {
        grouped[label.id] = [];
      });
      // Add unlabeled group
      grouped['unlabeled'] = [];
    } else if (groupBy === 'activityGroups') {
      activityGroups.filter(ag => ag.visible).forEach(ag => {
        grouped[ag.id] = [];
      });
    }
    
    // Distribute items to groups
    allItems.forEach(item => {
      let groupKey;
      
      if (groupBy === 'rings') {
        groupKey = item.ringId;
      } else if (groupBy === 'labels') {
        groupKey = item.labelId || 'unlabeled';
      } else if (groupBy === 'activityGroups') {
        groupKey = item.activityId;
      }
      
      if (grouped[groupKey]) {
        grouped[groupKey].push(item);
      }
    });
    
    // Sort items within each group by start date
    Object.keys(grouped).forEach(groupKey => {
      grouped[groupKey].sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
      );
    });
    
    return grouped;
  }, [allItems, groupBy, rings, labels, activityGroups]);
  
  return {
    groupedItems,
    allItems,
  };
};
