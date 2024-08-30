/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useState } from "react";

function GeneralInputs({
  onTitleChange,
  onYearChange,
  onShowYearEventsChange,
}) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("2024");
  const [showEvents, setShowEvents] = useState(false);

  return (
    <div className="general-inputs">
      <div className="general-input">
        <label>Titel</label>
        <input
          className="title-input"
          onChange={(e) => {
            setTitle(e.target.value);
            onTitleChange(e.target.value);
          }}
          value={title}
        />
      </div>
      <div className="general-input">
        <label>År</label>
        <select
          className="year-select"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            onYearChange(e.target.value);
          }}
        >
          <option value="2023">2023</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
        </select>
      </div>
      {/* <div className="general-input">
        <label>
          Visa årstider och helger
          <input
            type="checkbox"
            checked={showEvents}
            onChange={(e) => {
              setShowEvents(e.target.checked);
              onShowYearEventsChange(e.target.checked);
            }}
          />
        </label>
      </div> */}
    </div>
  );
}

export default GeneralInputs;
