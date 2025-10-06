/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */import { useRef, useEffect, useState } from "react";
import YearWheelClass from "./YearWheelClass";
import ItemTooltip from "./components/ItemTooltip";
import EditItemModal from "./components/EditItemModal";

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
  zoomedMonth,
  onUpdateItem,
  onDeleteItem,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(90); // Percentage: 50% to 200%, default 90% for better fit
  const [events, setEvents] = useState([]);
  const [yearWheel, setYearWheel] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState("png");
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 50));
  
  const fitToScreen = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Base canvas size is 1000px width, 1250px height
    const baseWidth = 1000;
    const baseHeight = 1250;
    
    // Calculate zoom to fit (with some padding)
    const widthZoom = (containerWidth * 0.9 / baseWidth) * 100;
    const heightZoom = ((containerHeight - 80) * 0.9 / baseHeight) * 100; // 80px for toolbar
    
    const optimalZoom = Math.min(widthZoom, heightZoom, 100);
    setZoomLevel(Math.max(50, Math.floor(optimalZoom)));
  };

  const handleItemClick = (item, position) => {
    setSelectedItem(item);
    setTooltipPosition(position);
  };

  const handleUpdateItem = (updatedItem) => {
    // This will be passed from App.jsx through props
    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
  };

  const handleDeleteItem = (itemId) => {
    // This will be passed from App.jsx through props
    if (onDeleteItem) {
      onDeleteItem(itemId);
    }
  };

  useEffect(() => {
    setEvents(yearEventsCollection || []);
  }, [year, yearEventsCollection]);

  // Create and render the wheel
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    // Fixed render size at 2000px for high quality
    const renderSize = 2000;
    canvas.width = renderSize;
    canvas.height = renderSize * 1.25;

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
        zoomedMonth,
        onItemClick: handleItemClick,
      }
    );
    setYearWheel(newYearWheel);
    newYearWheel.create();
  }, [
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
    zoomedMonth,
  ]);

  const downloadImage = () => {
    yearWheel.downloadImage(downloadFormat);
  };

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
      <div className="flex-1 flex items-center justify-center w-full overflow-auto bg-white">
        <canvas
          ref={canvasRef}
          style={{
            width: `${1000 * (zoomLevel / 100)}px`,
            height: `${1000 * (zoomLevel / 100)}px`,
            maxWidth: 'none',
          }}
          className="drop-shadow-2xl"
        />
      </div>
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
              className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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

          {/* Download Controls */}
          <div className="flex gap-2 items-center border-l border-gray-200 pl-3">
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="png">PNG (Transparent)</option>
              <option value="png-white">PNG (Vit bakgrund)</option>
              <option value="jpeg">JPEG</option>
              <option value="svg">SVG</option>
            </select>
            <button
              onClick={downloadImage}
              className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-medium transition-colors"
            >
              Ladda ner
            </button>
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
          onDelete={handleDeleteItem}
          onClose={() => {
            setSelectedItem(null);
            setTooltipPosition(null);
          }}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          organizationData={organizationData}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

export default YearWheel;
