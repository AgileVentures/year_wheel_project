/* eslint-disable no-debugger */
/* eslint-disable react/prop-types */
// RingManager.jsx
import { useState } from "react";
import MonthTextarea from "./MonthTextarea";
import { Button } from "@chakra-ui/react";


// Ring.jsx
const months = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

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

// Ring.jsx
function Ring({ ringData, onMonthChange }) {
  return (
    <div className="ring-textareas-wrapper">
      <div className="ring-textareas">
        {months.map((month) => (
          <MonthTextarea
            key={month}
            month={month}
            value={ringData[monthNameToIndex[month]].join("\n")} // Converts the array to a string
            onChange={onMonthChange}
          />
        ))}
      </div>
    </div>
  );
}

const RingButton = ({ index, isSelected, setRingSelected }) => {
  return (
    // <button
    //   onClick={() => setRingSelected(index)}
    //   className={`ring-button${isSelected ? " selected" : ""}`}
    // >
    //   Ring {index + 1}
    // </button>

<Button colorScheme='purple' onClick={() => setRingSelected(index)}
      className={`ring-button${isSelected ? " selected" : ""}`}>Ring {index + 1}</Button>
  );
};

// RingManager.jsx
function RingManager({ ringsData, onRingsChange }) {
  // const [ringsData, onRingsChange] = useState([initialRing]);
  const [ringSelected, setRingSelected] = useState(0);

  // Add ring function
  const addRing = () => {
    // Create a new ring with 12 empty arrays, one for each month
    const newRing = Array.from({ length: 12 }, () => [""]);

    // Add the new ring to the existing rings data
    const newRings = [...ringsData, newRing];

    // Call the onRingsChange function to update the parent component
    onRingsChange(newRings);
  };

  // Delete ring function
  const deleteRing = (index) => {
    if (ringsData.length > 1) {
      const newRings = ringsData.filter((_, i) => i !== index);
      onRingsChange(newRings);
      // onRingsChange(newRings); // Update parent component
      setRingSelected((prev) =>
        prev === index ? 0 : prev > index ? prev - 1 : prev
      );
    }
  };

  // Handle month change function
  const handleMonthChange = (ringIndex, monthName, value) => {
    const monthIndex = monthNameToIndex[monthName];

    if (monthIndex === undefined) {
      console.error("Invalid month name:", monthName);
      return;
    }

    const updatedRings = ringsData.map((ring, index) => {
      if (index === ringIndex) {
        const updatedRing = { ...ring };
        updatedRing[monthIndex] = value.split("\n");
        return updatedRing;
      }
      return ring;
    });

    onRingsChange(updatedRings);
  };

  const selectRing = (index) => {
    setRingSelected(index);
  };

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
          {/* <button className="add-ring-button" onClick={addRing}>
            Add ring
          </button> */}
          {/* <button
            className="delete-ring-button"
            onClick={() => deleteRing(ringSelected)}
            disabled={ringsData.length <= 1} // Prevent deletion if only one ring exists
          >
            Delete ring
          </button> */}
          <Button
            colorScheme='purple'
            className="add-ring-button" onClick={addRing}
          >Add ring</Button>
          <Button
            colorScheme='purple'
            className="delete-ring-button"
            onClick={() => deleteRing(ringSelected)}
            disabled={ringsData.length <= 1} // Prevent deletion if only one ring exists
          >Delete ring</Button>
        </div>
      </div>
      {ringsData[ringSelected] && (
        <Ring
          ringData={ringsData[ringSelected]}
          onMonthChange={(month, value) =>
            handleMonthChange(ringSelected, month, value)
          }
        />
      )}
    </div>
  );
}

export default RingManager;
