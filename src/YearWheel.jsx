/* eslint-disable react/prop-types */
import { useRef, useEffect, useState } from "react";
import YearWheelClass from "./YearWheelClass"

function useZoom(initialScale = 1, maxScale = 1.5, minScale = 0.1) {
  const [scale, setScale] = useState(initialScale);

  const zoomIn = () => setScale((prevScale) => Math.min(prevScale * 1.1, maxScale));
  const zoomOut = () => setScale((prevScale) => Math.max(prevScale / 1.1, minScale));
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

  useEffect(() => {
    setEvents(yearEventsCollection || []);
  }, [year, yearEventsCollection]);

  useEffect(() => {
    if (canvasRef.current && events.length > 0) {
      const canvas = canvasRef.current;
      canvas.width = 800 * scale; // Set canvas width according to scale
      canvas.height = (800 / 4 + 800) * scale; // Set canvas height according to scale

      // Create a new YearWheel instance if it doesn't exist
      if (!yearWheel) {
        const newYearWheel = new YearWheelClass(
          canvas,
          year,
          title,
          colors,
          canvas.width,
          events,
          {
            showYearEvents,
            ringsData: ringsData.map((ring) => ({
              ...ring.data,
              orientation: ring.orientation,
            })),
          }
        );
       setYearWheel(newYearWheel.create());
      } else {
        // If the yearWheel instance already exists, update it
        yearWheel.canvas = canvas;
        yearWheel.year = year;
        yearWheel.title = title;
        yearWheel.colors = colors;
        yearWheel.size = canvas.width;
        yearWheel.events = events;
        yearWheel.options = { showYearEvents, ringsData };
        yearWheel.create();
      }
    }
  }, [ringsData, title, year, colors, events, showYearEvents, scale, yearWheel]);

  const downloadPNG = () => {
    if (yearWheel) {
      yearWheel.downloadAsPNG();
    }
  };

  return (
    <div className="year-wheel">
      <canvas
        ref={canvasRef}
        style={{
          width: `${800 * scale}px`, // Adjust display size based on scale
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
        <button className="download-button" onClick={downloadPNG}>
          Download as PNG
        </button>
      </div>
    </div>
  );
}

export default YearWheel;
