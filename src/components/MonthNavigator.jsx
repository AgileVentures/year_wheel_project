/**
 * MonthNavigator Component
 * 
 * Compact month selection sidebar inspired by Circalify.
 * Provides quick navigation to any month with visual activity indicators.
 * 
 * Features:
 * - 12 month buttons in a clean grid
 * - Activity count badges
 * - Current month highlighting
 * - Zoom to month on click
 * - Compact design (fits in sidebar)
 */

import { Calendar, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function MonthNavigator({ 
  year, 
  currentMonth = null, // 0-11 or null for full year view
  currentQuarter = null, // 0-3 or null - needed to detect quarter zoom
  organizationData,
  onMonthSelect,
  onQuarterSelect, // Needed to clear quarter when selecting month
  onResetZoom,
  className = ''
}) {
  const { t } = useTranslation(['common', 'zoom']);

  // Month names (short 3-letter format)
  const monthNames = [
    t('common:months.jan'),
    t('common:months.feb'),
    t('common:months.mar'),
    t('common:months.apr'),
    t('common:months.may'),
    t('common:months.jun'),
    t('common:months.jul'),
    t('common:months.aug'),
    t('common:months.sep'),
    t('common:months.oct'),
    t('common:months.nov'),
    t('common:months.dec')
  ];

  // Calculate activity count for each month
  const getMonthActivityCount = (monthIndex) => {
    if (!organizationData?.items) return 0;

    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59);

    return organizationData.items.filter(item => {
      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);
      
      // Item overlaps with month if:
      // - Item ends after month starts AND
      // - Item starts before month ends
      return itemEnd >= monthStart && itemStart <= monthEnd;
    }).length;
  };

  // Get total activities across all months
  const totalActivities = organizationData?.items?.length || 0;

  // Handle month click with smart zoom logic
  const handleMonthClick = (monthIndex) => {
    // CRITICAL: Use explicit null checks because monthIndex can be 0 (January)
    // Never use truthy/falsy checks with indices!
    
    if (currentMonth !== null && currentMonth !== undefined && currentMonth === monthIndex) {
      // Clicking current month again = reset to full year
      onResetZoom?.();
    } else if (currentQuarter !== null && currentQuarter !== undefined) {
      // If a quarter is zoomed, first reset to full year, then zoom to month
      onResetZoom?.();
      setTimeout(() => {
        onQuarterSelect?.(null); // Clear quarter zoom
        onMonthSelect?.(monthIndex);
      }, 300); // Short delay for smooth transition
    } else {
      // Direct zoom to selected month (clear quarter just in case)
      onQuarterSelect?.(null);
      onMonthSelect?.(monthIndex);
    }
  };

  return (
    <div className={className}>
      {/* Month Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
          {monthNames.map((monthName, index) => {
            const activityCount = getMonthActivityCount(index);
            const isCurrentMonth = currentMonth === index;
            const hasActivities = activityCount > 0;

            return (
              <button
                key={index}
                onClick={() => handleMonthClick(index)}
                className={`
                  relative px-3 py-2.5 rounded-md text-sm font-medium
                  transition-all duration-200
                  ${isCurrentMonth 
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-2' 
                    : hasActivities
                      ? 'bg-gray-50 text-gray-900 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
                      : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 border border-gray-100'
                  }
                  ${!hasActivities && !isCurrentMonth ? 'opacity-60' : ''}
                `}
                title={`${monthName} - ${activityCount} ${t('zoom:activities')}`}
              >
                {/* Month name */}
                <div className="text-center">
                  {monthName}
                </div>

                {/* Activity count badge */}
                {hasActivities && (
                  <div 
                    className={`
                      absolute -top-1 -right-1 
                      min-w-[18px] h-[18px] 
                      flex items-center justify-center 
                      rounded-full text-[10px] font-bold
                      ${isCurrentMonth 
                        ? 'bg-white text-blue-600' 
                        : 'bg-blue-600 text-white'
                      }
                      shadow-sm
                    `}
                  >
                    {activityCount > 99 ? '99+' : activityCount}
                  </div>
                )}
              </button>
            );
          })}
      </div>

      {/* Footer with zoom hint */}
      {currentMonth !== null && (
        <div className="mt-3 py-2 px-3 bg-blue-50 rounded-sm">
          <button
            onClick={onResetZoom}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-100 rounded font-medium transition-colors"
          >
            <RotateCcw size={12} />
            {t('zoom:resetToFullYear')}
          </button>
        </div>
      )}
      
      {currentMonth === null && (
        <div className="mt-3 py-2 px-3 bg-gray-50 rounded-sm">
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            {t('zoom:clickMonthToZoom')}
          </p>
        </div>
      )}
    </div>
  );
}

export default MonthNavigator;
