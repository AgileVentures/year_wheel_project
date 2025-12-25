import { memo, useState } from 'react';
import { ArrowLeft, ChevronDown, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * MobileHeader - Simplified header for mobile editor
 * 
 * Features:
 * - Back arrow to dashboard
 * - Wheel title (truncated)
 * - Year/page selector (compact dropdown)
 * - Unsaved indicator
 */
function MobileHeader({
  title,
  year,
  onBack,
  hasUnsavedChanges = false,
  pages = [],
  currentPageId,
  onPageChange,
}) {
  const { t } = useTranslation(['common']);
  const [showPageSelector, setShowPageSelector] = useState(false);
  
  const currentPage = pages.find(p => p.id === currentPageId);
  const displayYear = currentPage?.year || year;
  
  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-30 safe-area-top">
      <div className="flex items-center h-14 px-3">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 -ml-2 text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-full transition-colors"
          aria-label={t('common:back', { defaultValue: 'Tillbaka' })}
        >
          <ArrowLeft size={24} />
        </button>
        
        {/* Title & Unsaved Indicator */}
        <div className="flex-1 min-w-0 px-2">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {title || t('common:newWheel', { defaultValue: 'Nytt hjul' })}
            </h1>
            {hasUnsavedChanges && (
              <Circle 
                size={8} 
                className="text-orange-500 fill-orange-500 flex-shrink-0" 
                aria-label={t('common:unsavedChanges', { defaultValue: 'Osparade ändringar' })}
              />
            )}
          </div>
        </div>
        
        {/* Year/Page Selector */}
        <div className="relative">
          <button
            onClick={() => setShowPageSelector(!showPageSelector)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors"
            aria-expanded={showPageSelector}
            aria-haspopup="listbox"
          >
            <span>{displayYear}</span>
            <ChevronDown size={16} className={`transition-transform ${showPageSelector ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Page/Year Dropdown */}
          {showPageSelector && pages.length > 0 && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowPageSelector(false)}
              />
              
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-white rounded-sm shadow-lg border border-gray-200 py-1 min-w-[120px] z-50">
                {pages
                  .sort((a, b) => (a.year || 0) - (b.year || 0))
                  .map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        onPageChange && onPageChange(page.id);
                        setShowPageSelector(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        page.id === currentPageId
                          ? 'bg-teal-50 text-teal-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      {page.year}
                      {page.title && page.title !== String(page.year) && (
                        <span className="text-gray-400 ml-1">- {page.title}</span>
                      )}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default memo(MobileHeader);
