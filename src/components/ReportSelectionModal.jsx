import { useState } from 'react';
import { X, FileText, Calendar, BarChart3, Layers, ChevronRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * ReportSelectionModal - Choose report type and options before generating PDF
 * 
 * Report Types:
 * 1. wheel-activity - Wheel image + activity list (current default)
 * 2. monthly-calendar - 12-page calendar with activities on dates
 * 3. timeline - Gantt-style horizontal timeline
 * 4. ring-summary - Activities organized by ring with details
 */
export default function ReportSelectionModal({ 
  isOpen, 
  onClose, 
  onGenerate,
  isPremium = false 
}) {
  const { t } = useTranslation(['reports', 'common']);
  const [selectedType, setSelectedType] = useState('wheel-activity');
  const [options, setOptions] = useState({
    includeDescriptions: true,
    includeLegend: true,
    includeEmptyMonths: false,
    includeWheelImage: true,
    pageOrientation: 'portrait' // portrait or landscape
  });
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const reportTypes = [
    {
      id: 'wheel-activity',
      icon: FileText,
      title: t('reports:types.wheelActivity.title', 'Hjul + Aktivitetslista'),
      description: t('reports:types.wheelActivity.description', 'Visuell hjulbild med komplett aktivitetslista organiserad per ring'),
      recommended: true
    },
    {
      id: 'monthly-calendar',
      icon: Calendar,
      title: t('reports:types.monthlyCalendar.title', 'Månadskalender'),
      description: t('reports:types.monthlyCalendar.description', '12-sidig kalender med aktiviteter på sina datum, perfekt för utskrift'),
      pages: '12 sidor'
    },
    {
      id: 'timeline',
      icon: BarChart3,
      title: t('reports:types.timeline.title', 'Tidslinje'),
      description: t('reports:types.timeline.description', 'Gantt-liknande tidslinje som visar aktiviteternas varaktighet'),
      pages: '1-2 sidor'
    },
    {
      id: 'ring-summary',
      icon: Layers,
      title: t('reports:types.ringSummary.title', 'Ringsammanfattning'),
      description: t('reports:types.ringSummary.description', 'Detaljerad rapport per ring med beskrivningar och gruppering'),
      pages: 'Varierande'
    }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(selectedType, options);
      onClose();
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedReport = reportTypes.find(r => r.id === selectedType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('reports:modal.title', 'Välj rapporttyp')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('reports:modal.subtitle', 'Anpassa din PDF-rapport')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Report Type Selection */}
          <div className="space-y-3">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              const isSelected = selectedType === report.id;
              
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedType(report.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-sm ${
                      isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <Icon size={22} className={isSelected ? 'text-indigo-600' : 'text-gray-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {report.title}
                        </h3>
                        {report.recommended && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <Sparkles size={12} />
                            {t('reports:recommended', 'Rekommenderad')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {report.description}
                      </p>
                      {report.pages && (
                        <p className="text-xs text-gray-400 mt-1">
                          {report.pages}
                        </p>
                      )}
                    </div>
                    <div className={`p-1 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                      {isSelected ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Options Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              {t('reports:options.title', 'Alternativ')}
            </h3>
            <div className="space-y-3">
              {/* Include descriptions */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeDescriptions}
                  onChange={(e) => setOptions({ ...options, includeDescriptions: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  {t('reports:options.includeDescriptions', 'Inkludera beskrivningar')}
                </span>
              </label>

              {/* Include legend */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeLegend}
                  onChange={(e) => setOptions({ ...options, includeLegend: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  {t('reports:options.includeLegend', 'Inkludera aktivitetsgrupplegend')}
                </span>
              </label>

              {/* Include wheel image (for non-wheel reports) */}
              {selectedType !== 'wheel-activity' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeWheelImage}
                    onChange={(e) => setOptions({ ...options, includeWheelImage: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    {t('reports:options.includeWheelImage', 'Lägg till hjulbild som sista sida')}
                  </span>
                </label>
              )}

              {/* Include empty months (for calendar) */}
              {selectedType === 'monthly-calendar' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeEmptyMonths}
                    onChange={(e) => setOptions({ ...options, includeEmptyMonths: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    {t('reports:options.includeEmptyMonths', 'Visa månader utan aktiviteter')}
                  </span>
                </label>
              )}

              {/* Orientation (for timeline) */}
              {selectedType === 'timeline' && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-700">
                    {t('reports:options.orientation', 'Orientering')}:
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOptions({ ...options, pageOrientation: 'portrait' })}
                      className={`px-3 py-1.5 text-sm rounded-sm border ${
                        options.pageOrientation === 'portrait'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t('reports:options.portrait', 'Stående')}
                    </button>
                    <button
                      onClick={() => setOptions({ ...options, pageOrientation: 'landscape' })}
                      className={`px-3 py-1.5 text-sm rounded-sm border ${
                        options.pageOrientation === 'landscape'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t('reports:options.landscape', 'Liggande')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedReport && (
              <span className="flex items-center gap-1">
                <selectedReport.icon size={14} />
                {selectedReport.title}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
            >
              {t('common:actions.cancel', 'Avbryt')}
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !isPremium}
              className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors flex items-center gap-2 ${
                isPremium
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('reports:generating', 'Genererar...')}
                </>
              ) : (
                <>
                  {t('reports:generate', 'Generera PDF')}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Premium notice */}
        {!isPremium && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-200">
            <p className="text-sm text-amber-700">
              {t('reports:premiumRequired', 'PDF-rapporter kräver en Premium-prenumeration.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
