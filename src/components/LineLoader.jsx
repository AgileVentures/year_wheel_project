import PropTypes from 'prop-types';
import './LineLoader.css';

/**
 * LineLoader Component
 * An animated loading spinner based on YearLine's timeline design
 * @param {string} size - 'sm', 'md', 'lg', or 'xl'
 * @param {string} className - Additional CSS classes
 */
function LineLoader({ size = 'md', className = '' }) {
  // Size mapping
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  // Timeline bars with different lengths and colors
  const timelineBars = [
    { y: 30, width: 120, color: '#a855f7', delay: 0 },      // Purple
    { y: 60, width: 80, color: '#22d3ee', delay: 150 },     // Cyan
    { y: 90, width: 150, color: '#ec4899', delay: 300 },    // Pink
    { y: 120, width: 100, color: '#06b6d4', delay: 450 },   // Teal
    { y: 150, width: 130, color: '#8b5cf6', delay: 600 },   // Violet
  ];

  return (
    <div className={`line-loader ${sizeClasses[size]} ${className}`}>
      <svg viewBox="0 0 200 180" className="line-loader-svg">
        <style>
          {`
            @keyframes bar-slide {
              0% { 
                opacity: 0;
                transform: translateX(-20px);
              }
              50% {
                opacity: 1;
              }
              100% { 
                opacity: 0.3;
                transform: translateX(0);
              }
            }
            @keyframes bar-pulse {
              0%, 100% { 
                opacity: 0.3;
              }
              50% { 
                opacity: 1;
              }
            }
            @keyframes marker-slide {
              0% { 
                transform: translateX(-10px);
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
              100% { 
                transform: translateX(180px);
                opacity: 0;
              }
            }
            .timeline-bar {
              animation: bar-slide 1.5s ease-out forwards, bar-pulse 2s ease-in-out infinite;
              transform-origin: left center;
            }
            .time-marker {
              animation: marker-slide 2.5s ease-in-out infinite;
            }
          `}
        </style>
        
        {/* Background grid lines */}
        <g opacity="0.1">
          <line x1="0" y1="30" x2="200" y2="30" stroke="#94a3b8" strokeWidth="1" />
          <line x1="0" y1="60" x2="200" y2="60" stroke="#94a3b8" strokeWidth="1" />
          <line x1="0" y1="90" x2="200" y2="90" stroke="#94a3b8" strokeWidth="1" />
          <line x1="0" y1="120" x2="200" y2="120" stroke="#94a3b8" strokeWidth="1" />
          <line x1="0" y1="150" x2="200" y2="150" stroke="#94a3b8" strokeWidth="1" />
        </g>

        {/* Timeline bars */}
        {timelineBars.map((bar, index) => (
          <g key={index}>
            <rect
              className="timeline-bar"
              x="20"
              y={bar.y - 8}
              width={bar.width}
              height="16"
              rx="8"
              fill={bar.color}
              style={{ animationDelay: `${bar.delay}ms` }}
            />
          </g>
        ))}

        {/* Moving time marker line */}
        <line 
          className="time-marker"
          x1="20" 
          y1="15" 
          x2="20" 
          y2="165" 
          stroke="#FF5A5F" 
          strokeWidth="2" 
          strokeDasharray="4,4"
        />
      </svg>
    </div>
  );
}

LineLoader.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};

export default LineLoader;
