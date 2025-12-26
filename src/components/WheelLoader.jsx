import PropTypes from 'prop-types';

/**
 * WheelLoader Component
 * An animated loading spinner based on the YearWheel design
 * @param {string} size - 'sm', 'md', 'lg', or 'xl'
 * @param {string} className - Additional CSS classes
 */
function WheelLoader({ size = 'md', className = '' }) {
  // Size mapping
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  // Helper function to create arc segment path
  const createArcSegment = (startAngle, endAngle, innerRadius, outerRadius, centerX = 180, centerY = 180) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    
    const x1 = centerX + outerRadius * Math.cos(startRad);
    const y1 = centerY + outerRadius * Math.sin(startRad);
    const x2 = centerX + outerRadius * Math.cos(endRad);
    const y2 = centerY + outerRadius * Math.sin(endRad);
    const x3 = centerX + innerRadius * Math.cos(endRad);
    const y3 = centerY + innerRadius * Math.sin(endRad);
    const x4 = centerX + innerRadius * Math.cos(startRad);
    const y4 = centerY + innerRadius * Math.sin(startRad);
    
    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  // Activities for full circle - same as WheelVisualization full variant
  const activities = [
    // Outer Ring - distributed around the circle
    { start: 15, end: 42, inner: 159, outer: 182, color: '#ec4899' },
    { start: 78, end: 95, inner: 159, outer: 182, color: '#06b6d4' },
    { start: 135, end: 165, inner: 159, outer: 182, color: '#8b5cf6' },
    { start: 195, end: 218, inner: 159, outer: 182, color: '#3b82f6' },
    { start: 255, end: 275, inner: 159, outer: 182, color: '#f97316' },
    { start: 310, end: 340, inner: 159, outer: 182, color: '#10b981' },
    // Middle Outer Ring
    { start: 5, end: 35, inner: 132, outer: 154, color: '#3b82f6' },
    { start: 88, end: 112, inner: 132, outer: 154, color: '#f97316' },
    { start: 148, end: 172, inner: 132, outer: 154, color: '#10b981' },
    { start: 208, end: 235, inner: 132, outer: 154, color: '#8b5cf6' },
    { start: 268, end: 285, inner: 132, outer: 154, color: '#ec4899' },
    { start: 318, end: 332, inner: 132, outer: 154, color: '#06b6d4' },
    // Middle Ring
    { start: 22, end: 48, inner: 104, outer: 127, color: '#8b5cf6' },
    { start: 75, end: 92, inner: 104, outer: 127, color: '#ec4899' },
    { start: 125, end: 145, inner: 104, outer: 127, color: '#06b6d4' },
    { start: 185, end: 205, inner: 104, outer: 127, color: '#3b82f6' },
    { start: 235, end: 258, inner: 104, outer: 127, color: '#f97316' },
    { start: 295, end: 312, inner: 104, outer: 127, color: '#10b981' },
  ];

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg viewBox="0 0 360 360" className="w-full h-full animate-wheel-spin">
        <style>
          {`
            @keyframes wheel-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes ring-fade-in {
              from { opacity: 0; transform: scale(0.8); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes activity-pop {
              0% { opacity: 0; transform: scale(0); }
              70% { transform: scale(1.1); }
              100% { opacity: 1; transform: scale(1); }
            }
            .animate-wheel-spin {
              animation: wheel-spin 8s linear infinite;
              transform-origin: center;
            }
            .ring-animate {
              animation: ring-fade-in 0.6s ease-out forwards;
              transform-origin: center;
            }
            .activity-animate {
              animation: activity-pop 0.4s ease-out forwards;
              transform-origin: center;
              opacity: 0;
            }
          `}
        </style>
        
        {/* Ring backgrounds with staggered fade-in */}
        <g className="ring-animate" style={{ animationDelay: '0ms' }}>
          <circle cx="180" cy="180" r="170" fill="none" stroke="#f1f5f9" strokeWidth="28" />
        </g>
        <g className="ring-animate" style={{ animationDelay: '100ms' }}>
          <circle cx="180" cy="180" r="142" fill="none" stroke="#f8fafc" strokeWidth="26" />
        </g>
        <g className="ring-animate" style={{ animationDelay: '200ms' }}>
          <circle cx="180" cy="180" r="114" fill="none" stroke="#f1f5f9" strokeWidth="24" />
        </g>
        <g className="ring-animate" style={{ animationDelay: '300ms' }}>
          <circle cx="180" cy="180" r="90" fill="none" stroke="#e2e8f0" strokeWidth="12" />
        </g>
        <g className="ring-animate" style={{ animationDelay: '400ms' }}>
          <circle cx="180" cy="180" r="78" fill="none" stroke="#f3f4f6" strokeWidth="10" />
        </g>
        
        {/* Activity segments with staggered pop-in animation */}
        {activities.map((activity, index) => (
          <path
            key={index}
            className="activity-animate"
            style={{ animationDelay: `${500 + index * 50}ms` }}
            d={createArcSegment(activity.start, activity.end, activity.inner, activity.outer)}
            fill={activity.color}
            opacity="0.9"
          />
        ))}
      </svg>
    </div>
  );
}

WheelLoader.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};

export default WheelLoader;
