/* eslint-disable react/prop-types */
import { useRef, useEffect, useState } from "react";
import createYearWheel from "./year-wheel-refactored";
// import YearWheelClass from "./YearWheel";
import { Button, Container } from '@chakra-ui/react'

function YearWheel({
  ringsData,
  title,
  year,
  colors,
  showYearEvents,
  yearEventsCollection,
}) {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1); // Start with no scaling
  const [events, setEvents] = useState([]);
  
  const size = 800;
  
  useEffect(() => {
    const yearEvents = yearEventsCollection || [];
    setEvents(yearEvents);
  }, [year, yearEventsCollection]);

  useEffect(() => {
    if (canvasRef.current && events.length > 0) {
      // Make sure there are events to draw
      const canvas = canvasRef.current;
      createYearWheel(
        canvas,
        ringsData,
        title,
        year,
        colors,
        canvas.width,
        events,
        {showYearEvents: showYearEvents}
      ); // Pass events here
      // const yearWheel = new YearWheelClass(
      //   canvas,
      //   ringsData,
      //   title,
      //   year,
      //   colors,
      //   canvas.width,
      //   events,
      //   { showYearEvents: showYearEvents }
      // );
      // yearWheel.create();
    }
  }, [ringsData, title, year, colors, events, scale, showYearEvents]);

  const zoomIn = () => {
    setScale((prevScale) => (prevScale < 1.5 ? prevScale * 1.1 : prevScale));
  };

  const zoomOut = () => {
    setScale((prevScale) => (prevScale > 0.1 ? prevScale / 1.1 : prevScale));
  };

  return (
    <Container className="year-wheel" maxW='xxl' bg='blue.600' color='white'>
      <canvas
        ref={canvasRef}
        width={size * scale} // Adjust base size as needed
        height={(size / 4 + size) * scale} // Adjust base size as needed
        style={{
          width: `${size * scale}px`,
          height: `${(size / 4 + size) * scale}px`,
        }}
      />
      <Container className="zoom-buttons">
        {/* <button className="zoom-button" onClick={zoomIn}>
          +
        </button> */}
        <Button
        className="zoom-button" onClick={zoomIn}
        >+</Button>
        <Button
        className="zoom-button" onClick={zoomOut}
        >-</Button>
        {/* <button className="zoom-button" onClick={zoomOut}>
          -
        </button> */}
      </Container>
    </Container>
  );
}

export default YearWheel;
