import PropTypes from 'prop-types';

/**
 * WheelVisualization Component
 * Displays a decorative year wheel with activities
 * @param {string} variant - 'half', 'quarter', or 'full'
 * @param {string} className - Additional CSS classes
 */
function WheelVisualization({ variant = 'half', className = '' }) {
  // Helper function to create perfect arc segment
  const createArcSegment = (startAngle, endAngle, innerRadius, outerRadius, centerX = 180, centerY = 190) => {
    // Adjust angles based on variant
    let adjustedStart = startAngle;
    let adjustedEnd = endAngle;
    
    if (variant === 'half') {
      adjustedStart = startAngle + 270; // 270 = -90 in SVG coords
      adjustedEnd = endAngle + 270;
    } else if (variant === 'quarter') {
      adjustedStart = startAngle + 270; // Start from vertical (top)
      adjustedEnd = endAngle + 270;
    } else if (variant === 'full') {
      adjustedStart = startAngle;
      adjustedEnd = endAngle;
    }
    
    const startRad = (adjustedStart * Math.PI) / 180;
    const endRad = (adjustedEnd * Math.PI) / 180;
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

  // Define activities based on variant
  const getActivities = () => {
    if (variant === 'half') {
      // Upper semicircle: -90° to +90° range
      return [
        // Outer Ring
        { start: -80, end: -50, inner: 159, outer: 182, color: '#ec4899' },
        { start: -15, end: -3, inner: 159, outer: 182, color: '#06b6d4' },
        { start: 60, end: 82, inner: 159, outer: 182, color: '#8b5cf6' },
        // Middle Outer Ring
        { start: -85, end: -48, inner: 132, outer: 154, color: '#3b82f6' },
        { start: 10, end: 36, inner: 132, outer: 154, color: '#f97316' },
        { start: 50, end: 62, inner: 132, outer: 154, color: '#10b981' },
        // Middle Ring
        { start: -62, end: -40, inner: 104, outer: 127, color: '#8b5cf6' },
        { start: -8, end: 22, inner: 104, outer: 127, color: '#ec4899' },
        { start: 68, end: 78, inner: 104, outer: 127, color: '#06b6d4' },
      ];
    } else if (variant === 'quarter') {
      // Quarter circle: 0° to 90° range
      return [
        // Outer Ring
        { start: 8, end: 32, inner: 159, outer: 182, color: '#3b82f6' },
        { start: 58, end: 78, inner: 159, outer: 182, color: '#f97316' },
        // Middle Outer Ring
        { start: 15, end: 42, inner: 132, outer: 154, color: '#8b5cf6' },
        { start: 72, end: 85, inner: 132, outer: 154, color: '#10b981' },
        // Middle Ring
        { start: 5, end: 25, inner: 104, outer: 127, color: '#ec4899' },
        { start: 50, end: 70, inner: 104, outer: 127, color: '#06b6d4' },
      ];
    } else if (variant === 'full') {
      // Full circle: 0° to 360° range
      return [
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
    }
    return [];
  };

  // Define viewBox and paths based on variant
  const getViewBoxAndCenter = () => {
    if (variant === 'half') {
      return { viewBox: '0 0 360 220', centerX: 180, centerY: 190 };
    } else if (variant === 'quarter') {
      return { viewBox: '0 0 200 200', centerX: 20, centerY: 180 };
    } else if (variant === 'full') {
      return { viewBox: '0 0 360 360', centerX: 180, centerY: 180 };
    }
    return { viewBox: '0 0 360 220', centerX: 180, centerY: 190 };
  };

  const { viewBox, centerX, centerY } = getViewBoxAndCenter();
  const activities = getActivities();

  // Ring paths based on variant
  const getRingPaths = () => {
    if (variant === 'half') {
      return (
        <>
          <path d="M 10 190 A 170 170 0 0 1 350 190" fill="none" stroke="#f1f5f9" strokeWidth="28" />
          <path d="M 38 190 A 142 142 0 0 1 322 190" fill="none" stroke="#f8fafc" strokeWidth="26" />
          <path d="M 66 190 A 114 114 0 0 1 294 190" fill="none" stroke="#f1f5f9" strokeWidth="24" />
          <path d="M 90 190 A 90 90 0 0 1 270 190" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <path d="M 102 190 A 78 78 0 0 1 258 190" fill="none" stroke="#f3f4f6" strokeWidth="10" />
        </>
      );
    } else if (variant === 'quarter') {
      return (
        <>
          <path d="M 20 10 A 170 170 0 0 1 190 180" fill="none" stroke="#f1f5f9" strokeWidth="28" />
          <path d="M 20 38 A 142 142 0 0 1 162 180" fill="none" stroke="#f8fafc" strokeWidth="26" />
          <path d="M 20 66 A 114 114 0 0 1 134 180" fill="none" stroke="#f1f5f9" strokeWidth="24" />
          <path d="M 20 90 A 90 90 0 0 1 110 180" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <path d="M 20 102 A 78 78 0 0 1 98 180" fill="none" stroke="#f3f4f6" strokeWidth="10" />
        </>
      );
    } else if (variant === 'full') {
      return (
        <>
          <circle cx="180" cy="180" r="170" fill="none" stroke="#f1f5f9" strokeWidth="28" />
          <circle cx="180" cy="180" r="142" fill="none" stroke="#f8fafc" strokeWidth="26" />
          <circle cx="180" cy="180" r="114" fill="none" stroke="#f1f5f9" strokeWidth="24" />
          <circle cx="180" cy="180" r="90" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle cx="180" cy="180" r="78" fill="none" stroke="#f3f4f6" strokeWidth="10" />
        </>
      );
    }
    return null;
  };

  return (
    <svg viewBox={viewBox} className={`w-full h-auto ${className}`}>
      {/* Background */}
      <rect x="0" y="0" width={viewBox.split(' ')[2]} height={viewBox.split(' ')[3]} fill="transparent" />
      
      {/* Ring segments */}
      {getRingPaths()}
      
      {/* Activity segments */}
      {activities.map((activity, index) => (
        <path
          key={index}
          d={createArcSegment(activity.start, activity.end, activity.inner, activity.outer, centerX, centerY)}
          fill={activity.color}
          opacity={index % 3 === 0 ? '0.9' : index % 3 === 1 ? '0.88' : '0.85'}
        />
      ))}
    </svg>
  );
}

WheelVisualization.propTypes = {
  variant: PropTypes.oneOf(['half', 'quarter', 'full']),
  className: PropTypes.string,
};

export default WheelVisualization;
