import { useState, useRef, useEffect } from 'react';
import { HelpCircle, BookOpen, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * OnboardingMenu - Dropdown menu for selecting which onboarding guide to show
 */
function OnboardingMenu({ onStartEditorGuide, onStartAIGuide, showAIOption = false }) {
  const { t } = useTranslation(['editor', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEditorGuide = () => {
    setIsOpen(false);
    onStartEditorGuide && onStartEditorGuide();
  };

  const handleAIGuide = () => {
    setIsOpen(false);
    onStartAIGuide && onStartAIGuide();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
        title={t('common:header.showGuide')}
      >
        <HelpCircle size={14} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-sm shadow-xl z-50 min-w-[240px]">
            <div className="py-1">
              {/* Editor Guide */}
              <button
                onClick={handleEditorGuide}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-3 transition-colors"
              >
                <BookOpen size={16} className="text-blue-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">{t('editor:guides.editorGuide.title')}</div>
                  <div className="text-xs text-gray-500">{t('editor:guides.editorGuide.description')}</div>
                </div>
              </button>

              {/* AI Assistant Guide - Only show if user has access */}
              {showAIOption && (
                <>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={handleAIGuide}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-3 transition-colors"
                  >
                    <Sparkles size={16} className="text-amber-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {t('editor:guides.aiGuide.title')}
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">PREMIUM</span>
                      </div>
                      <div className="text-xs text-gray-500">{t('editor:guides.aiGuide.description')}</div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OnboardingMenu;
