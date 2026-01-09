import { useMemo } from 'react';

/**
 * useGanttData Hook
 * 
 * Transforms wheel structure data into Gantt-ready format
 * Groups items by rings, labels, or activityGroups
 * Filters by year if specified
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
  
  // Get all items, optionally filtered by year
  const allItems = useMemo(() => {
    // Collect items from all pages
    const items = pages.flatMap(page => {
      const pageYear = parseInt(page.year, 10);
      return (page.items || []).map(item => ({
        ...item,
        _pageYear: pageYear,
      }));
    });
    
    // Filter by year if not 'all'
    if (yearFilter === 'all') {
      return items;
    }
    
    const filterYear = parseInt(yearFilter, 10);
    return items.filter(item => {
      const startYear = new Date(item.startDate).getFullYear();
      const endYear = new Date(item.endDate).getFullYear();
      // Include if item overlaps with the filtered year
      return startYear <= filterYear && endYear >= filterYear;
    });
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
