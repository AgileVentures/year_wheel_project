import { FiPlus, FiUser } from "react-icons/fi";

/**
 * DayBox Component
 *
 * @param {Date} day - The date object representing the day
 * @param {boolean} isToday - Indicates if the day is today
 * @param {boolean} isCurrentMonth - Indicates if the day belongs to the current month
 * @param {function} onClick - Callback when the box is clicked
 * @param {function} onAddEvent - Callback when the plus icon is clicked
 * @param {boolean} providerWorking - whether the provider is working on this day
 * @param {Array} appointments - appointments for this day (if any)
 * @param {boolean} isInThePast - whether the day is in the past
 */
const DayBox = ({
  day,
  isToday,
  isCurrentMonth,
  onClick,
  onAddEvent,
  providerWorking,
  appointments = [],
  isInThePast,
}) => {
  const dayNumber = day.getDate();

  const renderIcons = () => {
    const totalAppointments = appointments.length;
    if (totalAppointments === 0) return null;
    
    return (
      <div className="flex justify-center items-center space-x-0">
        {appointments.slice(0, 3).map((_, index) => (
          <FiUser
            key={index}
            className={`w-4 h-4 text-red-500 ${index > 0 ? '-ml-3' : ''}`}
            style={{ zIndex: 3 - index }}
          />
        ))}
        {totalAppointments > 3 && (
          <span className="text-xs font-bold text-red-500 ml-1">
            +{totalAppointments - 3}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`w-full h-[100px] p-3 ${
        isInThePast || !providerWorking ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100'
      } overflow-hidden relative ${
        isToday ? 'bg-blue-50' : 
        isInThePast ? 'bg-gray-100' : 'bg-white'
      }`}
      onClick={isInThePast || !providerWorking ? undefined : onClick}
    >
      {/* Only show the plus icon if it's NOT in the past and provider is working */}
      {!isInThePast && providerWorking && (
        <div
          className="absolute top-1 right-1 cursor-pointer hover:bg-gray-200 rounded-full p-1"
          onClick={(e) => {
            e.stopPropagation();
            onAddEvent(day);
          }}
        >
          <FiPlus className="w-3 h-3 text-gray-500" />
        </div>
      )}
      
      <div className="flex flex-col h-full">
        {/* Day number in center */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-2xl font-bold ${
            isToday ? 'text-red-500' : 
            !providerWorking ? 'text-gray-300' :
            isInThePast ? 'text-gray-400' : 
            isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
          }`}>
            {dayNumber}
          </div>
        </div>
        
        {/* Appointment icons at bottom */}
        <div className="h-6 flex items-center justify-center">
          {renderIcons()}
        </div>
      </div>
    </div>
  );
};


export default DayBox;