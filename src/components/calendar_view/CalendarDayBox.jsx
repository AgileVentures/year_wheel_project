/**
 * CalendarDayBox Component
 *
 * Displays a single day in the calendar with activity indicators as colored dots
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
  const totalItems = items.length;

  const renderIcons = () => {
    if (totalItems === 0) return null;
    
    return (
      <div className="flex justify-center items-center space-x-0">
        {items.slice(0, 3).map((item, index) => {
          const group = getActivityGroup(item);
          return (
            <div
              key={item.id || index}
              className={`w-4 h-4 rounded-full border-2 border-white flex-shrink-0 ${index > 0 ? '-ml-3' : ''}`}
              style={{ 
                backgroundColor: group?.color || '#EF4444',
                zIndex: 3 - index 
              }}
              title={item.name}
            />
          );
        })}
        {totalItems > 3 && (
          <span className="text-xs font-bold text-gray-700 ml-1">
            +{totalItems - 3}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`w-full h-[100px] p-3 cursor-pointer hover:bg-gray-100 overflow-hidden relative ${
        isToday ? 'bg-blue-50' : 
        isPast ? 'bg-gray-100' : 'bg-white'
      }`}
      onClick={onClick}
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
        
        {/* Item icons at bottom */}
        <div className="h-6 flex items-center justify-center">
          {renderIcons()}
        </div>
      </div>
    </div>
  );
};

export default CalendarDayBox;
