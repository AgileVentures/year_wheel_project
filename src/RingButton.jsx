function RingButton({ index, isSelected, setRingSelected }) {
  return (
    <button
      onClick={() => setRingSelected(index)}
      className={`ring-button${isSelected ? " selected" : ""}`}
    >
      Ring {index + 1}
    </button>
  );
}

export default RingButton;
