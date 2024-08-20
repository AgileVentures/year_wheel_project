import React from 'react';
import MonthTextarea from './MonthTextarea';

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

function Ring({ ringData, onMonthChange, onOrientationChange, orientation }) {
  if (!Array.isArray(ringData.data) || ringData.data.length !== 12) {
    console.error("ringData is not properly structured:", ringData);
    return null; // Return null if ringData is not valid
  }

  return (
    <div className="ring-textareas-wrapper">
      <div className="ring-textareas">
        {months.map((month) => {
          const monthIndex = months.indexOf(month);
          const monthData = ringData.data[monthIndex] || [""];

          return (
            <MonthTextarea
              key={month}
              month={month} // This should just be the month name for identification
              value={monthData.join("\n")} // This is the actual content for that month
              onChange={onMonthChange} // Handler to update the data
            />
          );
        })}
      </div>
      <div className="ring-orientation">
        <label htmlFor="orientation-select">Orientation: </label>
        <select
          id="orientation-select"
          value={orientation}
          onChange={(e) => onOrientationChange(e.target.value)}
        >
          <option value="vertical">Vertical</option>
          <option value="horizontal">Horizontal</option>
        </select>
      </div>
    </div>
  );
}

export default Ring;
