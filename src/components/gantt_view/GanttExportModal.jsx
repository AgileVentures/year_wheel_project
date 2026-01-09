import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileImage, FileText, FileSpreadsheet, Printer, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

/**
 * GanttExportModal Component
 * 
 * Modal for configuring timeline export options:
 * - Format selection (PNG, PDF, CSV, Print)
 * - Date range (Smart, Current view, Full year, Custom)
 * - Content toggles (names panel, dates, legend, dependencies)
 * - PDF size options
 */
const GanttExportModal = ({
  isOpen,
  onClose,
  onExport,
  viewStart,
  viewEnd,
  allItems = [],
  availableYears = [],
}) => {
  const { t, i18n } = useTranslation(['timeline', 'common']);
  const dateLocale = i18n.language === 'sv' ? sv : enUS;
  
  // Export options state
  const [exportFormat, setExportFormat] = useState('pdf');
  const [dateRangeMode, setDateRangeMode] = useState('smart');
  const [customStartMonth, setCustomStartMonth] = useState(() => format(viewStart, 'yyyy-MM'));
  const [customEndMonth, setCustomEndMonth] = useState(() => format(viewEnd, 'yyyy-MM'));
  
  // Content options
  const [showNamesPanel, setShowNamesPanel] = useState(true);
  const [showDatesOnBars, setShowDatesOnBars] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  
  // PDF options
  const [pdfSize, setPdfSize] = useState('auto');
  
  // Calculate smart date range from items
  const smartDateRange = useMemo(() => {
    if (!allItems || allItems.length === 0) {
      return { start: viewStart, end: viewEnd };
    }
    
    let minDate = null;
    let maxDate = null;
    
    allItems.forEach(item => {
      if (!item.startDate || !item.endDate) return;
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      if (!minDate || start < minDate) minDate = start;
      if (!maxDate || end > maxDate) maxDate = end;
    });
    
    if (!minDate || !maxDate) {
      return { start: viewStart, end: viewEnd };
    }
    
    return {
      start: startOfMonth(minDate),
      end: endOfMonth(maxDate),
    };
  }, [allItems, viewStart, viewEnd]);
  
  // Calculate full year range
  const fullYearRange = useMemo(() => {
    if (availableYears.length === 0) {
      return { start: startOfYear(viewStart), end: endOfYear(viewEnd) };
    }
    const minYear = Math.min(...availableYears);
    const maxYear = Math.max(...availableYears);
    return {
      start: new Date(minYear, 0, 1),
      end: new Date(maxYear, 11, 31),
    };
  }, [availableYears, viewStart, viewEnd]);
  
  // Generate month options for custom range
  const monthOptions = useMemo(() => {
    const options = [];
    const startYear = Math.min(...availableYears, new Date().getFullYear()) - 1;
    const endYear = Math.max(...availableYears, new Date().getFullYear()) + 1;
    
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        options.push({
          value: format(date, 'yyyy-MM'),
          label: format(date, 'MMM yyyy', { locale: dateLocale }),
        });
      }
    }
    return options;
  }, [availableYears, dateLocale]);
  
  // Get actual date range based on mode
  const getDateRange = () => {
    switch (dateRangeMode) {
      case 'smart':
        return smartDateRange;
      case 'current':
        return { start: viewStart, end: viewEnd };
      case 'full':
        return fullYearRange;
      case 'custom':
        return {
          start: startOfMonth(new Date(customStartMonth + '-01')),
          end: endOfMonth(new Date(customEndMonth + '-01')),
        };
      default:
        return smartDateRange;
    }
  };
  
  // Format date range for display
  const formatDateRange = (start, end) => {
    return `${format(start, 'd MMM yyyy', { locale: dateLocale })} – ${format(end, 'd MMM yyyy', { locale: dateLocale })}`;
  };
  
  // Handle export
  const handleExport = () => {
    const dateRange = getDateRange();
    
    onExport(exportFormat, {
      dateRange,
      showNamesPanel,
      showDatesOnBars,
      showLegend,
      showDependencies,
      pdfSize,
    });
    
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-sm shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('timeline:export.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('timeline:export.format')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'png', icon: FileImage, label: 'PNG' },
                { id: 'pdf', icon: FileText, label: 'PDF' },
                { id: 'csv', icon: FileSpreadsheet, label: 'CSV' },
                { id: 'print', icon: Printer, label: t('common:actions.export') },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setExportFormat(id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-sm border-2 transition-colors ${
                    exportFormat === id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Date Range - Not shown for CSV */}
          {exportFormat !== 'csv' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('timeline:export.dateRange')}
              </label>
              <div className="space-y-2">
                {[
                  { 
                    id: 'smart', 
                    label: t('timeline:export.smartRange'),
                    detail: formatDateRange(smartDateRange.start, smartDateRange.end),
                  },
                  { 
                    id: 'current', 
                    label: t('timeline:export.currentView'),
                    detail: formatDateRange(viewStart, viewEnd),
                  },
                  { 
                    id: 'full', 
                    label: t('timeline:export.fullYear'),
                    detail: formatDateRange(fullYearRange.start, fullYearRange.end),
                  },
                  { 
                    id: 'custom', 
                    label: t('timeline:export.customRange'),
                    detail: null,
                  },
                ].map(({ id, label, detail }) => (
                  <label
                    key={id}
                    className={`flex items-start gap-3 p-3 rounded-sm border cursor-pointer transition-colors ${
                      dateRangeMode === id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dateRange"
                      value={id}
                      checked={dateRangeMode === id}
                      onChange={(e) => setDateRangeMode(e.target.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{label}</div>
                      {detail && (
                        <div className="text-xs text-gray-500 mt-0.5">{detail}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              
              {/* Custom date range inputs */}
              {dateRangeMode === 'custom' && (
                <div className="flex items-center gap-2 mt-3 ml-7">
                  <select
                    value={customStartMonth}
                    onChange={(e) => setCustomStartMonth(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-sm"
                  >
                    {monthOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="text-gray-500">–</span>
                  <select
                    value={customEndMonth}
                    onChange={(e) => setCustomEndMonth(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-sm"
                  >
                    {monthOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          
          {/* Content Options - Not shown for CSV */}
          {exportFormat !== 'csv' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('timeline:export.include')}
              </label>
              <div className="space-y-2">
                {[
                  { id: 'showNamesPanel', label: t('timeline:export.namesPanel'), state: showNamesPanel, setter: setShowNamesPanel },
                  { id: 'showDatesOnBars', label: t('timeline:export.datesOnBars'), state: showDatesOnBars, setter: setShowDatesOnBars },
                  { id: 'showLegend', label: t('timeline:export.legend'), state: showLegend, setter: setShowLegend },
                  { id: 'showDependencies', label: t('timeline:export.dependencies'), state: showDependencies, setter: setShowDependencies },
                ].map(({ id, label, state, setter }) => (
                  <label
                    key={id}
                    className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={state}
                      onChange={(e) => setter(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* PDF Options */}
          {exportFormat === 'pdf' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('timeline:export.pdfSize')}
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'auto', label: t('timeline:export.autoSize') },
                  { id: 'fit', label: t('timeline:export.fitToPage') },
                  { id: 'a4', label: 'A4' },
                  { id: 'a3', label: 'A3' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setPdfSize(id)}
                    className={`px-3 py-1.5 text-sm rounded-sm border transition-colors ${
                      pdfSize === id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* CSV Info */}
          {exportFormat === 'csv' && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-sm">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">{t('timeline:export.csvInfo')}</p>
                <p className="mt-1 text-blue-700">
                  {t('timeline:export.csvDescription')}
                </p>
              </div>
            </div>
          )}
          
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-sm hover:bg-blue-700 transition-colors"
          >
            {exportFormat === 'print' 
              ? t('common:actions.export')
              : t('common:actions.export')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default GanttExportModal;
