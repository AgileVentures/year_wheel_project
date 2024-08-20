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
      "Januari", "Februari", "Mars", "April", "Maj", "Juni",
      "Juli", "Augusti", "September", "Oktober", "November", "December"
    ];
  }

  toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  moveToAngle(center, radius, angle) {
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    return { x, y };
  }

  drawTextOnCircle(text, radius, angle, fontSize, color, textAlign = "center", rotationDivider = 2) {
    const coord = this.moveToAngle(this.center, radius, angle);
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
  }) {
    const endRadius = startRadius + width;
    const calculatedStartAngle = this.toRadians(startAngle);
    const calculatedEndAngle = this.toRadians(endAngle);

    const innerStartCoords = this.moveToAngle(this.center, startRadius, calculatedStartAngle);
    const outerStartCoords = this.moveToAngle(this.center, endRadius, calculatedStartAngle);
    const innerEndCoords = this.moveToAngle(this.center, startRadius, calculatedEndAngle);
    const outerEndCoords = this.moveToAngle(this.center, endRadius, calculatedEndAngle);
    const angleLength = Math.abs(calculatedEndAngle - calculatedStartAngle);

    this.context.beginPath();
    this.context.fillStyle = color;
    this.context.moveTo(outerStartCoords.x, outerStartCoords.y);
    this.context.lineTo(innerStartCoords.x, innerStartCoords.y);
    this.context.arc(this.center.x, this.center.y, startRadius, calculatedStartAngle, calculatedEndAngle, false);
    this.context.lineTo(outerEndCoords.x, outerEndCoords.y);
    this.context.arc(this.center.x, this.center.y, startRadius + width, calculatedEndAngle, calculatedStartAngle, true);
    this.context.fill();
    this.context.closePath();

    if (text !== undefined) {
      textFunction(this.context, text, this.center, startRadius, width, calculatedStartAngle, calculatedEndAngle, angleLength, fontSize);
    }
  }

  setCircleSectionSmallTitle(context, text, center, startRadius, width, startAngle, endAngle, angleLength, fontSize) {
    const angle = (startAngle + endAngle) / 2;
    const middleRadius = startRadius + width / 2.2;
    const circleSectionLength = startRadius * 2 * Math.PI * (angleLength / (Math.PI * 2));
    const textWidth = context.measureText(text).width;

    const radius = textWidth < circleSectionLength ? middleRadius : middleRadius + width;
    const rotationDivider = textWidth < circleSectionLength ? 2.06 : 1;
    const color = textWidth < circleSectionLength ? "#ffffff" : this.textColor;

    this.drawTextOnCircle(text, radius, angle, fontSize, color, "right", rotationDivider);
  }

  setCircleSectionTitle(context, text, center, startRadius, width, startAngle, endAngle, angleLength, fontSize) {
    const angle = (startAngle + endAngle) / 2;
    const middleRadius = startRadius + width / 2.2;
    const circleSectionLength = startRadius * 2 * Math.PI * (angleLength / (Math.PI * 2));
    const textWidth = context.measureText(text).width;

    const radius = textWidth < circleSectionLength ? middleRadius : middleRadius + width;
    const color = textWidth < circleSectionLength ? "#ffffff" : this.textColor;

    this.drawTextOnCircle(text, radius, angle, fontSize, color, "center");
  }

  setCircleSectionTexts(context, texts, center, startRadius, width, startAngle, endAngle, angleLength) {
    const radius = startRadius + width / 2;
    const angleDifference = angleLength / (texts.length + 1);

    context.fillStyle = "#ffffff";
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const angle = startAngle + angleDifference + i * angleDifference;
      const coord = this.moveToAngle(center, startRadius + width / 10, angle);

      context.save();
      context.font = `bold ${10}px Arial`;
      context.textAlign = "start";
      context.textBaseline = "middle";
      context.translate(coord.x, coord.y);
      context.rotate(angle);
      context.fillText(text, -5, 0, width - width * 0.5);
      context.restore();
    }
  }

  addCircleSection(spacingAngle, startRadius, width, startAngle, endAngle, color, textFunction, text, fontSize) {
    const newStartAngle = this.initAngle + startAngle + spacingAngle;
    const newEndAngle = this.initAngle + endAngle - spacingAngle;

    this.setCircleSectionHTML({
      center: this.center,
      startRadius,
      width,
      startAngle: newStartAngle,
      endAngle: newEndAngle,
      color,
      textFunction,
      text,
      fontSize,
    });
  }

  addRegularCircleSections(numberOfIntervals, spacingAngle, startRadius, width, color, textFunction, texts, fontSize, colors) {
    const intervalAngle = 360 / numberOfIntervals;
    for (let i = 0; i < numberOfIntervals; i++) {
      const text = texts[i];
      this.addCircleSection(
        spacingAngle,
        startRadius,
        width,
        i * intervalAngle,
        i * intervalAngle + intervalAngle,
        color ? color : colors[i % colors.length],
        textFunction,
        text,
        fontSize
      );
    }
  }

  addMonthlyCircleSection(startRadius, width, spacingAngle, color, textFunction, texts, fontSize, colors) {
    const numberOfIntervals = 12;
    this.addRegularCircleSections(numberOfIntervals, spacingAngle, startRadius, width, color, textFunction, texts, fontSize, colors);
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
    this.context.fillText(this.year, this.center.x, this.center.y + this.size / 500, this.size);

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
        this.addCircleSection(
          0,
          calendarEventStartRadius,
          calendarEventWidth,
          startAngle,
          endAngle,
          this.colors[i % this.colors.length],
          this.setCircleSectionSmallTitle.bind(this),
          calendarEvent.name,
          this.size / 90
        );
      }
    }

    // Draw month names
    const monthColor = this.colors[0];
    const monthNameWidth = this.size / 25;
    const monthNameStartRadius = calendarEventStartRadius - monthNameWidth - this.size / 200;
    this.addMonthlyCircleSection(
      monthNameStartRadius,
      monthNameWidth,
      0.5,
      monthColor,
      this.setCircleSectionTitle.bind(this),
      this.monthNames,
      this.size / 60,
      this.colors
    );

    // Draw monthly events
    const eventSpacing = this.size / 300;
    const numberOfEvents = this.options.ringsData.length;
    const eventWidth = monthNameStartRadius - this.minRadius - this.size / 30 - eventSpacing * (numberOfEvents - 1);
    let remainingEventWidth = eventWidth;
    let eventRadius = this.minRadius;

    for (let i = 0; i < numberOfEvents; i++) {
      const percentage = (1 / (numberOfEvents - i)) * 1.1;
      const newEventWidth = i !== numberOfEvents - 1
        ? remainingEventWidth * percentage
        : remainingEventWidth;
      remainingEventWidth -= newEventWidth;

      this.addMonthlyCircleSection(
        eventRadius,
        newEventWidth,
        0.4,
        null,
        this.setCircleSectionTexts.bind(this),
        this.options.ringsData[i],
        this.size / 150,
        this.colors
      );
      eventRadius += newEventWidth + eventSpacing;
    }
  }

  downloadAsPNG() {
    const pngCanvas = this.copyCanvas();
    const link = document.createElement("a");
    link.download = "year-wheel.png";
    link.href = pngCanvas.toDataURL("image/png");
    link.click();
  }

  copyCanvas() {
    const $copiedCanvas = this.canvas.cloneNode();
    $copiedCanvas.width = this.canvas.width;
    $copiedCanvas.height = this.canvas.height;
    const copiedContext = $copiedCanvas.getContext("2d");
    copiedContext.drawImage(this.canvas, 0, 0);
    copiedContext.webkitImageSmoothingEnabled = false;
    copiedContext.mozImageSmoothingEnabled = false;
    copiedContext.imageSmoothingEnabled = false;
    return $copiedCanvas;
  }
}

export default YearWheel;
