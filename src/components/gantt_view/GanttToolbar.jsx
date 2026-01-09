import { ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * GanttToolbar Component
 * 
 * Top toolbar with controls for:
 * - Year selection
 * - Today button
 * - Zoom controls
 * - Grouping options
 */
const GanttToolbar = ({
  yearFilter,
  availableYears,
  groupBy,
  zoomLevel,
  onYearChange,
  onGroupByChange,
  onZoomIn,
  onZoomOut,
  onTodayClick,
}) => {
  const { t } = useTranslation();
  
  return (
    <div 
      className="flex items-center justify-between px-4 py-3 bg-white border-b"
      data-cy="gantt-toolbar"
    >
      {/* Left: Year selector and Today button */}
      <div className="flex items-center gap-3">
        <select
          value={yearFilter}
          onChange={(e) => onYearChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-cy="gantt-year-filter"
        >
          <option value="all">{t('common.allYears', 'Alla år')}</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        
        <button
          onClick={onTodayClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-cy="gantt-today-button"
        >
          <Calendar className="w-4 h-4" />
          {t('common.today', 'Idag')}
        </button>
      </div>
      
      {/* Center: Grouping options */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{t('gantt.groupBy', 'Gruppera efter')}:</span>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-md">
          <button
            onClick={() => onGroupByChange('rings')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              groupBy === 'rings'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            data-cy="gantt-group-rings"
          >
            {t('gantt.rings', 'Ringar')}
          </button>
          <button
            onClick={() => onGroupByChange('labels')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              groupBy === 'labels'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            data-cy="gantt-group-labels"
          >
            {t('gantt.labels', 'Etiketter')}
          </button>
          <button
            onClick={() => onGroupByChange('activityGroups')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              groupBy === 'activityGroups'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            data-cy="gantt-group-activities"
          >
            {t('gantt.activityGroups', 'Aktivitetsgrupper')}
          </button>
        </div>
      </div>
      
      {/* Right: Zoom controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{t('gantt.zoom', 'Zoom')}:</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            disabled={zoomLevel === 'month'}
            className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            data-cy="gantt-zoom-out"
            title={t('gantt.zoomOut', 'Zooma ut')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded min-w-[60px] text-center">
            {t(`gantt.zoom.${zoomLevel}`, zoomLevel)}
          </span>
          <button
            onClick={onZoomIn}
            disabled={zoomLevel === 'day'}
            className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            data-cy="gantt-zoom-in"
            title={t('gantt.zoomIn', 'Zooma in')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GanttToolbar;
