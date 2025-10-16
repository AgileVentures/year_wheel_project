/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import YearWheelClass from "./YearWheelClass";
import ItemTooltip from "./components/ItemTooltip";
import EditAktivitetModal from "./components/EditAktivitetModal";

function YearWheel({
  ringsData,
  title,
  year,
  colors,
  organizationData,
  showYearEvents,
  showSeasonRing,
  yearEventsCollection,
  showWeekRing,
  showMonthRing,
  showRingNames,
  showLabels,
  weekRingDisplayMode,
  zoomedMonth,
  zoomedQuarter,
  onSetZoomedMonth,
  onSetZoomedQuarter,
  onWheelReady,
  onUpdateAktivitet,
  onDeleteAktivitet,
  readonly = false,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const notifiedWheelRef = useRef(null); // Track which wheel instance was notified
  const hasAutoFittedRef = useRef(false); // Track if we've done initial auto-fit
  const [zoomLevel, setZoomLevel] = useState(100); // Percentage: 50% to 200%, default 100%
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Pan offset in pixels
  const [events, setEvents] = useState([]);
  const [yearWheel, setYearWheel] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  
  const { t, i18n } = useTranslation(['common']);
  
  const monthNames = useMemo(() => [
    t('common:monthsFull.january'),
    t('common:monthsFull.february'),
    t('common:monthsFull.march'),
    t('common:monthsFull.april'),
    t('common:monthsFull.may'),
    t('common:monthsFull.june'),
    t('common:monthsFull.july'),
    t('common:monthsFull.august'),
    t('common:monthsFull.september'),
    t('common:monthsFull.october'),
    t('common:monthsFull.november'),
    t('common:monthsFull.december')
  ], [t, i18n.language]);

  const zoomIn = () => {
    setZoomLevel(prev => {
      const newZoom = Math.min(prev + 10, 200);
      // Center scroll when zooming in past 100%
      if (newZoom > 100 && prev <= 100) {
        setTimeout(() => centerScroll(), 0);
      }
      return newZoom;
    });
  };
  
  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };
  
  const centerScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    // Center the scroll position
    container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
  };
  
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Base display size at 100% zoom is 1000px
    const baseDisplaySize = 1000;
    
    // Calculate zoom to fit (with some padding)
    const widthZoom = (containerWidth * 0.9 / baseDisplaySize) * 100;
    const heightZoom = ((containerHeight - 80) * 0.9 / baseDisplaySize) * 100; // 80px for toolbar
    
    const optimalZoom = Math.min(widthZoom, heightZoom, 200);
    setZoomLevel(Math.max(50, Math.floor(optimalZoom)));
    
    // Reset pan offset when fitting to screen
    setPanOffset({ x: 0, y: 0 });
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);
  
  // Auto-fit on initial load
  useEffect(() => {
    if (!hasAutoFittedRef.current && containerRef.current) {
      // Small delay to ensure container has rendered with correct dimensions
      const timer = setTimeout(() => {
        fitToScreen();
        hasAutoFittedRef.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fitToScreen]);
  
  // Pan navigation functions
  const panStep = 100; // pixels to move per arrow click
  
  const panUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop -= panStep;
    }
  };
  
  const panDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop += panStep;
    }
  };
  
  const panLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft -= panStep;
    }
  };
  
  const panRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += panStep;
    }
  };

  // Use refs to avoid recreating callbacks (which would destroy the wheel instance)
  const onUpdateAktivitetRef = useRef(onUpdateAktivitet);
  const onDeleteAktivitetRef = useRef(onDeleteAktivitet);

  // Keep refs up to date
  useEffect(() => {
    onUpdateAktivitetRef.current = onUpdateAktivitet;
    onDeleteAktivitetRef.current = onDeleteAktivitet;
  }, [onUpdateAktivitet, onDeleteAktivitet]);

  const handleItemClick = useCallback((item, position) => {
    setSelectedItem(item);
    
    // Position tooltip at upper left of container with some padding
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + 20,  // 20px padding from left edge
        y: rect.top + 20    // 20px padding from top edge
      });
    } else {
      // Fallback to click position if container ref not available
      setTooltipPosition(position);
    }
  }, []);

  const handleUpdateAktivitet = useCallback((updatedItem) => {
    if (onUpdateAktivitetRef.current) {
      onUpdateAktivitetRef.current(updatedItem);
    }
  }, []); // Empty deps - uses ref

  const handleDeleteAktivitet = useCallback((itemId) => {
    if (onDeleteAktivitetRef.current) {
      onDeleteAktivitetRef.current(itemId);
    }
  }, []); // Empty deps - uses ref

  useEffect(() => {
    setEvents(yearEventsCollection || []);
  }, [year, yearEventsCollection]);
  
  // Sync selectedMonthIndex with zoomedMonth prop (only when prop changes from outside)
  useEffect(() => {
    // Only update if the change came from outside (e.g., from calendar sidebar)
    if (zoomedMonth !== null) {
      setSelectedMonthIndex(zoomedMonth);
    } else if (zoomedMonth === null && zoomedQuarter === null) {
      setSelectedMonthIndex(null);
    }
  }, [zoomedMonth, zoomedQuarter]);

  // Apply zoom to canvas display size (separate from wheel creation)
  // Base display size is 1000px at 100% zoom (50% of internal 2000px resolution)
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const baseDisplaySize = 1000; // 100% zoom = 1000px display
    const displaySize = baseDisplaySize * (zoomLevel / 100);
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    canvas.style.maxWidth = 'none';
    canvas.style.aspectRatio = '1 / 1';
  }, [zoomLevel]);

  // Create and render the wheel
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    // Fixed render size at 2000px for high quality (square canvas)
    const renderSize = 2000;
    canvas.width = renderSize;
    canvas.height = renderSize;

    // Create the YearWheel instance
    const newYearWheel = new YearWheelClass(
      canvas,
      year,
      title,
      colors,
      renderSize,
      yearEventsCollection,
      {
        showYearEvents,
        showSeasonRing,
        ringsData,
        organizationData,
        showWeekRing,
        showMonthRing,
        showRingNames,
        showLabels,
        weekRingDisplayMode,
        zoomedMonth,
        zoomedQuarter,
        monthNames,
        zoomLevel, // Pass zoom level for smart text scaling
        onItemClick: handleItemClick,
        onUpdateAktivitet: handleUpdateAktivitet,
      }
    );
    setYearWheel(newYearWheel);
    newYearWheel.create();

    // Cleanup function to remove event listeners from old instance
    return () => {
      if (newYearWheel && newYearWheel.cleanup) {
        newYearWheel.cleanup();
      }
    };
  }, [
    ringsData,
    title,
    year,
    colors,
    showYearEvents,
    showSeasonRing,
    yearEventsCollection,
    showWeekRing,
    showMonthRing,
    showRingNames,
    showLabels,
    weekRingDisplayMode,
    zoomedMonth,
    zoomedQuarter,
    monthNames,
    handleItemClick,
    handleUpdateAktivitet,
    // organizationData excluded - updated via updateOrganizationData to prevent wheel recreation during drag
  ]);

  // Update organization data without recreating the wheel instance
  // This preserves drag state and prevents wheel from going blank during drag
  useEffect(() => {
    if (yearWheel && organizationData) {
      yearWheel.updateOrganizationData(organizationData);
    }
  }, [organizationData, yearWheel]);

  // Update zoom level for smart text scaling (without recreating wheel)
  useEffect(() => {
    if (yearWheel && yearWheel.updateZoomLevel) {
      yearWheel.updateZoomLevel(zoomLevel);
    }
  }, [zoomLevel, yearWheel]);

  // Notify parent when wheel instance changes (only once per instance)
  useEffect(() => {
    if (yearWheel && yearWheel !== notifiedWheelRef.current) {
      notifiedWheelRef.current = yearWheel;
      if (onWheelReady) {
        onWheelReady(yearWheel);
      }
    }
  }, [yearWheel, onWheelReady]);

  const toggleSpinning = () => {
    if (isSpinning) {
      yearWheel.stopSpinning();
    } else {
      yearWheel.startSpinning();
    }
    setIsSpinning(!isSpinning); // Toggle spinning state
  };

  return (
    <div ref={containerRef} className="relative flex flex-col w-full h-full">
      <div 
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-auto bg-white"
      >
        <div style={{ 
          display: 'inline-block',
          position: 'relative',
          minWidth: zoomLevel > 100 ? '200%' : '100%',
          minHeight: zoomLevel > 100 ? '200%' : '100%',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}>
            <canvas
              ref={canvasRef}
              style={{
                width: `${2000 * (zoomLevel / 100)}px`,
                height: `${2000 * (zoomLevel / 100)}px`,
                maxWidth: 'none',
                aspectRatio: '1 / 1'
              }}
              className="drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
      
      {/* Navigation cross - only show when zoomed in, positioned upper right */}
      {zoomLevel > 100 && (
        <div className="absolute top-4 right-4 pointer-events-none z-20">
          <div className="relative w-28 h-28 pointer-events-auto">
            {/* Up arrow */}
            <button
              onClick={panUp}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-300 transition-all hover:scale-110 text-gray-700"
              title="Flytta upp"
              aria-label="Pan up"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            
            {/* Right arrow */}
            <button
              onClick={panRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-300 transition-all hover:scale-110 text-gray-700"
              title="Flytta höger"
              aria-label="Pan right"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Down arrow */}
            <button
              onClick={panDown}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-300 transition-all hover:scale-110 text-gray-700"
              title="Flytta ner"
              aria-label="Pan down"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Left arrow */}
            <button
              onClick={panLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-300 transition-all hover:scale-110 text-gray-700"
              title="Flytta vänster"
              aria-label="Pan left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="sticky bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex gap-3 items-center p-3 flex-wrap justify-center">
          {/* Zoom Controls */}
          <div className="flex gap-2 items-center">
            <button
              onClick={zoomOut}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-lg font-semibold transition-colors"
              title="Zooma ut"
            >
              −
            </button>
            <input
              type="range"
              min="50"
              max="200"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="w-32 h-2 bg-gray-200 rounded-sm appearance-none cursor-pointer"
              title={`${zoomLevel}%`}
            />
            <button
              onClick={zoomIn}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-lg font-semibold transition-colors"
              title="Zooma in"
            >
              +
            </button>
            <span className="text-xs font-medium text-gray-600 min-w-[45px] text-center">
              {zoomLevel}%
            </span>
          </div>

          {/* View Controls */}
          <div className="flex gap-2 items-center border-l border-gray-200 pl-3">
            <button
              onClick={fitToScreen}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium transition-colors"
              title="Anpassa till skärm"
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Anpassa
            </button>
            <button
              onClick={toggleSpinning}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                isSpinning
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {isSpinning ? 'Stoppa' : 'Rotera'}
            </button>
          </div>

          {/* Date Zoom Controls */}
          <div className="flex gap-2 items-center border-l border-gray-200 pl-3">
            <span className="text-xs font-medium text-gray-600">Zooma:</span>
            <select
              value={selectedMonthIndex !== null ? selectedMonthIndex : ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setSelectedMonthIndex(null);
                  if (onSetZoomedMonth) onSetZoomedMonth(null);
                  if (onSetZoomedQuarter) onSetZoomedQuarter(null);
                } else {
                  const monthIndex = parseInt(value);
                  setSelectedMonthIndex(monthIndex);
                  if (onSetZoomedMonth) onSetZoomedMonth(monthIndex);
                  if (onSetZoomedQuarter) onSetZoomedQuarter(null);
                }
              }}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white min-w-[110px]"
            >
              <option value="">Hela året</option>
              {monthNames.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((quarter) => (
                <button
                  key={quarter}
                  onClick={() => {
                    const quarterIndex = quarter - 1;
                    if (zoomedQuarter === quarterIndex) {
                      // Toggle off
                      if (onSetZoomedQuarter) onSetZoomedQuarter(null);
                      setSelectedMonthIndex(null);
                    } else {
                      // Set quarter
                      if (onSetZoomedQuarter) onSetZoomedQuarter(quarterIndex);
                      if (onSetZoomedMonth) onSetZoomedMonth(null);
                      setSelectedMonthIndex(null);
                    }
                  }}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    zoomedQuarter === (quarter - 1)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={`Kvartal ${quarter}`}
                >
                  Q{quarter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Item Tooltip */}
      {selectedItem && tooltipPosition && (
        <ItemTooltip
          item={selectedItem}
          organizationData={organizationData}
          position={tooltipPosition}
          onEdit={setEditingItem}
          onDelete={handleDeleteAktivitet}
          onClose={() => {
            setSelectedItem(null);
            setTooltipPosition(null);
          }}
          readonly={readonly}
        />
      )}

      {/* Edit Aktivitet Modal - only in edit mode */}
      {editingItem && !readonly && (
        <EditAktivitetModal
          aktivitet={editingItem}
          organizationData={organizationData}
          onUpdateAktivitet={handleUpdateAktivitet}
          onDeleteAktivitet={handleDeleteAktivitet}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

export default YearWheel;
