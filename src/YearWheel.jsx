/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */import { useRef, useEffect, useState } from "react";
import YearWheelClass from "./YearWheelClass";

function YearWheel({
  ringsData,
  title,
  year,
  colors,
  showYearEvents,
  showSeasonRing,
  yearEventsCollection,
  showWeekRing,
  showMonthRing,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(100); // Percentage: 50% to 200%
  const [events, setEvents] = useState([]);
  const [yearWheel, setYearWheel] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState("png");
  const [isSpinning, setIsSpinning] = useState(false);

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 50));

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
        showWeekRing,
        showMonthRing,
      }
    );
    setYearWheel(newYearWheel);
    newYearWheel.create();
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
      <div className="flex-1 flex items-center justify-center w-full overflow-auto pb-24">
        <canvas
          ref={canvasRef}
          style={{
            width: `${1000 * (zoomLevel / 100)}px`,
            height: `${1250 * (zoomLevel / 100)}px`,
            maxWidth: 'none',
          }}
          className="drop-shadow-xl"
        />
      </div>
      <div className="sticky bottom-0 left-0 right-0 z-10 flex gap-4 items-center bg-white p-4 rounded-sm shadow-lg border border-gray-200 border-t-2 flex-wrap justify-center">
        {/* Zoom Controls */}
        <div className="flex gap-2 items-center border-r border-gray-200 pr-4">
          <button
            onClick={zoomOut}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold transition-colors"
            title="Zooma ut"
          >
            −
          </button>
          <span className="text-sm font-medium text-gray-600 min-w-[60px] text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={zoomIn}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold transition-colors"
            title="Zooma in"
          >
            +
          </button>
        </div>

        {/* Rotation Control */}
        <button
          onClick={toggleSpinning}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isSpinning
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
          }`}
        >
          {isSpinning ? 'Stoppa rotation' : 'Rotera hjul'}
        </button>

        {/* Download Controls */}
        <div className="flex gap-2 items-center border-l border-gray-200 pl-4">
          <select
            value={downloadFormat}
            onChange={(e) => setDownloadFormat(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="png">PNG (Transparent)</option>
            <option value="png-white">PNG (Vit bakgrund)</option>
            <option value="jpeg">JPEG</option>
            <option value="svg">SVG</option>
          </select>
          <button
            onClick={downloadImage}
            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            Ladda ner
          </button>
        </div>
      </div>
    </div>
  );
}

export default YearWheel;
