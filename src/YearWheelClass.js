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
    this.sectionColors = colors.slice(1); // Use the remaining colors for sections
    this.size = size;
    this.events = events;
    this.options = options;
    this.textColor = "#333333";
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

    this.canvas.addEventListener("mousedown", this.startDrag.bind(this));
    this.canvas.addEventListener("mousemove", this.drag.bind(this));
    this.canvas.addEventListener("mouseup", this.stopDrag.bind(this));
    this.canvas.addEventListener("mouseleave", this.stopDrag.bind(this));
    console.table(this.generateWeeks());
  }

  generateWeeks() {
    const weeks = [];
    const year = parseInt(this.year); // Convert year to integer
    let currentDate = new Date(year, 0, 1); // Start from January 1st of the given year

    // Adjust to the first Monday of the year
    if (currentDate.getDay() !== 1) {
      while (currentDate.getDay() !== 1) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    let weekNumber = 1;

    while (currentDate.getFullYear() === year) {
      currentDate.setDate(currentDate.getDate() + 6); // Move to Sunday

      // We are only using week numbers for now. There's a use case for week start date and week end date that can come into play
      // const weekStart = new Date(currentDate);
      // const weekEnd = new Date(currentDate);

      // weeks.push({
      //   week: weekNumber,
      //   startDate: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
      //   endDate: `${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
      // });

      weeks.push(weekNumber.toString())

      // Move to the next Monday
      currentDate.setDate(currentDate.getDate() + 1);
      weekNumber++;
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
  }) {
    const endRadius = startRadius + width; // Properly define endRadius
    const calculatedStartAngle = this.toRadians(startAngle);
    const calculatedEndAngle = this.toRadians(endAngle);

    const outerStartCoords = this.moveToAngle(endRadius, calculatedStartAngle);
    const outerEndCoords = this.moveToAngle(endRadius, calculatedEndAngle);
    const angleLength = Math.abs(calculatedEndAngle - calculatedStartAngle);

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

    // Drawing the separating lines
    this.context.beginPath();
    this.context.moveTo(this.center.x, this.center.y);
    this.context.lineTo(outerStartCoords.x, outerStartCoords.y);
    this.context.lineWidth = 3; // Set line width
    this.context.strokeStyle = "#FFFFFF"; // Set line color
    this.context.stroke();

    this.context.beginPath();
    this.context.moveTo(this.center.x, this.center.y);
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
        const coord = this.moveToAngle(startRadius + width / 10, angle);
        this.context.save();
        this.context.font = `bold ${fontSize}px Arial`;
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.translate(coord.x, coord.y);
        this.context.rotate(angle);
        this.context.fillText(text, -5, 0, width - width * 0.5);
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

    // Draw title and year (no rotation applied)
    this.context.fillStyle = this.textColor;
    this.context.font = `bold ${this.size / 20}px Arial`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText(this.title, this.size / 2, this.size / 9, this.size);

    this.context.font = `bold ${this.size / 30}px Arial`;
    this.context.fillText(
      this.year,
      this.center.x,
      this.center.y + this.size / 500,
      this.size
    );

    this.context.restore();
  }

  // Function to draw rotating elements
  drawRotatingElements() {
    this.context.save();
    this.context.translate(this.center.x, this.center.y);
    this.context.rotate(this.rotationAngle);
    this.context.translate(-this.center.x, -this.center.y);

    // Draw month names (outer ring)
    const monthNameWidth = this.size / 25;
    const monthNameStartRadius =
      this.maxRadius - monthNameWidth - this.size / 400;
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

    // Draw week ring using addCircleSection
    const weekData = this.generateWeeks();
    const weekRingWidth = this.size / 30;
    const weekStartRadius =
      monthNameStartRadius - weekRingWidth - this.size / 170;

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

    // Draw monthly events (inner sections)
    const eventSpacing = this.size / 300;
    const numberOfEvents = this.options.ringsData.length;
    const eventWidth =
      weekStartRadius -
      this.minRadius -
      this.size / 140 -
      eventSpacing * (numberOfEvents - 1);
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
      eventRadius += newEventWidth + eventSpacing;
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
