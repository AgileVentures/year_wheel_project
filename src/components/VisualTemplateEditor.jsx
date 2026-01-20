import React, { useState, useEffect, useRef } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import { 
  renderTemplate, 
  validateTemplate, 
  buildTemplateContext,
  exportToPDF,
  getTemplateVariables
} from '../services/templateService';

// Custom blocks for report templates
const CUSTOM_BLOCKS = [
  {
    id: 'report-header',
    label: 'Rapportsidhuvud',
    category: 'Rapport',
    content: `<div style="border-bottom: 3px solid #3b82f6; padding-bottom: 1rem; margin-bottom: 2rem;">
      <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">{{wheel.title}}</h1>
      <p style="font-size: 1.25rem; color: #64748b; margin-top: 0.5rem;">{{wheel.year}}</p>
    </div>`,
    media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v4H4V4zm0 6h16v10H4V10z"/></svg>'
  },
  {
    id: 'stats-grid',
    label: 'Statistikrutor',
    category: 'Rapport',
    content: `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0;">
      <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 2.5rem; font-weight: 700; color: #3b82f6;">{{stats.totalItems}}</div>
        <div style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">Aktiviteter</div>
      </div>
      <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 2.5rem; font-weight: 700; color: #3b82f6;">{{stats.totalActivityGroups}}</div>
        <div style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">Grupper</div>
      </div>
      <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 2.5rem; font-weight: 700; color: #3b82f6;">{{stats.totalRings}}</div>
        <div style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">Ringar</div>
      </div>
    </div>`,
    media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zm-8 8h6v6H3v-6zm8 0h6v6h-6v-6z"/></svg>'
  },
  {
    id: 'activity-loop',
    label: 'Aktivitetslista',
    category: 'Rapport',
    content: `<div style="margin: 1.5rem 0;">
      <h2 style="font-size: 1.5rem; font-weight: 600; color: #3b82f6; margin-bottom: 1rem;">Aktiviteter</h2>
      {{#each items}}
      <div style="margin: 0.5rem 0; padding: 0.75rem 1rem; background: #f8fafc; border-left: 4px solid {{activityColor}}; border-radius: 0 4px 4px 0;">
        <div style="font-weight: 600; color: #1e293b;">{{name}}</div>
        <div style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">{{formatDate startDate}} - {{formatDate endDate}}</div>
      </div>
      {{/each}}
    </div>`,
    media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg>'
  },
  {
    id: 'activity-groups-loop',
    label: 'Grupper med aktiviteter',
    category: 'Rapport',
    content: `<div style="margin: 1.5rem 0;">
      {{#each activityGroups}}
      <div style="margin: 1.5rem 0; page-break-inside: avoid;">
        <h3 style="font-size: 1.25rem; font-weight: 600; color: {{color}}; border-bottom: 2px solid {{color}}; padding-bottom: 0.5rem; margin-bottom: 1rem;">{{name}}</h3>
        {{#if items}}
        {{#each items}}
        <div style="margin: 0.5rem 0; padding: 0.5rem 1rem; background: #f8fafc; border-radius: 4px;">
          <strong>{{name}}</strong> - {{ringName}}
          <span style="color: #64748b; font-size: 0.875rem; margin-left: 1rem;">{{formatDate startDate}} - {{formatDate endDate}}</span>
        </div>
        {{/each}}
        {{else}}
        <p style="color: #94a3b8; font-style: italic;">Inga aktiviteter i denna grupp</p>
        {{/if}}
      </div>
      {{/each}}
    </div>`,
    media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 6h4v4H2V6zm6 0h14v2H8V6zm0 2h10v2H8V8zM2 12h4v4H2v-4zm6 0h14v2H8v-2zm0 2h10v2H8v-2z"/></svg>'
  },
  {
    id: 'months-loop',
    label: 'Månadsöversikt',
    category: 'Rapport',
    content: `<div style="margin: 1.5rem 0;">
      <h2 style="font-size: 1.5rem; font-weight: 600; color: #334155; margin-bottom: 1rem;">Månadsöversikt</h2>
      {{#each months}}
      <div style="margin: 1rem 0; padding: 1rem; background: #f8fafc; border-radius: 8px; page-break-inside: avoid;">
        <h3 style="font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0 0 0.5rem 0;">{{name}}</h3>
        {{#if items}}
        <ul style="margin: 0; padding-left: 1.5rem;">
          {{#each items}}
          <li style="margin: 0.25rem 0;">{{name}}</li>
          {{/each}}
        </ul>
        {{else}}
        <p style="color: #94a3b8; font-style: italic; margin: 0;">Inga aktiviteter denna månad</p>
        {{/if}}
      </div>
      {{/each}}
    </div>`,
    media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>'
  },
  {
    id: 'table-activities',
    label: 'Aktivitetstabell',
    category: 'Rapport',
    content: `<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
      <thead>
        <tr style="background: #3b82f6; color: white;">
          <th style="padding: 12px 16px; text-align: left; font-weight: 600;">Aktivitet</th>
          <th style="padding: 12px 16px; text-align: left; font-weight: 600;">Ring</th>
          <th style="padding: 12px 16px; text-align: left; font-weight: 600;">Grupp</th>
          <th style="padding: 12px 16px; text-align: left; font-weight: 600;">Period</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 16px;">{{name}}</td>
          <td style="padding: 10px 16px;">{{ringName}}</td>
          <td style="padding: 10px 16px;">{{activityName}}</td>
          <td style="padding: 10px 16px;">{{formatDate startDate}} - {{formatDate endDate}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>`,
    media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm2 2v4h4V5H5zm6 0v4h4V5h-4zm6 0v4h4V5h-4zm-12 6v4h4v-4H5zm6 0v4h4v-4h-4zm6 0v4h4v-4h-4zm-12 6v4h4v-4H5zm6 0v4h4v-4h-4zm6 0v4h4v-4h-4z"/></svg>'
  },
  {
    id: 'footer',
    label: 'Sidfot',
    category: 'Rapport',
    content: `<div style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.875rem; color: #64748b; text-align: center;">
      Genererad {{currentDate}} | {{wheel.title}} - {{wheel.year}}
    </div>`,
    media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 18h16v2H4v-2z"/></svg>'
  },
  {
    id: 'page-break',
    label: 'Sidbrytning',
    category: 'Rapport',
    content: `<div style="page-break-before: always; height: 1px;"></div>`,
    media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9h18v2H3V9zm0 4h18v2H3v-2z"/></svg>'
  }
];

// Design themes
const DESIGN_THEMES = {
  modern: {
    name: 'Modern',
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b'
  },
  professional: {
    name: 'Professionell',
    primary: '#1e40af',
    secondary: '#374151',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827'
  },
  warm: {
    name: 'Varm',
    primary: '#ea580c',
    secondary: '#78716c',
    background: '#fffbeb',
    surface: '#fef3c7',
    text: '#292524'
  },
  nature: {
    name: 'Natur',
    primary: '#16a34a',
    secondary: '#57534e',
    background: '#f0fdf4',
    surface: '#dcfce7',
    text: '#14532d'
  },
  corporate: {
    name: 'Företag',
    primary: '#475569',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f1f5f9',
    text: '#0f172a'
  }
};

/**
 * VisualTemplateEditor - Drag & drop visual editor with code toggle
 */
export default function VisualTemplateEditor({ 
  template, 
  onSave, 
  onCancel,
  wheelData,
  pageData,
  organizationData 
}) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || 'custom');
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'code' | 'preview'
  const [htmlCode, setHtmlCode] = useState(template?.template_content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize GrapesJS editor
  useEffect(() => {
    if (viewMode === 'visual' && containerRef.current && !editorInstanceRef.current) {
      const editor = grapesjs.init({
        container: containerRef.current,
        height: '100%',
        width: 'auto',
        storageManager: false,
        plugins: [gjsPresetWebpage],
        pluginsOpts: {
          [gjsPresetWebpage]: {
            blocksBasicOpts: {
              blocks: ['column1', 'column2', 'column3', 'text', 'link', 'image', 'video'],
              flexGrid: true
            },
            navbarOpts: false,
            countdownOpts: false,
            formsOpts: false
          }
        },
        canvas: {
          styles: [
            `body { 
              font-family: 'Inter', system-ui, sans-serif; 
              line-height: 1.6; 
              color: #1e293b;
              padding: 40px;
            }
            h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; }
            h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; }
            h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }`
          ]
        },
        deviceManager: {
          devices: [
            { name: 'A4', width: '210mm', height: '297mm' }
          ]
        },
        panels: {
          defaults: []
        }
      });

      // Add custom blocks for reports
      const blockManager = editor.BlockManager;
      CUSTOM_BLOCKS.forEach(block => {
        blockManager.add(block.id, {
          label: block.label,
          category: block.category,
          content: block.content,
          media: block.media
        });
      });

      // Load initial content
      if (htmlCode) {
        editor.setComponents(htmlCode);
      }

      // Listen for changes
      editor.on('change:changesCount', () => {
        const html = editor.getHtml();
        setHtmlCode(html);
      });

      editorInstanceRef.current = editor;
    }

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
    };
  }, [viewMode]);

  // Sync code to visual editor when switching modes
  useEffect(() => {
    if (viewMode === 'visual' && editorInstanceRef.current) {
      const currentHtml = editorInstanceRef.current.getHtml();
      if (currentHtml !== htmlCode) {
        editorInstanceRef.current.setComponents(htmlCode);
      }
    }
  }, [viewMode, htmlCode]);

  // Generate preview HTML with theme
  const generatePreviewHtml = () => {
    const theme = DESIGN_THEMES[selectedTheme];
    const css = `
      body {
        font-family: 'Inter', system-ui, sans-serif;
        line-height: 1.7;
        color: ${theme.text};
        background: ${theme.background};
        padding: 48px;
        margin: 0;
      }
      h1 { font-size: 2rem; font-weight: 700; color: ${theme.text}; border-bottom: 3px solid ${theme.primary}; padding-bottom: 0.5rem; }
      h2 { font-size: 1.5rem; font-weight: 600; color: ${theme.primary}; margin-top: 2rem; }
      h3 { font-size: 1.125rem; font-weight: 600; color: ${theme.secondary}; }
      table th { background: ${theme.primary}; color: white; }
    `;

    if (wheelData && organizationData) {
      try {
        const context = buildTemplateContext(wheelData, pageData, organizationData);
        const rendered = renderTemplate(htmlCode, context);
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>${rendered}</body></html>`;
      } catch (error) {
        return `<!DOCTYPE html><html><head><style>${css}</style></head><body><div style="color: red;">Error: ${error.message}</div></body></html>`;
      }
    }
    return `<!DOCTYPE html><html><head><style>${css}</style></head><body><div style="color: #64748b;">Ingen data tillgänglig för förhandsvisning</div></body></html>`;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Ange ett mallnamn');
      return;
    }

    // Get HTML from GrapesJS if in visual mode
    let finalHtml = htmlCode;
    if (viewMode === 'visual' && editorInstanceRef.current) {
      finalHtml = editorInstanceRef.current.getHtml();
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        template_content: finalHtml,
        category
      });
    } catch (error) {
      alert('Kunde inte spara mall: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    const previewHtml = generatePreviewHtml();
    setIsExporting(true);
    try {
      const filename = `${name.replace(/\s+/g, '_').toLowerCase() || 'rapport'}_${Date.now()}.pdf`;
      await exportToPDF(previewHtml, filename);
    } catch (error) {
      alert('Kunde inte exportera PDF: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="visual-template-editor h-full flex flex-col bg-gray-900">
      {/* Top toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mallnamn"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="custom">Anpassad</option>
              <option value="monthly">Månatlig</option>
              <option value="activity">Aktivitet</option>
              <option value="summary">Sammanfattning</option>
            </select>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(DESIGN_THEMES).map(([key, theme]) => (
                <option key={key} value={key}>{theme.name}</option>
              ))}
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'visual' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              Visuell
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'code' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              Kod
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'preview' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              Förhandsvisning
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition disabled:opacity-50"
            >
              {isExporting ? 'Exporterar...' : 'Exportera PDF'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-medium transition"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition disabled:opacity-50"
            >
              {isSaving ? 'Sparar...' : 'Spara mall'}
            </button>
          </div>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 overflow-hidden">
        {/* Visual editor (GrapesJS) */}
        {viewMode === 'visual' && (
          <div 
            ref={containerRef} 
            className="h-full"
            style={{ background: '#374151' }}
          />
        )}

        {/* Code editor */}
        {viewMode === 'code' && (
          <div className="h-full flex">
            {/* Code textarea */}
            <div className="flex-1 flex flex-col">
              <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                <span className="text-sm text-gray-300">HTML + Handlebars</span>
              </div>
              <textarea
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                className="flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none"
                placeholder="Skriv din HTML-mall här..."
                spellCheck={false}
              />
            </div>
            
            {/* Variables sidebar */}
            <div className="w-72 bg-gray-800 border-l border-gray-700 overflow-y-auto p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Variabler</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-gray-400 mb-1">Hjul & Sida:</p>
                  <code className="text-blue-400 block">{'{{wheel.title}}'}</code>
                  <code className="text-blue-400 block">{'{{wheel.year}}'}</code>
                  <code className="text-blue-400 block">{'{{currentDate}}'}</code>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Statistik:</p>
                  <code className="text-blue-400 block">{'{{stats.totalItems}}'}</code>
                  <code className="text-blue-400 block">{'{{stats.totalRings}}'}</code>
                  <code className="text-blue-400 block">{'{{stats.totalActivityGroups}}'}</code>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Loopar:</p>
                  <code className="text-green-400 block">{'{{#each items}}...{{/each}}'}</code>
                  <code className="text-green-400 block">{'{{#each activityGroups}}...{{/each}}'}</code>
                  <code className="text-green-400 block">{'{{#each months}}...{{/each}}'}</code>
                  <code className="text-green-400 block">{'{{#each rings}}...{{/each}}'}</code>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">I loopar:</p>
                  <code className="text-yellow-400 block">{'{{name}}'}</code>
                  <code className="text-yellow-400 block">{'{{formatDate startDate}}'}</code>
                  <code className="text-yellow-400 block">{'{{activityColor}}'}</code>
                  <code className="text-yellow-400 block">{'{{itemCount}}'}</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {viewMode === 'preview' && (
          <div className="h-full bg-gray-100 p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <iframe
                srcDoc={generatePreviewHtml()}
                className="bg-white shadow-2xl border-0"
                style={{ width: '794px', height: '1123px' }}
                title="Template Preview"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
