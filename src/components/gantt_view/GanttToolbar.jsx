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
  const { t } = useTranslation(['timeline', 'common']);
  
  return (
    <div 
      className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200"
      data-cy="gantt-toolbar"
    >
      {/* Left: Title and Year selector */}
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t('timeline:title')}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={yearFilter}
            onChange={(e) => onYearChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-cy="gantt-year-filter"
          >
            <option value="all">{t('timeline:toolbar.allYears')}</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <button
            onClick={onTodayClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-cy="gantt-today-button"
          >
            <Calendar className="w-4 h-4" />
            {t('timeline:toolbar.today')}
          </button>
        </div>
      </div>
      
      {/* Center: Grouping options */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{t('timeline:toolbar.groupBy')}:</span>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-sm">
          <button
            onClick={() => onGroupByChange('rings')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              groupBy === 'rings'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            data-cy="gantt-group-rings"
          >
            {t('timeline:toolbar.rings')}
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
            {t('timeline:toolbar.labels')}
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
            {t('timeline:toolbar.activityGroups')}
          </button>
        </div>
      </div>
      
      {/* Right: Zoom controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{t('timeline:toolbar.zoom')}:</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            disabled={zoomLevel === 'month'}
            className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            data-cy="gantt-zoom-out"
            title={t('timeline:toolbar.zoomOut')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded min-w-[60px] text-center">
            {t(`timeline:zoomLevels.${zoomLevel}`)}
          </span>
          <button
            onClick={onZoomIn}
            disabled={zoomLevel === 'day'}
            className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            data-cy="gantt-zoom-in"
            title={t('timeline:toolbar.zoomIn')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GanttToolbar;
