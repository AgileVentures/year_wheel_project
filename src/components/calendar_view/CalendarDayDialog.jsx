import { format } from "date-fns";
import { X, ExternalLink } from "lucide-react";
import { useTranslation } from 'react-i18next';

/**
 * CalendarDayDialog Component
 *
 * Shows details for a selected day with all activities/items
 *
 * @param {boolean} isOpen - Whether the dialog is open
 * @param {Function} onClose - Callback to close the dialog
 * @param {Date} day - The date object representing the selected day
 * @param {Array} items - Wheel items for the selected day
 * @param {Function} getActivityGroup - Get activity group for an item
 * @param {Function} getRing - Get ring for an item
 * @param {Function} onUpdateItem - Callback when item is updated
 * @param {Function} onDeleteItem - Callback when item is deleted
 * @param {Function} onNavigateToItem - Callback to open item tooltip in wheel
 * @param {Object} locale - date-fns locale object
 */
const CalendarDayDialog = ({ 
  isOpen, 
  onClose, 
  day, 
  items = [],
  getActivityGroup,
  getRing,
  onUpdateItem,
  onDeleteItem,
  onNavigateToItem,
  locale
}) => {
  const { t } = useTranslation();
  
  console.log('[CalendarDayDialog] isOpen:', isOpen);
  console.log('[CalendarDayDialog] items:', items);
  console.log('[CalendarDayDialog] items length:', items?.length);
  
  if (!isOpen) return null;

  const formatItemDate = (item) => {
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return format(start, "d MMM yyyy", { locale });
    }
    return `${format(start, "d MMM", { locale })} - ${format(end, "d MMM yyyy", { locale })}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              {format(day, "d MMMM yyyy", { locale })}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-sm transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item) => {
                  const activityGroup = getActivityGroup(item);
                  const ring = getRing(item);
                  
                  return (
                    <div
                      key={item.id}
                      className="p-4 border border-gray-200 rounded-sm bg-gray-50 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        {/* Color indicator */}
                        {activityGroup && (
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                            style={{ backgroundColor: activityGroup.color }}
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {/* Item name */}
                          <div className="font-semibold text-gray-900 mb-1">
                            {item.name}
                          </div>
                          
                          {/* Date range */}
                          <div className="text-sm text-gray-600 mb-2">
                            {formatItemDate(item)}
                          </div>
                          
                          {/* Metadata */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {activityGroup && (
                              <span className="px-2 py-1 bg-white border border-gray-200 rounded-sm">
                                {activityGroup.name}
                              </span>
                            )}
                            {ring && (
                              <span className="px-2 py-1 bg-white border border-gray-200 rounded-sm">
                                {ring.name}
                              </span>
                            )}
                          </div>
                          
                          {/* Description if exists */}
                          {item.description && (
                            <div className="mt-2 text-sm text-gray-600">
                              {item.description}
                            </div>
                          )}
                          
                          {/* View in wheel button */}
                          {onNavigateToItem && (
                            <button
                              onClick={() => onNavigateToItem(item.id)}
                              className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              <ExternalLink size={14} />
                              {t('common:actions.viewInWheel', 'Visa i hjul')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                {t('common:calendar.noActivities')}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-sm transition-colors text-sm font-medium"
            >
              {t('common:actions.close')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CalendarDayDialog;
