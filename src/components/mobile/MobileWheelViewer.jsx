import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { X, Presentation, ZoomIn, ZoomOut, RotateCcw, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import YearWheel from '../../YearWheel';

/**
 * MobileWheelViewer - Full-screen wheel overlay for mobile
 * 
 * Features:
 * - Full-screen view of the wheel
 * - Pinch-to-zoom support
 * - Rotation via touch
 * - Quick access to presentation/cast mode
 * - Zoom controls
 * - Page navigation for multi-year wheels
 */
function MobileWheelViewer({
  isOpen,
  onClose,
  wheelId,
  wheelData,
  title,
  year,
  colors,
  wheelStructure,
  allItems,
  showWeekRing,
  showMonthRing,
  showRingNames,
  showLabels,
  weekRingDisplayMode,
  onOpenPresentation,
  // Page navigation
  pages,
  currentPageId,
  onPageChange,
}) {
  const { t } = useTranslation(['common']);
  const [wheelRef, setWheelRef] = useState(null);
  const containerRef = useRef(null);
  const [showPageSelector, setShowPageSelector] = useState(false);
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  // Pinch zoom state
  const touchStartDistance = useRef(null);
  const touchStartZoom = useRef(null);
  
  // Reset zoom and rotation when opening
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setRotation(0);
      setShowPageSelector(false);
    }
  }, [isOpen]);
  
  // Handle pinch zoom
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistance.current = Math.hypot(dx, dy);
      touchStartZoom.current = zoomLevel;
    }
  }, [zoomLevel]);
  
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && touchStartDistance.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.hypot(dx, dy);
      
      const scale = currentDistance / touchStartDistance.current;
      const newZoom = Math.min(3, Math.max(0.5, touchStartZoom.current * scale));
      setZoomLevel(newZoom);
    }
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    touchStartDistance.current = null;
    touchStartZoom.current = null;
  }, []);
  
  // Zoom controls
  const handleZoomIn = () => setZoomLevel(z => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoomLevel(z => Math.max(0.5, z - 0.25));
  const handleResetView = () => {
    setZoomLevel(1);
    setRotation(0);
  };
  
  // Get current page info
  const currentPage = pages?.find(p => p.id === currentPageId);
  const displayYear = currentPage?.year || year;
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 safe-area-top">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-gray-700 hover:text-gray-900 active:bg-gray-100 rounded-full transition-colors"
          aria-label={t('common:close', { defaultValue: 'Stäng' })}
        >
          <X size={24} />
        </button>
        
        <div className="flex items-center gap-2">
          <h2 className="text-gray-900 font-medium truncate">
            {title || t('common:yearWheel', { defaultValue: 'Årshjul' })}
          </h2>
          
          {/* Page Selector */}
          {pages && pages.length > 1 && (
            <div className="relative">
              <button
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setShowPageSelector(!showPageSelector);
                }}
                onClick={() => setShowPageSelector(!showPageSelector)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 active:bg-gray-300 touch-manipulation"
              >
                <span className="text-sm font-medium">{displayYear}</span>
                <ChevronDown size={16} className={`transform transition-transform ${showPageSelector ? 'rotate-180' : ''}`} />
              </button>
              
              {showPageSelector && (
                <>
                  <div 
                    className="fixed inset-0 z-30"
                    onClick={() => setShowPageSelector(false)}
                  />
                  <div className="absolute top-full mt-1 right-0 bg-white rounded shadow-lg z-40 min-w-[120px] border border-gray-200">
                    {pages
                      .sort((a, b) => a.pageOrder - b.pageOrder)
                      .map(page => (
                        <button
                          key={page.id}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            onPageChange(page.id);
                            setShowPageSelector(false);
                          }}
                          onClick={() => {
                            onPageChange(page.id);
                            setShowPageSelector(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 first:rounded-t last:rounded-b touch-manipulation ${
                            page.id === currentPageId ? 'bg-gray-100 font-semibold' : ''
                          }`}
                        >
                          {page.year}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={onOpenPresentation}
          className="flex items-center gap-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white text-sm font-medium rounded-full transition-colors"
        >
          <Presentation size={16} />
          <span className="hidden sm:inline">{t('common:cast', { defaultValue: 'Casta' })}</span>
        </button>
      </div>
      
      {/* Wheel Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden bg-white flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="transition-transform duration-100 ease-out"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
          }}
        >
          <YearWheel
            wheelId={wheelId}
            wheelData={wheelData}
            title={title}
            year={year}
            colors={colors}
            wheelStructure={wheelStructure}
            allItemsAcrossPages={allItems}
            showWeekRing={showWeekRing}
            showMonthRing={showMonthRing}
            showRingNames={showRingNames}
            showLabels={showLabels}
            weekRingDisplayMode={weekRingDisplayMode}
            initialRotation={rotation}
            onRotationChange={setRotation}
            onWheelReady={setWheelRef}
            readonly={true}
            hideControls={true}
            renderSize={1500} // Smaller for mobile performance
          />
        </div>
      </div>
      
      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 bg-white border-t border-gray-200 safe-area-bottom">
        <button
          onClick={handleZoomOut}
          disabled={zoomLevel <= 0.5}
          className="p-3 text-gray-700 hover:text-gray-900 active:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t('common:zoomOut', { defaultValue: 'Zooma ut' })}
        >
          <ZoomOut size={24} />
        </button>
        
        <button
          onClick={handleResetView}
          className="p-3 text-gray-700 hover:text-gray-900 active:bg-gray-100 rounded-full transition-colors"
          aria-label={t('common:resetView', { defaultValue: 'Återställ vy' })}
        >
          <RotateCcw size={24} />
        </button>
        
        <button
          onClick={handleZoomIn}
          disabled={zoomLevel >= 3}
          className="p-3 text-gray-700 hover:text-gray-900 active:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t('common:zoomIn', { defaultValue: 'Zooma in' })}
        >
          <ZoomIn size={24} />
        </button>
        
        {/* Zoom Level Indicator */}
        <span className="text-gray-600 text-sm min-w-[60px] text-center">
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>
      
      {/* CSS for safe areas */}
      <style>{`
        .safe-area-top {
          padding-top: max(12px, env(safe-area-inset-top));
        }
        .safe-area-bottom {
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}

export default memo(MobileWheelViewer);
