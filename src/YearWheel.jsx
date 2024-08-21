/* eslint-disable react/prop-types */
import { useRef, useEffect, useState } from "react";
import YearWheelClass from "./YearWheelClass";

function useZoom(initialScale = 1, maxScale = 1.5, minScale = 0.1) {
  const [scale, setScale] = useState(initialScale);

  const zoomIn = () =>
    setScale((prevScale) => Math.min(prevScale * 1.1, maxScale));
  const zoomOut = () =>
    setScale((prevScale) => Math.max(prevScale / 1.1, minScale));
  const resetZoom = () => setScale(initialScale);

  return { scale, zoomIn, zoomOut, resetZoom };
}

function YearWheel({
  ringsData,
  title,
  year,
  colors,
  showYearEvents,
  yearEventsCollection,
}) {
  const canvasRef = useRef(null);
  const { scale, zoomIn, zoomOut } = useZoom();
  const [events, setEvents] = useState([]);
  const [yearWheel, setYearWheel] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState("png");

  useEffect(() => {
    setEvents(yearEventsCollection || []);
  }, [year, yearEventsCollection]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 800; // Set canvas width according to scale
      canvas.height = 800 / 4 + 800; // Set canvas height according to scale

      // Create the YearWheel instance
      const newYearWheel = new YearWheelClass(
        canvas,
        year,
        title,
        colors,
        canvas.width,
        yearEventsCollection,
        {
          showYearEvents,
          ringsData,
        }
      );
      setYearWheel(newYearWheel); 
      newYearWheel.create();
    }
  }, [canvasRef, ringsData, title, year, colors, showYearEvents, yearEventsCollection]);


  const downloadImage = () => {
    yearWheel.downloadImage(downloadFormat);
  };

  return (
    <div className="year-wheel">
      <canvas
        ref={canvasRef}
        style={{
          width: `${800 * scale}px`, 
          height: `${(800 / 4 + 800) * scale}px`,
        }}
      />
      <div className="zoom-buttons">
        <button className="zoom-button" onClick={zoomIn}>
          +
        </button>
        <button className="zoom-button" onClick={zoomOut}>
          -
        </button>
        <div>
          <label>Download Format:</label>
          <select
            value={downloadFormat}
            onChange={(e) => setDownloadFormat(e.target.value)}
          >
            <option value="png">PNG (Transparent)</option>
            <option value="png-white">PNG (White Background)</option>
            <option value="jpeg">JPEG</option>
            <option value="svg">SVG</option>
          </select>
        </div>
        <button className="download-button" onClick={downloadImage}>
          Download
        </button>
      </div>
    </div>
  );
}

export default YearWheel;
