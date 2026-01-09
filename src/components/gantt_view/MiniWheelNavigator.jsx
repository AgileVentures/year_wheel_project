import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * MiniWheelNavigator Component
 * 
 * Signature feature: Thin YearWheel ring showing year overview
 * with highlighted viewport segment that can be dragged to pan
 * 
 * Displays all years as a circular calendar with the current
 * viewport highlighted as a colored arc segment
 */
const MiniWheelNavigator = ({
  viewStart,
  viewEnd,
  yearFilter,
  availableYears,
  onViewportChange,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartAngle, setDragStartAngle] = useState(0);
  
  const size = 120; // Canvas size
  const centerX = size / 2;
  const centerY = size / 2;
  const innerRadius = 35;
  const outerRadius = 50;
  
  // Calculate angles for current viewport
  const getAngleFromDate = (date, year) => {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    const totalMs = yearEnd.getTime() - yearStart.getTime();
    const dateMs = date.getTime() - yearStart.getTime();
    const fraction = Math.max(0, Math.min(1, dateMs / totalMs));
    // Start from top (-90deg) and go clockwise
    return -90 + (fraction * 360);
  };
  
  const getDateFromAngle = (angle, year) => {
    // Convert from our angle system (top = -90) to fraction
    const normalizedAngle = (angle + 90 + 360) % 360;
    const fraction = normalizedAngle / 360;
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    const totalMs = yearEnd.getTime() - yearStart.getTime();
    return new Date(yearStart.getTime() + (fraction * totalMs));
  };
  
  // Draw mini wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    
    // Determine which year to display
    const displayYear = yearFilter === 'all' 
      ? new Date().getFullYear() 
      : parseInt(yearFilter, 10);
    
    // Draw outer ring (background)
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true); // Hole
    ctx.fillStyle = '#E5E7EB'; // Gray background
    ctx.fill();
    
    // Draw month divisions
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const angle = (-90 + (i * 30)) * Math.PI / 180;
      const x1 = centerX + innerRadius * Math.cos(angle);
      const y1 = centerY + innerRadius * Math.sin(angle);
      const x2 = centerX + outerRadius * Math.cos(angle);
      const y2 = centerY + outerRadius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // Draw viewport segment (if within displayed year)
    const viewStartYear = viewStart.getFullYear();
    const viewEndYear = viewEnd.getFullYear();
    
    if (viewStartYear === displayYear || viewEndYear === displayYear) {
      const startAngle = getAngleFromDate(
        viewStartYear === displayYear ? viewStart : new Date(displayYear, 0, 1),
        displayYear
      );
      const endAngle = getAngleFromDate(
        viewEndYear === displayYear ? viewEnd : new Date(displayYear, 11, 31),
        displayYear
      );
      
      ctx.beginPath();
      ctx.arc(
        centerX, 
        centerY, 
        outerRadius, 
        startAngle * Math.PI / 180, 
        endAngle * Math.PI / 180
      );
      ctx.arc(
        centerX, 
        centerY, 
        innerRadius, 
        endAngle * Math.PI / 180, 
        startAngle * Math.PI / 180,
        true
      );
      ctx.closePath();
      ctx.fillStyle = '#3B82F6'; // Blue highlight
      ctx.fill();
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Draw center year label
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayYear, centerX, centerY);
    
  }, [viewStart, viewEnd, yearFilter, availableYears]);
  
  // Handle drag to pan
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if click is within ring
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance >= innerRadius && distance <= outerRadius) {
      setIsDragging(true);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      setDragStartAngle(angle);
    }
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - centerX;
    const dy = y - centerY;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Calculate angle delta
    const delta = angle - dragStartAngle;
    setDragStartAngle(angle);
    
    // Update viewport (rotate by delta)
    const displayYear = yearFilter === 'all' 
      ? new Date().getFullYear() 
      : parseInt(yearFilter, 10);
    
    const currentStart = getAngleFromDate(viewStart, displayYear);
    const currentEnd = getAngleFromDate(viewEnd, displayYear);
    
    const newStart = getDateFromAngle(currentStart + delta, displayYear);
    const newEnd = getDateFromAngle(currentEnd + delta, displayYear);
    
    onViewportChange(newStart, newEnd);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartAngle]);
  
  return (
    <div className="flex items-center justify-center bg-white rounded-sm shadow-lg p-3" data-cy="mini-wheel-navigator">
      <div className="text-center">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onMouseDown={handleMouseDown}
          className="cursor-grab active:cursor-grabbing"
          style={{ display: 'block', margin: '0 auto' }}
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('gantt.miniWheel.hint', 'Dra för att panorera')}
        </p>
      </div>
    </div>
  );
};

export default MiniWheelNavigator;
