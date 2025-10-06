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
    this.organizationData = options.organizationData || { items: [], rings: [], activities: [] };
    this.showWeekRing = options.showWeekRing !== undefined ? options.showWeekRing : true;
    this.showMonthRing = options.showMonthRing !== undefined ? options.showMonthRing : true;
    this.showSeasonRing = options.showSeasonRing !== undefined ? options.showSeasonRing : true;
    this.zoomedMonth = options.zoomedMonth !== undefined && options.zoomedMonth !== null ? options.zoomedMonth : null;
    this.textColor = "#374151"; // Darker gray for better readability
    this.center = { x: size / 2, y: size / 5 + size / 2 };
    this.initAngle = -15 - 90;
    this.minRadius = size / 15;
    this.maxRadius = size / 2 - size / 30;
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
    this.canvas.addEventListener("mousemove", this.drag.bind(this));
    this.canvas.addEventListener("mouseup", this.stopDrag.bind(this));
    this.canvas.addEventListener("mouseleave", this.stopDrag.bind(this));
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
    this.context.font = `bold ${fontSize}px Arial`;
    this.context.fillStyle = color;
    this.context.textAlign = textAlign;
    this.context.textBaseline = "middle";
    this.context.translate(coord.x, coord.y);
    this.context.rotate(angle + Math.PI / rotationDivider);
    this.context.fillText(text.toUpperCase(), 0, 0);
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
    this.context.lineWidth = 3; // Set line width
    this.context.strokeStyle = "#FFFFFF"; // Set line color
    this.context.stroke();

    this.context.beginPath();
    this.context.moveTo(innerEndCoords.x, innerEndCoords.y);
    this.context.lineTo(outerEndCoords.x, outerEndCoords.y);
    this.context.lineWidth = 3; // Set line width
    this.context.strokeStyle = "#FFFFFF"; // Set line color
    this.context.stroke();

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
        isVertical // Pass isVertical as it is, don't default it to true
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
    const angle = (startAngle + endAngle) / 2;
    const middleRadius = startRadius + width / 2.2;
    const textWidth = this.context.measureText(text).width;
    const radius =
      textWidth < middleRadius ? middleRadius : middleRadius + width;
    const color = "#ffffff";

    this.drawTextOnCircle(text, radius, angle, fontSize, color, "center");
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
      if (this.zoomedMonth !== null && numberOfIntervals === 12) {
        // This is likely a month ring, apply fade effect
        opacity = i === this.zoomedMonth ? 1 : 0.2;
      }

      this.addCircleSection({
        spacingAngle, // This should now be 0 to avoid gaps
        startRadius,
        width,
        startAngle: i * intervalAngle,
        endAngle: (i + 1) * intervalAngle,
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
    this.canvas.width = this.size;
    this.canvas.height = this.size / 4 + this.size;
    this.canvas.style.height = `100%`;

    // Apply rotation and draw rotating elements (months, events)
    this.drawRotatingElements();
    // Draw static elements (title and year)
    this.drawStaticElements();
  }

  // Function to draw static elements
  drawStaticElements() {
    this.context.save();

    // Draw solid center circle
    this.context.beginPath();
    this.context.arc(this.center.x, this.center.y, this.minRadius, 0, Math.PI * 2);
    this.context.fillStyle = "#FFFFFF";
    this.context.fill();
    this.context.closePath();

    // Draw title and year (no rotation applied)
    if (this.title && this.title.trim() !== '') {
      this.context.fillStyle = this.textColor;
      this.context.font = `bold ${this.size / 20}px Arial`;
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.fillText(this.title, this.size / 2, this.size / 15, this.size);
    }

    // Draw year text in center
    this.context.fillStyle = this.textColor;
    this.context.font = `bold ${this.size / 30}px Arial`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText(
      this.year,
      this.center.x,
      this.center.y,
      this.size
    );

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
    
    // Draw season ring if enabled (outermost)
    if (this.showSeasonRing && this.events && this.events.length > 0) {
      const seasonRingWidth = this.size / 35;
      const seasonRingStartRadius = currentMaxRadius - seasonRingWidth - this.size / 400;
      
      const seasons = this.events.filter(event => event.type === 'season');
      
      for (let i = 0; i < seasons.length; i++) {
        const event = seasons[i];
        let eventStartDate = new Date(event.startDate);
        let eventEndDate = new Date(event.endDate);
        
        // Skip events that end before the current year
        if (eventEndDate < minDate) continue;
        
        // Skip events that start after the current year
        if (eventStartDate > maxDate) continue;
        
        // Clip event dates to year boundaries
        if (eventStartDate < minDate) eventStartDate = minDate;
        if (eventEndDate > maxDate) eventEndDate = maxDate;
        
        // Calculate angles
        let startAngle = dateToAngle(eventStartDate);
        let endAngle = dateToAngle(eventEndDate);
        
        // Apply the initAngle offset to align with the month ring
        const adjustedStartAngle = this.initAngle + startAngle;
        const adjustedEndAngle = this.initAngle + endAngle;
        
        this.setCircleSectionHTML({
          startRadius: seasonRingStartRadius,
          width: seasonRingWidth,
          startAngle: adjustedStartAngle,
          endAngle: adjustedEndAngle,
          color: this.sectionColors[i % this.sectionColors.length],
          textFunction: this.setCircleSectionSmallTitle.bind(this),
          text: event.name,
          fontSize: this.size / 90,
          isVertical: false,
        });
      }
      
      currentMaxRadius = seasonRingStartRadius - this.size / 200;
    }
    
    // Draw calendar events ring if enabled (holidays/special days)
    if (this.options.showYearEvents && this.events && this.events.length > 0) {
      const calendarEventWidth = this.size / 40;
      const calendarEventStartRadius = currentMaxRadius - calendarEventWidth - this.size / 400;
      
      const holidays = this.events.filter(event => event.type === 'holiday');
      
      for (let i = 0; i < holidays.length; i++) {
        const event = holidays[i];
        let eventStartDate = new Date(event.startDate);
        let eventEndDate = new Date(event.endDate);
        
        // Skip events that end before the current year
        if (eventEndDate < minDate) continue;
        
        // Skip events that start after the current year
        if (eventStartDate > maxDate) continue;
        
        // Clip event dates to year boundaries
        if (eventStartDate < minDate) eventStartDate = minDate;
        if (eventEndDate > maxDate) eventEndDate = maxDate;
        
        // Calculate angles
        let startAngle = dateToAngle(eventStartDate);
        let endAngle = dateToAngle(eventEndDate);
        
        // Ensure minimum visibility for single-day events
        if (Math.abs(startAngle - endAngle) < 3) {
          const averageAngle = (startAngle + endAngle) / 2;
          startAngle = averageAngle - 1.5;
          endAngle = averageAngle + 1.5;
        }
        
        // Apply the initAngle offset to align with the month ring
        const adjustedStartAngle = this.initAngle + startAngle;
        const adjustedEndAngle = this.initAngle + endAngle;
        
        this.setCircleSectionHTML({
          startRadius: calendarEventStartRadius,
          width: calendarEventWidth,
          startAngle: adjustedStartAngle,
          endAngle: adjustedEndAngle,
          color: this.sectionColors[i % this.sectionColors.length],
          textFunction: this.setCircleSectionSmallTitle.bind(this),
          text: event.name,
          fontSize: this.size / 90,
          isVertical: false,
        });
      }
      
      currentMaxRadius = calendarEventStartRadius - this.size / 200;
    }
    
    // Draw organization data items (from sidebar) if available
    if (this.organizationData && this.organizationData.items && this.organizationData.items.length > 0) {
      const visibleRings = this.organizationData.rings.filter(r => r.visible);
      const visibleActivities = this.organizationData.activities.filter(a => a.visible);
      const visibleLabels = this.organizationData.labels.filter(l => l.visible);
      
      if (visibleRings.length > 0) {
        const orgDataWidth = this.size / 35; // Width for organization items ring
        const orgDataStartRadius = currentMaxRadius - orgDataWidth - this.size / 400;
        
        visibleRings.forEach((ring, ringIndex) => {
          // Filter items for this ring that also have visible activity and label
          const ringItems = this.organizationData.items.filter(item => {
            const hasVisibleActivity = visibleActivities.some(a => a.id === item.activityId);
            const hasVisibleLabel = visibleLabels.some(l => l.id === item.labelId);
            return item.ringId === ring.id && hasVisibleActivity && hasVisibleLabel;
          });
          
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
            
            // Ensure minimum visibility for short duration items
            if (Math.abs(startAngle - endAngle) < 2) {
              const averageAngle = (startAngle + endAngle) / 2;
              startAngle = averageAngle - 1;
              endAngle = averageAngle + 1;
            }
            
            // Apply the initAngle offset to align with the month ring
            const adjustedStartAngle = this.initAngle + startAngle;
            const adjustedEndAngle = this.initAngle + endAngle;
            
            // Get color from activity
            const activity = this.organizationData.activities.find(a => a.id === item.activityId);
            const itemColor = activity ? activity.color : ring.color;
            
            const itemStartRadius = orgDataStartRadius - (ringIndex * (orgDataWidth * 0.3));
            const itemWidth = orgDataWidth * 0.25;
            
            // Draw the item block
            this.setCircleSectionHTML({
              startRadius: itemStartRadius,
              width: itemWidth,
              startAngle: adjustedStartAngle,
              endAngle: adjustedEndAngle,
              color: itemColor,
              textFunction: this.setCircleSectionSmallTitle.bind(this),
              text: item.name,
              fontSize: this.size / 100,
              isVertical: false,
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
        });
        
        currentMaxRadius = orgDataStartRadius - (visibleRings.length * (orgDataWidth * 0.3)) - this.size / 200;
      }
    }
    
    // Draw month names ring if enabled
    const monthNameWidth = this.size / 25;
    let monthNameStartRadius = currentMaxRadius - monthNameWidth - this.size / 400;
    
    if (this.showMonthRing) {
      this.addMonthlyCircleSection({
        startRadius: monthNameStartRadius,
        width: monthNameWidth,
        spacingAngle: 0.25,
        color: this.outerRingColor,
        textFunction: this.setCircleSectionTitle.bind(this),
        texts: this.monthNames,
        fontSize: this.size / 60,
        colors: this.sectionColors,
        isVertical: true,
      });
      currentMaxRadius = monthNameStartRadius;
    }

    // Draw week ring if enabled
    const weekRingWidth = this.size / 30;
    let weekStartRadius = currentMaxRadius - weekRingWidth - this.size / 170;
    
    if (this.showWeekRing) {
      const weekData = this.generateWeeks();
      const numberOfWeeks = weekData.length;
      this.addMonthlyCircleSection({
        startRadius: weekStartRadius,
        width: weekRingWidth,
        spacingAngle: 0.25,
        color: this.outerRingColor,
        textFunction: this.setCircleSectionTitle.bind(this),
        texts: weekData,
        fontSize: this.size / 80,
        colors: this.sectionColors,
        isVertical: true,
        lineHeight: this.lineHeight,
        numberOfIntervals: numberOfWeeks,
      });
      currentMaxRadius = weekStartRadius;
    }

    // Draw monthly events (inner sections) - they expand to fill available space
    const baseEventSpacing = this.size / 300;
    const numberOfEvents = this.options.ringsData.length;
    
    // Calculate total spacing needed (more for vertical text rings)
    let totalSpacing = 0;
    for (let i = 0; i < numberOfEvents - 1; i++) {
      const currentRing = this.options.ringsData[i];
      const nextRing = this.options.ringsData[i + 1];
      // Add extra spacing if either ring has vertical text
      const spacingMultiplier = (currentRing.orientation === "vertical" || nextRing.orientation === "vertical") ? 2.5 : 1;
      totalSpacing += baseEventSpacing * spacingMultiplier;
    }
    
    const eventWidth =
      currentMaxRadius -
      this.minRadius -
      this.size / 140 -
      totalSpacing;
    let remainingEventWidth = eventWidth;
    let eventRadius = this.minRadius;

    for (let i = 0; i < numberOfEvents; i++) {
      const ring = this.options.ringsData[i];
      const percentage = (1 / (numberOfEvents - i)) * 1.1;
      const newEventWidth =
        i !== numberOfEvents - 1
          ? remainingEventWidth * percentage
          : remainingEventWidth;
      remainingEventWidth -= newEventWidth;

      this.addMonthlyCircleSection({
        startRadius: eventRadius,
        width: newEventWidth,
        spacingAngle: 0.4,
        color: null,
        textFunction: this.setCircleSectionTexts.bind(this),
        texts: ring.data,
        fontSize: this.size / 150,
        colors: this.sectionColors,
        isVertical: ring.orientation === "vertical",
      });
      
      // Calculate spacing for next ring
      if (i < numberOfEvents - 1) {
        const nextRing = this.options.ringsData[i + 1];
        const spacingMultiplier = (ring.orientation === "vertical" || nextRing.orientation === "vertical") ? 2.5 : 1;
        eventRadius += newEventWidth + (baseEventSpacing * spacingMultiplier);
      }
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
