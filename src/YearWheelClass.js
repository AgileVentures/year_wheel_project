/* eslint-disable no-debugger */
class YearWheelClass {
  constructor(canvas, ringsData, title, year, colors, size, events, options) {
    this.canvas = canvas;
    this.year = year;
    this.title = title;
    this.colors = colors;
    this.size = size;
    this.events = events;
    this.rings = ringsData;
    this.options = options;
    this.context = canvas.getContext("2d");
    this.textColor = "#333333";
    this.center = { x: size / 2, y: size / 5 + size / 2 };
    this.initAngle = -15 - 90;
  }

  create() {
    this.setupCanvas();
    this.drawTitle();
    this.drawYear();
    this.drawEvents();
  }

  toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  moveToAngle(radius, angle) {
    const x = this.center.x + radius * Math.cos(angle);
    const y = this.center.y + radius * Math.sin(angle);
    return { x, y };
  }

  setupCanvas() {
    this.canvas.width = this.size;
    this.canvas.height = this.size / 4 + this.size;
    this.canvas.style.height = `100%`;
  }

  drawTitle() {
    this.context.fillStyle = this.textColor;
    this.context.font = `bold ${this.size / 20}px Arial`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText(this.title, this.size / 2, this.size / 9, this.size);
  }

  drawYear() {
    this.context.font = `bold ${this.size / 30}px Arial`;
    this.context.fillText(
      this.year,
      this.center.x,
      this.center.y + this.size / 500,
      this.size
    );
  }

  drawEvents() {
    const minDate = new Date(this.year, 0, 1);
    const maxDate = new Date(this.year, 11, 31);
    const calendarEventWidth = this.size / 40;
    const calendarEventStartRadius =
      this.size / 2 - this.size / 30 - calendarEventWidth;

    this.events
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .forEach((event, i) => {
        const startAngle = Math.round(
          ((new Date(event.startDate) - minDate) / (maxDate - minDate)) * 360
        );
        const endAngle = Math.round(
          ((new Date(event.endDate) - minDate) / (maxDate - minDate)) * 360
        );
        this.addCircleSection({
          spacingAngle: 0,
          startRadius: calendarEventStartRadius,
          width: calendarEventWidth,
          startAngle,
          endAngle,
          color: this.colors[i % this.colors.length],
          textFunction: "setCircleSectionTitle", // Assuming this is correctly implemented to handle text
          text: event.name,
          fontSize: this.size / 90,
        });
      });
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
  }) {
    debugger
    // Convert angles from degrees to radians for drawing
    const calculatedStartAngle = this.toRadians(startAngle);
    const calculatedEndAngle = this.toRadians(endAngle);

    // Calculate coordinates for the start and end points of the inner and outer arcs
    const innerStartCoords = this.moveToAngle(
      startRadius,
      calculatedStartAngle
    );
    const outerStartCoords = this.moveToAngle(
      startRadius + width,
      calculatedStartAngle
    );
    // const innerEndCoords = this.moveToAngle(startRadius, calculatedEndAngle);
    const outerEndCoords = this.moveToAngle(
      startRadius + width,
      calculatedEndAngle
    );

    // Begin path for the circle section
    this.context.beginPath();
    this.context.fillStyle = color;

    // Move to the start of the outer arc
    this.context.moveTo(outerStartCoords.x, outerStartCoords.y);

    // Line to the start of the inner arc
    this.context.lineTo(innerStartCoords.x, innerStartCoords.y);

    // Draw the inner arc
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius,
      calculatedStartAngle,
      calculatedEndAngle,
      false
    );

    // Line to the start of the outer arc
    this.context.lineTo(outerEndCoords.x, outerEndCoords.y);

    // Draw the outer arc (in reverse)
    this.context.arc(
      this.center.x,
      this.center.y,
      startRadius + width,
      calculatedEndAngle,
      calculatedStartAngle,
      true
    );

    // Fill the path
    this.context.fill();

    // Optionally add text
    if (text !== undefined && textFunction) {
      const angleLength = Math.abs(calculatedEndAngle - calculatedStartAngle);
      textFunction.bind(this)({
        text,
        startRadius,
        width,
        calculatedStartAngle,
        calculatedEndAngle,
        angleLength,
        fontSize,
      });
    }

    // Close the path
    this.context.closePath();
  }

  addMonthlyCircleSection({
    startRadius,
    width,
    spacingAngle,
    color,
    textFunction,
    texts,
    fontSize,
  }) {
    const numberOfIntervals = 12;
    this.addRegularCircleSections({
      numberOfIntervals,
      spacingAngle,
      startRadius,
      width,
      color,
      textFunction,
      texts,
      fontSize,
    });
  }

  addCircleSection({
    spacingAngle,
    startRadius,
    width,
    startAngle,
    endAngle,
    color,
    textFunction,
    text,
    fontSize,
  }) {
    // Adjust start and end angles based on the initial angle and spacing
    const newStartAngle = this.initAngle + startAngle + spacingAngle;
    const newEndAngle = this.initAngle + endAngle - spacingAngle;
debugger
    // Now calling setCircleSectionHTML as a class method
    this.setCircleSectionHTML({
      startRadius,
      width,
      startAngle: newStartAngle,
      endAngle: newEndAngle,
      color,
      textFunction: this[textFunction], // Assuming textFunction is a method name passed as a string
      text,
      fontSize,
    });
  }

  addRegularCircleSections({
    numberOfIntervals,
    spacingAngle,
    startRadius,
    width,
    color,
    textFunction,
    texts,
    fontSize,
  }) {
    const intervalAngle = 360 / numberOfIntervals;
    for (let i = 0; i < numberOfIntervals; i++) {
      const text = texts[i];
      this.addCircleSection({
        spacingAngle,
        startRadius,
        width,
        startAngle: i * intervalAngle,
        endAngle: i * intervalAngle + intervalAngle,
        color: color ? color : this.colors[i % this.colors.length],
        textFunction,
        text,
        fontSize,
      });
    }
  }

  setCircleSectionTitle({
    text,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
    textAlign = "center", // Default alignment
    textBaseline = "middle", // Default baseline
    rotationAngleDivider = 2, // Default divider for rotation
    textColor = "#ffffff", // Default text color, assuming textColor is a property of the class
    isSmallTitle = false, // Additional parameter to handle small title specific logic
  }) {
    const angle = (startAngle + endAngle) / 2;
    const middleRadius = startRadius + width / 2.2;
    let radius;

    const circleSectionLength =
      startRadius * 2 * Math.PI * (angleLength / (Math.PI * 2));
    const textWidth = this.context.measureText(text).width;

    if (textWidth < circleSectionLength) {
      radius = middleRadius;
      this.context.fillStyle = textColor;
      if (isSmallTitle) rotationAngleDivider = 2.06; // Adjust for small titles if needed
    } else {
      radius = middleRadius + width;
      this.context.fillStyle = this.textColor; // Use class's textColor for overflow
    }

    const coord = this.moveToAngle(radius, this.toRadians(angle));
debugger
    this.context.save();
    this.context.textAlign = textAlign; // Use specified textAlign
    this.context.textBaseline = textBaseline; // Use specified textBaseline
    this.context.translate(coord.x, coord.y);
    this.context.rotate(this.toRadians(angle) + Math.PI / rotationAngleDivider);
    this.context.fillText(text.toUpperCase(), 0, 0);
    this.context.restore();
  }

  setCircleSectionTexts({
    texts,
    startRadius,
    width,
    startAngle,
    endAngle,
    angleLength,
  }) {
    const radius = startRadius + width / 2;
    // Ensure angleLength is calculated within the method if not provided
    angleLength =
      angleLength ||
      Math.abs(this.toRadians(endAngle) - this.toRadians(startAngle));
    // const averageAngle = this.toRadians((startAngle + endAngle) / 2);
    const angleDifference = angleLength / (texts.length + 1);

    this.context.fillStyle = "#ffffff";
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      // Calculate the angle for each text based on its position in the sequence
      const angle = this.toRadians(startAngle) + angleDifference * (i + 1);

      // Use moveToAngle to calculate the position for each piece of text
      const coord = this.moveToAngle(radius, angle);

      this.context.save();
      this.context.font = `bold ${10}px Arial`; // Maintain the font size as in the original function
      this.context.textAlign = "start"; // Maintain text alignment as in the original function
      this.context.textBaseline = "middle"; // Keep the baseline as in the original function

      // Translate and rotate context for text drawing
      this.context.translate(coord.x, coord.y);
      this.context.rotate(angle); // Keep the rotation as in the original function

      // Draw the text with the original offset and width adjustments
      this.context.fillText(text, -5, 0, width - width * 0.5); // Keep the original text drawing logic

      this.context.restore();
    }
  }
}

export default YearWheelClass;

// Usage:
// const yearWheel = new YearWheel(
//   canvas,
//   year,
//   title,
//   colors,
//   size,
//   events,
//   options
// );
// yearWheel.create();
