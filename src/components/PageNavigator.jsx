import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Trash2 } from 'lucide-react';

/**
 * PageNavigator Component
 * 
 * Compact horizontal navigation for multi-page wheels
 * Shows year-based page navigation in header
 */
export default function PageNavigator({ 
  pages = [], 
  currentPageId, 
  onPageChange, 
  onAddPage,
  onDeletePage,
  disabled = false
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  const currentIndex = pages.findIndex(p => p.id === currentPageId);
  const currentPage = pages[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < pages.length - 1;

  const handlePrevPage = () => {
    if (canGoPrev && !disabled) {
      onPageChange(pages[currentIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    if (canGoNext && !disabled) {
      onPageChange(pages[currentIndex + 1].id);
    }
  };

  // If no pages exist, show just the add button
  if (!pages || pages.length === 0) {
    return (
      <button
        onClick={onAddPage}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-300 rounded-sm hover:bg-green-100 hover:border-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="Skapa första året"
      >
        <Plus size={16} />
        <span className="font-medium">Skapa år</span>
      </button>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      {/* Previous year button */}
      <button
        onClick={handlePrevPage}
        disabled={!canGoPrev || disabled}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Föregående år"
      >
        <ChevronLeft size={18} className="text-gray-600" />
      </button>

      {/* Current year dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-sm hover:border-blue-400 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
          title="Välj år"
        >
          <Calendar size={16} className="text-gray-500" />
          <span className="font-semibold text-gray-900">{currentPage?.year || '2025'}</span>
          <span className="text-xs text-gray-500 ml-auto">
            {currentIndex + 1}/{pages.length}
          </span>
        </button>

        {/* Dropdown with all years */}
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)}
            ></div>

            {/* Dropdown menu */}
            <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-sm shadow-xl z-50 min-w-[240px] max-h-[300px] overflow-y-auto">
              {pages.map((page, index) => {
                const isActive = page.id === currentPageId;
                const canDelete = pages.length > 1;
                return (
                  <div
                    key={page.id}
                    className={`
                      w-full flex items-center justify-between border-b border-gray-100 last:border-b-0
                      ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    `}
                  >
                    <button
                      onClick={() => {
                        onPageChange(page.id);
                        setShowDropdown(false);
                      }}
                      className={`
                        flex-1 px-4 py-2.5 text-left transition-colors flex items-center justify-between
                        ${isActive ? 'text-blue-700 font-semibold' : 'text-gray-700'}
                      `}
                    >
                      <div className="flex flex-col">
                        <span className="text-lg font-bold">{page.year}</span>
                        {page.title && (
                          <span className="text-xs text-gray-500 truncate max-w-[150px]">
                            {page.title}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                      )}
                    </button>
                    
                    {/* Delete button */}
                    {canDelete && onDeletePage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(page.id);
                          setShowDropdown(false);
                        }}
                        className="p-2 mr-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Radera år"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
              
              {/* Add new page option */}
              <button
                onClick={() => {
                  onAddPage();
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-green-50 transition-colors flex items-center gap-2 text-green-700 font-medium border-t-2 border-gray-200"
              >
                <Plus size={16} />
                <span>Nytt år</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Next year button */}
      <button
        onClick={handleNextPage}
        disabled={!canGoNext || disabled}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Nästa år"
      >
        <ChevronRight size={18} className="text-gray-600" />
      </button>
    </div>
  );
}
