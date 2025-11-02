/**
 * QuarterNavigator Component
 * 
 * Compact quarter selection for zooming into Q1-Q4.
 * Similar to MonthNavigator but for quarterly views.
 * 
 * Features:
 * - 4 quarter buttons in a 2x2 grid
 * - Activity count per quarter
 * - Current quarter highlighting
 * - Zoom to quarter on click
 */

import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function QuarterNavigator({ 
  year, 
  currentQuarter = null, // 0-3 or null for full year view
  currentMonth = null, // 0-11 or null - needed to detect month zoom
  organizationData,
  onQuarterSelect,
  onMonthSelect, // Needed to clear month when selecting quarter
  onResetZoom,
  className = ''
}) {
  const { t } = useTranslation(['common', 'zoom']);

  // Calculate activity count for each quarter
  const getQuarterActivityCount = (quarterIndex) => {
    if (!organizationData?.items) return 0;

    const quarterStartMonth = quarterIndex * 3;
    const quarterStart = new Date(year, quarterStartMonth, 1);
    const quarterEnd = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59);

    return organizationData.items.filter(item => {
      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);
      return (itemStart <= quarterEnd && itemEnd >= quarterStart);
    }).length;
  };

  // Handle quarter click with smart zoom logic
  const handleQuarterClick = (quarterIndex) => {
    // CRITICAL: Use explicit null checks because quarterIndex can be 0 (Q1)
    // Never use truthy/falsy checks with indices!
    
    if (currentQuarter !== null && currentQuarter !== undefined && currentQuarter === quarterIndex) {
      // Clicking current quarter again = reset to full year
      onResetZoom();
    } else if (currentMonth !== null && currentMonth !== undefined) {
      // If a month is zoomed, first reset to full year, then zoom to quarter
      onResetZoom();
      setTimeout(() => {
        onMonthSelect?.(null); // Clear month zoom
        onQuarterSelect(quarterIndex);
      }, 300); // Short delay for smooth transition
    } else {
      // Direct zoom to selected quarter (clear month just in case)
      onMonthSelect?.(null);
      onQuarterSelect(quarterIndex);
    }
  };

  const quarters = [
    { label: 'Q1', months: t('zoom:q1Months') },
    { label: 'Q2', months: t('zoom:q2Months') },
    { label: 'Q3', months: t('zoom:q3Months') },
    { label: 'Q4', months: t('zoom:q4Months') }
  ];

  return (
    <div className={className}>
      {/* Quarter Grid - Compact 2x2 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
          {quarters.map((quarter, index) => {
            const activityCount = getQuarterActivityCount(index);
            const isCurrentQuarter = currentQuarter === index;
            const hasActivities = activityCount > 0;

            return (
              <button
                key={index}
                onClick={() => handleQuarterClick(index)}
                className={`
                  relative px-2 py-3 rounded-sm text-sm font-medium
                  transition-all duration-200
                  ${isCurrentQuarter 
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-2' 
                    : hasActivities
                      ? 'bg-gray-50 text-gray-900 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
                      : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 border border-gray-100'
                  }
                  ${!hasActivities && !isCurrentQuarter ? 'opacity-60' : ''}
                `}
                title={`${quarter.label} (${quarter.months}) - ${activityCount} ${t('zoom:activities')}`}
              >
                {/* Quarter label */}
                <div className="text-center font-semibold mb-0.5">
                  {quarter.label}
                </div>

                {/* Month range */}
                <div className={`text-[10px] text-center ${isCurrentQuarter ? 'text-blue-100' : 'text-gray-500'}`}>
                  {quarter.months}
                </div>

                {/* Activity count badge */}
                {hasActivities && (
                  <div 
                    className={`
                      absolute -top-1 -right-1 
                      min-w-[18px] h-[18px] 
                      flex items-center justify-center 
                      rounded-full text-[10px] font-bold
                      ${isCurrentQuarter 
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
      {currentQuarter !== null && (
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
      
      {currentQuarter === null && (
        <div className="mt-3 py-2 px-3 bg-gray-50 rounded-sm">
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            {t('zoom:clickQuarterToZoom')}
          </p>
        </div>
      )}
    </div>
  );
}

export default QuarterNavigator;
