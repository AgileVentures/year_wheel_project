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
    this._logoCache = null;
  }

  // ==================== LOGO HELPER ====================

  /**
   * Load YearWheel logo as base64 data URL for embedding in PDFs
   * @returns {Promise<string|null>} Base64 data URL or null if failed
   */
  async loadLogo() {
    if (this._logoCache) return this._logoCache;
    
    try {
      const logoUrl = '/year_wheel_logo.png';
      const response = await fetch(logoUrl);
      if (!response.ok) throw new Error('Logo not found');
      
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          this._logoCache = reader.result;
          resolve(this._logoCache);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Could not load logo for PDF:', err);
      return null;
    }
  }

  /**
   * Add logo to PDF header
   * @param {jsPDF} pdf - jsPDF instance
   * @param {string} logoData - Base64 logo data
   * @param {number} pageWidth - Page width in mm
   * @param {number} margin - Page margin in mm
   * @returns {number} Y position after logo
   */
  addLogoToHeader(pdf, logoData, pageWidth, margin) {
    if (!logoData) return margin;
    
    try {
      // Logo dimensions (aspect ratio ~3.5:1 for wide logo)
      const logoHeight = 10;
      const logoWidth = 35;
      const logoX = pageWidth - margin - logoWidth;
      const logoY = margin - 5;
      
      pdf.addImage(logoData, 'PNG', logoX, logoY, logoWidth, logoHeight);
      return margin + 5; // Return y position after logo header area
    } catch (err) {
      console.warn('Could not add logo to PDF:', err);
      return margin;
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Export to specified format (download file)
   * @param {string} format - 'png'|'png-white'|'jpeg'|'svg'|'pdf'
   * @param {Function} onProgress - Optional progress callback (percent, message)
   */
  async exportImage(format, onProgress = null) {
    try {
      switch (format) {
        case "png":
          this.downloadAsPNG(false, onProgress);
          break;
        case "png-white":
          this.downloadAsPNG(true, onProgress);
          break;
        case "jpeg":
          this.downloadAsJPEG(onProgress);
          break;
        case "svg":
          this.downloadAsSVG(onProgress);
          break;
        case "pdf":
          await this.downloadAsPDF(onProgress);
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
   * @param {Function} onProgress - Optional progress callback
   */
  downloadAsPNG(whiteBackground = false, onProgress = null) {
    if (onProgress) onProgress(0, 'Creating PNG...');
    const pngCanvas = this.copyCanvas(whiteBackground);
    if (onProgress) onProgress(50, 'Converting to blob...');
    pngCanvas.toBlob((blob) => {
      if (onProgress) onProgress(90, 'Preparing download...');
      const fileName = this.generateFileName("png");
      this.downloadFile(blob, fileName, "image/png");
      if (onProgress) onProgress(100, 'Complete!');
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
   * @param {Function} onProgress - Optional progress callback
   */
  downloadAsJPEG(onProgress = null) {
    if (onProgress) onProgress(0, 'Creating JPEG...');
    const jpegCanvas = this.copyCanvas(true); // Always use white background for JPEG
    if (onProgress) onProgress(50, 'Converting to blob...');
    jpegCanvas.toBlob(
      (blob) => {
        if (onProgress) onProgress(90, 'Preparing download...');
        const fileName = this.generateFileName("jpg");
        this.downloadFile(blob, fileName, "image/jpeg");
        if (onProgress) onProgress(100, 'Complete!');
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
   * @param {Function} onProgress - Optional progress callback
   */
  downloadAsSVG(onProgress = null) {
    if (onProgress) onProgress(0, 'Creating SVG context...');
    const svgContext = this.createSVGContext();
    const originalContext = this.wheel.context;
    
    if (onProgress) onProgress(20, 'Rendering to SVG...');
    // Temporarily switch to SVG context and re-render
    this.wheel.context = svgContext;
    this.wheel.create();
    if (onProgress) onProgress(70, 'Serializing SVG...');
    const svgData = svgContext.getSerializedSvg();

    // Restore original context and re-render to canvas
    if (onProgress) onProgress(85, 'Restoring canvas...');
    this.wheel.context = originalContext;
    this.wheel.create();

    if (onProgress) onProgress(95, 'Preparing download...');
    const fileName = this.generateFileName("svg");
    this.downloadFile(svgData, fileName, "image/svg+xml");
    if (onProgress) onProgress(100, 'Complete!');
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
   * @param {Function} onProgress - Optional progress callback
   */
  async downloadAsPDF(onProgress = null) {
    // Dynamically import jsPDF only when PDF export is needed
    if (onProgress) onProgress(0, 'Loading PDF library...');
    const { jsPDF } = await import("jspdf");

    // Create a high-quality canvas for PDF export
    if (onProgress) onProgress(10, 'Creating high-quality canvas...');
    const pdfCanvas = this.copyCanvas(true); // White background for PDF

    // Calculate dimensions for PDF (A4 landscape or custom size based on wheel)
    if (onProgress) onProgress(25, 'Calculating dimensions...');
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
    if (onProgress) onProgress(40, 'Creating PDF document...');
    const pdf = new jsPDF({
      orientation: aspectRatio > 1 ? "landscape" : "portrait",
      unit: "mm",
      format: [finalWidth, finalHeight],
    });

    // Convert canvas to image data
    if (onProgress) onProgress(60, 'Converting to image data...');
    const imgData = pdfCanvas.toDataURL("image/jpeg", 1.0);

    // Add image to PDF (fill the entire page)
    if (onProgress) onProgress(80, 'Adding image to PDF...');
    pdf.addImage(imgData, "JPEG", 0, 0, finalWidth, finalHeight);

    // Download the PDF
    if (onProgress) onProgress(95, 'Preparing download...');
    const fileName = this.generateFileName("pdf");
    pdf.save(fileName);
    if (onProgress) onProgress(100, 'Complete!');
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
    
    // Load logo
    const logoData = await this.loadLogo();
    
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
        // Add logo to new page header
        this.addLogoToHeader(pdf, logoData, pageWidth, margin);
        yPos = margin;
        return true;
      }
      return false;
    };

    // ===== PAGE 1: Title and Activity List =====
    
    // Add logo to first page header (top-right)
    this.addLogoToHeader(pdf, logoData, pageWidth, margin);
    
    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPos + 5);
    yPos += 12;
    
    // Year subtitle
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(String(yearNum), margin, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 12;

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
    
    // Add logo to wheel page header
    this.addLogoToHeader(pdf, logoData, pageWidth, margin);
    yPos = margin;

    // Page title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const wheelImageTitle = language === 'sv' ? 'Årshjul' : 'Year Wheel';
    pdf.text(wheelImageTitle, margin, yPos + 5);
    yPos += 12;

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

  // ==================== MONTHLY CALENDAR REPORT ====================

  /**
   * Generate 12-page monthly calendar PDF report
   * @param {Object} options - Export options
   */
  async generateMonthlyCalendarReport(options = {}) {
    const { jsPDF } = await import("jspdf");
    
    const {
      wheelStructure = {},
      title = this.wheel.title || 'Årshjul',
      year = new Date().getFullYear(),
      translations = { t: (key) => key, language: 'sv' },
      includeDescriptions = true,
      includeLegend = true,
      includeEmptyMonths = false,
      includeWheelImage = true
    } = options;

    const { language } = translations;
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    
    // Load logo
    const logoData = await this.loadLogo();
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    const monthNames = language === 'sv' 
      ? ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const items = wheelStructure.items || [];
    const rings = wheelStructure.rings || [];
    const activityGroups = wheelStructure.activityGroups || [];

    // Group items by month
    const itemsByMonth = {};
    items.forEach(item => {
      const startDate = new Date(item.startDate);
      if (startDate.getFullYear() === yearNum) {
        const month = startDate.getMonth();
        if (!itemsByMonth[month]) itemsByMonth[month] = [];
        itemsByMonth[month].push(item);
      }
    });

    // Generate each month page
    let isFirstPage = true;
    for (let month = 0; month < 12; month++) {
      const monthItems = itemsByMonth[month] || [];
      
      // Skip empty months if option is disabled
      if (!includeEmptyMonths && monthItems.length === 0) continue;

      if (!isFirstPage) pdf.addPage();
      isFirstPage = false;

      let yPos = margin;

      // Month header with background
      pdf.setFillColor(59, 130, 246); // Indigo-500
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      // Add logo in header area (top-right, white/light version would be ideal, but PNG works)
      if (logoData) {
        try {
          pdf.addImage(logoData, 'PNG', pageWidth - margin - 30, 5, 25, 7);
        } catch (e) { /* ignore logo errors */ }
      }
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text(monthNames[month], margin, 25);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(yearNum), pageWidth - margin - 35, 25, { align: 'right' });
      
      pdf.setTextColor(0, 0, 0);
      yPos = 50;

      // Calendar grid for the month
      const daysInMonth = new Date(yearNum, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(yearNum, month, 1).getDay();
      const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday start

      const cellWidth = contentWidth / 7;
      const cellHeight = 18;
      
      // Day headers
      const dayNames = language === 'sv' 
        ? ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 100, 100);
      dayNames.forEach((day, i) => {
        pdf.text(day, margin + (i * cellWidth) + cellWidth / 2, yPos, { align: 'center' });
      });
      yPos += 6;

      // Draw calendar cells
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      let currentDay = 1;
      let currentWeek = 0;
      
      while (currentDay <= daysInMonth) {
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          const cellX = margin + (dayOfWeek * cellWidth);
          const cellY = yPos + (currentWeek * cellHeight);
          
          if ((currentWeek === 0 && dayOfWeek < adjustedFirstDay) || currentDay > daysInMonth) {
            // Empty cell
            pdf.setDrawColor(230, 230, 230);
            pdf.rect(cellX, cellY, cellWidth, cellHeight);
          } else {
            // Cell with date
            const isWeekend = dayOfWeek >= 5;
            pdf.setFillColor(isWeekend ? 250 : 255, isWeekend ? 250 : 255, isWeekend ? 250 : 255);
            pdf.setDrawColor(200, 200, 200);
            pdf.rect(cellX, cellY, cellWidth, cellHeight, 'FD');
            
            // Date number
            pdf.setFontSize(10);
            pdf.setTextColor(isWeekend ? 150 : 0, isWeekend ? 150 : 0, isWeekend ? 150 : 0);
            pdf.text(String(currentDay), cellX + 3, cellY + 5);
            
            // Check for activities on this day
            const dayActivities = monthItems.filter(item => {
              const start = new Date(item.startDate);
              const end = new Date(item.endDate);
              const currentDate = new Date(yearNum, month, currentDay);
              return currentDate >= start && currentDate <= end;
            });
            
            if (dayActivities.length > 0) {
              // Draw activity indicator dots
              const maxDots = Math.min(dayActivities.length, 3);
              for (let d = 0; d < maxDots; d++) {
                const ag = activityGroups.find(g => g.id === dayActivities[d].activityId);
                const color = ag?.color || '#3B82F6';
                const rgb = this.hexToRgb(color);
                pdf.setFillColor(rgb.r, rgb.g, rgb.b);
                pdf.circle(cellX + 5 + (d * 5), cellY + cellHeight - 4, 1.5, 'F');
              }
              if (dayActivities.length > 3) {
                pdf.setFontSize(6);
                pdf.setTextColor(100, 100, 100);
                pdf.text(`+${dayActivities.length - 3}`, cellX + 20, cellY + cellHeight - 2);
              }
            }
            
            currentDay++;
          }
        }
        currentWeek++;
      }

      yPos += (currentWeek * cellHeight) + 15;

      // Activity list for this month
      if (monthItems.length > 0) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const activityHeader = language === 'sv' ? 'Aktiviteter' : 'Activities';
        pdf.text(activityHeader, margin, yPos);
        yPos += 8;

        // Sort by start date
        monthItems.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        monthItems.forEach(item => {
          if (yPos > pageHeight - 30) return; // Don't overflow

          const ag = activityGroups.find(g => g.id === item.activityId);
          const ring = rings.find(r => r.id === item.ringId);
          
          // Activity group color dot
          if (ag) {
            const rgb = this.hexToRgb(ag.color || '#3B82F6');
            pdf.setFillColor(rgb.r, rgb.g, rgb.b);
            pdf.circle(margin + 3, yPos - 1, 2, 'F');
          }

          // Date range
          const startDate = new Date(item.startDate);
          const endDate = new Date(item.endDate);
          const dateStr = startDate.getTime() === endDate.getTime()
            ? `${startDate.getDate()}`
            : `${startDate.getDate()}-${endDate.getDate()}`;
          
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(dateStr, margin + 8, yPos);

          // Activity name
          pdf.setFontSize(9);
          pdf.setTextColor(0, 0, 0);
          pdf.text(item.name, margin + 22, yPos);

          // Ring name (right side)
          if (ring) {
            pdf.setFontSize(7);
            pdf.setTextColor(130, 130, 130);
            pdf.text(ring.name, pageWidth - margin, yPos, { align: 'right' });
          }

          yPos += 5;

          // Description if enabled
          if (includeDescriptions && item.description) {
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            const descLines = pdf.splitTextToSize(item.description, contentWidth - 25);
            pdf.text(descLines.slice(0, 2), margin + 22, yPos);
            yPos += descLines.length > 2 ? 8 : (descLines.length * 4);
          }

          yPos += 2;
        });
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(180, 180, 180);
      pdf.text(title, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Add wheel image as last page if requested
    if (includeWheelImage) {
      pdf.addPage();
      this.addWheelImagePage(pdf, title, yearNum, language);
    }

    // Add legend page if requested
    if (includeLegend && activityGroups.length > 0) {
      pdf.addPage();
      this.addLegendPage(pdf, activityGroups, rings, title, language);
    }

    const fileName = this.generateFileName('pdf').replace('.pdf', '_calendar.pdf');
    pdf.save(fileName);
  }

  // ==================== TIMELINE REPORT ====================

  /**
   * Generate Gantt-style timeline PDF report
   * @param {Object} options - Export options
   */
  async generateTimelineReport(options = {}) {
    const { jsPDF } = await import("jspdf");
    
    const {
      wheelStructure = {},
      title = this.wheel.title || 'Årshjul',
      year = new Date().getFullYear(),
      translations = { t: (key) => key, language: 'sv' },
      includeDescriptions = false,
      includeLegend = true,
      includeWheelImage = true,
      pageOrientation = 'landscape'
    } = options;

    const { language } = translations;
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    
    // Load logo
    const logoData = await this.loadLogo();
    
    const isLandscape = pageOrientation === 'landscape';
    const pdf = new jsPDF({
      orientation: pageOrientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    const monthNames = language === 'sv' 
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const items = wheelStructure.items || [];
    const rings = wheelStructure.rings || [];
    const activityGroups = wheelStructure.activityGroups || [];

    // Filter and sort items
    const yearItems = items.filter(item => {
      const startYear = new Date(item.startDate).getFullYear();
      const endYear = new Date(item.endDate).getFullYear();
      return startYear <= yearNum && endYear >= yearNum;
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Add logo to header (top-right)
    this.addLogoToHeader(pdf, logoData, pageWidth, margin);

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPos + 5);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const timelineLabel = language === 'sv' ? `Tidslinje ${yearNum}` : `Timeline ${yearNum}`;
    pdf.text(timelineLabel, margin, yPos + 12);
    pdf.setTextColor(0, 0, 0);
    yPos += 25;

    // Timeline header (months)
    const timelineStartX = margin + 60; // Space for activity names
    const timelineWidth = contentWidth - 60;
    const monthWidth = timelineWidth / 12;

    pdf.setFillColor(240, 240, 240);
    pdf.rect(timelineStartX, yPos, timelineWidth, 8, 'F');
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    monthNames.forEach((month, i) => {
      pdf.text(month, timelineStartX + (i * monthWidth) + monthWidth / 2, yPos + 5.5, { align: 'center' });
    });
    yPos += 12;

    // Draw month grid lines
    pdf.setDrawColor(230, 230, 230);
    for (let i = 0; i <= 12; i++) {
      const x = timelineStartX + (i * monthWidth);
      pdf.line(x, yPos, x, pageHeight - margin - 20);
    }

    // Draw activities
    const barHeight = 6;
    const barSpacing = includeDescriptions ? 12 : 8;
    
    yearItems.forEach((item, index) => {
      if (yPos > pageHeight - margin - 30) {
        // Add new page for more items
        pdf.addPage();
        yPos = margin + 15;
        
        // Redraw month header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(timelineStartX, yPos, timelineWidth, 8, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        monthNames.forEach((month, i) => {
          pdf.text(month, timelineStartX + (i * monthWidth) + monthWidth / 2, yPos + 5.5, { align: 'center' });
        });
        yPos += 12;
        
        // Redraw grid lines
        pdf.setDrawColor(230, 230, 230);
        for (let i = 0; i <= 12; i++) {
          const x = timelineStartX + (i * monthWidth);
          pdf.line(x, yPos, x, pageHeight - margin - 20);
        }
      }

      const ag = activityGroups.find(g => g.id === item.activityId);
      const ring = rings.find(r => r.id === item.ringId);
      
      // Activity name (left side)
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      let displayName = item.name;
      while (pdf.getTextWidth(displayName) > 55 && displayName.length > 3) {
        displayName = displayName.slice(0, -4) + '...';
      }
      pdf.text(displayName, margin, yPos + 4);

      // Calculate bar position
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      
      // Clamp to current year
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, 11, 31);
      const clampedStart = startDate < yearStart ? yearStart : startDate;
      const clampedEnd = endDate > yearEnd ? yearEnd : endDate;
      
      const startDayOfYear = Math.floor((clampedStart - yearStart) / (1000 * 60 * 60 * 24));
      const endDayOfYear = Math.floor((clampedEnd - yearStart) / (1000 * 60 * 60 * 24));
      
      const barX = timelineStartX + (startDayOfYear / 365) * timelineWidth;
      const barW = Math.max(((endDayOfYear - startDayOfYear + 1) / 365) * timelineWidth, 3);

      // Draw bar with activity group color
      const color = ag?.color || '#3B82F6';
      const rgb = this.hexToRgb(color);
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.roundedRect(barX, yPos, barW, barHeight, 1, 1, 'F');

      // Ring indicator (small label)
      if (ring) {
        pdf.setFontSize(5);
        pdf.setTextColor(150, 150, 150);
        pdf.text(ring.name, margin, yPos + 8);
      }

      yPos += barSpacing;

      // Description
      if (includeDescriptions && item.description) {
        pdf.setFontSize(6);
        pdf.setTextColor(120, 120, 120);
        const descLines = pdf.splitTextToSize(item.description, 55);
        pdf.text(descLines.slice(0, 1), margin, yPos);
        yPos += 4;
      }
    });

    // Add wheel image as last page if requested
    if (includeWheelImage) {
      pdf.addPage();
      this.addWheelImagePage(pdf, title, yearNum, language);
    }

    // Add legend
    if (includeLegend && activityGroups.length > 0) {
      pdf.addPage();
      this.addLegendPage(pdf, activityGroups, rings, title, language);
    }

    const fileName = this.generateFileName('pdf').replace('.pdf', '_timeline.pdf');
    pdf.save(fileName);
  }

  // ==================== RING SUMMARY REPORT ====================

  /**
   * Generate detailed ring-by-ring summary PDF report
   * @param {Object} options - Export options
   */
  async generateRingSummaryReport(options = {}) {
    const { jsPDF } = await import("jspdf");
    
    const {
      wheelStructure = {},
      title = this.wheel.title || 'Årshjul',
      year = new Date().getFullYear(),
      translations = { t: (key) => key, language: 'sv' },
      includeDescriptions = true,
      includeLegend = true,
      includeWheelImage = true
    } = options;

    const { language } = translations;
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    
    // Load logo
    const logoData = await this.loadLogo();
    
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

    const items = wheelStructure.items || [];
    const rings = wheelStructure.rings || [];
    const activityGroups = wheelStructure.activityGroups || [];

    // Filter items by year
    const yearItems = items.filter(item => {
      const startYear = new Date(item.startDate).getFullYear();
      return startYear === yearNum;
    });

    // Helper: Add new page if needed
    const checkNewPage = (neededHeight) => {
      if (yPos + neededHeight > pageHeight - margin) {
        pdf.addPage();
        // Add logo to new page header
        this.addLogoToHeader(pdf, logoData, pageWidth, margin);
        yPos = margin;
        return true;
      }
      return false;
    };

    // Add logo to first page header (top-right)
    this.addLogoToHeader(pdf, logoData, pageWidth, margin);

    // Title page
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPos + 20);
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const summaryLabel = language === 'sv' ? 'Ringsammanfattning' : 'Ring Summary';
    pdf.text(summaryLabel, margin, yPos + 32);
    
    pdf.setFontSize(14);
    pdf.text(String(yearNum), margin, yPos + 42);
    pdf.setTextColor(0, 0, 0);
    
    // Summary stats
    yPos += 60;
    pdf.setFontSize(10);
    const statsText = language === 'sv' 
      ? `${yearItems.length} aktiviteter • ${rings.filter(r => r.visible !== false).length} ringar • ${activityGroups.filter(g => g.visible !== false).length} aktivitetsgrupper`
      : `${yearItems.length} activities • ${rings.filter(r => r.visible !== false).length} rings • ${activityGroups.filter(g => g.visible !== false).length} activity groups`;
    pdf.text(statsText, margin, yPos);
    
    // Start ring sections on new page
    pdf.addPage();
    // Add logo to ring pages
    this.addLogoToHeader(pdf, logoData, pageWidth, margin);
    yPos = margin;

    // Process each ring
    const visibleRings = rings.filter(r => r.visible !== false);
    
    visibleRings.forEach((ring, ringIndex) => {
      const ringItems = yearItems.filter(item => item.ringId === ring.id)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      checkNewPage(40);

      // Ring header with colored bar
      pdf.setFillColor(59, 130, 246);
      pdf.rect(margin, yPos, 4, 20, 'F');
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(ring.name, margin + 10, yPos + 8);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const ringType = ring.type === 'outer' 
        ? (language === 'sv' ? 'Yttre ring' : 'Outer ring')
        : (language === 'sv' ? 'Inre ring' : 'Inner ring');
      const itemCount = language === 'sv' 
        ? `${ringItems.length} aktiviteter`
        : `${ringItems.length} activities`;
      pdf.text(`${ringType} • ${itemCount}`, margin + 10, yPos + 15);
      
      pdf.setTextColor(0, 0, 0);
      yPos += 28;

      if (ringItems.length === 0) {
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        const noActivities = language === 'sv' ? 'Inga aktiviteter' : 'No activities';
        pdf.text(noActivities, margin + 10, yPos);
        yPos += 15;
      } else {
        // List activities
        ringItems.forEach((item, itemIndex) => {
          checkNewPage(includeDescriptions && item.description ? 25 : 15);

          const ag = activityGroups.find(g => g.id === item.activityId);
          
          // Activity group color dot
          if (ag) {
            const rgb = this.hexToRgb(ag.color || '#3B82F6');
            pdf.setFillColor(rgb.r, rgb.g, rgb.b);
            pdf.circle(margin + 5, yPos - 1, 2.5, 'F');
          }

          // Activity name
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(item.name, margin + 12, yPos);

          // Date range
          const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            const months = language === 'sv' 
              ? ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
              : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${date.getDate()} ${months[date.getMonth()]}`;
          };
          
          const dateRange = `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 100, 100);
          pdf.text(dateRange, pageWidth - margin, yPos, { align: 'right' });

          yPos += 6;

          // Activity group name
          if (ag) {
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            pdf.text(ag.name, margin + 12, yPos);
            yPos += 4;
          }

          // Description
          if (includeDescriptions && item.description) {
            pdf.setFontSize(9);
            pdf.setTextColor(80, 80, 80);
            const descLines = pdf.splitTextToSize(item.description, contentWidth - 15);
            descLines.slice(0, 3).forEach(line => {
              pdf.text(line, margin + 12, yPos);
              yPos += 4;
            });
            if (descLines.length > 3) {
              pdf.setTextColor(150, 150, 150);
              pdf.text('...', margin + 12, yPos);
              yPos += 4;
            }
          }

          yPos += 6;

          // Divider (except for last item)
          if (itemIndex < ringItems.length - 1) {
            pdf.setDrawColor(230, 230, 230);
            pdf.line(margin + 12, yPos - 3, pageWidth - margin, yPos - 3);
          }
        });
      }

      yPos += 10;

      // Page break between rings (except last)
      if (ringIndex < visibleRings.length - 1) {
        pdf.addPage();
        yPos = margin;
      }
    });

    // Add wheel image as last page if requested
    if (includeWheelImage) {
      pdf.addPage();
      this.addWheelImagePage(pdf, title, yearNum, language);
    }

    // Add legend
    if (includeLegend && activityGroups.length > 0) {
      pdf.addPage();
      this.addLegendPage(pdf, activityGroups, rings, title, language);
    }

    const fileName = this.generateFileName('pdf').replace('.pdf', '_summary.pdf');
    pdf.save(fileName);
  }

  // ==================== REPORT HELPER METHODS ====================

  /**
   * Add wheel image page to PDF
   */
  addWheelImagePage(pdf, title, year, language) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;

    let yPos = margin;

    // Page title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const wheelImageTitle = language === 'sv' ? 'Årshjul' : 'Year Wheel';
    pdf.text(wheelImageTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Create high-quality wheel image
    const wheelCanvas = this.copyCanvas(true);
    const imgData = wheelCanvas.toDataURL('image/jpeg', 0.95);

    // Calculate dimensions
    const contentWidth = pageWidth - (margin * 2);
    const maxImageHeight = pageHeight - yPos - margin - 15;
    const wheelAspect = wheelCanvas.width / wheelCanvas.height;
    
    let imgWidth, imgHeight;
    if (contentWidth / maxImageHeight > wheelAspect) {
      imgHeight = maxImageHeight;
      imgWidth = imgHeight * wheelAspect;
    } else {
      imgWidth = contentWidth;
      imgHeight = imgWidth / wheelAspect;
    }

    const imgX = (pageWidth - imgWidth) / 2;
    pdf.addImage(imgData, 'JPEG', imgX, yPos, imgWidth, imgHeight);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    const dateGenerated = new Date().toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US');
    const footerText = language === 'sv' 
      ? `${title} • ${year} • Genererad ${dateGenerated}`
      : `${title} • ${year} • Generated ${dateGenerated}`;
    pdf.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  /**
   * Add legend page to PDF
   */
  addLegendPage(pdf, activityGroups, rings, title, language) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    const legendTitle = language === 'sv' ? 'Förklaring' : 'Legend';
    pdf.text(legendTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Activity Groups section
    if (activityGroups.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const agTitle = language === 'sv' ? 'Aktivitetsgrupper' : 'Activity Groups';
      pdf.text(agTitle, margin, yPos);
      yPos += 8;

      const visibleGroups = activityGroups.filter(g => g.visible !== false);
      const colWidth = (pageWidth - margin * 2) / 2;

      visibleGroups.forEach((group, index) => {
        const col = index % 2;
        const x = margin + (col * colWidth);
        
        if (col === 0 && index > 0) yPos += 8;

        // Color dot
        const rgb = this.hexToRgb(group.color || '#3B82F6');
        pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        pdf.circle(x + 3, yPos - 1, 3, 'F');

        // Name
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(group.name, x + 10, yPos);
      });

      yPos += 20;
    }

    // Rings section
    if (rings.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const ringsTitle = language === 'sv' ? 'Ringar' : 'Rings';
      pdf.text(ringsTitle, margin, yPos);
      yPos += 8;

      const visibleRings = rings.filter(r => r.visible !== false);

      visibleRings.forEach(ring => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        const ringType = ring.type === 'outer' 
          ? (language === 'sv' ? '(yttre)' : '(outer)')
          : (language === 'sv' ? '(inre)' : '(inner)');
        
        pdf.text(`• ${ring.name} ${ringType}`, margin + 5, yPos);
        yPos += 6;
      });
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(title, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  /**
   * Convert hex color to RGB object
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 }; // Default blue
  }

  /**
   * Main entry point for generating reports
   * @param {string} reportType - Type of report to generate
   * @param {Object} options - Report options
   */
  async generateReport(reportType, options = {}) {
    switch (reportType) {
      case 'wheel-activity':
        return this.downloadPDFReport(options);
      case 'monthly-calendar':
        return this.generateMonthlyCalendarReport(options);
      case 'timeline':
        return this.generateTimelineReport(options);
      case 'ring-summary':
        return this.generateRingSummaryReport(options);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }
}

export default ExportManager;
