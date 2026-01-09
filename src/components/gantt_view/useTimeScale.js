import { useMemo } from 'react';

/**
 * useTimeScale Hook
 * 
 * Calculates time scale for Gantt timeline
 * Provides date-to-pixel and pixel-to-date conversions
 * Handles different zoom levels (day/week/month)
 * 
 * @param {Date} viewStart - Start of visible time range
 * @param {Date} viewEnd - End of visible time range
 * @param {number} containerWidth - Width of timeline container in pixels
 * @param {string} zoomLevel - 'day' | 'week' | 'month'
 * @returns {Object} { dateToX, xToDate, pixelsPerDay, viewStart, viewEnd, zoomLevel }
 */
export const useTimeScale = ({
  viewStart,
  viewEnd,
  containerWidth,
  zoomLevel,
}) => {
  return useMemo(() => {
    // Calculate total days in view
    const totalMs = viewEnd.getTime() - viewStart.getTime();
    const totalDays = totalMs / (1000 * 60 * 60 * 24);
    
    // Calculate pixels per day
    const pixelsPerDay = containerWidth / totalDays;
    
    // Date to X coordinate
    const dateToX = (date) => {
      const dateObj = date instanceof Date ? date : new Date(date);
      const ms = dateObj.getTime() - viewStart.getTime();
      const days = ms / (1000 * 60 * 60 * 24);
      return days * pixelsPerDay;
    };
    
    // X coordinate to Date
    const xToDate = (x) => {
      const days = x / pixelsPerDay;
      const ms = days * (1000 * 60 * 60 * 24);
      return new Date(viewStart.getTime() + ms);
    };
    
    // Snap to grid based on zoom level
    const snapDate = (date) => {
      const d = new Date(date);
      
      if (zoomLevel === 'day') {
        // Snap to day
        d.setHours(0, 0, 0, 0);
      } else if (zoomLevel === 'week') {
        // Snap to Monday
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday is 1
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
      } else if (zoomLevel === 'month') {
        // Snap to first of month
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
      }
      
      return d;
    };
    
    return {
      dateToX,
      xToDate,
      snapDate,
      pixelsPerDay,
      totalDays,
      viewStart,
      viewEnd,
      zoomLevel,
    };
  }, [viewStart, viewEnd, containerWidth, zoomLevel]);
};
