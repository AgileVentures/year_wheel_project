/**
 * Export Data Modal
 * Allows users to export wheel data to various formats:
 * - Excel (.xlsx)
 * - CSV
 * - Google Sheets (premium feature with integration)
 */

import { useState, useEffect } from 'react';
import { X, FileSpreadsheet, FileText, Sheet, Download, Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  exportToExcel, 
  exportToCSV, 
  exportToGoogleSheets, 
  getExportPreview 
} from '../services/exportService';
import { getUserIntegrationByProvider } from '../services/integrationService';

function ExportDataModal({ 
  wheelStructure, 
  pages = [], // CRITICAL: All pages for multi-page export
  year, 
  title, 
  onClose,
  isPremium = false 
}) {
  const { t, i18n } = useTranslation(['common', 'export']);
  const [selectedFormat, setSelectedFormat] = useState('excel');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportResult, setExportResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [hasGoogleSheets, setHasGoogleSheets] = useState(false);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);

  // Export options - Basic fields
  const [includeRingNames, setIncludeRingNames] = useState(true);
  const [includeActivityGroups, setIncludeActivityGroups] = useState(true);
  const [includeLabels, setIncludeLabels] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
  
  // Export options - Date fields
  const [includeStartMonth, setIncludeStartMonth] = useState(false);
  const [includeEndMonth, setIncludeEndMonth] = useState(false);
  const [includeStartWeek, setIncludeStartWeek] = useState(false);
  const [includeEndWeek, setIncludeEndWeek] = useState(false);
  
  // Custom column names
  const [columnNames, setColumnNames] = useState({
    name: '',
    startDate: '',
    endDate: '',
    time: '',
    description: '',
    ring: '',
    activityGroup: '',
    label: '',
    startMonth: '',
    endMonth: '',
    startWeek: '',
    endWeek: ''
  });
  
  // Google Sheets options
  const [googleSheetName, setGoogleSheetName] = useState(year || '2025');
  const [createNewSheet, setCreateNewSheet] = useState(true);

  // Helper to update a single column name
  const updateColumnName = (field, value) => {
    setColumnNames(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    loadIntegrations();
    loadPreview();
  }, []);

  useEffect(() => {
    loadPreview();
  }, [
    includeRingNames, 
    includeActivityGroups, 
    includeLabels, 
    includeDescription, 
    includeTime,
    includeStartMonth,
    includeEndMonth,
    includeStartWeek,
    includeEndWeek,
    columnNames
  ]);

  const loadIntegrations = async () => {
    try {
      const sheetsAuth = await getUserIntegrationByProvider('google_sheets');
      setHasGoogleSheets(!!sheetsAuth);
    } catch (err) {
      console.error('Error loading integrations:', err);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const loadPreview = () => {
    try {
      const previewData = getExportPreview(wheelStructure, {
        maxRows: 5,
        pages: pages, // Pass all pages for accurate preview
        includeRingNames,
        includeActivityGroups,
        includeLabels,
        includeDescription,
        includeTime,
        includeStartMonth,
        includeEndMonth,
        includeStartWeek,
        includeEndWeek,
        language: i18n.language,
        columnNames: Object.fromEntries(
          Object.entries(columnNames).filter(([_, value]) => value)
        )
      });
      setPreview(previewData);
    } catch (err) {
      console.error('Error loading preview:', err);
    }
  };

  const handleExport = async () => {
    setError('');
    setSuccess('');
    setExporting(true);
    setExportResult(null);

    try {
      const exportOptions = {
        year,
        title,
        includeRingNames,
        includeActivityGroups,
        includeLabels,
        includeDescription,
        includeTime,
        includeStartMonth,
        includeEndMonth,
        includeStartWeek,
        includeEndWeek,
        language: i18n.language,
        pages: pages, // CRITICAL: Pass all pages for multi-page export
        columnNames: Object.fromEntries(
          Object.entries(columnNames).filter(([_, value]) => value)
        )
      };

      let result;
      
      switch (selectedFormat) {
        case 'excel':
          const excelFilename = exportToExcel(wheelStructure, exportOptions);
          setSuccess(t('export:success.excel', { filename: excelFilename }));
          break;
          
        case 'csv':
          const csvFilename = exportToCSV(wheelStructure, exportOptions);
          setSuccess(t('export:success.csv', { filename: csvFilename }));
          break;
          
        case 'google_sheets':
          if (!hasGoogleSheets) {
            throw new Error(t('export:errors.noGoogleSheetsAuth'));
          }
          if (!isPremium) {
            throw new Error(t('export:errors.premiumRequired'));
          }
          
          result = await exportToGoogleSheets(wheelStructure, {
            ...exportOptions,
            sheetName: googleSheetName,
            spreadsheetId: createNewSheet ? null : undefined
          });
          
          setExportResult(result);
          setSuccess(t('export:success.googleSheets'));
          break;
          
        default:
          throw new Error('Invalid export format');
      }

      // Show success toast
      const event = new CustomEvent('showToast', { 
        detail: { 
          message: selectedFormat === 'google_sheets' 
            ? t('export:toast.googleSheets')
            : t('export:toast.fileDownloaded'), 
          type: 'success' 
        } 
      });
      window.dispatchEvent(event);

    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || t('export:errors.exportFailed'));
      
      // Show error toast
      const event = new CustomEvent('showToast', { 
        detail: { message: err.message || t('export:errors.exportFailed'), type: 'error' } 
      });
      window.dispatchEvent(event);
    } finally {
      setExporting(false);
    }
  };

  const formatOptions = [
    {
      id: 'excel',
      name: 'Excel (.xlsx)',
      description: t('export:formats.excel.description'),
      icon: FileSpreadsheet,
      available: true,
      premium: false,
      beta: true
    },
    {
      id: 'csv',
      name: 'CSV',
      description: t('export:formats.csv.description'),
      icon: FileText,
      available: true,
      premium: false
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: t('export:formats.googleSheets.description'),
      icon: Sheet,
      available: false, // Disabled - coming soon
      premium: true,
      requiresAuth: true,
      comingSoon: true
    }
  ];

  if (loadingIntegrations) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-sm shadow-xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 justify-center">
            <Loader2 size={20} className="animate-spin text-blue-600" />
            <span className="text-gray-700">{t('export:loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-sm shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('export:title')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('export:description')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-sm text-green-700 text-sm">
              <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{success}</span>
                {exportResult?.spreadsheetUrl && (
                  <a 
                    href={exportResult.spreadsheetUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 text-green-800 hover:text-green-900 underline font-medium"
                  >
                    {t('export:openInGoogleSheets')}
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('export:selectFormat')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {formatOptions.map(format => {
                const Icon = format.icon;
                const isDisabled = !format.available || (format.premium && !isPremium);
                
                return (
                  <button
                    key={format.id}
                    onClick={() => !isDisabled && setSelectedFormat(format.id)}
                    disabled={isDisabled}
                    className={`p-4 border-2 rounded-sm transition-all text-left ${
                      selectedFormat === format.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon size={24} className={selectedFormat === format.id ? 'text-blue-600' : 'text-gray-400'} />
                    <div className="mt-2 font-medium text-gray-900 text-sm flex items-center gap-2">
                      {format.name}
                      {format.beta && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">BETA</span>
                      )}
                      {format.comingSoon && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                          {t('export:comingSoon')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{format.description}</div>
                    {format.premium && !isPremium && (
                      <div className="mt-2 text-xs text-amber-600 font-medium">
                        {t('common:subscription.premium')}
                      </div>
                    )}
                    {format.requiresAuth && !format.available && !format.comingSoon && (
                      <div className="mt-2 text-xs text-red-600">
                        {t('export:notConnected')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Google Sheets Options */}
          {selectedFormat === 'google_sheets' && hasGoogleSheets && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-sm space-y-3">
              <div>
                <label className="block text-sm font-medium text-green-900 mb-2">
                  {t('export:googleSheets.sheetName')}
                </label>
                <input
                  type="text"
                  value={googleSheetName}
                  onChange={(e) => setGoogleSheetName(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={year}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createNew"
                  checked={createNewSheet}
                  onChange={(e) => setCreateNewSheet(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="createNew" className="text-sm text-green-900">
                  {t('export:googleSheets.createNewSpreadsheet')}
                </label>
              </div>
            </div>
          )}

          {/* Export Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('export:options.title')}
            </label>
            <p className="text-xs text-gray-500 mb-3">
              {t('export:options.customizeHint')}
            </p>
            
            {/* Basic Information */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {t('export:options.basicInfo')}
              </div>
              <div className="space-y-2 pl-2">
                {/* Ring Names */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeRings"
                    checked={includeRingNames}
                    onChange={(e) => setIncludeRingNames(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label htmlFor="includeRings" className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {t('export:options.includeRingNames')}
                  </label>
                  <input
                    type="text"
                    value={columnNames.ring}
                    onChange={(e) => updateColumnName('ring', e.target.value)}
                    placeholder={t('export:options.placeholders.ring')}
                    disabled={!includeRingNames}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {/* Activity Groups */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeGroups"
                    checked={includeActivityGroups}
                    onChange={(e) => setIncludeActivityGroups(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label htmlFor="includeGroups" className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {t('export:options.includeActivityGroups')}
                  </label>
                  <input
                    type="text"
                    value={columnNames.activityGroup}
                    onChange={(e) => updateColumnName('activityGroup', e.target.value)}
                    placeholder={t('export:options.placeholders.activityGroup')}
                    disabled={!includeActivityGroups}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {/* Labels */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeLabels"
                    checked={includeLabels}
                    onChange={(e) => setIncludeLabels(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label htmlFor="includeLabels" className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {t('export:options.includeLabels')}
                  </label>
                  <input
                    type="text"
                    value={columnNames.label}
                    onChange={(e) => updateColumnName('label', e.target.value)}
                    placeholder={t('export:options.placeholders.label')}
                    disabled={!includeLabels}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {/* Description */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeDescription"
                    checked={includeDescription}
                    onChange={(e) => setIncludeDescription(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label htmlFor="includeDescription" className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {t('export:options.includeDescription')}
                  </label>
                  <input
                    type="text"
                    value={columnNames.description}
                    onChange={(e) => updateColumnName('description', e.target.value)}
                    placeholder={t('export:options.placeholders.description')}
                    disabled={!includeDescription}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {/* Time */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeTime"
                    checked={includeTime}
                    onChange={(e) => setIncludeTime(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label htmlFor="includeTime" className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {t('export:options.includeTime')}
                  </label>
                  <input
                    type="text"
                    value={columnNames.time}
                    onChange={(e) => updateColumnName('time', e.target.value)}
                    placeholder={t('export:options.placeholders.time')}
                    disabled={!includeTime}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>
              
              {/* Date/Time Details */}
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mt-4">
                {t('export:options.dateTimeDetails')}
              </div>
              <div className="space-y-2 pl-2">
                {/* Start Month */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeStartMonth"
                    checked={includeStartMonth}
                    onChange={(e) => setIncludeStartMonth(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label htmlFor="includeStartMonth" className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {t('export:options.includeStartMonth')}
                  </label>
                  <input
                    type="text"
                    value={columnNames.startMonth}
                    onChange={(e) => updateColumnName('startMonth', e.target.value)}
                    placeholder={i18n.language === 'sv' ? 'Startmånad' : 'Start Month'}
                    disabled={!includeStartMonth}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {/* End Month */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeEndMonth"
                    checked={includeEndMonth}
                    onChange={(e) => setIncludeEndMonth(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label htmlFor="includeEndMonth" className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {t('export:options.includeEndMonth')}
                  </label>
                  <input
                    type="text"
                    value={columnNames.endMonth}
                    onChange={(e) => updateColumnName('endMonth', e.target.value)}
                    placeholder={i18n.language === 'sv' ? 'Slutmånad' : 'End Month'}
                    disabled={!includeEndMonth}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {/* Start Week */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeStartWeek"
                    checked={includeStartWeek}
                    onChange={(e) => setIncludeStartWeek(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label htmlFor="includeStartWeek" className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {t('export:options.includeStartWeek')}
                  </label>
                  <input
                    type="text"
                    value={columnNames.startWeek}
                    onChange={(e) => updateColumnName('startWeek', e.target.value)}
                    placeholder={t('export:options.placeholders.startWeek')}
                    disabled={!includeStartWeek}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {/* End Week */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeEndWeek"
                    checked={includeEndWeek}
                    onChange={(e) => setIncludeEndWeek(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <label htmlFor="includeEndWeek" className="text-sm text-gray-700 w-32 flex-shrink-0">
                    {t('export:options.includeEndWeek')}
                  </label>
                  <input
                    type="text"
                    value={columnNames.endWeek}
                    onChange={(e) => updateColumnName('endWeek', e.target.value)}
                    placeholder={t('export:options.placeholders.endWeek')}
                    disabled={!includeEndWeek}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Data Preview */}
          {preview && preview.rows.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('export:preview.title')} ({preview.totalRows} {t('export:preview.activities')})
              </label>
              <div className="border border-gray-200 rounded-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {preview.headers.map(header => (
                          <th key={header} className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {preview.headers.map(header => (
                            <td key={header} className="px-3 py-2 text-gray-900 whitespace-nowrap">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.totalRows > 5 && (
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                    {t('export:preview.showingFirst', { count: 5, total: preview.totalRows })}
                  </div>
                )}
              </div>
            </div>
          )}

          {preview && preview.rows.length === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-sm text-yellow-800 text-sm">
              {t('export:noData')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-sm transition-colors"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !preview || preview.rows.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('export:exporting')}
              </>
            ) : (
              <>
                <Download size={16} />
                {t('export:exportButton')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDataModal;
