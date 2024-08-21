import C2S from "canvas2svg";

class YearWheel {
  constructor(canvas, year, title, colors, size, events, options) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.year = year;
    this.title = title;
    this.colors = colors;
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
    const endRadius = startRadius + width;
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
    isVertical
  ) {
    const radius = startRadius + width / 2;
    const angleDifference = angleLength / (texts.length + 1);

    this.context.fillStyle = "#ffffff";
    const fontSize = 10; // Fixed font size

    if (isVertical) {
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const angle = startAngle + angleDifference + i * angleDifference;
        const coord = this.moveToAngle(startRadius + width / 10, angle);

        this.context.save();
        this.context.font = `bold ${fontSize}px Arial`;
        this.context.textAlign = "start";
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
      this.context.font = `bold ${fontSize}px Arial`; // Re-apply the font size after transformation

      let lineHeight = 14; // Adjust based on font size
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
    color,
    textFunction,
    text,
    fontSize,
    isVertical,
  }) {
    const newStartAngle = this.initAngle + startAngle + spacingAngle;
    const newEndAngle = this.initAngle + endAngle - spacingAngle;

    this.setCircleSectionHTML({
      startRadius,
      width,
      startAngle: newStartAngle,
      endAngle: newEndAngle,
      color,
      textFunction,
      text,
      fontSize,
      isVertical, // Pass the correct orientation
    });
  }

  addRegularCircleSections({
    numberOfIntervals,
    spacingAngle,
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
        spacingAngle,
        startRadius,
        width,
        startAngle: i * intervalAngle,
        endAngle: i * intervalAngle + intervalAngle,
        color: sectionColor,
        textFunction,
        text,
        fontSize,
        isVertical, // Pass the correct orientation
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
      colors,
      isVertical, // Pass the correct orientation
    });
  }

  create() {
    this.canvas.width = this.size;
    this.canvas.height = this.size / 4 + this.size;
    this.canvas.style.height = `100%`;

    // Draw title and year
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

    const minDate = new Date(this.year, 0, 1);
    const maxDate = new Date(this.year, 11, 31);

    // Draw calendar events
    const sortedCalenderEvents = this.events.sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );

    const calendarEventWidth = this.size / 40;
    const calendarEventStartRadius = this.maxRadius - calendarEventWidth;

    for (let i = 0; i < sortedCalenderEvents.length; i++) {
      const calendarEvent = sortedCalenderEvents[i];
      const eventStartDate = new Date(calendarEvent.startDate);
      const eventEndDate = new Date(calendarEvent.endDate);

      let startAngle = Math.round(
        ((eventStartDate - minDate) / (maxDate - minDate)) * 360
      );
      let endAngle = Math.round(
        ((eventEndDate - minDate) / (maxDate - minDate)) * 360
      );

      if (Math.abs(startAngle - endAngle) < 3) {
        const averageAngle = (startAngle + endAngle) / 2;
        startAngle = averageAngle - 1.5;
        endAngle = averageAngle + 1.5;
      }

      if (this.options.showYearEvents) {
        this.addCircleSection({
          spacingAngle: 0,
          startRadius: calendarEventStartRadius,
          width: calendarEventWidth,
          startAngle,
          endAngle,
          color: this.colors[i % this.colors.length],
          textFunction: this.setCircleSectionSmallTitle.bind(this),
          text: calendarEvent.name,
          fontSize: this.size / 90,
          isVertical: true, // Default for year events
        });
      }
    }

    // Draw month names
    const monthColor = this.colors[0];
    const monthNameWidth = this.size / 25;
    const monthNameStartRadius =
      calendarEventStartRadius - monthNameWidth - this.size / 200;
    this.addMonthlyCircleSection({
      startRadius: monthNameStartRadius,
      width: monthNameWidth,
      spacingAngle: 0.5,
      color: monthColor,
      textFunction: this.setCircleSectionTitle.bind(this),
      texts: this.monthNames,
      fontSize: this.size / 60,
      colors: this.colors,
      isVertical: true, // Month names are always vertical
    });

    // Draw monthly events
    const eventSpacing = this.size / 300;
    const numberOfEvents = this.options.ringsData.length;
    const eventWidth =
      monthNameStartRadius -
      this.minRadius -
      this.size / 30 -
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
        colors: this.colors,
        isVertical: ring.orientation === "vertical", // Use the orientation from the ring data
      });
      eventRadius += newEventWidth + eventSpacing;
    }
  }

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
    const dateStr = today.toISOString().split('T')[0]; 
    const titlePart = this.title ? `${this.title.replace(/\s+/g, '_')}_` : '';
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
      const fileName = this.generateFileName('png');
      this.downloadFile(blob, fileName, "image/png");
    });
  }

  downloadAsJPEG() {
    const jpegCanvas = this.copyCanvas(true); // Always use white background for JPEG
    jpegCanvas.toBlob(
      (blob) => {
        const fileName = this.generateFileName('jpg');
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
    const fileName = this.generateFileName('svg');
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
