import C2S from "canvas2svg";

class YearWheel {
  constructor(canvas, year, title, colors, size, events, options) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.year = parseInt(year, 10);
    this.title = title;
    this.outerRingColor = colors[0];
    this.sectionColors = colors.slice(1);
    this.size = size;
    this.events = events;
    this.options = options;
    this.center = { x: size / 2, y: size / 4 + size / 2 };
    this.initAngle = -Math.PI / 2;  // Adjusted for correct initial rotation
    this.minRadius = size / 15;
    this.maxRadius = size / 2 - size / 20;
    this.monthNames = [
      "JANUARI", "FEBRUARI", "MARS", "APRIL", "MAJ", "JUNI",
      "JULI", "AUGUSTI", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DECEMBER",
    ];
    this.rotationAngle = 0;
    this.isAnimating = false;
    this.lineHeight = size / 90; // Adjusted for text legibility

    this.initializeEvents();
  }

  initializeEvents() {
    this.canvas.addEventListener("mousedown", this.startDrag.bind(this));
    this.canvas.addEventListener("mousemove", this.drag.bind(this));
    this.canvas.addEventListener("mouseup", this.stopDrag.bind(this));
    this.canvas.addEventListener("mouseleave", this.stopDrag.bind(this));
  }

  generateWeeks() {
    const weeks = [];
    let currentDate = new Date(this.year, 0, 1);

    while (currentDate.getDay() !== 1) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let weekNumber = 1;
    while (currentDate.getFullYear() === this.year) {
      weeks.push(`W${weekNumber}`);
      currentDate.setDate(currentDate.getDate() + 7);
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

  drawTextOnCircle(text, radius, angle, fontSize, rotationDivider = 2) {
    const coord = this.moveToAngle(radius, angle);
    this.context.save();
    this.context.font = `bold ${fontSize}px Arial`;
    this.context.fillStyle = "#ffffff";
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.translate(coord.x, coord.y);
    this.context.rotate(angle + Math.PI / rotationDivider);
    this.context.fillText(text, 0, 0);
    this.context.restore();
  }

  drawSection({ startRadius, width, startAngle, endAngle, color, text, fontSize }) {
    const endRadius = startRadius + width;
    const calculatedStartAngle = this.toRadians(startAngle);
    const calculatedEndAngle = this.toRadians(endAngle);
    const outerStartCoords = this.moveToAngle(endRadius, calculatedStartAngle);
    const outerEndCoords = this.moveToAngle(endRadius, calculatedEndAngle);

    this.context.beginPath();
    this.context.fillStyle = color;
    this.context.arc(this.center.x, this.center.y, startRadius, calculatedStartAngle, calculatedEndAngle);
    this.context.lineTo(outerEndCoords.x, outerEndCoords.y);
    this.context.arc(this.center.x, this.center.y, endRadius, calculatedEndAngle, calculatedStartAngle, true);
    this.context.closePath();
    this.context.fill();

    this.context.beginPath();
    this.context.moveTo(this.center.x, this.center.y);
    this.context.lineTo(outerStartCoords.x, outerStartCoords.y);
    this.context.lineWidth = 2;  // Adjusted line width for better visibility
    this.context.strokeStyle = "#FFFFFF";
    this.context.stroke();

    this.context.beginPath();
    this.context.moveTo(this.center.x, this.center.y);
    this.context.lineTo(outerEndCoords.x, outerEndCoords.y);
    this.context.stroke();

    if (text) {
      this.drawTextOnCircle(text, startRadius + width / 2, (startAngle + endAngle) / 2, fontSize);
    }
  }

  drawCircularSections({ startRadius, width, texts, fontSize, spacingAngle = 0, numberOfSections, color }) {
    const anglePerSection = 360 / numberOfSections;
    for (let i = 0; i < numberOfSections; i++) {
      const text = texts[i] || "";
      const startAngle = i * anglePerSection + spacingAngle / 2;
      const endAngle = (i + 1) * anglePerSection - spacingAngle / 2;
      this.drawSection({
        startRadius, width, startAngle, endAngle, color, text, fontSize,
      });
    }
  }

  drawRotatingElements() {
    this.context.save();
    this.context.translate(this.center.x, this.center.y);
    this.context.rotate(this.rotationAngle);
    this.context.translate(-this.center.x, -this.center.y);

    // Month name sections
    const monthNameWidth = this.size / 25;
    const monthNameStartRadius = this.maxRadius - monthNameWidth - this.size / 30;
    this.drawCircularSections({
      startRadius: monthNameStartRadius,
      width: monthNameWidth,
      texts: this.monthNames,
      fontSize: this.size / 40,  // Increased font size for better readability
      numberOfSections: 12,
      spacingAngle: 0.5,  // Adjusted spacing for better appearance
      color: this.outerRingColor,
    });

    // Week number sections
    const weekRingWidth = this.size / 30;
    const weekStartRadius = monthNameStartRadius - weekRingWidth - this.size / 50;
    const weeks = this.generateWeeks();
    this.drawCircularSections({
      startRadius: weekStartRadius,
      width: weekRingWidth,
      texts: weeks,
      fontSize: this.size / 70,  // Increased font size for better readability
      numberOfSections: weeks.length,
      spacingAngle: 0.5,
      color: this.outerRingColor,
    });

    // Inner event sections
    const eventSpacing = this.size / 200;
    const numberOfEvents = this.options.ringsData.length;
    const eventWidth = weekStartRadius - this.minRadius - this.size / 40 - eventSpacing * (numberOfEvents - 1);
    let remainingEventWidth = eventWidth;
    let eventRadius = this.minRadius;

    for (let i = 0; i < numberOfEvents; i++) {
      const ring = this.options.ringsData[i];
      const percentage = (1 / (numberOfEvents - i)) * 1.1;
      const newEventWidth = i !== numberOfEvents - 1 ? remainingEventWidth * percentage : remainingEventWidth;
      remainingEventWidth -= newEventWidth;

      this.drawCircularSections({
        startRadius: eventRadius,
        width: newEventWidth,
        texts: ring.data,
        fontSize: this.size / 120,  // Adjusted font size for better fit
        numberOfSections: 12,
        spacingAngle: 0.4,
        color: this.sectionColors[i % this.sectionColors.length],  // Ensures correct colors are applied
      });
      eventRadius += newEventWidth + eventSpacing;
    }

    this.context.restore();
  }

  drawStaticElements() {
    this.context.save();
    this.context.fillStyle = "#333333";
    this.context.font = `bold ${this.size / 15}px Arial`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText(this.title, this.size / 2, this.size / 9);
    this.context.font = `bold ${this.size / 20}px Arial`;
    this.context.fillText(this.year, this.center.x, this.center.y);
    this.context.restore();
  }

  create() {
    this.canvas.width = this.size;
    this.canvas.height = this.size / 2 + this.size;
    this.canvas.style.height = `100%`;

    this.drawRotatingElements();
    this.drawStaticElements();
  }
  // Animation, drag, download, and helper methods remain unchanged

  // ANIMATION

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

  stopDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
  }

  getMouseAngle(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - this.center.x;
    const y = event.clientY - rect.top - this.center.y;
    return Math.atan2(y, x);
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
