/* eslint-disable no-unused-vars */
/* eslint-disable no-debugger */
const textColor = "#333333";

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function copyYearWheel($canvas, context, width, height) {
  const $copiedCanvas = $canvas.cloneNode();
  $copiedCanvas.width = width;
  $copiedCanvas.height = height;
  const imageData = context.getImageData(0, 0, width, height);
  const copiedContext = $copiedCanvas.getContext("2d");
  copiedContext.putImageData(imageData, 0, 0);
  copiedContext.webkitImageSmoothingEnabled = false;
  copiedContext.mozImageSmoothingEnabled = false;
  copiedContext.imageSmoothingEnabled = false;

  return $copiedCanvas;
}

export function downloadYearWheelAsPNG($canvas) {
  const link = document.createElement("a");
  link.download = "year-wheel.png";
  link.href = $canvas.toDataURL("image/png");
  link.click();
}

function moveToAngle(center, radius, angle) {
  const x = center.x + radius * Math.cos(angle);
  const y = center.y + radius * Math.sin(angle);
  return { x, y };
}

function drawTextOnCircle(
  context,
  text,
  center,
  radius,
  angle,
  fontSize,
  color,
  textAlign = "center",
  rotationDivider = 2
) {
  const coord = moveToAngle(center, radius, angle);
  context.save();
  context.font = `bold ${fontSize}px Arial`;
  context.fillStyle = color;
  context.textAlign = textAlign;
  context.textBaseline = "middle";
  context.translate(coord.x, coord.y);
  context.rotate(angle + Math.PI / rotationDivider);
  context.fillText(text.toUpperCase(), 0, 0);
  context.restore();
}

function setCircleSectionHTML(
  context,
  { center, startRadius, width, startAngle, endAngle, color, textFunction, text, fontSize }
) {
  const endRadius = startRadius + width;
  const calculatedStartAngle = toRadians(startAngle);
  const calculatedEndAngle = toRadians(endAngle);

  const innerStartCoords = moveToAngle(center, startRadius, calculatedStartAngle);
  const outerStartCoords = moveToAngle(center, endRadius, calculatedStartAngle);
  const innerEndCoords = moveToAngle(center, startRadius, calculatedEndAngle);
  const outerEndCoords = moveToAngle(center, endRadius, calculatedEndAngle);
  const angleLength = Math.abs(calculatedEndAngle - calculatedStartAngle);

  context.beginPath();
  context.fillStyle = color;
  context.moveTo(outerStartCoords.x, outerStartCoords.y);
  context.lineTo(innerStartCoords.x, innerStartCoords.y);
  context.arc(center.x, center.y, startRadius, calculatedStartAngle, calculatedEndAngle, false);
  context.lineTo(outerEndCoords.x, outerEndCoords.y);
  context.arc(center.x, center.y, startRadius + width, calculatedEndAngle, calculatedStartAngle, true);
  context.fill();
  context.closePath();

  if (text !== undefined) {
    textFunction(
      context,
      text,
      center,
      startRadius,
      width,
      calculatedStartAngle,
      calculatedEndAngle,
      angleLength,
      fontSize
    );
  }
}

function setCircleSectionSmallTitle(
  context,
  text,
  center,
  startRadius,
  width,
  startAngle,
  endAngle,
  angleLength,
  fontSize
) {
  const angle = (startAngle + endAngle) / 2;
  const middleRadius = startRadius + width / 2.2;
  const circleSectionLength = startRadius * 2 * Math.PI * (angleLength / (Math.PI * 2));
  const textWidth = context.measureText(text).width;

  const radius = textWidth < circleSectionLength ? middleRadius : middleRadius + width;
  const rotationDivider = textWidth < circleSectionLength ? 2.06 : 1;
  const color = textWidth < circleSectionLength ? "#ffffff" : textColor;

  drawTextOnCircle(context, text, center, radius, angle, fontSize, color, "right", rotationDivider);
}

function setCircleSectionTitle(
  context,
  text,
  center,
  startRadius,
  width,
  startAngle,
  endAngle,
  angleLength,
  fontSize
) {
  const angle = (startAngle + endAngle) / 2;
  const middleRadius = startRadius + width / 2.2;
  const circleSectionLength = startRadius * 2 * Math.PI * (angleLength / (Math.PI * 2));
  const textWidth = context.measureText(text).width;

  const radius = textWidth < circleSectionLength ? middleRadius : middleRadius + width;
  const color = textWidth < circleSectionLength ? "#ffffff" : textColor;

  drawTextOnCircle(context, text, center, radius, angle, fontSize, color, "center");
}

function setCircleSectionTexts(
  context,
  texts,
  center,
  startRadius,
  width,
  startAngle,
  endAngle,
  angleLength
) {
  const radius = startRadius + width / 2;
  const angleDifference = angleLength / (texts.length + 1);

  context.fillStyle = "#ffffff";
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const angle = startAngle + angleDifference + i * angleDifference;
    const coord = moveToAngle(center, startRadius + width / 10, angle);

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

function addCircleSection(
  context,
  center,
  spacingAngle,
  startRadius,
  width,
  startAngle,
  endAngle,
  color,
  textFunction,
  text,
  fontSize,
  initAngle
) {
  const newStartAngle = initAngle + startAngle + spacingAngle;
  const newEndAngle = initAngle + endAngle - spacingAngle;
  
  setCircleSectionHTML(context, {
    center,
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

function addRegularCircleSections(
  context,
  center,
  numberOfIntervals,
  spacingAngle,
  startRadius,
  width,
  color,
  textFunction,
  texts,
  fontSize,
  colors,
  initAngle
) {
  const intervalAngle = 360 / numberOfIntervals;
  for (let i = 0; i < numberOfIntervals; i++) {
    const text = texts[i];
    addCircleSection(
      context,
      center,
      spacingAngle,
      startRadius,
      width,
      i * intervalAngle,
      i * intervalAngle + intervalAngle,
      color ? color : colors[i % colors.length],
      textFunction,
      text,
      fontSize,
      initAngle
    );
  }
}

function addMonthlyCircleSection(
  context,
  center,
  startRadius,
  width,
  spacingAngle,
  color,
  textFunction,
  texts,
  fontSize,
  colors,
  initAngle
) {
  const numberOfIntervals = 12;
  addRegularCircleSections(
    context,
    center,
    numberOfIntervals,
    spacingAngle,
    startRadius,
    width,
    color,
    textFunction,
    texts,
    fontSize,
    colors,
    initAngle
  );
}

function createYearWheel(
  $canvas,
  ringsData,
  title,
  year,
  colors,
  size,
  events,
  options
) {
  const context = $canvas.getContext("2d");
  const width = size;
  const height = size / 4 + size;
  $canvas.width = width;
  $canvas.height = height;
  $canvas.style.height = `100%`;
  const center = { x: size / 2, y: size / 5 + size / 2 };

  // Draw title and year
  context.fillStyle = textColor;
  context.font = `bold ${size / 20}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(title, size / 2, size / 9, size);

  context.font = `bold ${size / 30}px Arial`;
  context.fillText(year, center.x, center.y + size / 500, size);

  const initAngle = -15 - 90;
  const minRadius = size / 15;
  const maxRadius = size / 2 - size / 30;
  const minDate = new Date(year, 0, 1);
  const maxDate = new Date(year, 11, 31);

  // Draw calendar events
  const sortedCalenderEvents = events.sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  const calendarEventWidth = size / 40;
  const calendarEventStartRadius = maxRadius - calendarEventWidth;

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

    if (options.showYearEvents) {
      addCircleSection(
        context,
        center,
        0,
        calendarEventStartRadius,
        calendarEventWidth,
        startAngle,
        endAngle,
        colors[i % colors.length],
        setCircleSectionSmallTitle,
        calendarEvent.name,
        size / 90,
        initAngle
      );
    }
  }

  // Draw month names
  const monthColor = colors[0];
  const monthNameWidth = size / 25;
  const monthNameStartRadius = calendarEventStartRadius - monthNameWidth - size / 200;
  const monthNames = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December"
  ];
  addMonthlyCircleSection(
    context,
    center,
    monthNameStartRadius,
    monthNameWidth,
    0.5,
    monthColor,
    setCircleSectionTitle,
    monthNames,
    size / 60,
    colors,
    initAngle
  );

  // Draw monthly events
  const eventSpacing = size / 300;
  const numberOfEvents = ringsData.length;
  const eventWidth = monthNameStartRadius - minRadius - size / 30 - eventSpacing * (numberOfEvents - 1);
  let remainingEventWidth = eventWidth;
  let eventRadius = minRadius;

  for (let i = 0; i < numberOfEvents; i++) {
    const percentage = (1 / (numberOfEvents - i)) * 1.1;
    const newEventWidth = i !== numberOfEvents - 1
      ? remainingEventWidth * percentage
      : remainingEventWidth;
    remainingEventWidth -= newEventWidth;

    addMonthlyCircleSection(
      context,
      center,
      eventRadius,
      newEventWidth,
      0.4,
      null,
      setCircleSectionTexts,
      ringsData[i],
      size / 150,
      colors,
      initAngle
    );
    eventRadius += newEventWidth + eventSpacing;
  }

  // Create and return the PNG canvas
  const $pngCanvas = copyYearWheel($canvas, context, width, height);
}

export default createYearWheel;
