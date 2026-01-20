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
 * Export rendered HTML to PDF
 * Expects a complete HTML document with styling already included
 */
export async function exportToPDF(html, filename = 'report.pdf') {
  const options = {
    margin: [10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  try {
    await html2pdf().set(options).from(html).save();
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
