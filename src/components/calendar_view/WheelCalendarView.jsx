import { useState, useMemo } from "react";
import { CalendarViewType, useCalendar } from "@h6s/calendar";
import { format, isToday, isSameMonth, startOfDay } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import CalendarDayBox from "./CalendarDayBox";
import CalendarDayDialog from "./CalendarDayDialog";

/**
 * WheelCalendarView Component
 * 
 * Displays wheel items (activities) in a calendar view as an alternative to the circular wheel
 * 
 * @param {Object} wheelStructure - Contains rings, activityGroups, labels, and items
 * @param {number} year - Current year being displayed
 * @param {Function} onUpdateItem - Callback when item is updated
 * @param {Function} onDeleteItem - Callback when item is deleted
 */
const WheelCalendarView = ({ 
  wheelStructure, 
  year,
  onUpdateItem,
  onDeleteItem 
}) => {
  const { body, month, year: calendarYear, navigation } = useCalendar({
    defaultViewType: CalendarViewType.Month,
    defaultDate: new Date(year, 0, 1) // Start at January of the wheel year
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const { t, i18n } = useTranslation();
  const locale = useMemo(() => {
    return i18n.language === "sv" ? sv : enUS;
  }, [i18n.language]);

  // Debug logging
  console.log('[WheelCalendarView] wheelStructure:', wheelStructure);
  console.log('[WheelCalendarView] year:', year);
  console.log('[WheelCalendarView] items count:', wheelStructure?.items?.length || 0);

  // Get items for a specific day
  const getItemsForDay = (day) => {
    if (!wheelStructure?.items) {
      console.log('[WheelCalendarView] No items in wheelStructure');
      return [];
    }
    
    const dayStart = startOfDay(day).getTime();
    const dayEnd = new Date(day).setHours(23, 59, 59, 999);
    
    const dayItems = wheelStructure.items.filter((item) => {
      const itemStart = new Date(item.startDate).getTime();
      const itemEnd = new Date(item.endDate).getTime();
      
      // Item overlaps with this day if it starts before day ends and ends after day starts
      return itemStart <= dayEnd && itemEnd >= dayStart;
    });
    
    if (dayItems.length > 0) {
      console.log('[WheelCalendarView] Found', dayItems.length, 'items for', day);
    }
    
    return dayItems;
  };

  // Get activity group for an item
  const getActivityGroup = (item) => {
    if (!item.activityId || !wheelStructure?.activityGroups) return null;
    return wheelStructure.activityGroups.find(ag => ag.id === item.activityId);
  };

  // Get ring for an item
  const getRing = (item) => {
    if (!item.ringId || !wheelStructure?.rings) return null;
    return wheelStructure.rings.find(r => r.id === item.ringId);
  };

  const handleDayClick = (dayValue) => {
    const itemsForDay = getItemsForDay(dayValue);
    setSelectedDay({ date: dayValue, items: itemsForDay });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedDay(null);
  };

  return (
    <div className="flex flex-col items-center w-full h-full bg-white p-2 md:p-6">
      <div className="max-w-full w-[95%] md:w-full mx-auto px-2 md:px-5">
        {/* Calendar Header with Navigation */}
        <div className="sticky top-0 z-10 mb-2 bg-white">
          <div className="flex justify-between items-center py-1">
            <div className="flex items-center space-x-4">
              <button
                onClick={navigation.toPrev}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-sm transition-colors text-sm font-medium"
              >
                &lt;
              </button>
              <div className="text-lg font-bold">
                {format(new Date(calendarYear, month), "MMMM yyyy", { locale })}
              </div>
              <button
                onClick={navigation.toNext}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-sm transition-colors text-sm font-medium"
              >
                &gt;
              </button>
            </div>
            <button
              onClick={navigation.setToday}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors text-sm font-medium"
            >
              {t("common:calendar.today", "Idag")}
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-y-auto p-2 md:p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-0 border border-gray-200 bg-gray-50">
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              const sampleDate = new Date(2025, 0, 5 + dayIndex); // Sunday = Jan 5, 2025
              const dayName = format(sampleDate, "EEE", { locale });
              return (
                <div 
                  key={dayIndex} 
                  className="border-r border-gray-200 last:border-r-0 p-3 text-center text-sm font-medium text-gray-600"
                >
                  {dayName}
                </div>
              );
            })}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-0 border-l border-r border-b border-gray-200">
            {body.value.map(({ value: days }) =>
              days.map(({ key, value }) => {
                const itemsForDay = getItemsForDay(value);
                const isCurrentMonth = isSameMonth(value, new Date(calendarYear, month));
                const isPast = value < new Date().setHours(0, 0, 0, 0);

                return (
                  <div
                    key={key}
                    className={`border-r border-b border-gray-200 last:border-r-0 ${
                      isCurrentMonth ? "bg-white" : "bg-gray-100"
                    }`}
                  >
                    <CalendarDayBox
                      day={value}
                      isToday={isToday(value)}
                      isCurrentMonth={isCurrentMonth}
                      onClick={() => handleDayClick(value)}
                      items={itemsForDay}
                      isPast={isPast}
                      getActivityGroup={getActivityGroup}
                      getRing={getRing}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Day Dialog */}
        {selectedDay && (
          <CalendarDayDialog
            isOpen={isDialogOpen}
            onClose={handleCloseDialog}
            day={selectedDay.date}
            items={selectedDay.items}
            getActivityGroup={getActivityGroup}
            getRing={getRing}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
};

export default WheelCalendarView;
