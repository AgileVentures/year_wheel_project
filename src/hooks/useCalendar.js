import { useState, useMemo, useCallback } from 'react';

/**
 * Custom calendar hook to replace @h6s/calendar
 * Provides month navigation and calendar grid data
 * Compatible with React 19
 */

export const CalendarViewType = {
  Month: 'month',
  Week: 'week',
  Day: 'day'
};

/**
 * Generate calendar grid for a month (6 weeks x 7 days)
 * @param {number} year 
 * @param {number} month - 0-indexed month
 * @returns {Array} weeks array with day objects
 */
function generateCalendarBody(year, month) {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Get the day of week for first day (0 = Sunday, 6 = Saturday)
  const startDayOfWeek = firstDayOfMonth.getDay();
  
  // Calculate start date (may be in previous month)
  const startDate = new Date(year, month, 1 - startDayOfWeek);
  
  const weeks = [];
  let currentDate = new Date(startDate);
  
  // Generate 6 weeks to ensure we cover all possible month layouts
  for (let week = 0; week < 6; week++) {
    const days = [];
    
    for (let day = 0; day < 7; day++) {
      const dateValue = new Date(currentDate);
      days.push({
        key: `${dateValue.getFullYear()}-${dateValue.getMonth()}-${dateValue.getDate()}`,
        value: dateValue
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    weeks.push({
      key: `week-${week}`,
      value: days
    });
    
    // Stop if we've passed the last day of the month and completed the week
    if (currentDate > lastDayOfMonth && currentDate.getDay() === 0) {
      // Only stop if we have at least 4 weeks (some months fit in 4-5 weeks)
      if (weeks.length >= 4) {
        break;
      }
    }
  }
  
  return weeks;
}

/**
 * useCalendar hook - replacement for @h6s/calendar
 * @param {Object} options
 * @param {string} options.defaultViewType - CalendarViewType (currently only Month supported)
 * @param {Date} options.defaultDate - Initial date to display
 * @returns {Object} calendar state and navigation
 */
export function useCalendar({ defaultViewType = CalendarViewType.Month, defaultDate = new Date() } = {}) {
  const [currentDate, setCurrentDate] = useState(() => {
    return defaultDate instanceof Date ? defaultDate : new Date(defaultDate);
  });
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const body = useMemo(() => {
    return {
      value: generateCalendarBody(year, month)
    };
  }, [year, month]);
  
  const navigation = useMemo(() => ({
    toPrev: () => {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    },
    toNext: () => {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    },
    setToday: () => {
      setCurrentDate(new Date());
    },
    setDate: (date) => {
      setCurrentDate(date instanceof Date ? date : new Date(date));
    }
  }), []);
  
  return {
    body,
    month,
    year,
    navigation,
    viewType: defaultViewType
  };
}

export default useCalendar;
