import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Copy, Trash2, GripVertical } from 'lucide-react';

/**
 * PageNavigator Component
 * 
 * Bottom navigation bar for multi-page wheels (Canva-style)
 * Shows thumbnails of all pages with navigation controls
 */
export default function PageNavigator({ 
  pages = [], 
  currentPageId, 
  onPageChange, 
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  disabled = false
}) {
  const [hoveredPageId, setHoveredPageId] = useState(null);
  
  const currentIndex = pages.findIndex(p => p.id === currentPageId);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < pages.length - 1;

  const handlePrevPage = () => {
    if (canGoPrev) {
      onPageChange(pages[currentIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      onPageChange(pages[currentIndex + 1].id);
    }
  };

  const handleDeletePage = (pageId, e) => {
    e.stopPropagation();
    
    if (pages.length === 1) {
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kan inte radera sista sidan', type: 'error' }
      });
      window.dispatchEvent(event);
      return;
    }

    if (confirm('Är du säker på att du vill radera denna sida?')) {
      onDeletePage(pageId);
    }
  };

  const handleDuplicatePage = (pageId, e) => {
    e.stopPropagation();
    onDuplicatePage(pageId);
  };

  if (!pages || pages.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-full px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          {/* Previous button */}
          <button
            onClick={handlePrevPage}
            disabled={!canGoPrev || disabled}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Föregående sida"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>

          {/* Page thumbnails */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-4xl px-2">
            {pages.map((page, index) => {
              const isActive = page.id === currentPageId;
              const isHovered = page.id === hoveredPageId;
              
              return (
                <div
                  key={page.id}
                  className="relative flex-shrink-0 group"
                  onMouseEnter={() => setHoveredPageId(page.id)}
                  onMouseLeave={() => setHoveredPageId(null)}
                >
                  {/* Page thumbnail */}
                  <button
                    onClick={() => onPageChange(page.id)}
                    disabled={disabled}
                    className={`
                      relative w-24 h-24 rounded-lg border-2 transition-all
                      ${isActive 
                        ? 'border-blue-500 shadow-lg scale-105' 
                        : 'border-gray-300 hover:border-blue-300 hover:shadow-md'
                      }
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      bg-gradient-to-br from-gray-50 to-gray-100
                      flex flex-col items-center justify-center
                      overflow-hidden
                    `}
                  >
                    {/* Year badge */}
                    <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                      {page.year}
                    </div>

                    {/* Page number */}
                    <div className="text-2xl font-bold text-gray-400">
                      {index + 1}
                    </div>
                    
                    {/* Page title */}
                    <div className="text-xs text-gray-600 mt-1 px-1 truncate max-w-full">
                      {page.title || `Sida ${index + 1}`}
                    </div>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
                    )}
                  </button>

                  {/* Hover actions */}
                  {(isHovered || isActive) && !disabled && (
                    <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDuplicatePage(page.id, e)}
                        className="p-1 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                        title="Duplicera sida"
                      >
                        <Copy size={14} />
                      </button>
                      {pages.length > 1 && (
                        <button
                          onClick={(e) => handleDeletePage(page.id, e)}
                          className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
                          title="Radera sida"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Drag handle (for future drag-to-reorder) */}
                  <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity cursor-move">
                    <GripVertical size={16} className="text-gray-400" />
                  </div>
                </div>
              );
            })}

            {/* Add page button */}
            <button
              onClick={onAddPage}
              disabled={disabled}
              className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Lägg till ny sida"
            >
              <Plus size={24} />
              <span className="text-xs font-medium">Ny sida</span>
            </button>
          </div>

          {/* Next button */}
          <button
            onClick={handleNextPage}
            disabled={!canGoNext || disabled}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Nästa sida"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Page indicator */}
        <div className="text-center mt-2 text-sm text-gray-500">
          Sida {currentIndex + 1} av {pages.length}
        </div>
      </div>
    </div>
  );
}
