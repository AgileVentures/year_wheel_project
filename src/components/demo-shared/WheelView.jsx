function WheelView({ items = { ring1: [], ring2: [] }, year = '2026' }) {
  const createArcSegment = (startAngle, endAngle, innerRadius, outerRadius) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const x1 = 180 + outerRadius * Math.cos(startRad);
    const y1 = 180 + outerRadius * Math.sin(startRad);
    const x2 = 180 + outerRadius * Math.cos(endRad);
    const y2 = 180 + outerRadius * Math.sin(endRad);
    const x3 = 180 + innerRadius * Math.cos(endRad);
    const y3 = 180 + innerRadius * Math.sin(endRad);
    const x4 = 180 + innerRadius * Math.cos(startRad);
    const y4 = 180 + innerRadius * Math.sin(startRad);

    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 py-8 px-4 animate-fadeIn">
      <div className="relative w-full max-w-md">
        <svg viewBox="0 0 360 360" className="transform -rotate-90 drop-shadow-2xl w-full h-auto">
          {/* Background */}
          <circle cx="180" cy="180" r="175" fill="#fafafa" />

          {/* Outer ring - Campaigns (blue) */}
          <circle cx="180" cy="180" r="165" fill="none" stroke="#dbeafe" strokeWidth="28" />

          {/* Inner ring - Content (purple) */}
          <circle cx="180" cy="180" r="132" fill="none" stroke="#ede9fe" strokeWidth="26" />

          {/* Month ring */}
          <circle cx="180" cy="180" r="102" fill="none" stroke="#e2e8f0" strokeWidth="12" />

          {/* Center */}
          <circle cx="180" cy="180" r="94" fill="white" stroke="#e5e7eb" strokeWidth="2" />

          {/* Month dividers */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30) * (Math.PI / 180);
            const x1 = 180 + 96 * Math.cos(angle);
            const y1 = 180 + 96 * Math.sin(angle);
            const x2 = 180 + 179 * Math.cos(angle);
            const y2 = 180 + 179 * Math.sin(angle);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth="1" opacity="0.4" />
            );
          })}

          {/* Campaign activities (outer ring - blue) */}
          {items.ring1?.map((item) => (
            <path
              key={item.id}
              d={createArcSegment(item.startAngle, item.endAngle, 151, 179)}
              fill="#3b82f6"
              opacity={item.isNew ? 1 : 0.85}
              className={item.isNew ? 'animate-pulse' : ''}
            />
          ))}

          {/* Content activities (inner ring - purple) */}
          {items.ring2?.map((item) => (
            <path
              key={item.id}
              d={createArcSegment(item.startAngle, item.endAngle, 119, 145)}
              fill="#8b5cf6"
              opacity="0.85"
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-full px-4 py-2 text-lg font-semibold text-gray-900 shadow-sm">
            {year}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WheelView;
