import { X, FileText, Copy, Calendar, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showToast } from '../utils/dialogs';

/**
 * AddPageModal Component
 * 
 * Modal for creating new pages with different options
 */
export default function AddPageModal({ 
  currentPage,
  onClose, 
  onCreateBlank, 
  onDuplicate, 
  onCreateNextYear,
  onSmartCopy,
  isPremium = false
}) {
  const { t } = useTranslation(['editor', 'subscription']);
  const currentYear = currentPage?.year || new Date().getFullYear();
  const nextYear = currentYear + 1;

  const options = [
    {
      id: 'next-year',
      icon: Calendar,
      title: t('editor:addPageModal.nextYearTitle', { year: nextYear }),
      description: t('editor:addPageModal.nextYearDescription', { year: nextYear }),
      color: 'green',
      action: onCreateNextYear,
      isPremium: false
    },
    {
      id: 'smart-copy',
      icon: Sparkles,
      title: t('editor:addPageModal.smartCopyTitle', { year: nextYear }),
      description: t('editor:addPageModal.smartCopyDescription', { year: nextYear }),
      color: 'purple',
      action: onSmartCopy,
      isPremium: true
    }
  ];

  const handleOptionClick = (option) => {
    // Check if option is premium and user doesn't have access
    if (option.isPremium && !isPremium) {
      // Show upgrade prompt instead of executing action
      showToast(t('subscription:upgradePrompt.smartCopy'), 'info');
      return;
    }
    
    option.action();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('editor:addPageModal.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {options.map((option) => {
            const Icon = option.icon;
            const isLocked = option.isPremium && !isPremium;
            const colorClasses = {
              blue: isLocked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-50 border-blue-200 hover:border-blue-400',
              purple: isLocked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-purple-100 text-purple-600 hover:bg-purple-50 border-purple-200 hover:border-purple-400',
              green: isLocked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-green-100 text-green-600 hover:bg-green-50 border-green-200 hover:border-green-400'
            };

            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                className={`
                  w-full flex items-start gap-4 p-4 rounded-sm border-2 transition-all
                  relative
                  ${isLocked ? '' : 'hover:shadow-md group'}
                  ${colorClasses[option.color]}
                `}
              >
                {/* Premium Badge */}
                {option.isPremium && (
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    isPremium 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    <Sparkles size={12} />
                    Premium
                  </div>
                )}
                
                {/* Icon */}
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-sm flex items-center justify-center
                  bg-white shadow-sm ${isLocked ? 'opacity-50' : 'group-hover:scale-110'} transition-transform
                `}>
                  <Icon size={24} />
                </div>

                {/* Content */}
                <div className="flex-1 text-left pr-20">
                  <h3 className={`font-semibold text-lg mb-1 ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
                    {option.title}
                  </h3>
                  <p className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                    {option.description}
                  </p>
                  {isLocked && (
                    <p className="text-xs text-purple-600 font-medium mt-2">
                      Uppgradera till Premium för att använda denna funktion
                    </p>
                  )}
                </div>

                {/* Arrow indicator */}
                {!isLocked && (
                  <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all">
                    →
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-sm transition-colors font-medium"
          >
            {t('editor:addPageModal.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
