import React, { useState, useEffect } from 'react';
import Ring from './Ring';
import RingButton from './RingButton';

const monthNameToIndex = {
  Januari: 0,
  Februari: 1,
  Mars: 2,
  April: 3,
  Maj: 4,
  Juni: 5,
  Juli: 6,
  Augusti: 7,
  September: 8,
  Oktober: 9,
  November: 10,
  December: 11,
};

function RingManager({ ringsData = [], onRingsChange }) {
  const [ringSelected, setRingSelected] = useState(0);

  useEffect(() => {
    if (ringsData.length === 0) {
      const initialRing = {
        data: Array.from({ length: 12 }, () => [""]),
        orientation: "vertical",
      };
      onRingsChange([initialRing]);
      setRingSelected(0);
    }
  }, [ringsData, onRingsChange]);

  const addRing = () => {
    const newRing = {
      data: Array.from({ length: 12 }, () => [""]),
      orientation: "vertical",
    };

    const newRings = [...ringsData, newRing];
    onRingsChange(newRings);
    setRingSelected(newRings.length - 1);
  };

  const deleteRing = (index) => {
    if (ringsData.length > 1) {
      const newRings = ringsData.filter((_, i) => i !== index);
      onRingsChange(newRings);
      setRingSelected((prev) =>
        prev === index ? 0 : prev > index ? prev - 1 : prev
      );
    }
  };

  const handleMonthChange = (ringIndex, monthName, value) => {
    const monthIndex = monthNameToIndex[monthName];

    if (monthIndex === undefined) {
      console.error("Invalid month name:", monthName);
      return;
    }

    const updatedRings = ringsData.map((ring, index) => {
      if (index === ringIndex) {
        const updatedRing = { ...ring };
        updatedRing.data[monthIndex] = value.split("\n");
        return updatedRing;
      }
      return ring;
    });

    onRingsChange(updatedRings);
  };

  const handleOrientationChange = (ringIndex, orientation) => {
    const updatedRings = ringsData.map((ring, index) => {
      if (index === ringIndex) {
        return {
          ...ring,
          orientation,
        };
      }
      return ring;
    });

    onRingsChange(updatedRings);
  };

  const selectRing = (index) => {
    setRingSelected(index);
  };

  const selectedRing = ringsData[ringSelected];

  if (!selectedRing || !selectedRing.data) {
    return null; // Do not render if selectedRing or its data is undefined
  }

  return (
    <div className="ring-inputs">
      <div className="rings-sidebar">
        <div className="rings">
          {ringsData.map((_, index) => (
            <RingButton
              key={index}
              index={index}
              isSelected={ringSelected === index}
              setRingSelected={() => selectRing(index)}
            />
          ))}
          <button className="add-ring-button" onClick={addRing}>
            Add ring
          </button>
          <button
            className="delete-ring-button"
            onClick={() => deleteRing(ringSelected)}
            disabled={ringsData.length <= 1}
          >
            Delete ring
          </button>
        </div>
      </div>
      <div className="ring-content">
        <Ring
          ringData={selectedRing.data}
          orientation={selectedRing.orientation}
          onMonthChange={(month, value) =>
            handleMonthChange(ringSelected, month, value)
          }
          onOrientationChange={(orientation) =>
            handleOrientationChange(ringSelected, orientation)
          }
        />
      </div>
    </div>
  );
}

export default RingManager;
