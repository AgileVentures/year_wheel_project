import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import EditItemModal from './EditItemModal';

function CalendarSidebar({ year, organizationData, onOrganizationChange, onClose, onZoomToMonth }) {
  const [currentMonth, setCurrentMonth] = useState(9); // October (0-indexed)
  const [selectedYear, setSelectedYear] = useState(parseInt(year));
  const [editingItem, setEditingItem] = useState(null);
  const [isZoomedToMonth, setIsZoomedToMonth] = useState(false);

  const months = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
  ];

  const daysOfWeek = ['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön'];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Get events for the current month
  const getEventsForMonth = () => {
    if (!organizationData?.items) return [];
    
    const monthStart = new Date(selectedYear, currentMonth, 1);
    const monthEnd = new Date(selectedYear, currentMonth + 1, 0, 23, 59, 59);
    
    return organizationData.items.filter(item => {
      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);
      return itemEnd >= monthStart && itemStart <= monthEnd;
    });
  };

  const events = getEventsForMonth();

  // Generate calendar grid
  const daysInMonth = getDaysInMonth(selectedYear, currentMonth);
  const firstDay = getFirstDayOfMonth(selectedYear, currentMonth);
  const calendarDays = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get activity color
  const getActivityColor = (activityId) => {
    const activity = organizationData?.activities?.find(a => a.id === activityId);
    return activity?.color || '#D1D5DB';
  };

  // Handle update item
  const handleUpdateItem = (updatedItem) => {
    const updatedItems = organizationData.items.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    onOrganizationChange({ ...organizationData, items: updatedItems });
  };

  // Handle delete item
  const handleDeleteItem = (itemId) => {
    const updatedItems = organizationData.items.filter(item => item.id !== itemId);
    onOrganizationChange({ ...organizationData, items: updatedItems });
  };

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="text-base font-medium text-gray-900">
            {months[currentMonth]} {selectedYear}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="zoom-toggle"
              checked={isZoomedToMonth}
              onChange={(e) => {
                setIsZoomedToMonth(e.target.checked);
                if (onZoomToMonth) {
                  onZoomToMonth(e.target.checked ? currentMonth : null);
                }
              }}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="zoom-toggle" className="text-xs text-gray-600 cursor-pointer">
              Zooma in månad
            </label>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-xs text-gray-500 font-medium">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`aspect-square flex items-center justify-center text-xs ${
                day
                  ? 'text-gray-900 hover:bg-gray-100 rounded cursor-pointer'
                  : ''
              }`}
            >
              {day || ''}
            </div>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4">
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map(event => {
              const startDate = new Date(event.startDate);
              const endDate = new Date(event.endDate);
              const isSameDay = startDate.toDateString() === endDate.toDateString();
              
              return (
                <div key={event.id} className="flex items-start gap-2">
                  <div className="flex flex-col items-center min-w-[40px] pt-1">
                    <div className="text-xs text-gray-500">
                      {startDate.getDate()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {months[startDate.getMonth()].slice(0, 3).toLowerCase()}.
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: getActivityColor(event.activityId) }}
                      />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-900">
                          {event.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {startDate.getHours().toString().padStart(2, '0')}:00 - {' '}
                          {isSameDay 
                            ? `${endDate.getHours().toString().padStart(2, '0')}:00`
                            : `${endDate.getDate()} ${months[endDate.getMonth()].slice(0, 3)}`
                          }
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingItem(event)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Redigera"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                          <path d="M11.333 2A1.886 1.886 0 0 1 14 4.667l-9 9-3.667 1 1-3.667 9-9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-400 py-8">
            Inga händelser denna månad
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          organizationData={organizationData}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

export default CalendarSidebar;
