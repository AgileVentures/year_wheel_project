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

function moveToAngle(center, radius, angle) {
  const x = center.x + radius * Math.cos(angle);
  const y = center.y + radius * Math.sin(angle);
  return { x: x, y: y };
}

function setCircleSectionHTML(
  context,
  center,
  startRadius,
  width,
  startAngle,
  endAngle,
  color,
  textFunction,
  text,
  fontSize
) {
  const endRadius = startRadius + width;
  const calculatedStartAngle = toRadians(startAngle);
  const calculatedEndAngle = toRadians(endAngle);

  const innerStartCoords = moveToAngle(
    center,
    startRadius,
    calculatedStartAngle
  );
  const outerStartCoords = moveToAngle(center, endRadius, calculatedStartAngle);
  const innerEndCoords = moveToAngle(center, startRadius, calculatedEndAngle);
  const outerEndCoords = moveToAngle(center, endRadius, calculatedEndAngle);
  const angleLength = Math.abs(calculatedEndAngle - calculatedStartAngle);

  context.beginPath();
  context.fillStyle = color;
  context.moveTo(outerStartCoords.x, outerStartCoords.y);
  context.lineTo(innerStartCoords.x, innerStartCoords.y);

  context.arc(
    center.x,
    center.y,
    startRadius,
    calculatedStartAngle,
    calculatedEndAngle,
    false
  );

  context.lineTo(outerEndCoords.x, outerEndCoords.y);
  context.arc(
    center.x,
    center.y,
    startRadius + width,
    calculatedEndAngle,
    calculatedStartAngle,
    true
  );
  context.fill();
  context.closePath();

  context.moveTo(center.x, center.y);

  if (text !== undefined) {
    context.font = `bold ${fontSize}px Arial`;
    textFunction(
      text,
      context,
      center,
      startRadius,
      width,
      calculatedStartAngle,
      calculatedEndAngle,
      angleLength
    );
  }
}
function setCircleSectionSmallTitle(
  text,
  context,
  center,
  startRadius,
  width,
  startAngle,
  endAngle,
  angleLength,
  rotationAngleDivider = 1
) {
  const angle = (startAngle + endAngle) / 2;
  const middleRadius = startRadius + width / 2.2;
  let radius;

  const circleSectionLength =
    startRadius * 2 * Math.PI * (angleLength / (Math.PI * 2));
  const textWidth = context.measureText(text).width;

  if (textWidth < circleSectionLength) {
    radius = middleRadius;
    context.fillStyle = "#ffffff";
    rotationAngleDivider = 2.06;
  } else {
    radius = middleRadius + width;
    context.fillStyle = textColor;
  }
  const coord = moveToAngle(center, radius, angle);

  context.save();
  context.textAlign = "right";
  context.textBaseline = "left";
  context.translate(coord.x, coord.y);
  context.rotate(angle + Math.PI / rotationAngleDivider);
  context.fillText(text.toUpperCase(), 0, 0);
  context.restore();
}

function setCircleSectionTitle(
  text,
  context,
  center,
  startRadius,
  width,
  startAngle,
  endAngle,
  angleLength,
  rotationAngleDivider = 2
) {
  const angle = (startAngle + endAngle) / 2;
  const middleRadius = startRadius + width / 2.2;
  let radius;

  const circleSectionLength =
    startRadius * 2 * Math.PI * (angleLength / (Math.PI * 2));
  const textWidth = context.measureText(text).width;

  if (textWidth < circleSectionLength) {
    radius = middleRadius;
    context.fillStyle = "#ffffff";
  } else {
    radius = middleRadius + width;
    context.fillStyle = textColor;
  }
  const coord = moveToAngle(center, radius, angle);

  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.translate(coord.x, coord.y);
  context.rotate(angle + Math.PI / rotationAngleDivider);
  context.fillText(text.toUpperCase(), 0, 0);
  context.restore();
}

function setCircleSectionTexts(
  texts,
  context,
  center,
  startRadius,
  width,
  startAngle,
  endAngle,
  angleLength
) {
  const radius = startRadius + width / 2;
  const averageAngle = (startAngle + endAngle) / 2;
  context.fillStyle = "#ffffff";
  const angleDifference = angleLength / (texts.length + 1);
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

  context.fillStyle = textColor;
  context.font = `bold ${size / 20}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(title, size / 2, size / 9, size);

  context.font = `bold ${size / 30}px Arial`;
  context.fillText(year, center.x, center.y + size / 500, size);

  function addMonthlyCircleSection(
    startRadius,
    width,
    spacingAngle,
    color,
    textFunction,
    texts,
    fontSize
  ) {
    const numberOfIntervals = 12;
    addRegularCircleSections(
      numberOfIntervals,
      spacingAngle,
      startRadius,
      width,
      color,
      textFunction,
      texts,
      fontSize
    );
  }

  function addRegularCircleSections(
    numberOfIntervals,
    spacingAngle,
    startRadius,
    width,
    color,
    textFunction,
    texts,
    fontSize,
    rotationAngleDivider
  ) {
    const intervalAngle = 360 / numberOfIntervals;
    for (let i = 0; i < numberOfIntervals; i++) {
      const text = texts[i];
      addCircleSection(
        spacingAngle,
        startRadius,
        width,
        i * intervalAngle,
        i * intervalAngle + intervalAngle,
        color ? color : colors[i % colors.length],
        textFunction,
        text,
        fontSize,
        rotationAngleDivider
      );
    }
  }

  const initAngle = -15 - 90;
  function addCircleSection(
    spacingAngle,
    startRadius,
    width,
    startAngle,
    endAngle,
    color,
    textFunction,
    text,
    fontSize,
    rotationAngleDivider
  ) {
    const newStartAngle = initAngle + startAngle + spacingAngle;
    const newEndAngle = initAngle + endAngle - spacingAngle;
    setCircleSectionHTML(
      context,
      center,
      startRadius,
      width,
      newStartAngle,
      newEndAngle,
      color,
      textFunction,
      text,
      fontSize,
      rotationAngleDivider
    );
  }

  const minRadius = size / 15;
  const maxRadius = size / 2 - size / 30;

  const minDate = new Date(year, 0, 1);
  const maxDate = new Date(year, 11, 31);

  // calendar events

  const sortedCalenderEvents = events.sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  const calendarEventWidth = size / 40;
  const calendarEventStartRadius = maxRadius - calendarEventWidth;
  for (let i = 0; i < sortedCalenderEvents.length; i++) {
    const calendarEvent = sortedCalenderEvents[i];

    // Convert string dates to Date objects
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
        0,
        calendarEventStartRadius,
        calendarEventWidth,
        startAngle,
        endAngle,
        colors[i % colors.length],
        setCircleSectionSmallTitle,
        calendarEvent.name,
        size / 90,
        1.5
      );
    }
  }

  // months name
  const monthColor = colors[0];
  const monthNameWidth = size / 25;
  const monthNameStartRadius =
    calendarEventStartRadius - monthNameWidth - size / 200;
  const monthNames = [
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
  addMonthlyCircleSection(
    monthNameStartRadius,
    monthNameWidth,
    0.5,
    monthColor,
    setCircleSectionTitle,
    monthNames,
    size / 60
  );

  // monthly events
  const eventSpacing = size / 300;
  const numberOfEvents = ringsData.length;
  const eventWidth =
    monthNameStartRadius -
    minRadius -
    size / 30 -
    eventSpacing * (numberOfEvents - 1);
  let percentage;
  let remainingEventWidth = eventWidth;
  let eventRadius = minRadius;
  for (let i = 0; i < numberOfEvents; i++) {
    percentage = (1 / (numberOfEvents - i)) * 1.1;
    const newEventWidth =
      i !== numberOfEvents - 1
        ? remainingEventWidth * percentage
        : remainingEventWidth;
    remainingEventWidth -= newEventWidth;
    addMonthlyCircleSection(
      eventRadius,
      newEventWidth,
      0.4,
      null,
      setCircleSectionTexts,
      ringsData[i],
      size / 150
    );
    eventRadius += newEventWidth + eventSpacing;
  }

  let $copiedCanvas = copyYearWheel($canvas, context, width, height);
  let $pngCanvas = copyYearWheel($canvas, context, width, height);
}

export default createYearWheel;
