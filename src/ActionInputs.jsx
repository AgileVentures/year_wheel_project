/* eslint-disable react/prop-types */
function ActionInputs({ onSave, onReset }) {
  return (
    <div className="action-inputs">
      <button onClick={onSave}>Save</button>
      <button onClick={onReset}>Reset</button>
    </div>
  );
}

export default ActionInputs;
