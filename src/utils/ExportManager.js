/**
 * ExportManager.js
 * 
 * Handles all export functionality for YearWheel:
 * - PNG (with/without white background)
 * - JPEG (always with white background)
 * - SVG (using canvas2svg)
 * - PDF (using jsPDF, dynamic import)
 * - Clipboard copy operations
 * 
 * Extracted from YearWheelClass.js (lines 5400-5610)
 * Date: 2025-10-30
 */

class ExportManager {
  /**
   * Initialize export manager
   * @param {YearWheel} wheelInstance - Reference to YearWheel instance
   */
  constructor(wheelInstance) {
    this.wheel = wheelInstance;
  }

  // ==================== PUBLIC API ====================

  /**
   * Export to specified format (download file)
   * @param {string} format - 'png'|'png-white'|'jpeg'|'svg'|'pdf'
   */
  async exportImage(format) {
    try {
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
        case "pdf":
          await this.downloadAsPDF();
          break;
        default:
          console.error("Unsupported format:", format);
      }
    } catch (err) {
      console.error(`Error exporting as ${format}:`, err);
      throw err;
    }
  }

  /**
   * Copy image to clipboard
   * @param {string} format - 'png'|'png-white'|'jpeg'|'svg'
   */
  async copyToClipboard(format) {
    try {
      switch (format) {
        case "png":
        case "png-white":
          await this.copyPNGToClipboard(format === "png-white");
          break;
        case "jpeg":
          await this.copyJPEGToClipboard();
          break;
        case "svg":
          await this.copySVGToClipboard();
          break;
        default:
          console.error("Unsupported format for clipboard:", format);
          throw new Error(`Format ${format} not supported for clipboard`);
      }

      // Show success feedback via toast
      const event = new CustomEvent("showToast", {
        detail: { message: "Bild kopierad till urklipp!", type: "success" },
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      const event = new CustomEvent("showToast", {
        detail: { message: "Kunde inte kopiera till urklipp", type: "error" },
      });
      window.dispatchEvent(event);
      throw err;
    }
  }

  // ==================== PNG EXPORT ====================

  /**
   * Download canvas as PNG
   * @param {boolean} whiteBackground - Use white background instead of transparent
   */
  downloadAsPNG(whiteBackground = false) {
    const pngCanvas = this.copyCanvas(whiteBackground);
    pngCanvas.toBlob((blob) => {
      const fileName = this.generateFileName("png");
      this.downloadFile(blob, fileName, "image/png");
    });
  }

  /**
   * Copy PNG to clipboard
   * @param {boolean} whiteBackground - Use white background instead of transparent
   */
  async copyPNGToClipboard(whiteBackground = false) {
    const pngCanvas = this.copyCanvas(whiteBackground);
    const blob = await new Promise((resolve) =>
      pngCanvas.toBlob(resolve, "image/png")
    );
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  }

  // ==================== JPEG EXPORT ====================

  /**
   * Download canvas as JPEG (always with white background)
   */
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

  /**
   * Copy JPEG to clipboard (converted to PNG for clipboard compatibility)
   */
  async copyJPEGToClipboard() {
    const jpegCanvas = this.copyCanvas(true);
    const blob = await new Promise((resolve) =>
      jpegCanvas.toBlob(resolve, "image/jpeg", 1.0)
    );
    // Convert JPEG to PNG for clipboard (clipboard doesn't support JPEG directly)
    const pngBlob = await new Promise((resolve) =>
      jpegCanvas.toBlob(resolve, "image/png")
    );
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngBlob }),
    ]);
  }

  // ==================== SVG EXPORT ====================

  /**
   * Download canvas as SVG (re-renders using canvas2svg context)
   */
  downloadAsSVG() {
    const svgContext = this.createSVGContext();
    const originalContext = this.wheel.context;
    
    // Temporarily switch to SVG context and re-render
    this.wheel.context = svgContext;
    this.wheel.create();
    const svgData = svgContext.getSerializedSvg();

    // Restore original context and re-render to canvas
    this.wheel.context = originalContext;
    this.wheel.create();

    const fileName = this.generateFileName("svg");
    this.downloadFile(svgData, fileName, "image/svg+xml");
  }

  /**
   * Copy SVG to clipboard as text
   */
  async copySVGToClipboard() {
    const svgContext = this.createSVGContext();
    const originalContext = this.wheel.context;
    
    // Temporarily switch to SVG context and re-render
    this.wheel.context = svgContext;
    this.wheel.create();
    const svgData = svgContext.getSerializedSvg();

    // Restore original context and re-render to canvas
    this.wheel.context = originalContext;
    this.wheel.create();

    // Copy as text
    await navigator.clipboard.writeText(svgData);
  }

  // ==================== PDF EXPORT ====================

  /**
   * Download canvas as PDF (dynamic jsPDF import)
   */
  async downloadAsPDF() {
    // Dynamically import jsPDF only when PDF export is needed
    const { jsPDF } = await import("jspdf");

    // Create a high-quality canvas for PDF export
    const pdfCanvas = this.copyCanvas(true); // White background for PDF

    // Calculate dimensions for PDF (A4 landscape or custom size based on wheel)
    const imgWidth = this.wheel.canvas.width;
    const imgHeight = this.wheel.canvas.height;

    // Create PDF with dimensions matching the canvas aspect ratio
    // Use A4 landscape as base, or adjust based on canvas size
    const pdfWidth = 297; // A4 landscape width in mm
    const pdfHeight = 210; // A4 landscape height in mm

    // If the wheel is square or taller, use portrait or square format
    const aspectRatio = imgWidth / imgHeight;
    let finalWidth, finalHeight;

    if (aspectRatio > 1.2) {
      // Landscape
      finalWidth = pdfWidth;
      finalHeight = pdfWidth / aspectRatio;
    } else if (aspectRatio < 0.8) {
      // Portrait
      finalHeight = pdfWidth; // Use full width as height for portrait
      finalWidth = finalHeight * aspectRatio;
    } else {
      // Square-ish, use square format
      finalWidth = finalHeight = Math.min(pdfWidth, pdfHeight);
    }

    // Create PDF document
    const pdf = new jsPDF({
      orientation: aspectRatio > 1 ? "landscape" : "portrait",
      unit: "mm",
      format: [finalWidth, finalHeight],
    });

    // Convert canvas to image data
    const imgData = pdfCanvas.toDataURL("image/jpeg", 1.0);

    // Add image to PDF (fill the entire page)
    pdf.addImage(imgData, "JPEG", 0, 0, finalWidth, finalHeight);

    // Download the PDF
    const fileName = this.generateFileName("pdf");
    pdf.save(fileName);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Create a copy of the canvas with optional white background
   * @param {boolean} whiteBackground - Fill background with white color
   * @returns {HTMLCanvasElement} Copied canvas
   */
  copyCanvas(whiteBackground = false) {
    const copiedCanvas = document.createElement("canvas");
    copiedCanvas.width = this.wheel.canvas.width;
    copiedCanvas.height = this.wheel.canvas.height;
    const copiedContext = copiedCanvas.getContext("2d");

    if (whiteBackground) {
      copiedContext.fillStyle = "#FFFFFF";
      copiedContext.fillRect(0, 0, copiedCanvas.width, copiedCanvas.height);
    }

    copiedContext.drawImage(this.wheel.canvas, 0, 0);
    return copiedCanvas;
  }

  /**
   * Create SVG context using canvas2svg library
   * @returns {C2S} SVG rendering context
   */
  createSVGContext() {
    // Assumes C2S is globally available from canvas2svg library
    return new C2S(this.wheel.size, this.wheel.size / 4 + this.wheel.size);
  }

  /**
   * Generate filename with timestamp and title
   * @param {string} extension - File extension (png, jpg, svg, pdf)
   * @returns {string} Generated filename
   */
  generateFileName(extension) {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const titlePart = this.wheel.title
      ? `${this.wheel.title.replace(/\s+/g, "_")}_`
      : "";
    return `YearWheel_${titlePart}${dateStr}.${extension}`;
  }

  /**
   * Download a file (blob or text data)
   * @param {Blob|string} data - File data
   * @param {string} fileName - Download filename
   * @param {string} mimeType - MIME type for blob creation
   */
  downloadFile(data, fileName, mimeType) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}

export default ExportManager;
