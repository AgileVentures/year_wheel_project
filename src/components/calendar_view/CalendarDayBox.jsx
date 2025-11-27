/**
 * CalendarDayBox Component
 *
 * Displays a single day in the calendar with activity indicators
 *
 * @param {Date} day - The date object representing the day
 * @param {boolean} isToday - Indicates if the day is today
 * @param {boolean} isCurrentMonth - Indicates if the day belongs to the current month
 * @param {Function} onClick - Callback when the box is clicked
 * @param {Array} items - Wheel items for this day
 * @param {boolean} isPast - Whether the day is in the past
 * @param {Function} getActivityGroup - Get activity group for an item
 * @param {Function} getRing - Get ring for an item
 */
const CalendarDayBox = ({
  day,
  isToday,
  isCurrentMonth,
  onClick,
  items = [],
  isPast,
  getActivityGroup,
  getRing
}) => {
  const dayNumber = day.getDate();

  // Get unique activity groups for this day (max 3 to display)
  const activityGroups = items
    .map(item => getActivityGroup(item))
    .filter(Boolean)
    .filter((group, index, self) => 
      index === self.findIndex(g => g.id === group.id)
    )
    .slice(0, 3);

  const totalItems = items.length;

  return (
    <div
      className={`w-full h-[100px] p-3 ${
        isPast ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100'
      } overflow-hidden relative ${
        isToday ? 'bg-blue-50' : 
        isPast ? 'bg-gray-100' : 'bg-white'
      }`}
      onClick={isPast ? undefined : onClick}
    >
      <div className="flex flex-col h-full">
        {/* Day number in center */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-2xl font-bold ${
            isToday ? 'text-red-500' : 
            isPast ? 'text-gray-400' : 
            isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
          }`}>
            {dayNumber}
          </div>
        </div>
        
        {/* Activity group indicators at bottom */}
        <div className="h-6 flex items-center justify-center space-x-1">
          {activityGroups.map((group, index) => (
            <div
              key={group.id}
              className="w-4 h-4 rounded-full border border-white"
              style={{ 
                backgroundColor: group.color,
                zIndex: 3 - index 
              }}
              title={group.name}
            />
          ))}
          {totalItems > 3 && (
            <span className="text-xs font-bold text-gray-600 ml-1">
              +{totalItems - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarDayBox;
