/* eslint-disable react/prop-types */
import { Textarea } from '@chakra-ui/react'

function MonthTextarea({ month, value, onChange }) {
  return (
    <div className="month-textarea">
      <label>{month}</label>
      {/* <textarea
        value={value}
        onChange={(e) => onChange(month, e.target.value)}
      /> */}
      <Textarea 
      value={value}
      onChange={(e) => onChange(month, e.target.value)}
      />
    </div>
  );
}


export default MonthTextarea;