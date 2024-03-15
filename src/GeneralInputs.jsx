/* eslint-disable react/prop-types */
import { useState } from "react";
import { Input, Select, Checkbox } from '@chakra-ui/react';

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
        <Input 
          className="title-input"
          bg='white'
          color='black'
          onChange={(e) => {
            setTitle(e.target.value);
            onTitleChange(e.target.value);
          }}
          value={title}
          variant='outline'
          placeholder='Basic usage'
        />
      </div>
      <div className="general-input">
        <label>År</label>
        <Select
        bg='white'
        color='black'
        placeholder='Select option'
        className="year-select"
        value={year}
        onChange={(e) => {
          setYear(e.target.value);
          onYearChange(e.target.value);
        }}>
          <option value="2022">2022</option>
          <option value="2023">2023</option>
          <option value="2024">2024</option>
        </Select>
      </div>
      <div className="general-input">
        <label >
          Visa årstider och helger
        </label>
        <Checkbox
          isInvalid
          size='md'
          colorScheme='orange'
          onChange={(e) => {
              setShowEvents(e.target.checked);
              onShowYearEventsChange(e.target.checked);
            }} />
      </div>
    </div>
  );
}

export default GeneralInputs;
