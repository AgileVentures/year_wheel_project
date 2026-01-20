import Handlebars from 'handlebars';
import html2pdf from 'html2pdf.js';
import { supabase } from '../lib/supabase';

/**
 * Template Service - Handles report template rendering with Handlebars
 * Supports placeholders, iterators, and conditional logic
 */

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
});

Handlebars.registerHelper('formatDateTime', function(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('sv-SE', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifContains', function(array, value, options) {
  if (array && array.includes(value)) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('add', function(a, b) {
  return a + b;
});

Handlebars.registerHelper('subtract', function(a, b) {
  return a - b;
});

Handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

Handlebars.registerHelper('divide', function(a, b) {
  return b !== 0 ? a / b : 0;
});

Handlebars.registerHelper('pluralize', function(count, singular, plural) {
  return count === 1 ? singular : plural;
});

Handlebars.registerHelper('uppercase', function(str) {
  return str ? str.toUpperCase() : '';
});

Handlebars.registerHelper('lowercase', function(str) {
  return str ? str.toLowerCase() : '';
});

Handlebars.registerHelper('truncate', function(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
});

Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context, null, 2);
});

/**
 * Build template data context from wheel data
 */
export function buildTemplateContext(wheelData, pageData, organizationData) {
  const { rings = [], activityGroups = [], labels = [], items = [] } = organizationData || {};
  
  // Build months with associated items
  const monthNames = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
  ];
  
  const months = monthNames.map((name, index) => {
    const monthItems = items.filter(item => {
      const startDate = new Date(item.startDate);
      return startDate.getMonth() === index && startDate.getFullYear() === (pageData?.year || wheelData.year);
    }).map(item => enrichItem(item, rings, activityGroups, labels));
    
    return {
      name,
      index,
      items: monthItems,
      itemCount: monthItems.length
    };
  });
  
  // Enrich rings with item counts
  const enrichedRings = rings.map(ring => ({
    ...ring,
    items: items.filter(item => item.ringId === ring.id).map(item => enrichItem(item, rings, activityGroups, labels)),
    itemCount: items.filter(item => item.ringId === ring.id).length
  }));
  
  // Enrich activity groups with items
  const enrichedActivityGroups = activityGroups.map(group => ({
    ...group,
    items: items.filter(item => item.activityId === group.id).map(item => enrichItem(item, rings, activityGroups, labels)),
    itemCount: items.filter(item => item.activityId === group.id).length
  }));
  
  // Enrich labels with items
  const enrichedLabels = labels.map(label => ({
    ...label,
    items: items.filter(item => item.labelId === label.id).map(item => enrichItem(item, rings, activityGroups, labels)),
    itemCount: items.filter(item => item.labelId === label.id).length
  }));
  
  // Calculate statistics
  const stats = {
    totalItems: items.length,
    totalRings: rings.length,
    totalActivityGroups: activityGroups.length,
    totalLabels: labels.length,
    itemsByMonth: months.map(m => m.itemCount),
    itemsByRing: enrichedRings.map(r => ({ name: r.name, count: r.itemCount })),
    itemsByGroup: enrichedActivityGroups.map(g => ({ name: g.name, count: g.itemCount })),
    itemsByLabel: enrichedLabels.map(l => ({ name: l.name, count: l.itemCount }))
  };
  
  return {
    wheel: {
      id: wheelData.id,
      title: wheelData.title,
      year: pageData?.year || wheelData.year,
      colors: wheelData.colors || {},
      showWeekRing: wheelData.showWeekRing,
      showMonthRing: wheelData.showMonthRing,
      showRingNames: wheelData.showRingNames,
      showLabels: wheelData.showLabels
    },
    page: pageData ? {
      id: pageData.id,
      title: pageData.title,
      year: pageData.year,
      pageOrder: pageData.pageOrder
    } : null,
    months,
    rings: enrichedRings,
    activityGroups: enrichedActivityGroups,
    labels: enrichedLabels,
    items: items.map(item => enrichItem(item, rings, activityGroups, labels)),
    stats,
    currentDate: new Date().toLocaleDateString('sv-SE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  };
}

/**
 * Enrich item with related data
 */
function enrichItem(item, rings, activityGroups, labels) {
  const ring = rings.find(r => r.id === item.ringId);
  const activityGroup = activityGroups.find(a => a.id === item.activityId);
  const label = item.labelId ? labels.find(l => l.id === item.labelId) : null;
  
  return {
    ...item,
    ringName: ring?.name || 'Unknown Ring',
    ringColor: ring?.color || '#94A3B8',
    activityName: activityGroup?.name || 'Unknown Group',
    activityColor: activityGroup?.color || '#94A3B8',
    labelName: label?.name || null,
    labelColor: label?.color || null
  };
}

/**
 * Render template with data context
 */
export function renderTemplate(templateContent, context) {
  try {
    const template = Handlebars.compile(templateContent);
    return template(context);
  } catch (error) {
    console.error('Template rendering error:', error);
    throw new Error(`Template rendering failed: ${error.message}`);
  }
}

/**
 * Wrap content in full HTML document with Tailwind-like CSS for PDF export
 */
export function wrapInPdfDocument(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* Base styles */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1e293b;
      padding: 40px;
    }
    
    /* Typography */
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; color: #0f172a; }
    h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; color: #1e293b; }
    h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #334155; }
    h4 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: #475569; }
    p { margin-bottom: 0.75rem; }
    
    /* Tailwind-style utilities */
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-base { font-size: 1rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-3xl { font-size: 1.875rem; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-normal { font-weight: 400; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    
    /* Colors */
    .text-gray-400 { color: #9ca3af; }
    .text-gray-500 { color: #6b7280; }
    .text-gray-600 { color: #4b5563; }
    .text-gray-700 { color: #374151; }
    .text-gray-800 { color: #1f2937; }
    .text-gray-900 { color: #111827; }
    .text-slate-400 { color: #94a3b8; }
    .text-slate-500 { color: #64748b; }
    .text-slate-600 { color: #475569; }
    .text-slate-700 { color: #334155; }
    .text-slate-800 { color: #1e293b; }
    .text-slate-900 { color: #0f172a; }
    .text-blue-600 { color: #2563eb; }
    .text-green-600 { color: #16a34a; }
    .text-red-600 { color: #dc2626; }
    
    /* Backgrounds */
    .bg-white { background-color: #ffffff; }
    .bg-gray-50 { background-color: #f9fafb; }
    .bg-gray-100 { background-color: #f3f4f6; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100 { background-color: #f1f5f9; }
    .bg-blue-50 { background-color: #eff6ff; }
    .bg-blue-100 { background-color: #dbeafe; }
    .bg-green-50 { background-color: #f0fdf4; }
    
    /* Spacing */
    .p-2 { padding: 0.5rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .p-5 { padding: 1.25rem; }
    .p-6 { padding: 1.5rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .m-2 { margin: 0.5rem; }
    .m-4 { margin: 1rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }
    .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
    .my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
    
    /* Borders */
    .border { border: 1px solid #e2e8f0; }
    .border-t { border-top: 1px solid #e2e8f0; }
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .border-l { border-left: 1px solid #e2e8f0; }
    .border-l-4 { border-left: 4px solid #e2e8f0; }
    .border-gray-200 { border-color: #e5e7eb; }
    .border-slate-200 { border-color: #e2e8f0; }
    .border-blue-500 { border-color: #3b82f6; }
    .rounded { border-radius: 0.25rem; }
    .rounded-md { border-radius: 0.375rem; }
    .rounded-lg { border-radius: 0.5rem; }
    
    /* Flexbox & Grid */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .gap-2 { gap: 0.5rem; }
    .gap-4 { gap: 1rem; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #475569; }
    
    /* Lists */
    ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
    li { margin-bottom: 0.25rem; }
    .list-none { list-style: none; padding-left: 0; }
    
    /* Print/PDF */
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
    
    /* Shadow (visual only, may not render in PDF) */
    .shadow { box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .shadow-md { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Export rendered HTML to PDF
 */
export async function exportToPDF(html, filename = 'report.pdf') {
  // Wrap in full document with CSS
  const fullDocument = wrapInPdfDocument(html);
  
  const options = {
    margin: [10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  try {
    await html2pdf().set(options).from(fullDocument).save();
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error(`PDF export failed: ${error.message}`);
  }
}

/**
 * Fetch all templates (user's + system)
 * Returns: user-wide templates (wheel_id = null), wheel-specific templates, and system templates
 */
export async function fetchTemplates(wheelId = null) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    let query = supabase
      .from('report_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (wheelId && userId) {
      // Get: system templates, user's global templates, and wheel-specific templates
      query = query.or(`is_system.eq.true,and(user_id.eq.${userId},wheel_id.is.null),and(user_id.eq.${userId},wheel_id.eq.${wheelId})`);
    } else if (userId) {
      // Get: system templates and user's global templates
      query = query.or(`is_system.eq.true,and(user_id.eq.${userId},wheel_id.is.null)`);
    } else {
      // Only system templates for non-authenticated users
      query = query.eq('is_system', true);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
}

/**
 * Fetch single template
 */
export async function fetchTemplate(templateId) {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
}

/**
 * Create new template
 * If wheel_id is not provided, creates a user-wide template (visible on all wheels)
 */
export async function createTemplate(template) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        user_id: userData.user.id,
        wheel_id: template.wheel_id || null, // null = user-wide template
        ...template
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}

/**
 * Update template
 */
export async function updateTemplate(templateId, updates) {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
}

/**
 * Delete template
 */
export async function deleteTemplate(templateId) {
  try {
    const { error } = await supabase
      .from('report_templates')
      .delete()
      .eq('id', templateId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

/**
 * Validate template syntax
 */
export function validateTemplate(templateContent) {
  try {
    Handlebars.compile(templateContent);
    return { valid: true, error: null };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      line: error.line,
      column: error.column
    };
  }
}

/**
 * Get available template variables for documentation
 */
export function getTemplateVariables() {
  return {
    wheel: ['id', 'title', 'year', 'colors', 'showWeekRing', 'showMonthRing', 'showRingNames', 'showLabels'],
    page: ['id', 'title', 'year', 'pageOrder'],
    months: ['name', 'index', 'items', 'itemCount'],
    rings: ['id', 'name', 'type', 'color', 'visible', 'items', 'itemCount'],
    activityGroups: ['id', 'name', 'color', 'visible', 'items', 'itemCount'],
    labels: ['id', 'name', 'color', 'visible', 'items', 'itemCount'],
    items: ['id', 'name', 'startDate', 'endDate', 'ringId', 'activityId', 'labelId', 'ringName', 'activityName', 'labelName', 'ringColor', 'activityColor', 'labelColor'],
    stats: ['totalItems', 'totalRings', 'totalActivityGroups', 'totalLabels', 'itemsByMonth', 'itemsByRing', 'itemsByGroup', 'itemsByLabel'],
    helpers: ['formatDate', 'formatDateTime', 'ifEquals', 'ifContains', 'add', 'subtract', 'multiply', 'divide', 'pluralize', 'uppercase', 'lowercase', 'truncate', 'json']
  };
}

export default {
  buildTemplateContext,
  renderTemplate,
  exportToPDF,
  fetchTemplates,
  fetchTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  validateTemplate,
  getTemplateVariables
};
