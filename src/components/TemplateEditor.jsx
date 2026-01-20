import React, { useState, useEffect } from 'react';
import { 
  renderTemplate, 
  validateTemplate, 
  buildTemplateContext,
  exportToPDF,
  getTemplateVariables
} from '../services/templateService';

// Design themes with complete styling
const DESIGN_THEMES = {
  modern: {
    name: 'Modern',
    description: 'Clean and minimal',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#0ea5e9',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0'
    }
  },
  professional: {
    name: 'Professionell',
    description: 'Classic business style',
    colors: {
      primary: '#1e40af',
      secondary: '#374151',
      accent: '#059669',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textMuted: '#6b7280',
      border: '#d1d5db'
    }
  },
  warm: {
    name: 'Varm',
    description: 'Friendly and inviting',
    colors: {
      primary: '#ea580c',
      secondary: '#78716c',
      accent: '#f59e0b',
      background: '#fffbeb',
      surface: '#fef3c7',
      text: '#292524',
      textMuted: '#78716c',
      border: '#fcd34d'
    }
  },
  dark: {
    name: 'Mörk',
    description: 'Dark mode elegance',
    colors: {
      primary: '#60a5fa',
      secondary: '#9ca3af',
      accent: '#34d399',
      background: '#1f2937',
      surface: '#374151',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      border: '#4b5563'
    }
  },
  nature: {
    name: 'Natur',
    description: 'Green and organic',
    colors: {
      primary: '#16a34a',
      secondary: '#57534e',
      accent: '#84cc16',
      background: '#f0fdf4',
      surface: '#dcfce7',
      text: '#14532d',
      textMuted: '#57534e',
      border: '#86efac'
    }
  },
  corporate: {
    name: 'Företag',
    description: 'Formal and structured',
    colors: {
      primary: '#475569',
      secondary: '#64748b',
      accent: '#0284c7',
      background: '#ffffff',
      surface: '#f1f5f9',
      text: '#0f172a',
      textMuted: '#475569',
      border: '#cbd5e1'
    }
  }
};

// Generate CSS for a theme
const generateThemeCSS = (theme) => {
  const c = theme.colors;
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.7;
      color: ${c.text};
      background: ${c.background};
      padding: 48px;
    }
    
    /* Typography */
    h1 { 
      font-size: 2rem; 
      font-weight: 700; 
      margin-bottom: 0.75rem; 
      color: ${c.text};
      border-bottom: 3px solid ${c.primary};
      padding-bottom: 0.5rem;
    }
    h2 { 
      font-size: 1.5rem; 
      font-weight: 600; 
      margin-bottom: 0.75rem; 
      margin-top: 2rem;
      color: ${c.primary};
    }
    h3 { 
      font-size: 1.125rem; 
      font-weight: 600; 
      margin-bottom: 0.5rem; 
      color: ${c.secondary};
    }
    p { margin-bottom: 0.75rem; }
    strong { font-weight: 600; }
    
    /* Lists */
    ul, ol { 
      margin-bottom: 1rem; 
      padding-left: 1.5rem; 
    }
    li { 
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      background: ${c.surface};
      border-radius: 4px;
      list-style-position: inside;
    }
    
    /* Tables */
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 1rem 0;
      background: ${c.background};
    }
    th { 
      background: ${c.primary}; 
      color: white;
      padding: 12px 16px; 
      text-align: left; 
      font-weight: 600;
    }
    td { 
      padding: 10px 16px; 
      border-bottom: 1px solid ${c.border};
    }
    tr:nth-child(even) td {
      background: ${c.surface};
    }
    
    /* Cards/Sections */
    .section {
      margin: 1.5rem 0;
      padding: 1rem;
      background: ${c.surface};
      border-radius: 8px;
      border-left: 4px solid ${c.primary};
    }
    .card {
      margin: 0.75rem 0;
      padding: 1rem;
      background: ${c.background};
      border: 1px solid ${c.border};
      border-radius: 6px;
    }
    
    /* Item blocks */
    .item {
      margin: 0.5rem 0;
      padding: 0.75rem 1rem;
      background: ${c.surface};
      border-left: 4px solid ${c.accent};
      border-radius: 0 4px 4px 0;
    }
    .item-name {
      font-weight: 600;
      color: ${c.text};
    }
    .item-meta {
      font-size: 0.875rem;
      color: ${c.textMuted};
      margin-top: 0.25rem;
    }
    
    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .stat-box {
      text-align: center;
      padding: 1.5rem;
      background: ${c.surface};
      border-radius: 8px;
      border: 1px solid ${c.border};
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: ${c.primary};
    }
    .stat-label {
      font-size: 0.875rem;
      color: ${c.textMuted};
      margin-top: 0.25rem;
    }
    
    /* Footer */
    .footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid ${c.border};
      font-size: 0.875rem;
      color: ${c.textMuted};
    }
    
    /* Print */
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
    
    @media print {
      body { padding: 20px; }
    }
  `;
};

// Generate full HTML document
const generateHtmlDocument = (content, theme) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${generateThemeCSS(theme)}</style>
</head>
<body>
${content}
</body>
</html>`;
};

/**
 * TemplateEditor - Edit and preview report templates
 * Features: Syntax validation, live preview, design themes
 */
export default function TemplateEditor({ 
  template, 
  onSave, 
  onCancel,
  wheelData,
  pageData,
  organizationData 
}) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [templateContent, setTemplateContent] = useState(template?.template_content || '');
  const [category, setCategory] = useState(template?.category || 'custom');
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const [validation, setValidation] = useState({ valid: true, error: null });
  const [preview, setPreview] = useState('');
  const [showVariables, setShowVariables] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const variables = getTemplateVariables();
  const theme = DESIGN_THEMES[selectedTheme];

  // Validate template and update preview on content or theme change
  useEffect(() => {
    if (templateContent) {
      const result = validateTemplate(templateContent);
      setValidation(result);
      
      // Update preview if valid
      if (result.valid && wheelData && organizationData) {
        try {
          const context = buildTemplateContext(wheelData, pageData, organizationData);
          const rendered = renderTemplate(templateContent, context);
          setPreview(generateHtmlDocument(rendered, theme));
        } catch (error) {
          console.error('Template render error:', error);
          setPreview(generateHtmlDocument(`<div style="color: red; padding: 20px;">
            <strong>Preview Error:</strong><br>
            ${error.message}
          </div>`, theme));
        }
      } else if (!wheelData || !organizationData) {
        setPreview(generateHtmlDocument(`<div style="color: #64748b; padding: 20px; font-style: italic;">
          Ingen hjuldata tillgänglig. Öppna mallredigeraren från ett hjul för att se förhandsvisning.
        </div>`, theme));
      }
    }
  }, [templateContent, wheelData, pageData, organizationData, selectedTheme]);

  const handleSave = async () => {
    if (!validation.valid) {
      alert('Please fix template errors before saving');
      return;
    }

    if (!name.trim()) {
      alert('Please enter a template name');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        template_content: templateContent,
        category
      });
    } catch (error) {
      alert('Failed to save template: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPreview = async () => {
    if (!templateContent || !wheelData) return;
    
    setIsExporting(true);
    try {
      const context = buildTemplateContext(wheelData, pageData, organizationData);
      const rendered = renderTemplate(templateContent, context);
      const htmlDocument = generateHtmlDocument(rendered, theme);
      const filename = `${name.replace(/\s+/g, '_').toLowerCase() || 'rapport'}_${Date.now()}.pdf`;
      await exportToPDF(htmlDocument, filename);
    } catch (error) {
      alert('Failed to export PDF: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('template-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateContent;
    const before = text.substring(0, start);
    const after = text.substring(end);
    setTemplateContent(before + variable + after);
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  return (
    <div className="template-editor h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {template?.id ? 'Redigera mall' : 'Skapa ny mall'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowVariables(!showVariables)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
            >
              {showVariables ? 'Dölj variabler' : 'Visa variabler'}
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
            >
              {showPreview ? 'Dölj förhandsvisning' : 'Visa förhandsvisning'}
            </button>
            <button
              onClick={handleExportPreview}
              disabled={!preview || isExporting}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
            >
              {isExporting ? 'Exporterar...' : 'Exportera PDF'}
            </button>
          </div>
        </div>

        {/* Metadata fields */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mallnamn *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="t.ex. Månadsrapport"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="custom">Anpassad</option>
              <option value="monthly">Månatlig</option>
              <option value="activity">Aktivitet</option>
              <option value="summary">Sammanfattning</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designschema
            </label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(DESIGN_THEMES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.name} - {t.description}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beskrivning
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Beskriv vad mallen används till"
            />
          </div>
        </div>

        {/* Theme color preview */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">Färger:</span>
          <div className="flex gap-1">
            <div 
              className="w-5 h-5 rounded border border-gray-300" 
              style={{ background: theme.colors.primary }}
              title="Primär"
            />
            <div 
              className="w-5 h-5 rounded border border-gray-300" 
              style={{ background: theme.colors.secondary }}
              title="Sekundär"
            />
            <div 
              className="w-5 h-5 rounded border border-gray-300" 
              style={{ background: theme.colors.accent }}
              title="Accent"
            />
            <div 
              className="w-5 h-5 rounded border border-gray-300" 
              style={{ background: theme.colors.surface }}
              title="Bakgrund"
            />
          </div>
        </div>

        {/* Validation error */}
        {!validation.valid && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <strong>Template Error:</strong> {validation.error}
            {validation.line && ` (Line ${validation.line}${validation.column ? `, Column ${validation.column}` : ''})`}
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Variables sidebar */}
        {showVariables && (
          <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Tillgängliga variabler</h3>
            <div className="space-y-4">
              
              {/* Top-level variables */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Hjul & Sida</h4>
                <div className="space-y-1">
                  <button onClick={() => insertVariable('{{wheel.title}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">wheel.title</button>
                  <button onClick={() => insertVariable('{{wheel.year}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">wheel.year</button>
                  <button onClick={() => insertVariable('{{page.title}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">page.title</button>
                  <button onClick={() => insertVariable('{{currentDate}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">currentDate</button>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Statistik</h4>
                <div className="space-y-1">
                  <button onClick={() => insertVariable('{{stats.totalItems}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">stats.totalItems</button>
                  <button onClick={() => insertVariable('{{stats.totalRings}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">stats.totalRings</button>
                  <button onClick={() => insertVariable('{{stats.totalActivityGroups}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">stats.totalActivityGroups</button>
                </div>
              </div>
              
              {/* Loop context variables */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Loopar (använd bara fältnamn)</h4>
                <p className="text-xs text-gray-500 mb-2">I loopar: <code className="bg-gray-100 px-1">{'{{name}}'}</code> inte <code className="bg-gray-100 px-1 line-through">{'{{months.name}}'}</code></p>
                
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Månader:</p>
                  <button onClick={() => insertVariable('{{#each months}}\n  <p>{{name}} - {{itemCount}} aktiviteter</p>\n{{/each}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded mb-1">#each months</button>
                  <p className="text-xs text-gray-500 pl-2">→ name, index, items, itemCount</p>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Aktivitetsgrupper:</p>
                  <button onClick={() => insertVariable('{{#each activityGroups}}\n  <h3>{{name}}</h3>\n  {{#each items}}\n    <p>{{name}}</p>\n  {{/each}}\n{{/each}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded mb-1">#each activityGroups</button>
                  <p className="text-xs text-gray-500 pl-2">→ name, color, items, itemCount</p>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Ringar:</p>
                  <button onClick={() => insertVariable('{{#each rings}}\n  <p>{{name}} - {{itemCount}} aktiviteter</p>\n{{/each}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded mb-1">#each rings</button>
                  <p className="text-xs text-gray-500 pl-2">→ name, type, items, itemCount</p>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Aktiviteter:</p>
                  <button onClick={() => insertVariable('{{#each items}}\n  <p>{{name}}: {{ringName}} - {{activityName}}</p>\n{{/each}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded mb-1">#each items</button>
                  <p className="text-xs text-gray-500 pl-2">→ name, startDate, endDate, ringName, activityName, ringColor, activityColor</p>
                </div>
              </div>

              {/* Helpers */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Hjälpfunktioner</h4>
                <div className="space-y-1">
                  <button onClick={() => insertVariable('{{formatDate startDate}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">formatDate</button>
                  <button onClick={() => insertVariable('{{uppercase name}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">uppercase</button>
                  <button onClick={() => insertVariable('{{lowercase name}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">lowercase</button>
                </div>
              </div>

              {/* Conditionals */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Villkor</h4>
                <div className="space-y-1">
                  <button onClick={() => insertVariable('{{#if items}}\n  ...\n{{else}}\n  <p>Inga aktiviteter</p>\n{{/if}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">#if</button>
                  <button onClick={() => insertVariable('{{#unless items}}\n  <p>Inga aktiviteter</p>\n{{/unless}}')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">#unless</button>
                </div>
              </div>

              {/* CSS Classes */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Styling-klasser</h4>
                <p className="text-xs text-gray-500 mb-2">Använd dessa klasser för styling (färger sätts av designschemat)</p>
                <div className="space-y-1">
                  <button onClick={() => insertVariable('<div class="section">\n  ...\n</div>')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">section</button>
                  <button onClick={() => insertVariable('<div class="card">\n  ...\n</div>')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">card</button>
                  <button onClick={() => insertVariable('<div class="item">\n  <span class="item-name">{{name}}</span>\n  <span class="item-meta">{{formatDate startDate}}</span>\n</div>')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">item</button>
                  <button onClick={() => insertVariable('<div class="stats-grid">\n  <div class="stat-box">\n    <div class="stat-value">{{stats.totalItems}}</div>\n    <div class="stat-label">Aktiviteter</div>\n  </div>\n</div>')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">stats-grid</button>
                  <button onClick={() => insertVariable('<div class="footer">\n  Genererad {{currentDate}}\n</div>')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">footer</button>
                </div>
              </div>

              {/* Print helpers */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">PDF/Print</h4>
                <div className="space-y-1">
                  <button onClick={() => insertVariable('<div class="page-break"></div>')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">page-break</button>
                  <button onClick={() => insertVariable('<div class="no-break">\n  ...\n</div>')} className="block w-full text-left px-2 py-1 text-xs font-mono bg-white hover:bg-blue-50 border border-gray-200 rounded">no-break</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editor and preview */}
        <div className={`flex-1 flex ${showPreview ? 'flex-row' : ''}`}>
          {/* Template editor */}
          <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200`}>
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">HTML-mall (Handlebars)</h3>
            </div>
            <textarea
              id="template-editor"
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              className="flex-1 p-4 font-mono text-sm border-none focus:ring-0 resize-none"
              placeholder="Skriv din mall här... Använd {{variabler}} och {{#each loops}}...{{/each}}"
              spellCheck={false}
            />
          </div>

          {/* Preview pane */}
          {showPreview && (
            <div className="w-1/2 flex flex-col bg-gray-100">
              <div className="bg-gray-200 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Förhandsvisning</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">A4-format</span>
                  <button
                    onClick={handleExportPreview}
                    disabled={!preview || isExporting}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
                  >
                    {isExporting ? 'Exporterar...' : 'Exportera PDF'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-8">
                {preview ? (
                  <div className="max-w-4xl mx-auto">
                    {/* A4 Document Preview - 210mm x 297mm at 96dpi = 794px x 1123px */}
                    <iframe
                      srcDoc={preview}
                      className="bg-white shadow-2xl mx-auto border-0"
                      style={{
                        width: '794px',
                        height: '1123px',
                      }}
                      title="Template Preview"
                    />
                    <div className="mt-4 text-center text-xs text-gray-500">
                      Detta är en förhandsgranskning. Verkliga PDF:en kan se något annorlunda ut.
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-8">
                    Skriv en mall för att se förhandsvisning
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="bg-white border-t border-gray-200 p-4 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
        >
          Avbryt
        </button>
        <button
          onClick={handleSave}
          disabled={!validation.valid || !name.trim() || isSaving}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition disabled:opacity-50"
        >
          {isSaving ? 'Sparar...' : 'Spara mall'}
        </button>
      </div>
    </div>
  );
}
