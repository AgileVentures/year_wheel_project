/* eslint-disable no-debugger */
/* eslint-disable react/prop-types */
function MonthTextarea({ month, value, onChange }) {
  return (
    <div className="month-textarea">
      <label>{month}</label>
      <textarea
        value={value}
        onChange={(e) => {
          onChange(month, e.target.value);
        }}
      />
    </div>
  );
}

export default MonthTextarea;
