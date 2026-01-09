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

import { format, startOfMonth, endOfMonth, differenceInDays, eachMonthOfInterval } from 'date-fns';
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
 * Renders fresh content with customizable options
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
    // New customization options
    showNamesPanel = true,
    showDatesOnBars = false,
    showLegend = true,
  } = options;
  
  const dateLocale = locale === 'sv' ? sv : enUS;
  const dateFormat = 'd MMM yyyy';
  const shortDateFormat = 'd MMM';
  
  // Use the provided date range (already calculated by modal)
  const exportStart = viewStart;
  const exportEnd = viewEnd;
  
  // Generate months for the range
  const months = eachMonthOfInterval({ start: exportStart, end: exportEnd });
  const totalDays = differenceInDays(exportEnd, exportStart) + 1;
  
  // Create container for export
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    width: max-content;
    min-width: ${showNamesPanel ? '1200px' : '900px'};
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
          ${format(exportStart, dateFormat, { locale: dateLocale })} – ${format(exportEnd, dateFormat, { locale: dateLocale })}
        </p>
      </div>
      <div style="text-align: right; font-size: 12px; color: #9CA3AF;">
        ${locale === 'sv' ? 'Exporterad' : 'Exported'}: ${format(new Date(), 'yyyy-MM-dd HH:mm', { locale: dateLocale })}
      </div>
    </div>
  `;
  container.appendChild(header);
  
  // Add legend for activity groups (only those with visible items)
  if (showLegend) {
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
  
  // Left pane: Group headers and item names (conditional)
  let leftPane = null;
  if (showNamesPanel) {
    leftPane = document.createElement('div');
    leftPane.style.cssText = `
      flex-shrink: 0;
      width: ${leftPaneWidth}px;
      border-right: 1px solid #E5E7EB;
    `;
    
    // Left pane header (spacer)
    const leftHeader = document.createElement('div');
    leftHeader.style.cssText = `
      height: 36px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    `;
    leftPane.appendChild(leftHeader);
  }
  
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
  
  // Helper to calculate position and width of a bar
  const calculateBarPosition = (itemStart, itemEnd) => {
    const start = new Date(itemStart);
    const end = new Date(itemEnd);
    
    // Clamp to visible range
    const visibleStart = start < exportStart ? exportStart : start;
    const visibleEnd = end > exportEnd ? exportEnd : end;
    
    const daysFromStart = differenceInDays(visibleStart, exportStart);
    const barDays = differenceInDays(visibleEnd, visibleStart) + 1;
    
    const left = (daysFromStart / totalDays) * timelineWidth;
    const width = Math.max(20, (barDays / totalDays) * timelineWidth); // Min 20px width
    
    return { left, width };
  };
  
  // Helper to format bar content based on options
  const formatBarContent = (item, width) => {
    const itemName = item.name || 'Unnamed';
    
    if (showDatesOnBars && width > 100) {
      // Show name + dates
      const startStr = format(new Date(item.startDate), shortDateFormat, { locale: dateLocale });
      const endStr = format(new Date(item.endDate), shortDateFormat, { locale: dateLocale });
      return `${itemName} (${startStr} - ${endStr})`;
    } else if (showDatesOnBars && width > 60) {
      // Show just dates
      const startStr = format(new Date(item.startDate), 'd/M', { locale: dateLocale });
      const endStr = format(new Date(item.endDate), 'd/M', { locale: dateLocale });
      return `${startStr}-${endStr}`;
    } else if (width > 60) {
      return itemName;
    }
    return '';
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
    
    // Group header - left side (conditional)
    if (showNamesPanel && leftPane) {
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
    }
    
    // Group header - right side (with group name if no left pane)
    const groupHeaderRight = document.createElement('div');
    groupHeaderRight.style.cssText = `
      height: ${GROUP_HEADER_HEIGHT}px;
      background: #F3F4F6;
      border-bottom: 1px solid #E5E7EB;
      ${!showNamesPanel ? 'padding: 4px 12px; display: flex; align-items: center; gap: 8px;' : ''}
    `;
    if (!showNamesPanel) {
      groupHeaderRight.innerHTML = `
        <span style="width: 10px; height: 10px; border-radius: 2px; background: ${groupColor}; flex-shrink: 0;"></span>
        <span style="font-size: 12px; font-weight: 600; color: #374151;">${groupName}</span>
      `;
    }
    rightPane.appendChild(groupHeaderRight);
    
    // Item rows
    items.forEach(item => {
      const itemActivityGroup = wheelStructure?.activityGroups?.find(a => a.id === item.activityId);
      const barColor = itemActivityGroup?.color || groupColor;
      
      // Item name - left side (conditional)
      if (showNamesPanel && leftPane) {
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
      }
      
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
      bar.textContent = formatBarContent(item, width);
      itemRowRight.appendChild(bar);
      rightPane.appendChild(itemRowRight);
    });
  });
  
  if (showNamesPanel && leftPane) {
    mainContent.appendChild(leftPane);
  }
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
  const { title = 'timeline', pdfSize = 'auto' } = options;
  
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
    
    // Calculate PDF dimensions based on pdfSize option
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const aspectRatio = imgWidth / imgHeight;
    
    let pdfWidth, pdfHeight, orientation;
    
    switch (pdfSize) {
      case 'a4':
        // Force A4 landscape (297 × 210 mm)
        orientation = 'landscape';
        pdfWidth = 297;
        pdfHeight = 210;
        break;
      case 'a3':
        // Force A3 landscape (420 × 297 mm)
        orientation = 'landscape';
        pdfWidth = 420;
        pdfHeight = 297;
        break;
      case 'fit':
        // Fit to single page (maintain aspect ratio, constrain to A3 max)
        orientation = aspectRatio > 1 ? 'landscape' : 'portrait';
        if (aspectRatio > 1) {
          pdfWidth = Math.min(420, imgWidth * 0.264583); // pixels to mm at 96 DPI
          pdfHeight = pdfWidth / aspectRatio;
          if (pdfHeight > 297) {
            pdfHeight = 297;
            pdfWidth = pdfHeight * aspectRatio;
          }
        } else {
          pdfHeight = Math.min(420, imgHeight * 0.264583);
          pdfWidth = pdfHeight * aspectRatio;
          if (pdfWidth > 297) {
            pdfWidth = 297;
            pdfHeight = pdfWidth / aspectRatio;
          }
        }
        break;
      case 'auto':
      default:
        // Auto size (custom dimensions based on content)
        pdfWidth = 297; // Start with A4 landscape width
        pdfHeight = pdfWidth / aspectRatio;
        
        // Cap at A3 height
        if (pdfHeight > 420) {
          pdfHeight = 420;
          pdfWidth = pdfHeight * aspectRatio;
        }
        orientation = aspectRatio > 1 ? 'landscape' : 'portrait';
        break;
    }
    
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pdfSize === 'a4' || pdfSize === 'a3' ? pdfSize.toUpperCase() : [pdfWidth, pdfHeight],
    });
    
    // Get actual PDF page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Scale image to fit PDF page
    let finalWidth, finalHeight;
    if (pdfSize === 'a4' || pdfSize === 'a3' || pdfSize === 'fit') {
      // Scale to fit within page margins
      const margin = 5; // mm
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2);
      
      const scaleX = maxWidth / imgWidth;
      const scaleY = maxHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY);
      
      finalWidth = imgWidth * scale;
      finalHeight = imgHeight * scale;
      
      // Center on page
      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
    } else {
      // Auto: fill page
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    }
    
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

/**
 * Export Gantt data as CSV
 * Exports all items with columns: Name, Start Date, End Date, Group, Activity Group, Labels
 */
export const exportGanttAsCSV = async (options) => {
  const {
    title = 'timeline',
    allItems = [],
    wheelStructure,
    locale = 'sv',
    viewStart,
    viewEnd,
  } = options;
  
  try {
    const dateLocale = locale === 'sv' ? sv : enUS;
    
    // Filter items within date range
    const filteredItems = allItems.filter(item => {
      if (!item.startDate || !item.endDate) return false;
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      return start <= viewEnd && end >= viewStart;
    });
    
    // Build CSV rows
    const headers = [
      locale === 'sv' ? 'Namn' : 'Name',
      locale === 'sv' ? 'Startdatum' : 'Start Date',
      locale === 'sv' ? 'Slutdatum' : 'End Date',
      locale === 'sv' ? 'Ring' : 'Ring',
      locale === 'sv' ? 'Aktivitetsgrupp' : 'Activity Group',
      locale === 'sv' ? 'Etikett' : 'Label',
      locale === 'sv' ? 'Beskrivning' : 'Description',
    ];
    
    const rows = filteredItems.map(item => {
      // Find related entities
      const ring = wheelStructure?.rings?.find(r => r.id === item.ringId);
      const activityGroup = wheelStructure?.activityGroups?.find(a => a.id === item.activityId);
      const label = wheelStructure?.labels?.find(l => l.id === item.labelId);
      
      return [
        item.name || '',
        format(new Date(item.startDate), 'yyyy-MM-dd', { locale: dateLocale }),
        format(new Date(item.endDate), 'yyyy-MM-dd', { locale: dateLocale }),
        ring?.name || '',
        activityGroup?.name || '',
        label?.name || '',
        item.description || '',
      ];
    });
    
    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value) => {
      const str = String(value || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    // Build CSV content
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');
    
    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = generateFileName('csv', title);
    link.click();
    URL.revokeObjectURL(link.href);
    
    return true;
  } catch (error) {
    console.error('CSV export failed:', error);
    throw error;
  }
};

export default {
  exportAsPNG: exportGanttAsPNG,
  exportAsPDF: exportGanttAsPDF,
  exportAsCSV: exportGanttAsCSV,
  print: printGantt,
};
