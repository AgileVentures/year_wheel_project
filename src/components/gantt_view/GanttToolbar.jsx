import { ZoomIn, ZoomOut, Calendar, Download, ChevronDown, FileImage, FileText, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';

/**
 * GanttToolbar Component
 * 
 * Top toolbar with controls for:
 * - Year selection
 * - Today button
 * - Zoom controls
 * - Grouping options
 * - Export options
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
  onExport,
}) => {
  const { t } = useTranslation();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  
  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleExport = (format) => {
    setShowExportMenu(false);
    if (onExport) {
      onExport(format);
    }
  };
  
  return (
    <div 
      className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200"
      data-cy="gantt-toolbar"
    >
      {/* Left: Title and Year selector */}
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t('gantt.title', 'Tidslinje')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('gantt.subtitle', 'Aktiviteter som tidslinje')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={yearFilter}
            onChange={(e) => onYearChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      
      {/* Right: Zoom controls and Export */}
      <div className="flex items-center gap-4">
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
        
        {/* Export button with dropdown */}
        {onExport && (
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-cy="gantt-export-button"
            >
              <Download className="w-4 h-4" />
              {t('common.export', 'Exportera')}
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <button
                  onClick={() => handleExport('png')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileImage className="w-4 h-4" />
                  {t('export.png', 'PNG-bild')}
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileText className="w-4 h-4" />
                  {t('export.pdf', 'PDF-dokument')}
                </button>
                <hr className="my-1 border-gray-200" />
                <button
                  onClick={() => handleExport('print')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Printer className="w-4 h-4" />
                  {t('common.print', 'Skriv ut')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GanttToolbar;
