import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "../../../components/ui/button";
import { CalendarViewType, useCalendar } from "@/hooks/useCalendar";
import { format, isToday, isSameMonth } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import { useParams, useNavigate } from "react-router-dom";
import Calendar from "@/resources/Calendar";
import DayBox from "./DayBox";
import DayDialog from "./DayDialog";
import AddEventDialog from "./AddEventDialog";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/custom";
import WheelLoader from "../WheelLoader";

const timeStringToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const CalendarView = () => {
  const { body, month, year, navigation } = useCalendar({
    defaultViewType: CalendarViewType.Month,
  });

  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { id } = useParams();
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);

  const { t, i18n } = useTranslation();
  const locale = useMemo(() => {
    switch (i18n.language) {
      case "sv":
        return sv;
      case "en":
      default:
        return enUS;
    }
  }, [i18n.language]);

  /**
   * determine if the provider is working on a given day.
   * uses calendar.work_schedule and calendar.exceptions.
   *
   * @param {Date} day - the day to check
   * @returns {boolean} - true if any working time remains, false otherwise.
   */

  const getISODateString = (date) => {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  };

  const isProviderWorking = (day) => {
    if (!calendar) return false;
    const isoDay = getISODateString(day);
    const jsDay = day.getDay();
    const scheduleKey = jsDay === 0 ? "7" : String(jsDay);
    const workInterval = calendar.work_schedule[scheduleKey];
    if (!workInterval || workInterval.length !== 2) return false;

    const workStart = timeStringToMinutes(workInterval[0]);
    const workEnd = timeStringToMinutes(workInterval[1]);

    let blockedTime = 0;

    if (calendar.exceptions && calendar.exceptions[isoDay]) {
      const exceptionDetails = calendar.exceptions[isoDay];

      if (
        exceptionDetails.work_hours &&
        exceptionDetails.work_hours.length > 0
      ) {
        exceptionDetails.work_hours.forEach((exceptionStr) => {
          const parts = exceptionStr.split("-").map((p) => p.trim());
          if (parts.length === 2) {
            const excStart = timeStringToMinutes(parts[0]);
            const excEnd = timeStringToMinutes(parts[1]);
            const effectiveStart = Math.max(workStart, excStart);
            const effectiveEnd = Math.min(workEnd, excEnd);

            if (effectiveEnd > effectiveStart) {
              blockedTime += effectiveEnd - effectiveStart;
            }
          }
        });
      } else {
        return false;
      }
    }

    const availableTime = workEnd - workStart - blockedTime;
    console.log(`Available work time: ${availableTime} min`);
    return availableTime > 0;
  };

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Calendar.show(id);
      setCalendar(data);
    } catch (err) {
      console.error("Failed to fetch calendar:", err);
      setError("Could not fetch calendar. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchCalendar();
    } else {
      setError("Invalid calendar ID.");
      setLoading(false);
    }
  }, [id, fetchCalendar]);

  const getAppointmentsForDay = (day) => {
    if (!calendar || !calendar.hosted_appointments) return [];
    const dayStart = new Date(day).setHours(0, 0, 0, 0);
    const dayEnd = new Date(day).setHours(23, 59, 59, 999);
    return calendar.hosted_appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.datetime).getTime();
      return appointmentDate >= dayStart && appointmentDate <= dayEnd;
    });
  };

  const handleDayClick = (dayValue) => {
    const appointmentsForDay = getAppointmentsForDay(dayValue);
    setSelectedDay({ date: dayValue, appointments: appointmentsForDay });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedDay(null);
  };

  const handleAddEventDialogClick = (dayValue) => {
    setSelectedDay({ date: dayValue });
    setIsAddEventDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <WheelLoader size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-500 text-lg">
          No calendar found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full space-y-6 p-2 md:p-6">
      <div className="max-w-full w-[95%] md:w-full mx-auto px-2 md:px-5">
        <div className="sticky top-0 z-10 mb-2">
          <div className="flex justify-between items-center py-1">
            <div className="flex items-center space-x-4">
              <Button onClick={navigation.toPrev} variant="outline" size="sm">
                &lt;
              </Button>
              <div className="text-lg font-bold">
                {format(new Date(year, month), "MMMM yyyy", { locale: locale })}
              </div>
              <Button onClick={navigation.toNext} variant="outline" size="sm">
                &gt;
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={navigation.setToday}
                variant="jurex"
                size="sm"
              >
                {t("calendarView.today")}
              </Button>
              <Button
                onClick={() => navigate(-1)}
                variant="jurex"
                size="sm"
              >
                {t("calendar.labels.back", "Back")}
              </Button>
            </div>
          </div>
        </div>
        <Separator />
        {/* Calendar Grid */}
        <div className="overflow-y-auto p-2 md:p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-0 border border-gray-200 bg-gray-50">
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              const sampleDate = new Date(2025, 0, 5 + dayIndex); // Sunday = Jan 5, 2025
              const dayName = format(sampleDate, "EEE", { locale: locale });
              return (
                <div key={dayIndex} className="border-r border-gray-200 last:border-r-0 p-3 text-center text-sm font-medium text-gray-600">
                  {dayName}
                </div>
              );
            })}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-0 border-l border-r border-b border-gray-200">
            {body.value.map(({ value: days }) =>
              days.map(({ key, value }) => {
                const providerWorking = isProviderWorking(value);
                const appointmentsForDay = getAppointmentsForDay(value);
                const isInThePast = value < new Date().setHours(0, 0, 0, 0);

                return (
                  <div
                    key={key}
                    className={`border-r border-b border-gray-200 last:border-r-0 ${
                      isSameMonth(value, new Date(year, month))
                        ? "bg-white"
                        : "bg-gray-100"
                    }`}
                  >
                    <DayBox
                      day={value}
                      isToday={isToday(value)}
                      isCurrentMonth={isSameMonth(value, new Date(year, month))}
                      onClick={() => handleDayClick(value)}
                      onAddEvent={() => handleAddEventDialogClick(value)}
                      providerWorking={providerWorking}
                      appointments={appointmentsForDay}
                      isInThePast={isInThePast}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Day Dialog */}
        {selectedDay && (
          <DayDialog
            isOpen={isDialogOpen}
            onClose={handleCloseDialog}
            day={selectedDay.date}
            appointments={selectedDay.appointments}
          />
        )}

        {/* Add Event Dialog */}
        {selectedDay && (
          <AddEventDialog
            isOpen={isAddEventDialogOpen}
            onClose={() => setIsAddEventDialogOpen(false)}
            day={selectedDay.date}
            onSuccess={fetchCalendar}
            calendar={calendar}
          />
        )}
      </div>
      <Separator />
    </div>
  );
};

export default CalendarView;