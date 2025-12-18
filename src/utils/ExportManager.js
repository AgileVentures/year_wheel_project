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

  // ==================== PDF REPORT EXPORT ====================

  /**
   * Download PDF report with activity list and wheel image
   * @param {Object} options - Export options
   * @param {Object} options.wheelStructure - Contains rings, activityGroups, labels, items
   * @param {string} options.title - Wheel title for header
   * @param {number|string} options.year - Year for filtering items
   * @param {Object} options.translations - i18n translations object { t, language }
   */
  async downloadPDFReport(options = {}) {
    const { jsPDF } = await import("jspdf");
    
    const {
      wheelStructure = {},
      title = this.wheel.title || 'Årshjul',
      year = new Date().getFullYear(),
      translations = { t: (key) => key, language: 'sv' }
    } = options;

    const { t, language } = translations;
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    
    // Create A4 portrait PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Helper: Add new page if needed
    const checkNewPage = (neededHeight) => {
      if (yPos + neededHeight > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // ===== PAGE 1: Title and Activity List =====
    
    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // Year subtitle
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(String(yearNum), pageWidth / 2, yPos, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    yPos += 15;

    // Get items and rings
    const items = wheelStructure.items || [];
    const rings = wheelStructure.rings || [];
    const activityGroups = wheelStructure.activityGroups || [];
    const labels = wheelStructure.labels || [];

    // Filter items by year
    const yearItems = items.filter(item => {
      const itemYear = new Date(item.startDate).getFullYear();
      return itemYear === yearNum;
    });

    // Group items by ring
    const itemsByRing = {};
    rings.forEach(ring => {
      const ringItems = yearItems.filter(item => item.ringId === ring.id);
      if (ringItems.length > 0) {
        itemsByRing[ring.id] = {
          ring,
          items: ringItems.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        };
      }
    });

    // Statistics
    const totalItems = yearItems.length;
    const activeRings = Object.keys(itemsByRing).length;
    
    // Summary line
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    const summaryText = language === 'sv' 
      ? `${totalItems} aktiviteter i ${activeRings} ringar`
      : `${totalItems} activities in ${activeRings} rings`;
    pdf.text(summaryText, pageWidth / 2, yPos, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    yPos += 12;

    // Divider line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Helper: Format date
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const months = language === 'sv' 
        ? ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    };

    // Helper: Get activity group name
    const getActivityGroupName = (activityId) => {
      const ag = activityGroups.find(g => g.id === activityId);
      return ag ? ag.name : '';
    };

    // Helper: Get label name
    const getLabelName = (labelId) => {
      if (!labelId) return '';
      const label = labels.find(l => l.id === labelId);
      return label ? label.name : '';
    };

    // Render each ring section
    Object.values(itemsByRing).forEach(({ ring, items: ringItems }) => {
      checkNewPage(25);

      // Ring header with background
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, yPos - 4, contentWidth, 10, 'F');
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(ring.name, margin + 3, yPos + 2);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const itemCountText = language === 'sv' 
        ? `${ringItems.length} aktiviteter`
        : `${ringItems.length} activities`;
      pdf.text(itemCountText, pageWidth - margin - 3, yPos + 2, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      yPos += 12;

      // Render items in this ring
      ringItems.forEach((item, index) => {
        checkNewPage(20);

        // Item row
        const dateRange = `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
        const activityGroupName = getActivityGroupName(item.activityId);
        const labelName = getLabelName(item.labelId);

        // Date column (left)
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(dateRange, margin + 3, yPos);

        // Item name (center-left)
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        const nameX = margin + 45;
        const maxNameWidth = 80;
        
        // Truncate name if too long
        let displayName = item.name;
        while (pdf.getTextWidth(displayName) > maxNameWidth && displayName.length > 3) {
          displayName = displayName.slice(0, -4) + '...';
        }
        pdf.text(displayName, nameX, yPos);

        // Activity group (right side)
        if (activityGroupName) {
          pdf.setFontSize(8);
          pdf.setTextColor(80, 80, 80);
          pdf.text(activityGroupName, pageWidth - margin - 3, yPos, { align: 'right' });
        }

        // Label badge (if exists)
        if (labelName) {
          pdf.setFontSize(7);
          pdf.setTextColor(60, 60, 60);
          pdf.text(`[${labelName}]`, nameX + pdf.getTextWidth(displayName) + 3, yPos);
        }

        pdf.setTextColor(0, 0, 0);
        yPos += 6;

        // Light divider between items
        if (index < ringItems.length - 1) {
          pdf.setDrawColor(230, 230, 230);
          pdf.line(margin + 3, yPos - 2, pageWidth - margin - 3, yPos - 2);
        }
      });

      yPos += 8;
    });

    // ===== PAGE 2: Wheel Image =====
    pdf.addPage();
    yPos = margin;

    // Page title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const wheelImageTitle = language === 'sv' ? 'Årshjul' : 'Year Wheel';
    pdf.text(wheelImageTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Create high-quality wheel image
    const wheelCanvas = this.copyCanvas(true); // White background
    const imgData = wheelCanvas.toDataURL('image/jpeg', 0.95);

    // Calculate dimensions to fit on page (centered, max size)
    const maxImageWidth = contentWidth;
    const maxImageHeight = pageHeight - yPos - margin - 10;
    const wheelAspect = wheelCanvas.width / wheelCanvas.height;
    
    let imgWidth, imgHeight;
    if (maxImageWidth / maxImageHeight > wheelAspect) {
      // Height constrained
      imgHeight = maxImageHeight;
      imgWidth = imgHeight * wheelAspect;
    } else {
      // Width constrained
      imgWidth = maxImageWidth;
      imgHeight = imgWidth / wheelAspect;
    }

    const imgX = (pageWidth - imgWidth) / 2;
    pdf.addImage(imgData, 'JPEG', imgX, yPos, imgWidth, imgHeight);

    // Footer with generation date
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    const dateGenerated = new Date().toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US');
    const footerText = language === 'sv' 
      ? `Genererad ${dateGenerated} med YearWheel`
      : `Generated ${dateGenerated} with YearWheel`;
    pdf.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Download
    const fileName = this.generateFileName('pdf').replace('.pdf', '_report.pdf');
    pdf.save(fileName);
  }
}

export default ExportManager;
