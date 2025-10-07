/* eslint-disable no-unused-vars */
// Based on the original/legacy from kirkby's year-wheel project
// See the YearWheelClassRedefined.js file for an attempt to make this more concise and readable
import C2S from "canvas2svg";

class YearWheel {
  constructor(canvas, year, title, colors, size, events, options) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.year = year;
    this.title = title;
    this.outerRingColor = colors[0]; // Use the first color for the outer ring
    this.sectionColors = colors; // Use all colors for sections (plandisc style)
    this.size = size;
    this.events = events;
    this.options = options;
    this.organizationData = options.organizationData || { items: [], rings: [], activityGroups: [] };
    // Backward compatibility: convert old 'activities' to 'activityGroups'
    if (this.organizationData.activities && !this.organizationData.activityGroups) {
      this.organizationData.activityGroups = this.organizationData.activities;
      delete this.organizationData.activities;
    }
    // For backward compatibility: merge old ringsData into organizationData.rings if needed
    if (options.ringsData && options.ringsData.length > 0 && !this.organizationData.rings.some(r => r.type === 'inner')) {
      // Convert old ringsData format to new ring structure
      const innerRingsFromOldData = options.ringsData.map((ring, index) => ({
        id: ring.id || `inner-ring-${index + 1}`,
        name: ring.name || `Ring ${index + 1}`,
        type: 'inner',
        visible: true,
        data: ring.data,
        orientation: ring.orientation || 'vertical'
      }));
      this.organizationData.rings = [...innerRingsFromOldData, ...this.organizationData.rings];
    }
    this.showWeekRing = options.showWeekRing !== undefined ? options.showWeekRing : true;
    this.showMonthRing = options.showMonthRing !== undefined ? options.showMonthRing : true;
    this.showRingNames = options.showRingNames !== undefined ? options.showRingNames : true;
    this.zoomedMonth = options.zoomedMonth !== undefined && options.zoomedMonth !== null ? options.zoomedMonth : null;
    this.textColor = "#374151"; // Darker gray for better readability
    this.center = { x: size / 2, y: size / 2 }; // Center vertically (title removed)
    this.initAngle = -15 - 90;
    this.minRadius = size / 12; // Smaller center circle for better proportions
    this.maxRadius = size / 2 - size / 30;
    this.hoveredItem = null; // Track currently hovered activity
    this.hoverRedrawPending = false; // Prevent excessive redraws on hover
    this.monthNames = [
      "Januari",
      "Februari",
      "Mars",
      "April",
      "Maj",
      "Juni",
      "Juli",
      "Augusti",
      "September",
      "Oktober",
      "November",
      "December",
    ];
    this.rotationAngle = 0;
    this.isAnimating = false;
    this.isDragging = false;
    this.lastMouseAngle = 0;
    this.dragStartAngle = 0;
    this.clickableItems = []; // Store clickable item regions

    this.canvas.addEventListener("mousedown", this.startDrag.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.stopDrag.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));
    this.canvas.addEventListener("click", this.handleClick.bind(this));
  }

  generateWeeks() {
    const weeks = [];
    const year = parseInt(this.year);

    // Helper function to get ISO week number
    const getISOWeek = (date) => {
      const tempDate = new Date(date.getTime());
      tempDate.setHours(0, 0, 0, 0);
      // Set to nearest Thursday: current date + 4 - current day number
      // Make Sunday's day number 7
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      // Get first day of year
      const yearStart = new Date(tempDate.getFullYear(), 0, 1);
      // Calculate full weeks to nearest Thursday
      const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
      return weekNo;
    };

    // Helper function to get the year that the ISO week belongs to
    const getISOWeekYear = (date) => {
      const tempDate = new Date(date.getTime());
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      return tempDate.getFullYear();
    };

    // Start from January 1st
    let currentDate = new Date(year, 0, 1);
    
    // Find the first Monday of the calendar (might be in previous year)
    while (currentDate.getDay() !== 1) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    const seenWeeks = new Set();
    
    // Iterate through all Mondays in the year
    while (currentDate.getFullYear() <= year) {
      const isoWeek = getISOWeek(currentDate);
      const isoYear = getISOWeekYear(currentDate);
      
      // Only include weeks that belong to the current year or overlap significantly
      if (isoYear === year || currentDate.getFullYear() === year) {
        // Use just the week number for uniqueness check
        if (!seenWeeks.has(isoWeek) && weeks.length < 53) {
          seenWeeks.add(isoWeek);
          // Return just the number without "W" prefix (Swedish interface)
          weeks.push(isoWeek.toString());
        }
      }
      
      // Move to next Monday
      currentDate.setDate(currentDate.getDate() + 7);
      
      // Stop if we've moved too far into the next year
      if (currentDate.getFullYear() > year && currentDate.getMonth() > 0) {
        break;
      }
    }

    return weeks;
  }

  toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  moveToAngle(radius, angle) {
    const x = this.center.x + radius * Math.cos(angle);
    const y = this.center.y + radius * Math.sin(angle);
    return { x, y };
  }

  // Calculate text color based on background luminance for better contrast
  getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate relative luminance (ITU-R BT.709)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, dark gray for light backgrounds
    return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
  }

  // Adjust color on hover: darken light colors, lighten dark colors
  getHoverColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    let newR, newG, newB;
    if (luminance > 0.5) {
      // Light color - darken by 20%
      newR = Math.max(0, Math.floor(r * 0.8));
      newG = Math.max(0, Math.floor(g * 0.8));
      newB = Math.max(0, Math.floor(b * 0.8));
    } else {
      // Dark color - lighten by 30%
      newR = Math.min(255, Math.floor(r * 1.3));
      newG = Math.min(255, Math.floor(g * 1.3));
      newB = Math.min(255, Math.floor(b * 1.3));
    }
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  drawTextOnCircle(
    text,
    radius,
    angle,
    fontSize,
    color,
    textAlign = "center",
    rotationDivider = 2
  ) {
    const coord = this.moveToAngle(radius, angle);
    this.context.save();
    this.context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`; // Modern system font
    this.context.fillStyle = color;
    this.context.textAlign = textAlign;
    this.context.textBaseline = "middle";
    this.context.translate(coord.x, coord.y);
    this.context.rotate(angle + Math.PI / rotationDivider);
    // Use original case for better readability (not all uppercase)
    this.context.fillText(text, 0, 0);
    this.context.restore();
  }

  setCircleSectionHTML({
    startRadius,
    width,
    startAngle,
    endAngle,
    color,
    textFunction,
    text,
    fontSize,
    isVertical,
    opacity,
    highlight,
  }) {
    const endRadius = startRadius + width; // Properly define endRadius
    const calculatedStartAngle = this.toRadians(startAngle);
    const calculatedEndAngle = this.toRadians(endAngle);

    const outerStartCoords = this.moveToAngle(endRadius, calculatedStartAngle);
    const outerEndCoords = this.moveToAngle(endRadius, calculatedEndAngle);
    const angleLength = Math.abs(calculatedEndAngle - calculatedStartAngle);

    // Apply opacity if provided
    if (opacity !== undefined && opacity < 1) {
      this.context.save();
      this.context.globalAlpha = opacity;
    }

    this.context.beginPath();
    this.context.fillStyle = color;
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius,
      calculatedStartAngle,
      calculatedEndAngle,
      false
    );
    this.context.lineTo(outerEndCoords.x, outerEndCoords.y);
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius + width,
      calculatedEndAngle,
      calculatedStartAngle,
      true
    );
    this.context.lineTo(outerStartCoords.x, outerStartCoords.y);
    this.context.fill();
    this.context.closePath();

    // Drawing the separating lines (from minRadius outward, not from center)
    const innerStartCoords = this.moveToAngle(this.minRadius, calculatedStartAngle);
    const innerEndCoords = this.moveToAngle(this.minRadius, calculatedEndAngle);
    
    this.context.beginPath();
    this.context.moveTo(innerStartCoords.x, innerStartCoords.y);
    this.context.lineTo(outerStartCoords.x, outerStartCoords.y);
    this.context.lineWidth = 0.5; // Ultra-thin lines for minimal visual noise
    this.context.strokeStyle = "rgba(255, 255, 255, 0.15)"; // Very subtle dividers
    this.context.stroke();

    this.context.beginPath();
    this.context.moveTo(innerEndCoords.x, innerEndCoords.y);
    this.context.lineTo(outerEndCoords.x, outerEndCoords.y);
    this.context.lineWidth = 0.5; // Ultra-thin lines for minimal visual noise
    this.context.strokeStyle = "rgba(255, 255, 255, 0.15)"; // Very subtle dividers
    this.context.stroke();

    // Draw highlight border if this section is highlighted (zoomed month)
    if (highlight) {
      this.context.beginPath();
      this.context.arc(
        this.center.x,
        this.center.y,
        startRadius,
        calculatedStartAngle,
        calculatedEndAngle,
        false
      );
      this.context.arc(
        this.center.x,
        this.center.y,
        startRadius + width,
        calculatedEndAngle,
        calculatedStartAngle,
        true
      );
      this.context.lineWidth = 1.5; // Subtle highlight
      this.context.strokeStyle = "rgba(59, 130, 246, 0.4)"; // Very subtle blue
      this.context.stroke();
      this.context.closePath();
    }

    if (text !== undefined) {
      textFunction.call(
        this,
        text,
        startRadius,
        width,
        calculatedStartAngle,
        calculatedEndAngle,
        angleLength,
        fontSize,
        isVertical, // Pass isVertical as it is, don't default it to true
        color // Pass background color for contrast calculation
      );
    }

    // Restore opacity if it was changed
    if (opacity !== undefined && opacity < 1) {
      this.context.restore();
    }
  }

  setCircleSectionSmallTitle(
    text,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    fontSize,
    isVertical
  ) {
    const angle = (startAngle + endAngle) / 2;
    const middleRadius = startRadius + width / 2.2;
    const circleSectionLength =
      startRadius * 2 * Math.PI * (angleLength / (Math.PI * 2));
    const textWidth = this.context.measureText(text).width;

    const radius =
      textWidth < circleSectionLength ? middleRadius : middleRadius + width;
    const rotationDivider = textWidth < circleSectionLength ? 2.06 : 1;
    const color = textWidth < circleSectionLength ? "#ffffff" : this.textColor;

    this.drawTextOnCircle(
      text,
      radius,
      angle,
      fontSize,
      color,
      "right",
      rotationDivider
    );
  }

  setCircleSectionTitle(
    text,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    fontSize,
    isVertical
  ) {
    // NATURAL letter spacing - measure each character individually
    const middleRadius = startRadius + width / 2;
    const color = "#ffffff";
    
    this.context.save();
    this.context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
    this.context.fillStyle = color;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    
    // Measure total text width to determine scale
    const totalTextWidth = this.context.measureText(text).width;
    
    // Dynamic arc percentage: longer names get more space (30-50% range)
    // Short names (3-5 chars): 30%, Medium (6-8 chars): 40%, Long (9+ chars): 50%
    const textLength = text.length;
    let arcPercentage;
    if (textLength <= 5) {
      arcPercentage = 0.30; // Short names like "Maj", "Juni"
    } else if (textLength <= 8) {
      arcPercentage = 0.40; // Medium names like "Januari", "Augusti"
    } else {
      arcPercentage = 0.50; // Long names like "September", "December"
    }
    
    const availableArcLength = middleRadius * angleLength * arcPercentage;
    
    // Calculate positions for each character based on their actual widths
    let currentAngle = startAngle;
    const charWidths = [];
    let totalWidth = 0;
    
    // Measure each character
    for (let i = 0; i < text.length; i++) {
      const charWidth = this.context.measureText(text[i]).width;
      charWidths.push(charWidth);
      totalWidth += charWidth;
    }
    
    // Scale to fit available arc
    const scale = availableArcLength / totalWidth;
    const startOffset = (angleLength - (totalWidth * scale / middleRadius)) / 2;
    currentAngle = startAngle + startOffset;
    
    // Draw each character at its natural position
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const scaledCharWidth = charWidths[i] * scale;
      const charAngleSpan = scaledCharWidth / middleRadius;
      
      // Position at center of character's arc span
      const charAngle = currentAngle + charAngleSpan / 2;
      const coord = this.moveToAngle(middleRadius, charAngle);
      
      this.context.save();
      this.context.translate(coord.x, coord.y);
      this.context.rotate(charAngle + Math.PI / 2);
      this.context.fillText(char, 0, 0);
      this.context.restore();
      
      currentAngle += charAngleSpan;
    }
    
    this.context.restore();
  }

  setCircleSectionAktivitetTitle(
    text,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    fontSize,
    isVertical,
    backgroundColor
  ) {
    // Calculate center angle and radius
    const centerAngle = (startAngle + endAngle) / 2;
    const middleRadius = startRadius + width / 2;
    const arcLength = middleRadius * angleLength;
    
    // Determine text color with strong contrast
    const textColor = backgroundColor ? this.getContrastColor(backgroundColor) : "#FFFFFF";
    
    // Use normal weight font, 70% of base size
    const activityFontSize = fontSize * 0.7;
    
    this.context.save();
    this.context.font = `400 ${activityFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
    const textWidth = this.context.measureText(text).width;
    
    // Position at center of the ring segment
    const coord = this.moveToAngle(middleRadius, centerAngle);
    this.context.fillStyle = textColor;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.translate(coord.x, coord.y);
    
    // Normalize angle to 0-2π
    let normalizedAngle = centerAngle;
    while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
    while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
    
    // VERTICAL text - perpendicular to the arc (90 degrees from horizontal)
    // Determine if we're on the left side (90° to 270°)
    const isLeftSide = normalizedAngle > Math.PI / 2 && normalizedAngle < Math.PI * 1.5;
    
    // Text is perpendicular to arc (radial direction)
    let rotation = centerAngle;
    
    // Flip on left side so text is readable from outside
    if (isLeftSide) {
      rotation += Math.PI;
    }
    
    this.context.rotate(rotation);
    
    // Draw text vertically (perpendicular to arc)
    // Truncate if too long to fit in ring width
    const maxWidth = width * 0.85;
    if (textWidth > maxWidth) {
      // Truncate with ellipsis
      let truncated = text;
      while (this.context.measureText(truncated + '…').width > maxWidth && truncated.length > 3) {
        truncated = truncated.slice(0, -1);
      }
      this.context.fillText(truncated + '…', 0, 0);
    } else {
      this.context.fillText(text, 0, 0);
    }
    
    this.context.restore();
  }

  // Draw text following the arc character by character with optimal spacing
  drawTextAlongArc(text, radius, startAngle, endAngle, fontSize, color) {
    this.context.save();
    this.context.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`; // Medium weight, modern font
    this.context.fillStyle = color;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    
    const angleSpan = endAngle - startAngle;
    const textLength = text.length;
    
    // Calculate character spacing with slight padding on edges
    const usableSpan = angleSpan * 0.95; // Use 95% of span for better margins
    const charSpacing = usableSpan / (textLength + 0.5);
    const startOffset = (angleSpan - usableSpan) / 2;
    
    // Draw each character along the arc with even spacing
    for (let i = 0; i < textLength; i++) {
      const char = text[i];
      const charAngle = startAngle + startOffset + charSpacing * (i + 0.5);
      const coord = this.moveToAngle(radius, charAngle);
      
      this.context.save();
      this.context.translate(coord.x, coord.y);
      this.context.rotate(charAngle + Math.PI / 2); // Rotate to follow arc
      this.context.fillText(char, 0, 0);
      this.context.restore();
    }
    
    this.context.restore();
  }

  // Draw ring name in a separator band with light background and text repeated 4 times
  drawRingNameBand(ringName, startRadius, bandWidth) {
    if (!ringName) return bandWidth;
    
    // Draw the separator ring with PROMINENT background
    this.context.beginPath();
    this.context.arc(this.center.x, this.center.y, startRadius, 0, Math.PI * 2);
    this.context.arc(this.center.x, this.center.y, startRadius + bandWidth, 0, Math.PI * 2, true);
    this.context.fillStyle = '#FFFFFF'; // White background for maximum visibility
    this.context.fill();
    this.context.closePath();
    
    // No border - clean look
    
    // Draw ring name 4 times around the circle (at quarters)
    const textToShow = ringName;
    const fontSize = this.size / 75; // Much smaller as requested
    const textRadius = startRadius + bandWidth / 2;
    
    this.context.save();
    this.context.font = `400 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`; // Normal weight (not bold)
    this.context.fillStyle = '#0F172A'; // Very dark for maximum contrast
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    
    // Draw at 4 positions: 0°, 90°, 180°, 270° (top, right, bottom, left)
    const positions = [0, 90, 180, 270];
    
    for (let position of positions) {
      const centerAngle = this.toRadians(position);
      const displayText = textToShow;
      
      // NATURAL letter spacing - measure each character individually
      const charWidths = [];
      let totalWidth = 0;
      
      for (let i = 0; i < displayText.length; i++) {
        const charWidth = this.context.measureText(displayText[i]).width;
        charWidths.push(charWidth);
        totalWidth += charWidth;
      }
      
      // Scale text to fit comfortably (use 10% of circle for tighter spacing)
      const maxArcLength = textRadius * Math.PI * 0.10;
      const scale = Math.min(1, maxArcLength / totalWidth);
      const scaledTotalWidth = totalWidth * scale;
      const totalAngleSpan = scaledTotalWidth / textRadius;
      
      // Start angle for text (centered at position)
      let currentAngle = centerAngle - totalAngleSpan / 2;
      
      for (let i = 0; i < displayText.length; i++) {
        const char = displayText[i];
        const scaledCharWidth = charWidths[i] * scale;
        const charAngleSpan = scaledCharWidth / textRadius;
        
        const charAngle = currentAngle + charAngleSpan / 2;
        const coord = this.moveToAngle(textRadius, charAngle);
        
        this.context.save();
        this.context.translate(coord.x, coord.y);
        
        // ALL characters point TOWARD center (inward)
        // Rotation: perpendicular to radius, pointing inward
        const rotation = charAngle + Math.PI / 2;
        
        this.context.rotate(rotation);
        this.context.fillText(char, 0, 0);
        this.context.restore();
        
        currentAngle += charAngleSpan;
      }
    }
    
    this.context.restore();
    
    return bandWidth;
  }

  setCircleSectionTexts(
    texts,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    initAngle,
    isVertical,
    lineHeight = 24
  ) {
    const radius = startRadius + width / 2;
    const angleDifference = angleLength / (texts.length + 1);

    this.context.fillStyle = "#ffffff";
    const fontSize = 20; // Fixed font size

    if (isVertical) {
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const angle = startAngle + angleDifference + i * angleDifference;
        // Position text in the middle of the ring, not at the outer edge
        const textRadius = startRadius + width / 2;
        const coord = this.moveToAngle(textRadius, angle);
        this.context.save();
        this.context.font = `bold ${fontSize}px Arial`;
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.translate(coord.x, coord.y);
        this.context.rotate(angle);
        this.context.fillText(text, 0, 0, width * 0.8);
        this.context.restore();
      }
    } else {
      const angle = (startAngle + endAngle) / 2;
      const coord = this.moveToAngle(radius, angle);

      this.context.save();
      this.context.translate(coord.x, coord.y);
      this.context.rotate(angle + Math.PI / 2); // Align text horizontally to the section's angle
      this.context.font = ` ${fontSize}px Arial`; // Re-apply the font size after transformation
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      let currentY = (-(texts.length - 1) * lineHeight) / 2; // Center the text vertically
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        this.context.fillText(text, 0, currentY);
        currentY += lineHeight;
      }

      this.context.restore();
    }
  }

  addCircleSection({
    spacingAngle,
    startRadius,
    width,
    startAngle,
    endAngle,
    color, // The color will be passed here from the calling function
    textFunction,
    text,
    fontSize,
    isVertical,
    opacity,
    highlight,
  }) {
    const newStartAngle = this.initAngle + startAngle;
    const newEndAngle = this.initAngle + endAngle;

    // Pass the color down to setCircleSectionHTML to ensure it's applied
    this.setCircleSectionHTML({
      startRadius,
      width,
      startAngle: newStartAngle,
      endAngle: newEndAngle,
      color,
      textFunction,
      text,
      fontSize,
      isVertical,
      opacity,
      highlight,
    });
  }

  addRegularCircleSections({
    numberOfIntervals,
    spacingAngle = 0, // No gaps
    startRadius,
    width,
    color,
    textFunction,
    texts = [],
    fontSize,
    colors = [],
    isVertical,
  }) {
    const intervalAngle = 360 / numberOfIntervals;
    for (let i = 0; i < numberOfIntervals; i++) {
      const text = texts[i] || ""; // Default to an empty string if undefined
      const sectionColor = color
        ? color
        : colors[i % colors.length] || "#000000"; // Default to black if undefined

      // Calculate opacity based on zoomedMonth
      let opacity = 1;
      let isZoomedMonth = false;
      if (this.zoomedMonth !== null && numberOfIntervals === 12) {
        // This is likely a month ring, apply fade effect
        isZoomedMonth = i === this.zoomedMonth;
        opacity = isZoomedMonth ? 1 : 0.15;
      }

      this.addCircleSection({
        spacingAngle, // This should now be 0 to avoid gaps
        startRadius,
        width,
        startAngle: i * intervalAngle,
        endAngle: (i + 1) * intervalAngle,
        highlight: isZoomedMonth,
        color: sectionColor,
        textFunction,
        text,
        fontSize,
        isVertical,
        opacity,
      });
    }
  }

  addMonthlyCircleSection({
    startRadius,
    width,
    spacingAngle,
    color,
    textFunction,
    texts,
    fontSize,
    colors,
    isVertical,
    lineHeight,
    numberOfIntervals = 12,
  }) {
    this.addRegularCircleSections({
      numberOfIntervals,
      spacingAngle,
      startRadius,
      width,
      color,
      textFunction,
      texts,
      fontSize,
      colors,
      isVertical, // Pass the correct orientation
      lineHeight,
    });
  }

  animateWheel() {
    if (!this.isAnimating) return; // If animation is stopped, don't animate

    this.rotationAngle += 0.01; // Adjust rotation speed
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the canvas

    // Redraw everything
    this.drawStaticElements();
    this.drawRotatingElements();

    requestAnimationFrame(this.animateWheel.bind(this)); // Loop the animation
  }

  startSpinning() {
    if (this.isAnimating) return; // Prevent multiple animations

    this.isAnimating = true;
    this.animateWheel(); // Start the animation loop
  }

  stopSpinning() {
    this.isAnimating = false; // Stop the animation
  }

  startDrag(event) {
    this.isDragging = true;
    this.lastMouseAngle = this.getMouseAngle(event);
    this.dragStartAngle = this.rotationAngle;
  }

  drag(event) {
    if (!this.isDragging) return;

    const currentMouseAngle = this.getMouseAngle(event);
    const angleDifference = currentMouseAngle - this.lastMouseAngle;

    // Update the rotation angle based on the difference in angles
    this.rotationAngle = this.dragStartAngle + angleDifference;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawRotatingElements();
    this.drawStaticElements();
  }

  stopDrag(event) {
    if (!this.isDragging) return;
    this.isDragging = false;
  }

  getMouseAngle(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - this.center.x;
    const y = event.clientY - rect.top - this.center.y;
    return Math.atan2(y, x);
  }

  handleMouseMove(event) {
    // Handle dragging
    if (this.isDragging) {
      this.drag(event);
      return;
    }

    // Handle hover detection for activities (throttled to prevent flicker)
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    let hoveredItemRegion = null;
    for (const itemRegion of this.clickableItems) {
      if (this.isPointInItemRegion(x, y, itemRegion)) {
        hoveredItemRegion = itemRegion;
        break;
      }
    }

    // Only update if hover state actually changed
    const newHoveredItem = hoveredItemRegion ? hoveredItemRegion.item : null;
    const hoveredItemId = this.hoveredItem ? this.hoveredItem.id : null;
    const newHoveredItemId = newHoveredItem ? newHoveredItem.id : null;

    if (hoveredItemId !== newHoveredItemId) {
      this.hoveredItem = newHoveredItem;
      this.canvas.style.cursor = newHoveredItem ? 'pointer' : 'default';
      
      // Use requestAnimationFrame to prevent excessive redraws
      if (!this.hoverRedrawPending) {
        this.hoverRedrawPending = true;
        requestAnimationFrame(() => {
          this.create();
          this.hoverRedrawPending = false;
        });
      }
    }
  }

  handleMouseLeave() {
    this.stopDrag();
    if (this.hoveredItem) {
      this.hoveredItem = null;
      this.canvas.style.cursor = 'default';
      this.create(); // Redraw without hover state
    }
  }

  handleClick(event) {
    if (this.isDragging) return; // Don't handle clicks if we were dragging

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check if click is on any item
    for (const itemRegion of this.clickableItems) {
      if (this.isPointInItemRegion(x, y, itemRegion)) {
        if (this.options.onItemClick) {
          // Pass client coordinates for tooltip positioning
          this.options.onItemClick(itemRegion.item, {
            x: event.clientX,
            y: event.clientY
          });
        }
        break;
      }
    }
  }

  isPointInItemRegion(x, y, region) {
    // Calculate distance from center
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if within radius range
    if (distance < region.startRadius || distance > region.endRadius) {
      return false;
    }

    // Calculate angle (accounting for rotation)
    let angle = Math.atan2(dy, dx) - this.toRadians(this.rotationAngle);
    
    // Normalize angle to 0-2π range
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;

    // Check if within angle range
    let startAngle = region.startAngle;
    let endAngle = region.endAngle;
    
    // Normalize angles
    while (startAngle < 0) startAngle += Math.PI * 2;
    while (endAngle < 0) endAngle += Math.PI * 2;
    while (startAngle >= Math.PI * 2) startAngle -= Math.PI * 2;
    while (endAngle >= Math.PI * 2) endAngle -= Math.PI * 2;

    // Handle wraparound
    if (startAngle < endAngle) {
      return angle >= startAngle && angle <= endAngle;
    } else {
      return angle >= startAngle || angle <= endAngle;
    }
  }

  create() {
    // Set canvas internal dimensions (for drawing resolution)
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    // Note: DO NOT set canvas.style here - let React component control display size for zoom

    // Apply rotation and draw rotating elements (months, events)
    this.drawRotatingElements();
    // Draw static elements (title and year)
    this.drawStaticElements();
  }

  // Function to draw static elements with proper proportions
  drawStaticElements() {
    this.context.save();

    // Draw center circle
    this.context.beginPath();
    this.context.arc(this.center.x, this.center.y, this.minRadius, 0, Math.PI * 2);
    this.context.fillStyle = "#FFFFFF";
    this.context.fill();
    
    // Add subtle border
    this.context.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    this.context.lineWidth = 1.5;
    this.context.stroke();
    this.context.closePath();

    if (this.hoveredItem) {
      // Show hovered activity info - cleaner, less cluttered
      const ring = this.organizationData.rings.find(r => r.id === this.hoveredItem.ringId);
      
      const lineHeight = this.size / 45;
      const maxWidth = this.minRadius * 1.7;
      
      // Activity name (bold, larger) - with text wrapping
      this.context.fillStyle = '#1E293B';
      this.context.textAlign = "center";
      this.context.font = `700 ${this.size / 52}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
      this.context.textBaseline = "middle";
      
      // Simple text wrapping for activity name
      const words = this.hoveredItem.name.split(' ');
      const lines = [];
      let currentLine = '';
      
      for (let word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = this.context.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      const startY = this.center.y - (lines.length * lineHeight) / 2;
      
      // Draw wrapped activity name
      for (let i = 0; i < lines.length; i++) {
        this.context.fillText(
          lines[i],
          this.center.x,
          startY + i * lineHeight
        );
      }
      
      // Date range (smaller, less prominent)
      this.context.fillStyle = '#64748B';
      this.context.font = `500 ${this.size / 75}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
      const startDate = new Date(this.hoveredItem.startDate).toLocaleDateString('sv-SE');
      const endDate = new Date(this.hoveredItem.endDate).toLocaleDateString('sv-SE');
      this.context.fillText(
        `${startDate} - ${endDate}`,
        this.center.x,
        startY + lines.length * lineHeight + lineHeight * 0.6
      );
      
      // Ring name only (skip activity group - too much info)
      if (ring) {
        this.context.fillText(
          ring.name,
          this.center.x,
          startY + lines.length * lineHeight + lineHeight * 1.4
        );
      }
    } else {
      // Draw year text in center (bold, large)
      this.context.fillStyle = '#1E293B';
      this.context.font = `700 ${this.size / 30}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.fillText(
        this.year,
        this.center.x,
        this.center.y,
        this.size
      );
    }

    this.context.restore();
  }

  // Function to draw rotating elements
  drawRotatingElements() {
    // Clear clickable items before redrawing
    this.clickableItems = [];
    
    this.context.save();
    this.context.translate(this.center.x, this.center.y);
    this.context.rotate(this.rotationAngle);
    this.context.translate(-this.center.x, -this.center.y);

    // Calculate available space based on what rings are visible
    let currentMaxRadius = this.maxRadius;
    
    // Helper function to convert a date to angular position
    // This aligns with the month ring where each month is 30 degrees (360/12)
    const dateToAngle = (date) => {
      const month = date.getMonth(); // 0-11
      const dayOfMonth = date.getDate(); // 1-31
      const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
      
      // Each month gets exactly 30 degrees regardless of actual day count
      const monthAngle = month * 30;
      const dayAngle = (dayOfMonth - 1) / daysInMonth * 30; // Proportional within the month
      
      return monthAngle + dayAngle;
    };
    
    const minDate = new Date(this.year, 0, 1);
    const maxDate = new Date(this.year, 11, 31, 23, 59, 59);
    
    // Define visibility filters at higher scope for use in both outer and inner ring drawing
    const visibleRings = this.organizationData.rings.filter(r => r.visible && r.type === 'outer');
    const visibleInnerRings = this.organizationData.rings.filter(r => r.visible && r.type === 'inner');
    const visibleActivityGroups = this.organizationData.activityGroups.filter(a => a.visible);
    const visibleLabels = this.organizationData.labels.filter(l => l.visible);
    
    // Draw organization data items (from sidebar) if available
    if (this.organizationData && this.organizationData.items && this.organizationData.items.length > 0) {
      
      if (visibleRings.length > 0) {
        const orgDataWidth = this.size / 23; // Ring width
        const ringNameBandWidth = this.size / 80; // Thinner ring name band
        const gapBetweenRings = this.size / 200; // Minimal gap between rings
        let currentRadius = currentMaxRadius;
        
        visibleRings.forEach((ring, ringIndex) => {
          // Reserve space for ring name band ABOVE the ring
          if (this.showRingNames) {
            currentRadius -= ringNameBandWidth;
            currentRadius -= gapBetweenRings;
            // Add extra gap between ring name and activities for better spacing
            currentRadius -= this.size / 250;
          }
          
          // Draw the actual ring
          currentRadius -= orgDataWidth;
          const ringStartRadius = currentRadius;
          
          // Ring name band will be drawn at the OUTER edge (above ring)
          const nameBandRadius = ringStartRadius + orgDataWidth;
          
          // Filter items for this ring that also have visible activity group (label is optional)
          const ringItems = this.organizationData.items.filter(item => {
            const hasVisibleActivityGroup = visibleActivityGroups.some(a => a.id === item.activityId);
            // Label is optional - only filter by label if item has one
            const labelOk = !item.labelId || visibleLabels.some(l => l.id === item.labelId);
            return item.ringId === ring.id && hasVisibleActivityGroup && labelOk;
          });
          
          // Only draw background if ring has visible items
          if (ringItems.length > 0) {
            // Draw light background for this outer ring (design draft style)
            this.context.beginPath();
            this.context.arc(this.center.x, this.center.y, ringStartRadius, 0, Math.PI * 2);
            this.context.arc(this.center.x, this.center.y, ringStartRadius + orgDataWidth, 0, Math.PI * 2, true);
            const bgColors = ['#F8FAFC', '#F1F5F9', '#E2E8F0'];
            this.context.fillStyle = bgColors[ringIndex % bgColors.length];
            this.context.fill();
            this.context.closePath();
          }
          
          ringItems.forEach((item) => {
            let itemStartDate = new Date(item.startDate);
            let itemEndDate = new Date(item.endDate);
            
            // Skip items outside the current year
            if (itemEndDate < minDate || itemStartDate > maxDate) return;
            
            // Clip item dates to year boundaries
            if (itemStartDate < minDate) itemStartDate = minDate;
            if (itemEndDate > maxDate) itemEndDate = maxDate;
            
            // Calculate angles
            let startAngle = dateToAngle(itemStartDate);
            let endAngle = dateToAngle(itemEndDate);
            
            // Enforce MINIMUM 1-WEEK WIDTH (7 days = ~5.75 degrees)
            const minWeekAngle = (7 / 365) * 360; // 1 week in degrees
            if (Math.abs(endAngle - startAngle) < minWeekAngle) {
              const center = (startAngle + endAngle) / 2;
              startAngle = center - minWeekAngle / 2;
              endAngle = center + minWeekAngle / 2;
            }
            
            // Apply the initAngle offset to align with the month ring
            const adjustedStartAngle = this.initAngle + startAngle;
            const adjustedEndAngle = this.initAngle + endAngle;
            
            // Get color from activity group
            const activityGroup = this.organizationData.activityGroups.find(a => a.id === item.activityId);
            let itemColor = activityGroup ? activityGroup.color : ring.color;
            
            // Check if this item is hovered
            const isHovered = this.hoveredItem && this.hoveredItem.id === item.id;
            if (isHovered) {
              itemColor = this.getHoverColor(itemColor);
            }
            
            // DESIGN DRAFT: Position at ring start and use full ring width
            const itemStartRadius = ringStartRadius;
            const itemWidth = orgDataWidth; // Use full width
            
            // Draw the item block
            this.setCircleSectionHTML({
              startRadius: itemStartRadius,
              width: itemWidth,
              startAngle: adjustedStartAngle,
              endAngle: adjustedEndAngle,
              color: itemColor,
              textFunction: this.setCircleSectionAktivitetTitle.bind(this),
              text: item.name,
              fontSize: this.size / 48, // Larger so text fits without truncation
              isVertical: false,
              highlight: isHovered,
            });
            
            // Store clickable region for this item
            this.clickableItems.push({
              item: item,
              startRadius: itemStartRadius,
              endRadius: itemStartRadius + itemWidth,
              startAngle: this.toRadians(adjustedStartAngle),
              endAngle: this.toRadians(adjustedEndAngle)
            });
          });
          
          // Draw ring name band AFTER items so it's visible on top
          if (this.showRingNames) {
            this.drawRingNameBand(ring.name, nameBandRadius, ringNameBandWidth);
          }
        });
        
        // Set currentMaxRadius to current position
        currentMaxRadius = currentRadius;
      }
    }
    
    // Reserve space for month and week rings (draw them LATER after inner rings)
    const monthNameWidth = this.size / 30;
    const weekRingWidth = this.size / 35;
    
    // Calculate positions - NO GAPS between month and week rings
    let monthNameStartRadius = currentMaxRadius - monthNameWidth;
    let weekStartRadius = monthNameStartRadius - weekRingWidth;
    
    // Reduce currentMaxRadius to leave space for BOTH rings
    if (this.showMonthRing) {
      currentMaxRadius -= monthNameWidth;
    }
    if (this.showWeekRing) {
      currentMaxRadius -= weekRingWidth;
    }
    
    // Add gap after week ring before inner rings start
    const gapAfterWeekRing = this.size / 200;
    if (this.showWeekRing) {
      currentMaxRadius -= gapAfterWeekRing;
    }

    // Draw monthly events (inner sections) - they expand to fill available space
    const ringNameBandWidth = this.size / 65; // Slightly THICKER ring name bands
    const ringNamePadding = this.size / 120; // MORE padding around ring name bands
    const ringPadding = this.size / 300; // Small padding between rings for visual separation
    
    // Filter out EMPTY rings (rings with no items)
    const innerRings = this.organizationData.rings.filter(r => {
      if (r.type !== 'inner' || !r.visible) return false;
      // Only include rings that have at least one visible item
      const hasItems = this.organizationData.items.some(item => {
        const hasVisibleActivityGroup = visibleActivityGroups.some(a => a.id === item.activityId);
        const labelOk = !item.labelId || visibleLabels.some(l => l.id === item.labelId);
        return item.ringId === r.id && hasVisibleActivityGroup && labelOk;
      });
      return hasItems;
    });
    const numberOfEvents = innerRings.length;
    
    // Calculate total spacing needed (ring name bands with padding + ring separation)
    let totalSpacing = 0;
    if (numberOfEvents > 1) {
      // Add small padding between rings for visual separation
      totalSpacing += (numberOfEvents - 1) * ringPadding;
      
      // Add space for ring name bands between rings (band + padding on each side)
      if (this.showRingNames) {
        totalSpacing += (numberOfEvents - 1) * (ringNameBandWidth + ringNamePadding * 2);
      }
    }
    
    const eventWidth =
      currentMaxRadius -
      this.minRadius -
      this.size / 140 -
      totalSpacing;
    let remainingEventWidth = eventWidth;
    let eventRadius = this.minRadius;

    for (let i = 0; i < numberOfEvents; i++) {
      const ring = innerRings[i];
      // Make inner rings slightly smaller (reduce from 1.1 to 1.05)
      const percentage = (1 / (numberOfEvents - i)) * 1.05;
      const newEventWidth =
        i !== numberOfEvents - 1
          ? remainingEventWidth * percentage
          : remainingEventWidth;
      remainingEventWidth -= newEventWidth;

      // Draw aktiviteter across the full ring width
      if (visibleInnerRings.length > 0) {
        const ringItems = this.organizationData.items.filter(item => {
          const hasVisibleActivityGroup = visibleActivityGroups.some(a => a.id === item.activityId);
          const labelOk = !item.labelId || visibleLabels.some(l => l.id === item.labelId);
          return item.ringId === ring.id && hasVisibleActivityGroup && labelOk;
        });
        
        // Only draw background if ring has visible items
        if (ringItems.length > 0) {
          // Draw light background for this inner ring (design draft style)
          this.context.beginPath();
          this.context.arc(this.center.x, this.center.y, eventRadius, 0, Math.PI * 2);
          this.context.arc(this.center.x, this.center.y, eventRadius + newEventWidth, 0, Math.PI * 2, true);
          const bgColors = ['#FEF9F3', '#FEF3F2', '#F0FDF4', '#EFF6FF'];
          this.context.fillStyle = bgColors[i % bgColors.length];
          this.context.fill();
          this.context.closePath();
        }
        
        ringItems.forEach((item) => {
          let itemStartDate = new Date(item.startDate);
          let itemEndDate = new Date(item.endDate);
          
          // Skip items outside the current year
          if (itemEndDate < minDate || itemStartDate > maxDate) return;
          
          // Clip item dates to year boundaries
          if (itemStartDate < minDate) itemStartDate = minDate;
          if (itemEndDate > maxDate) itemEndDate = maxDate;
          
          // Calculate angles
          let startAngle = dateToAngle(itemStartDate);
          let endAngle = dateToAngle(itemEndDate);
          
          // Enforce MINIMUM 1-WEEK WIDTH (7 days = ~5.75 degrees)
          const minWeekAngle = (7 / 365) * 360; // 1 week in degrees
          if (Math.abs(endAngle - startAngle) < minWeekAngle) {
            const center = (startAngle + endAngle) / 2;
            startAngle = center - minWeekAngle / 2;
            endAngle = center + minWeekAngle / 2;
          }
          
          // Apply the initAngle offset to align with the month ring
          const adjustedStartAngle = this.initAngle + startAngle;
          const adjustedEndAngle = this.initAngle + endAngle;
          
          // Get color from activity group
          const activityGroup = this.organizationData.activityGroups.find(a => a.id === item.activityId);
          let itemColor = activityGroup ? activityGroup.color : this.sectionColors[0];
          
          // Check if this item is hovered
          const isHovered = this.hoveredItem && this.hoveredItem.id === item.id;
          if (isHovered) {
            itemColor = this.getHoverColor(itemColor);
          }
          
          // DESIGN DRAFT: Activities fill FULL ring height (100%)
          const itemWidth = newEventWidth; // Use full width
          const itemStartRadius = eventRadius; // Start at ring edge
          
          // Draw the item block with modern styling
          this.setCircleSectionHTML({
            startRadius: itemStartRadius,
            width: itemWidth,
            startAngle: adjustedStartAngle,
            endAngle: adjustedEndAngle,
            color: itemColor,
            textFunction: this.setCircleSectionAktivitetTitle.bind(this),
            text: item.name,
            fontSize: this.size / 62, // Optimized for readability
            isVertical: false,
            highlight: isHovered,
          });
          
          // Store clickable region for this item
          this.clickableItems.push({
            item: item,
            startRadius: itemStartRadius,
            endRadius: itemStartRadius + itemWidth,
            startAngle: this.toRadians(adjustedStartAngle),
            endAngle: this.toRadians(adjustedEndAngle)
          });
        });
      }
      
      // Store ring name info for drawing LATER (after month/week rings)
      if (this.showRingNames) {
        const ringNameRadius = eventRadius + newEventWidth;
        if (!this.innerRingNamesToDraw) this.innerRingNamesToDraw = [];
        this.innerRingNamesToDraw.push({
          name: ring.name,
          radius: ringNameRadius,
          width: ringNameBandWidth
        });
      }
      
      // Move eventRadius for next ring
      eventRadius += newEventWidth;
      
      // Add spacing between rings for better visual separation
      if (i < numberOfEvents - 1) {
        eventRadius += ringPadding; // Small padding between rings
        
        if (this.showRingNames) {
          eventRadius += ringNamePadding; // Padding before ring name
          eventRadius += ringNameBandWidth; // Ring name band
          eventRadius += ringNamePadding; // Padding after ring name
        }
      }
    }

    // NOW draw month ring AFTER inner rings (so it's on top)
    if (this.showMonthRing) {
      // Enhanced color palette
      const enhancedMonthColors = [
        '#334155', '#3B4252', '#334155', '#3B4252',
        '#334155', '#3B4252', '#334155', '#3B4252',
        '#334155', '#3B4252', '#334155', '#3B4252',
      ];
      
      this.addMonthlyCircleSection({
        startRadius: monthNameStartRadius,
        width: monthNameWidth,
        spacingAngle: 0,
        color: null,
        textFunction: this.setCircleSectionTitle.bind(this),
        texts: this.monthNames,
        fontSize: this.size / 70, // Much smaller font
        colors: enhancedMonthColors,
        isVertical: true,
      });
    }

    // NOW draw week ring AFTER inner rings (so it's on top)
    if (this.showWeekRing) {
      const weekData = this.generateWeeks();
      const numberOfWeeks = weekData.length;
      
      // Very subtle color for week numbers
      const weekColors = Array(numberOfWeeks).fill('#94A3B8'); // Lighter gray
      
      this.addMonthlyCircleSection({
        startRadius: weekStartRadius,
        width: weekRingWidth,
        spacingAngle: 0, // Seamless
        color: null,
        textFunction: this.setCircleSectionSmallTitle.bind(this), // Use smaller text function
        texts: weekData,
        fontSize: this.size / 85, // Smaller, more subtle
        colors: weekColors,
        isVertical: true,
        lineHeight: this.lineHeight,
        numberOfIntervals: numberOfWeeks,
      });
    }

    // NOW draw inner ring names that were collected earlier
    if (this.showRingNames && this.innerRingNamesToDraw && this.innerRingNamesToDraw.length > 0) {
      for (const ringName of this.innerRingNamesToDraw) {
        this.drawRingNameBand(ringName.name, ringName.radius, ringName.width);
      }
      // Clear the array for next render
      this.innerRingNamesToDraw = [];
    }

    this.context.restore();
  }

  // DOWNLOAD FUNCTIONALITY

  downloadImage(format) {
    switch (format) {
      case "png":
        this.downloadAsPNG(false);
        break;
      case "png-white":
        this.downloadAsPNG(true);
        break;
      case "jpeg":
        this.downloadAsJPEG();
        break;
      case "svg":
        this.downloadAsSVG();
        break;
      default:
        console.error("Unsupported format");
    }
  }

  generateFileName(extension) {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const titlePart = this.title ? `${this.title.replace(/\s+/g, "_")}_` : "";
    return `YearWheel_${titlePart}${dateStr}.${extension}`;
  }

  downloadFile(data, fileName, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  downloadAsPNG(whiteBackground = false) {
    const pngCanvas = this.copyCanvas(whiteBackground);
    pngCanvas.toBlob((blob) => {
      const fileName = this.generateFileName("png");
      this.downloadFile(blob, fileName, "image/png");
    });
  }

  downloadAsJPEG() {
    const jpegCanvas = this.copyCanvas(true); // Always use white background for JPEG
    jpegCanvas.toBlob(
      (blob) => {
        const fileName = this.generateFileName("jpg");
        this.downloadFile(blob, fileName, "image/jpeg");
      },
      "image/jpeg",
      1.0
    );
  }

  downloadAsSVG() {
    const svgContext = this.createSVGContext();
    const originalContext = this.context;
    this.context = svgContext;
    this.create();
    this.context = originalContext;
    const svgData = svgContext.getSerializedSvg();
    const fileName = this.generateFileName("svg");
    this.downloadFile(svgData, fileName, "image/svg+xml");
  }

  copyCanvas(whiteBackground = false) {
    const copiedCanvas = document.createElement("canvas");
    copiedCanvas.width = this.canvas.width;
    copiedCanvas.height = this.canvas.height;
    const copiedContext = copiedCanvas.getContext("2d");

    if (whiteBackground) {
      copiedContext.fillStyle = "#FFFFFF";
      copiedContext.fillRect(0, 0, copiedCanvas.width, copiedCanvas.height);
    }

    copiedContext.drawImage(this.canvas, 0, 0);
    return copiedCanvas;
  }

  createSVGContext() {
    return new C2S(this.size, this.size / 4 + this.size);
  }
}

export default YearWheel;
