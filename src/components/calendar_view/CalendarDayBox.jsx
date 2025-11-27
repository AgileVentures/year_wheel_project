/**
 * CalendarDayBox Component
 *
 * Displays a single day in the calendar with activity items
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
  const displayItems = items.slice(0, 3); // Show max 3 items
  const remainingCount = items.length - 3;

  return (
    <div
      className={`w-full min-h-[120px] p-2 ${
        isPast ? 'cursor-default' : 'cursor-pointer hover:bg-blue-50'
      } overflow-hidden relative transition-colors ${
        isToday ? 'bg-blue-100 border-2 border-blue-500' : 
        isPast ? 'bg-gray-50' : 'bg-white'
      }`}
      onClick={onClick}
    >
      {/* Day number in top-left corner */}
      <div className={`text-sm font-semibold mb-1 ${
        isToday
          ? 'text-blue-700'
          : isPast
          ? 'text-gray-400'
          : isCurrentMonth
          ? 'text-gray-700'
          : 'text-gray-400'
      }`}>
        {dayNumber}
      </div>
      
      {/* Activity items as colored bars */}
      <div className="space-y-1">
        {displayItems.map((item, index) => {
          const group = getActivityGroup(item);
          return (
            <div
              key={item.id || index}
              className="text-[10px] px-1.5 py-0.5 rounded truncate text-white font-medium"
              style={{ 
                backgroundColor: group?.color || '#9CA3AF'
              }}
              title={item.name}
            >
              {item.name}
            </div>
          );
        })}
        
        {/* Show "+X more" if there are more items */}
        {remainingCount > 0 && (
          <div className="text-[10px] text-gray-600 font-semibold px-1">
            +{remainingCount} {remainingCount === 1 ? 'more' : 'more'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarDayBox;
