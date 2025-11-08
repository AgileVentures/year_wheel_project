/**
 * Export Service
 * Handles exporting Year Wheel data to various formats:
 * - Google Sheets (creates/updates a spreadsheet)
 * - Excel (.xlsx file download)
 * - CSV (for maximum compatibility)
 */

import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

/**
 * Helper function to get ISO week number
 */
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Helper function to get month name
 */
function getMonthName(date, language = 'sv') {
  const d = new Date(date);
  const months = {
    sv: ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };
  return months[language]?.[d.getMonth()] || months.sv[d.getMonth()];
}

/**
 * Transform wheelStructure into a flat array suitable for spreadsheet export
 * @param {Object} wheelStructure - The wheel's organization data
 * @param {Object} options - Export options
 * @returns {Array} Array of row objects
 */
export function transformDataForExport(wheelStructure, options = {}) {
  const { 
    year, 
    title, 
    includeRingNames = true, 
    includeActivityGroups = true, 
    includeLabels = true,
    includeDescription = false,
    includeTime = true,
    includeStartMonth = false,
    includeEndMonth = false,
    includeStartWeek = false,
    includeEndWeek = false,
    columnNames = {},
    language = 'sv'
  } = options;
  
  if (!wheelStructure || !wheelStructure.items) {
    return [];
  }

  // Default column names (can be overridden)
  const defaultColumnNames = {
    name: language === 'sv' ? 'Aktivitet' : 'Activity',
    startDate: language === 'sv' ? 'Startdatum' : 'Start Date',
    endDate: language === 'sv' ? 'Slutdatum' : 'End Date',
    time: language === 'sv' ? 'Tid' : 'Time',
    description: language === 'sv' ? 'Beskrivning' : 'Description',
    ring: language === 'sv' ? 'Ring' : 'Ring',
    activityGroup: language === 'sv' ? 'Aktivitetsgrupp' : 'Activity Group',
    label: language === 'sv' ? 'Etikett' : 'Label',
    startMonth: language === 'sv' ? 'Startmånad' : 'Start Month',
    endMonth: language === 'sv' ? 'Slutmånad' : 'End Month',
    startWeek: language === 'sv' ? 'Startvecka' : 'Start Week',
    endWeek: language === 'sv' ? 'Slutvecka' : 'End Week',
  };

  const cols = { ...defaultColumnNames, ...columnNames };

  // Create lookup maps for better performance
  const ringsMap = new Map((wheelStructure.rings || []).map(r => [r.id, r]));
  const activityGroupsMap = new Map((wheelStructure.activityGroups || []).map(a => [a.id, a]));
  const labelsMap = new Map((wheelStructure.labels || []).map(l => [l.id, l]));

  // Transform items into flat rows
  const rows = wheelStructure.items.map(item => {
    const row = {
      [cols.name]: item.name || '',
      [cols.startDate]: item.startDate || '',
      [cols.endDate]: item.endDate || '',
    };

    // Add start month if requested
    if (includeStartMonth && item.startDate) {
      row[cols.startMonth] = getMonthName(item.startDate, language);
    }

    // Add end month if requested
    if (includeEndMonth && item.endDate) {
      row[cols.endMonth] = getMonthName(item.endDate, language);
    }

    // Add start week if requested
    if (includeStartWeek && item.startDate) {
      row[cols.startWeek] = getISOWeek(item.startDate);
    }

    // Add end week if requested
    if (includeEndWeek && item.endDate) {
      row[cols.endWeek] = getISOWeek(item.endDate);
    }

    // Add time if it exists and is requested
    if (includeTime && item.time) {
      row[cols.time] = item.time;
    }

    // Add description if requested
    if (includeDescription && item.description) {
      row[cols.description] = item.description;
    }

    // Add ring name if requested
    if (includeRingNames && item.ringId) {
      const ring = ringsMap.get(item.ringId);
      row[cols.ring] = ring?.name || '';
    }

    // Add activity group if requested
    if (includeActivityGroups && item.activityId) {
      const activityGroup = activityGroupsMap.get(item.activityId);
      row[cols.activityGroup] = activityGroup?.name || '';
    }

    // Add label if requested
    if (includeLabels && item.labelId) {
      const label = labelsMap.get(item.labelId);
      row[cols.label] = label?.name || '';
    }

    return row;
  });

  // Sort by start date
  rows.sort((a, b) => {
    const dateA = new Date(a[cols.startDate]);
    const dateB = new Date(b[cols.startDate]);
    return dateA - dateB;
  });

  return rows;
}

/**
 * Export data to Excel (.xlsx) file
 * @param {Object} wheelStructure - The wheel's organization data
 * @param {Object} options - Export options
 * @returns {void} Downloads the file
 */
export function exportToExcel(wheelStructure, options = {}) {
  const { year = '2025', title = 'Årshjul', filename } = options;
  
  // Transform data
  const rows = transformDataForExport(wheelStructure, options);

  if (rows.length === 0) {
    throw new Error('Inga aktiviteter att exportera');
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Convert rows to worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths for better readability
  const colWidths = [
    { wch: 30 }, // Aktivitet
    { wch: 12 }, // Startdatum
    { wch: 12 }, // Slutdatum
    { wch: 15 }, // Tid (if present)
    { wch: 20 }, // Ring
    { wch: 25 }, // Aktivitetsgrupp
    { wch: 25 }, // Etikett
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, year);

  // Generate filename
  const safeTitle = title.trim() ? title.replace(/\s+/g, '_') : 'Arshjul';
  const exportFilename = filename || `${safeTitle}_${year}.xlsx`;

  // Download file
  XLSX.writeFile(wb, exportFilename);
  
  return exportFilename;
}

/**
 * Export data to CSV file
 * @param {Object} wheelStructure - The wheel's organization data
 * @param {Object} options - Export options
 * @returns {void} Downloads the file
 */
export function exportToCSV(wheelStructure, options = {}) {
  const { year = '2025', title = 'Årshjul', filename } = options;
  
  // Transform data
  const rows = transformDataForExport(wheelStructure, options);

  if (rows.length === 0) {
    throw new Error('Inga aktiviteter att exportera');
  }

  // Create workbook (we'll use XLSX to generate CSV for consistency)
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  // Generate filename
  const safeTitle = title.trim() ? title.replace(/\s+/g, '_') : 'Arshjul';
  const exportFilename = filename || `${safeTitle}_${year}.csv`;

  // Download as CSV
  XLSX.writeFile(wb, exportFilename, { bookType: 'csv' });
  
  return exportFilename;
}

/**
 * Create or update a Google Sheet with the wheel data
 * Requires existing Google Sheets integration
 * @param {Object} wheelStructure - The wheel's organization data
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Result with spreadsheet URL
 */
export async function exportToGoogleSheets(wheelStructure, options = {}) {
  const { 
    year = '2025', 
    title = 'Årshjul',
    spreadsheetId = null, // Optional: update existing sheet
    sheetName = year, // Default sheet name is the year
  } = options;

  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Du måste vara inloggad för att exportera till Google Sheets');
  }

  // Transform data to rows
  const rows = transformDataForExport(wheelStructure, {
    ...options,
    includeRingNames: true,
    includeActivityGroups: true,
    includeLabels: true
  });

  if (rows.length === 0) {
    throw new Error('Inga aktiviteter att exportera');
  }

  // Convert rows to 2D array format for Google Sheets API
  // First row is headers
  const headers = Object.keys(rows[0]);
  const values = [
    headers, // Header row
    ...rows.map(row => headers.map(header => row[header] || ''))
  ];

  // Call Supabase Edge Function to create/update Google Sheet
  const { data, error } = await supabase.functions.invoke('google-sheets-export', {
    body: {
      spreadsheetId, // null to create new, or existing ID to update
      sheetName,
      title: `${title} - ${year}`,
      values
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) {
    console.error('Google Sheets export error:', error);
    throw new Error(error.message || 'Kunde inte exportera till Google Sheets');
  }

  return data; // Returns { spreadsheetId, spreadsheetUrl, sheetName }
}

/**
 * Generate a preview of export data (for UI display)
 * @param {Object} wheelStructure - The wheel's organization data
 * @param {Object} options - Export options including maxRows
 * @returns {Object} Preview data with headers and sample rows
 */
export function getExportPreview(wheelStructure, options = {}) {
  const { maxRows = 5, ...exportOptions } = options;
  
  const rows = transformDataForExport(wheelStructure, exportOptions);

  if (rows.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = Object.keys(rows[0]);
  const previewRows = rows.slice(0, maxRows);

  return {
    headers,
    rows: previewRows,
    totalRows: rows.length
  };
}

/**
 * Get supported export formats
 * @returns {Array} List of export format objects
 */
export function getExportFormats() {
  return [
    {
      id: 'excel',
      name: 'Excel (.xlsx)',
      description: 'Ladda ner som Excel-fil',
      icon: 'FileSpreadsheet',
      requiresAuth: false,
      requiresPremium: false
    },
    {
      id: 'csv',
      name: 'CSV',
      description: 'Kommaseparerad textfil',
      icon: 'FileText',
      requiresAuth: false,
      requiresPremium: false
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: 'Exportera till Google Sheets',
      icon: 'Sheet',
      requiresAuth: true,
      requiresPremium: true,
      requiresIntegration: 'google_sheets'
    }
  ];
}
