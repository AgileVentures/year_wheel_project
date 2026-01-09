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
 * - Smart date range (only months with activities + padding)
 */

import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInDays, eachMonthOfInterval } from 'date-fns';
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
 * Calculate optimal date range based on actual items
 * Returns a range that includes all items with 1 month padding on each side
 */
const calculateOptimalDateRange = (items, fallbackStart, fallbackEnd) => {
  if (!items || items.length === 0) {
    return { start: fallbackStart, end: fallbackEnd };
  }
  
  let minDate = null;
  let maxDate = null;
  
  items.forEach(item => {
    if (!item.startDate || !item.endDate) return;
    
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    
    if (!minDate || startDate < minDate) minDate = startDate;
    if (!maxDate || endDate > maxDate) maxDate = endDate;
  });
  
  if (!minDate || !maxDate) {
    return { start: fallbackStart, end: fallbackEnd };
  }
  
  // Add padding: start at the beginning of the first month with activity,
  // and end at the end of the last month with activity
  const paddedStart = startOfMonth(minDate);
  const paddedEnd = endOfMonth(maxDate);
  
  return { start: paddedStart, end: paddedEnd };
};

/**
 * Create a printable/exportable version of the Gantt chart
 * Renders fresh content with optimal date range based on actual items
 */
const createExportableContent = async (options) => {
  const {
    title = 'Tidslinje',
    viewStart,
    viewEnd,
    wheelStructure,
    locale = 'sv',
    groupedItems = {},
    allItems = [],
  } = options;
  
  const dateLocale = locale === 'sv' ? sv : enUS;
  const dateFormat = 'd MMM yyyy';
  
  // Calculate optimal date range based on actual items
  const { start: optimalStart, end: optimalEnd } = calculateOptimalDateRange(allItems, viewStart, viewEnd);
  
  // Generate months for the optimal range
  const months = eachMonthOfInterval({ start: optimalStart, end: optimalEnd });
  const totalDays = differenceInDays(optimalEnd, optimalStart) + 1;
  
  // Create container for export
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    width: max-content;
    min-width: 1200px;
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
          ${format(optimalStart, dateFormat, { locale: dateLocale })} – ${format(optimalEnd, dateFormat, { locale: dateLocale })}
        </p>
      </div>
      <div style="text-align: right; font-size: 12px; color: #9CA3AF;">
        ${locale === 'sv' ? 'Exporterad' : 'Exported'}: ${format(new Date(), 'yyyy-MM-dd HH:mm', { locale: dateLocale })}
      </div>
    </div>
  `;
  container.appendChild(header);
  
  // Add legend for activity groups (only those with visible items)
  const usedActivityGroupIds = new Set();
  allItems.forEach(item => {
    if (item.activityId) usedActivityGroupIds.add(item.activityId);
  });
  
  const usedGroups = (wheelStructure?.activityGroups || []).filter(g => 
    g.visible !== false && usedActivityGroupIds.has(g.id)
  );
  
  if (usedGroups.length > 0) {
    const legend = document.createElement('div');
    legend.style.cssText = `
      padding: 12px 32px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    `;
    
    usedGroups.forEach(group => {
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
  
  // Calculate timeline width (more compact for print)
  const leftPaneWidth = 200;
  const timelineWidth = Math.max(800, months.length * 80); // ~80px per month
  
  // Create main content area
  const mainContent = document.createElement('div');
  mainContent.style.cssText = `
    display: flex;
    background: white;
  `;
  
  // Left pane: Group headers and item names
  const leftPane = document.createElement('div');
  leftPane.style.cssText = `
    flex-shrink: 0;
    width: ${leftPaneWidth}px;
    border-right: 1px solid #E5E7EB;
  `;
  
  // Right pane: Timeline with header and bars
  const rightPane = document.createElement('div');
  rightPane.style.cssText = `
    flex: 1;
    min-width: ${timelineWidth}px;
  `;
  
  // Timeline header (months)
  const timelineHeader = document.createElement('div');
  timelineHeader.style.cssText = `
    display: flex;
    border-bottom: 1px solid #E5E7EB;
    background: #F9FAFB;
    height: 36px;
  `;
  
  months.forEach(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const monthWidth = (daysInMonth / totalDays) * timelineWidth;
    
    const monthCell = document.createElement('div');
    monthCell.style.cssText = `
      flex-shrink: 0;
      width: ${monthWidth}px;
      padding: 8px 4px;
      text-align: center;
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      border-right: 1px solid #E5E7EB;
      box-sizing: border-box;
    `;
    monthCell.textContent = format(month, 'MMM yyyy', { locale: dateLocale });
    timelineHeader.appendChild(monthCell);
  });
  rightPane.appendChild(timelineHeader);
  
  // Left pane header (spacer)
  const leftHeader = document.createElement('div');
  leftHeader.style.cssText = `
    height: 36px;
    background: #F9FAFB;
    border-bottom: 1px solid #E5E7EB;
  `;
  leftPane.appendChild(leftHeader);
  
  // Helper to calculate position and width of a bar
  const calculateBarPosition = (itemStart, itemEnd) => {
    const start = new Date(itemStart);
    const end = new Date(itemEnd);
    
    // Clamp to visible range
    const visibleStart = start < optimalStart ? optimalStart : start;
    const visibleEnd = end > optimalEnd ? optimalEnd : end;
    
    const daysFromStart = differenceInDays(visibleStart, optimalStart);
    const barDays = differenceInDays(visibleEnd, visibleStart) + 1;
    
    const left = (daysFromStart / totalDays) * timelineWidth;
    const width = Math.max(20, (barDays / totalDays) * timelineWidth); // Min 20px width
    
    return { left, width };
  };
  
  // Render grouped items
  const groupIds = Object.keys(groupedItems);
  const ROW_HEIGHT = 32;
  const GROUP_HEADER_HEIGHT = 28;
  
  groupIds.forEach(groupId => {
    const items = groupedItems[groupId] || [];
    if (items.length === 0) return;
    
    // Find group info
    const ring = wheelStructure?.rings?.find(r => r.id === groupId);
    const label = wheelStructure?.labels?.find(l => l.id === groupId);
    const activityGroup = wheelStructure?.activityGroups?.find(a => a.id === groupId);
    const groupName = ring?.name || label?.name || activityGroup?.name || groupId;
    const groupColor = ring?.color || label?.color || activityGroup?.color || '#94A3B8';
    
    // Group header - left side
    const groupHeaderLeft = document.createElement('div');
    groupHeaderLeft.style.cssText = `
      height: ${GROUP_HEADER_HEIGHT}px;
      padding: 4px 12px;
      background: #F3F4F6;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
    `;
    groupHeaderLeft.innerHTML = `
      <span style="width: 10px; height: 10px; border-radius: 2px; background: ${groupColor}; flex-shrink: 0;"></span>
      ${groupName}
    `;
    leftPane.appendChild(groupHeaderLeft);
    
    // Group header - right side (empty row)
    const groupHeaderRight = document.createElement('div');
    groupHeaderRight.style.cssText = `
      height: ${GROUP_HEADER_HEIGHT}px;
      background: #F3F4F6;
      border-bottom: 1px solid #E5E7EB;
    `;
    rightPane.appendChild(groupHeaderRight);
    
    // Item rows
    items.forEach(item => {
      const itemActivityGroup = wheelStructure?.activityGroups?.find(a => a.id === item.activityId);
      const barColor = itemActivityGroup?.color || groupColor;
      
      // Item name - left side
      const itemRowLeft = document.createElement('div');
      itemRowLeft.style.cssText = `
        height: ${ROW_HEIGHT}px;
        padding: 0 12px 0 24px;
        border-bottom: 1px solid #F3F4F6;
        display: flex;
        align-items: center;
        font-size: 11px;
        color: #4B5563;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      itemRowLeft.textContent = item.name || 'Unnamed';
      leftPane.appendChild(itemRowLeft);
      
      // Item bar - right side
      const itemRowRight = document.createElement('div');
      itemRowRight.style.cssText = `
        height: ${ROW_HEIGHT}px;
        border-bottom: 1px solid #F3F4F6;
        position: relative;
      `;
      
      const { left, width } = calculateBarPosition(item.startDate, item.endDate);
      
      const bar = document.createElement('div');
      bar.style.cssText = `
        position: absolute;
        top: 6px;
        left: ${left}px;
        width: ${width}px;
        height: 20px;
        background: ${barColor};
        border-radius: 4px;
        display: flex;
        align-items: center;
        padding: 0 6px;
        font-size: 10px;
        color: white;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      // Only show name on bar if it has enough width
      if (width > 60) {
        bar.textContent = item.name || '';
      }
      itemRowRight.appendChild(bar);
      rightPane.appendChild(itemRowRight);
    });
  });
  
  mainContent.appendChild(leftPane);
  mainContent.appendChild(rightPane);
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
