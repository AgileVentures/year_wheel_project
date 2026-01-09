import { useTranslation } from 'react-i18next';

function AddActivityModal({ 
  show,
  activityName, 
  isTyping, 
  ringName,
  activityGroup = null,
  label = null,
  startDate = '2026-03-10',
  endDate = '2026-03-16',
  onClose = null
}) {
  const { t } = useTranslation(['landing']);
  
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-md mx-4 animate-fadeIn">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('landing:manualDemo.modal.addActivityTitle')}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('landing:manualDemo.modal.activityName')}{' '}
              <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={activityName}
                readOnly
                className="w-full px-4 py-2.5 border border-blue-500 rounded-sm bg-white text-base font-medium text-gray-900"
              />
              {isTyping && (
                <span 
                  className="absolute top-3 bg-blue-600 w-0.5 h-5 animate-pulse" 
                  style={{ left: `${16 + activityName.length * 8.5}px` }}
                />
              )}
            </div>
          </div>

          {/* Ring */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('landing:manualDemo.modal.ring')}{' '}
              <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
            </label>
            <select 
              value={ringName} 
              readOnly 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base bg-white"
            >
              <option>{ringName}</option>
            </select>
          </div>

          {/* Activity Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('landing:manualDemo.modal.activityGroup')}{' '}
              <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
            </label>
            <select className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base bg-white">
              <option>{activityGroup || t('landing:manualDemo.activities.planning')}</option>
            </select>
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('landing:manualDemo.modal.label')}
            </label>
            <select className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base bg-white">
              <option value="">{label || t('landing:manualDemo.modal.noLabel')}</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('landing:manualDemo.modal.startDate')}{' '}
                <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
              </label>
              <input
                type="date"
                value={startDate}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('landing:manualDemo.modal.endDate')}{' '}
                <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
              </label>
              <input
                type="date"
                value={endDate}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base text-gray-900 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {t('landing:manualDemo.modal.cancel')}
            </button>
          )}
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700">
            {t('landing:manualDemo.modal.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddActivityModal;
