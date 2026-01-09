/**
 * GanttExporter.js
 * 
 * Handles export functionality for the Gantt/Timeline view:
 * - PNG export (via html2canvas)
 * - PDF export (via jsPDF + html2canvas)
 * - Print functionality
 * 
 * Creates a print-friendly layout with:
 * - Title and date range header
 * - Legend for activity groups
 * - Full timeline without scrolling
 */

import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

/**
 * Generate a filename with timestamp
 */
const generateFileName = (extension, title = 'timeline') => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  return `${sanitizedTitle}_${timestamp}.${extension}`;
};

/**
 * Create a printable/exportable version of the Gantt chart
 * This renders to a hidden container with proper layout
 */
const createExportableContent = async (options) => {
  const {
    timelineElement,
    rowPaneElement,
    headerElement,
    title = 'Tidslinje',
    viewStart,
    viewEnd,
    wheelStructure,
    locale = 'sv',
  } = options;
  
  const dateLocale = locale === 'sv' ? sv : enUS;
  const dateFormat = 'd MMM yyyy';
  
  // Create container for export
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  // Add header with title and date range
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 24px 32px;
    border-bottom: 2px solid #E5E7EB;
    background: #F9FAFB;
  `;
  header.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0;">${title}</h1>
        <p style="font-size: 14px; color: #6B7280; margin: 4px 0 0 0;">
          ${format(viewStart, dateFormat, { locale: dateLocale })} – ${format(viewEnd, dateFormat, { locale: dateLocale })}
        </p>
      </div>
      <div style="text-align: right; font-size: 12px; color: #9CA3AF;">
        ${locale === 'sv' ? 'Exporterad' : 'Exported'}: ${format(new Date(), 'yyyy-MM-dd HH:mm', { locale: dateLocale })}
      </div>
    </div>
  `;
  container.appendChild(header);
  
  // Add legend for activity groups
  if (wheelStructure?.activityGroups?.length > 0) {
    const legend = document.createElement('div');
    legend.style.cssText = `
      padding: 12px 32px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    `;
    
    const visibleGroups = wheelStructure.activityGroups.filter(g => g.visible !== false);
    visibleGroups.forEach(group => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #374151;
      `;
      item.innerHTML = `
        <span style="
          width: 12px;
          height: 12px;
          border-radius: 3px;
          background: ${group.color || '#94A3B8'};
        "></span>
        ${group.name}
      `;
      legend.appendChild(item);
    });
    
    container.appendChild(legend);
  }
  
  // Create main content area with fixed layout
  const mainContent = document.createElement('div');
  mainContent.style.cssText = `
    display: flex;
    background: white;
  `;
  
  // Clone row pane (left side with names)
  if (rowPaneElement) {
    const rowClone = rowPaneElement.cloneNode(true);
    rowClone.style.cssText = `
      flex-shrink: 0;
      width: 250px;
      border-right: 1px solid #E5E7EB;
      overflow: visible;
      height: auto;
    `;
    // Remove scroll styles
    rowClone.style.overflow = 'visible';
    rowClone.style.maxHeight = 'none';
    mainContent.appendChild(rowClone);
  }
  
  // Clone timeline (right side with bars)
  if (timelineElement) {
    const timelineWrapper = document.createElement('div');
    timelineWrapper.style.cssText = `
      flex: 1;
      overflow: visible;
    `;
    
    // Clone header if provided
    if (headerElement) {
      const headerClone = headerElement.cloneNode(true);
      headerClone.style.overflow = 'visible';
      headerClone.style.width = 'auto';
      timelineWrapper.appendChild(headerClone);
    }
    
    const timelineClone = timelineElement.cloneNode(true);
    timelineClone.style.cssText = `
      overflow: visible;
      width: auto;
      height: auto;
    `;
    timelineWrapper.appendChild(timelineClone);
    mainContent.appendChild(timelineWrapper);
  }
  
  container.appendChild(mainContent);
  
  // Add footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 16px 32px;
    border-top: 1px solid #E5E7EB;
    background: #F9FAFB;
    text-align: center;
    font-size: 11px;
    color: #9CA3AF;
  `;
  footer.innerHTML = `YearWheel – ${locale === 'sv' ? 'Årshjulsplanerare' : 'Annual Planning Tool'}`;
  container.appendChild(footer);
  
  document.body.appendChild(container);
  
  return container;
};

/**
 * Export Gantt chart as PNG
 */
export const exportGanttAsPNG = async (options) => {
  const { title = 'timeline' } = options;
  
  try {
    // Dynamically import html2canvas
    const html2canvas = (await import('html2canvas')).default;
    
    const container = await createExportableContent(options);
    
    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2, // High resolution
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    
    // Clean up
    document.body.removeChild(container);
    
    // Download
    const link = document.createElement('a');
    link.download = generateFileName('png', title);
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    return true;
  } catch (error) {
    console.error('PNG export failed:', error);
    throw error;
  }
};

/**
 * Export Gantt chart as PDF
 */
export const exportGanttAsPDF = async (options) => {
  const { title = 'timeline' } = options;
  
  try {
    // Dynamically import dependencies
    const [html2canvasModule, jspdfModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const html2canvas = html2canvasModule.default;
    const { jsPDF } = jspdfModule;
    
    const container = await createExportableContent(options);
    
    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    
    // Clean up DOM
    document.body.removeChild(container);
    
    // Calculate PDF dimensions (A4 landscape or custom)
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const aspectRatio = imgWidth / imgHeight;
    
    // Use landscape A4 as base
    let pdfWidth = 297; // mm
    let pdfHeight = pdfWidth / aspectRatio;
    
    // If too tall, adjust
    if (pdfHeight > 420) { // A3 height limit
      pdfHeight = 420;
      pdfWidth = pdfHeight * aspectRatio;
    }
    
    const pdf = new jsPDF({
      orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
    });
    
    // Add image to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    
    // Download
    pdf.save(generateFileName('pdf', title));
    
    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
};

/**
 * Open print dialog for Gantt chart
 */
export const printGantt = async (options) => {
  try {
    const container = await createExportableContent(options);
    
    // Move to visible position for printing
    container.style.left = '0';
    container.style.top = '0';
    container.style.position = 'absolute';
    container.style.zIndex = '10000';
    container.style.width = '100%';
    
    // Create print-specific styles
    const printStyles = document.createElement('style');
    printStyles.id = 'gantt-print-styles';
    printStyles.textContent = `
      @media print {
        body > *:not(#gantt-print-container) {
          display: none !important;
        }
        #gantt-print-container {
          position: static !important;
          left: 0 !important;
          top: 0 !important;
        }
        @page {
          size: landscape;
          margin: 10mm;
        }
      }
    `;
    document.head.appendChild(printStyles);
    
    container.id = 'gantt-print-container';
    
    // Trigger print
    window.print();
    
    // Clean up after print dialog closes
    setTimeout(() => {
      document.body.removeChild(container);
      document.head.removeChild(printStyles);
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Print failed:', error);
    throw error;
  }
};

export default {
  exportAsPNG: exportGanttAsPNG,
  exportAsPDF: exportGanttAsPDF,
  print: printGantt,
};
