import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import { ColumnExtension } from './extensions/ColumnExtension';
import CodeEditor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';
import { 
  renderTemplate, 
  validateTemplate, 
  buildTemplateContext,
  exportToPDF,
  getTemplateVariables
} from './templateService';

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
    
    /* Layout Grid */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .three-columns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .four-columns {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .sidebar-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
    }
    .main-content {
      min-width: 0;
    }
    .sidebar {
      min-width: 0;
    }
    
    /* Print */
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
    
    /* TipTap Column Extension Styles */
    .column-block {
      width: 100%;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 24px;
      padding: 8px 0;
    }
    .column {
      overflow: auto;
      border: 1px ${c.border} dashed;
      border-radius: 8px;
      padding: 8px;
      margin: -8px;
    }
    
    @media print {
      body { padding: 20px; }
      .column { border: none; margin: 0; }
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

// Toolbar component for visual editor
function VisualEditorToolbar({ editor, showOutlines, setShowOutlines }) {
  if (!editor) return null;

  const buttonClass = (active) => 
    `p-2 rounded ${active ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-white">
      {/* Text formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive('bold'))}
        title="Fet (Ctrl+B)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive('italic'))}
        title="Kursiv (Ctrl+I)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={buttonClass(editor.isActive('underline'))}
        title="Understrykning (Ctrl+U)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v7a5 5 0 0010 0V4M5 20h14" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={buttonClass(editor.isActive('strike'))}
        title="Genomstruken"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5v14" transform="rotate(45 12 12)" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 1 }))}
        title="Rubrik 1"
      >
        <span className="font-bold text-sm">H1</span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 2 }))}
        title="Rubrik 2"
      >
        <span className="font-bold text-sm">H2</span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 3 }))}
        title="Rubrik 3"
      >
        <span className="font-bold text-sm">H3</span>
      </button>
      <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={buttonClass(editor.isActive('paragraph'))}
        title="Brödtext"
      >
        <span className="text-sm">P</span>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive('bulletList'))}
        title="Punktlista"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive('orderedList'))}
        title="Numrerad lista"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Text alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={buttonClass(editor.isActive({ textAlign: 'left' }))}
        title="Vänsterjustera"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={buttonClass(editor.isActive({ textAlign: 'center' }))}
        title="Centrera"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={buttonClass(editor.isActive({ textAlign: 'right' }))}
        title="Högerjustera"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Highlight */}
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={buttonClass(editor.isActive('highlight'))}
        title="Markera"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.243 4.515l-6.738 6.737-.707 2.121-1.04 1.041 2.828 2.829 1.04-1.041 2.122-.707 6.737-6.738-4.242-4.242zm6.364 3.536a1 1 0 010 1.414l-7.778 7.778-2.122.707-1.414 1.414a1 1 0 01-1.414 0l-4.243-4.243a1 1 0 010-1.414l1.414-1.414.707-2.121 7.778-7.778a1 1 0 011.414 0l5.658 5.657z" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={buttonClass(editor.isActive('blockquote'))}
        title="Citat"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Undo/Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={`p-2 rounded ${editor.can().undo() ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300'}`}
        title="Ångra (Ctrl+Z)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={`p-2 rounded ${editor.can().redo() ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300'}`}
        title="Gör om (Ctrl+Y)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Column controls */}
      <button
        onClick={() => editor.chain().focus().setColumns(2).run()}
        className={buttonClass(false)}
        title="Lägg till 2 kolumner"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M9 4H4v16h5M9 4h6v16H9M15 4h5v16h-5" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().setColumns(3).run()}
        className={buttonClass(false)}
        title="Lägg till 3 kolumner"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4v16M8 4H4v16h4M8 4h4v16H8M12 4h4v16h-4M16 4h4v16h-4" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().unsetColumns().run()}
        className={buttonClass(false)}
        title="Ta bort kolumnlayout"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Show outlines toggle */}
      <button
        onClick={() => setShowOutlines(!showOutlines)}
        className={buttonClass(showOutlines)}
        title={showOutlines ? "Dölj element-ramar" : "Visa element-ramar"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      </button>
    </div>
  );
}

// Visual block templates for drag-and-drop style editing
const LAYOUT_BLOCKS = [
  {
    id: 'header',
    name: 'Rubrik',
    icon: '📄',
    preview: (
      <div className="border-b-2 border-blue-500 pb-1">
        <div className="h-3 bg-gray-800 rounded w-3/4 mb-1"></div>
        <div className="h-2 bg-gray-400 rounded w-1/2"></div>
      </div>
    ),
    html: `<div class="mb-6">
  <h1>{{wheel.title}}</h1>
  <p class="text-muted">{{wheel.year}}</p>
</div>`
  },
  {
    id: 'section',
    name: 'Sektion',
    icon: '📦',
    preview: (
      <div className="border-l-4 border-blue-500 bg-blue-50 p-2 rounded-r">
        <div className="h-2 bg-gray-600 rounded w-1/2 mb-1"></div>
        <div className="h-1.5 bg-gray-300 rounded w-full"></div>
        <div className="h-1.5 bg-gray-300 rounded w-3/4 mt-1"></div>
      </div>
    ),
    html: `<div class="section">
  <h2>Rubrik</h2>
  <p>Innehåll här...</p>
</div>`
  },
  {
    id: 'card',
    name: 'Kort',
    icon: '🃏',
    preview: (
      <div className="border border-gray-300 rounded p-2 bg-white shadow-sm">
        <div className="h-2 bg-gray-600 rounded w-2/3 mb-1"></div>
        <div className="h-1.5 bg-gray-300 rounded w-full"></div>
      </div>
    ),
    html: `<div class="card">
  <h3>Korttitel</h3>
  <p>Kortinnehåll...</p>
</div>`
  },
  {
    id: 'stats-grid',
    name: 'Statistik',
    icon: '📊',
    preview: (
      <div className="grid grid-cols-3 gap-1">
        <div className="bg-blue-100 rounded p-1 text-center">
          <div className="text-xs font-bold text-blue-600">12</div>
        </div>
        <div className="bg-green-100 rounded p-1 text-center">
          <div className="text-xs font-bold text-green-600">8</div>
        </div>
        <div className="bg-purple-100 rounded p-1 text-center">
          <div className="text-xs font-bold text-purple-600">5</div>
        </div>
      </div>
    ),
    html: `<div class="stats-grid">
  <div class="stat-box">
    <div class="stat-value">{{stats.totalItems}}</div>
    <div class="stat-label">Aktiviteter</div>
  </div>
  <div class="stat-box">
    <div class="stat-value">{{stats.totalRings}}</div>
    <div class="stat-label">Ringar</div>
  </div>
  <div class="stat-box">
    <div class="stat-value">{{stats.totalActivityGroups}}</div>
    <div class="stat-label">Grupper</div>
  </div>
</div>`
  },
  {
    id: 'two-columns',
    name: '2 Kolumner',
    icon: '▥',
    isResizable: true,
    preset: '50-50',
    preview: (
      <div className="grid grid-cols-2 gap-1">
        <div className="bg-gray-100 rounded p-1">
          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
        </div>
        <div className="bg-gray-100 rounded p-1">
          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
        </div>
      </div>
    ),
    html: `<div class="two-columns">
  <div>
    <h3>Vänster kolumn</h3>
    <p>Innehåll...</p>
  </div>
  <div>
    <h3>Höger kolumn</h3>
    <p>Innehåll...</p>
  </div>
</div>`
  },
  {
    id: 'three-columns',
    name: '3 Kolumner',
    icon: '▦',
    isResizable: true,
    preset: '33-33-33',
    preview: (
      <div className="grid grid-cols-3 gap-0.5">
        <div className="bg-gray-100 rounded p-0.5">
          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
        </div>
        <div className="bg-gray-100 rounded p-0.5">
          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
        </div>
        <div className="bg-gray-100 rounded p-0.5">
          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
        </div>
      </div>
    ),
    html: `<div class="three-columns">
  <div class="card">
    <h3>Kolumn 1</h3>
    <p>Innehåll...</p>
  </div>
  <div class="card">
    <h3>Kolumn 2</h3>
    <p>Innehåll...</p>
  </div>
  <div class="card">
    <h3>Kolumn 3</h3>
    <p>Innehåll...</p>
  </div>
</div>`
  },
  {
    id: 'sidebar-layout',
    name: 'Sidofält',
    icon: '◧',
    isResizable: true,
    preset: '66-33',
    preview: (
      <div className="grid grid-cols-3 gap-0.5">
        <div className="col-span-2 bg-gray-100 rounded p-1">
          <div className="h-1.5 bg-gray-400 rounded w-full mb-0.5"></div>
          <div className="h-1.5 bg-gray-300 rounded w-3/4"></div>
        </div>
        <div className="bg-blue-100 rounded p-1">
          <div className="h-1 bg-blue-400 rounded w-full"></div>
        </div>
      </div>
    ),
    html: `<div class="sidebar-layout">
  <div class="main-content">
    <h2>Huvudinnehåll</h2>
    <p>Det primära innehållet...</p>
  </div>
  <div class="sidebar">
    <div class="card">
      <h4>Sidofält</h4>
      <p>Extra info...</p>
    </div>
  </div>
</div>`
  },
  {
    id: 'four-columns',
    name: '4 Kolumner',
    icon: '▤',
    isResizable: true,
    preset: '25-25-25-25',
    preview: (
      <div className="grid grid-cols-4 gap-0.5">
        <div className="bg-gray-100 rounded p-0.5">
          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
        </div>
        <div className="bg-gray-100 rounded p-0.5">
          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
        </div>
        <div className="bg-gray-100 rounded p-0.5">
          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
        </div>
        <div className="bg-gray-100 rounded p-0.5">
          <div className="h-1.5 bg-gray-400 rounded w-full"></div>
        </div>
      </div>
    ),
    html: `<div class="four-columns">
  <div><p>Kolumn 1</p></div>
  <div><p>Kolumn 2</p></div>
  <div><p>Kolumn 3</p></div>
  <div><p>Kolumn 4</p></div>
</div>`
  },
  {
    id: 'table',
    name: 'Tabell',
    icon: '📋',
    preview: (
      <div className="border border-gray-300 rounded overflow-hidden">
        <div className="bg-blue-600 h-2"></div>
        <div className="grid grid-cols-3 gap-px bg-gray-200">
          <div className="bg-white h-1.5"></div>
          <div className="bg-white h-1.5"></div>
          <div className="bg-white h-1.5"></div>
        </div>
      </div>
    ),
    html: `<table>
  <thead>
    <tr>
      <th>Kolumn 1</th>
      <th>Kolumn 2</th>
      <th>Kolumn 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data</td>
      <td>Data</td>
      <td>Data</td>
    </tr>
  </tbody>
</table>`
  },
  {
    id: 'activity-loop',
    name: 'Aktivitetsgrupper',
    icon: '🔄',
    preview: (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <div className="h-1.5 bg-gray-400 rounded flex-1"></div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <div className="h-1.5 bg-gray-400 rounded flex-1"></div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
          <div className="h-1.5 bg-gray-400 rounded flex-1"></div>
        </div>
      </div>
    ),
    html: `{{#each activityGroups}}
<div class="section" style="border-left-color: {{color}};">
  <h3>{{name}}</h3>
  <p>{{itemCount}} aktiviteter</p>
  {{#each items}}
  <div class="item">
    <span class="item-name">{{name}}</span>
    <span class="item-meta">{{formatDate startDate}} - {{formatDate endDate}}</span>
  </div>
  {{/each}}
</div>
{{/each}}`
  },
  {
    id: 'month-loop',
    name: 'Månadsöversikt',
    icon: '📅',
    preview: (
      <div className="grid grid-cols-4 gap-0.5">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded p-0.5 text-center">
            <div className="text-[6px] text-gray-500">{['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][i]}</div>
          </div>
        ))}
      </div>
    ),
    html: `<h2>Månadsöversikt</h2>
{{#each months}}
<div class="card">
  <h3>{{name}}</h3>
  <p>{{itemCount}} aktiviteter</p>
  {{#if items}}
  <ul>
    {{#each items}}
    <li>{{name}}</li>
    {{/each}}
  </ul>
  {{/if}}
</div>
{{/each}}`
  },
  {
    id: 'ring-loop',
    name: 'Ringlista',
    icon: '⭕',
    preview: (
      <div className="space-y-1">
        <div className="border-l-4 border-orange-400 pl-1">
          <div className="h-1.5 bg-gray-400 rounded w-2/3"></div>
        </div>
        <div className="border-l-4 border-teal-400 pl-1">
          <div className="h-1.5 bg-gray-400 rounded w-2/3"></div>
        </div>
      </div>
    ),
    html: `<h2>Per ring</h2>
{{#each rings}}
<div class="section">
  <h3>{{name}}</h3>
  <p>{{itemCount}} aktiviteter</p>
</div>
{{/each}}`
  },
  {
    id: 'footer',
    name: 'Sidfot',
    icon: '📝',
    preview: (
      <div className="border-t border-gray-300 pt-1">
        <div className="h-1.5 bg-gray-300 rounded w-1/3"></div>
      </div>
    ),
    html: `<div class="footer">
  <p>Genererad {{currentDate}} | {{wheel.title}}</p>
</div>`
  },
  {
    id: 'page-break',
    name: 'Sidbrytning',
    icon: '📃',
    preview: (
      <div className="border-t-2 border-dashed border-gray-400 my-1 relative">
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-white px-1 text-[6px] text-gray-400">NY SIDA</span>
      </div>
    ),
    html: `<div class="page-break"></div>`
  }
];

// Block palette component
function BlockPalette({ onInsertBlock, onInsertColumns }) {
  return (
    <div className="p-3 space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Layout-block</h4>
      <div className="grid grid-cols-2 gap-2">
        {LAYOUT_BLOCKS.map(block => (
          <button
            key={block.id}
            onClick={() => block.isResizable && onInsertColumns ? onInsertColumns(block.preset) : onInsertBlock(block.html)}
            className={`p-2 bg-white border rounded-lg hover:border-blue-400 hover:shadow-md transition-all text-left group ${block.isResizable ? 'border-blue-200' : 'border-gray-200'}`}
            title={block.isResizable ? `${block.name} (resizable)` : block.name}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{block.icon}</span>
              <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600">{block.name}</span>
              {block.isResizable && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">↔</span>
              )}
            </div>
            <div className="h-12 overflow-hidden rounded bg-gray-50 p-1.5">
              {block.preview}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * TemplateEditor - Edit and preview report templates
 * Features: Syntax validation, live preview, design themes, visual/code modes
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('blocks'); // 'blocks' or 'variables'
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editorMode, setEditorMode] = useState('visual'); // 'code', 'visual', or 'preview'
  const [showSettings, setShowSettings] = useState(false);
  const [showOutlines, setShowOutlines] = useState(true); // Show element borders in visual editor

  // Syntax highlighting function for HTML + Handlebars
  const highlightCode = useCallback((code) => {
    if (!code) return '';
    
    // First highlight HTML with Prism
    let html = Prism.highlight(code, Prism.languages.markup, 'markup');
    
    // Then add custom Handlebars highlighting on top
    // Handlebars blocks: {{#each}}, {{#if}}, {{/each}}, {{/if}}, {{else}}
    html = html.replace(
      /(\{\{)(#(?:each|if|unless)|\/(?:each|if|unless)|else)(\s*)([^}]*)(\}\})/g,
      '<span class="token handlebars-delimiter">$1</span><span class="token handlebars-block">$2</span>$3<span class="token handlebars-variable">$4</span><span class="token handlebars-delimiter">$5</span>'
    );
    
    // Handlebars helpers: {{formatDate x}}, {{uppercase x}}, etc.
    html = html.replace(
      /(\{\{)(formatDate|formatDateTime|uppercase|lowercase|truncate|pluralize|add|subtract|multiply|divide|ifEquals|ifContains|json)(\s+)([^}]+)(\}\})/g,
      '<span class="token handlebars-delimiter">$1</span><span class="token handlebars-helper">$2</span>$3<span class="token handlebars-variable">$4</span><span class="token handlebars-delimiter">$5</span>'
    );
    
    // Simple Handlebars variables: {{variable}}, {{object.property}}
    html = html.replace(
      /(\{\{)([^#\/][^}]*)(\}\})/g,
      '<span class="token handlebars-delimiter">$1</span><span class="token handlebars-variable">$2</span><span class="token handlebars-delimiter">$3</span>'
    );
    
    return html;
  }, []);

  const variables = getTemplateVariables();

  // Format HTML code
  const formatCode = useCallback(() => {
    if (!templateContent) return;
    
    let formatted = templateContent;
    
    // Step 1: Add newlines around tags and Handlebars blocks
    formatted = formatted
      .replace(/>\s*</g, '>\n<')  // Between HTML tags
      .replace(/(\{\{#(?:each|if|unless)[^}]*\}\})/g, '\n$1\n')  // Opening blocks
      .replace(/(\{\{\/(?:each|if|unless)\}\})/g, '\n$1\n')  // Closing blocks
      .replace(/(\{\{else\}\})/g, '\n$1\n');  // else blocks
    
    // Step 2: Split into lines and clean up
    let lines = formatted.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Step 3: Add proper indentation
    let indent = 0;
    const indentedLines = [];
    
    for (let line of lines) {
      // Decrease indent BEFORE adding line for closing tags/blocks
      if (line.match(/^<\//) || line.match(/^\{\{\/(?:each|if|unless)\}\}/)) {
        indent = Math.max(0, indent - 1);
      }
      
      // Add indented line
      indentedLines.push('  '.repeat(indent) + line);
      
      // Check if this is an opening tag/block that should increase indent
      const isOpeningTag = line.match(/^<([a-z][a-z0-9]*)\b[^>]*>$/i) && !line.match(/<\/\1>/);  // Opening tag without closing on same line
      const isHandlebarsBlock = line.match(/^\{\{#(?:each|if|unless)/);
      const isSelfClosing = line.match(/\/>$/);  // Self-closing like <br/>
      
      if ((isOpeningTag || isHandlebarsBlock) && !isSelfClosing) {
        indent++;
      }
    }
    
    formatted = indentedLines.join('\n');
    setTemplateContent(formatted);
  }, [templateContent]);
  const theme = DESIGN_THEMES[selectedTheme];

  // TipTap editor for visual mode
  const visualEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      GlobalDragHandle.configure({
        dragHandleWidth: 24,
        scrollTreshold: 100,
      }),
      ColumnExtension,
    ],
    content: templateContent || '<p>Börja skriva här...</p>',
    onUpdate: ({ editor }) => {
      if (editorMode === 'visual') {
        setTemplateContent(editor.getHTML());
      }
    },
  });

  // Sync content when switching modes
  const handleModeSwitch = useCallback((newMode) => {
    // When leaving visual mode, save TipTap content as HTML
    if (editorMode === 'visual' && visualEditor) {
      const content = visualEditor.getHTML();
      setTemplateContent(content);
    }
    // When entering visual mode, load content from HTML (now works with parseHTML!)
    if (newMode === 'visual' && visualEditor) {
      visualEditor.commands.setContent(templateContent || '<p></p>');
    }
    // When entering code mode, auto-format the code
    if (newMode === 'code' && templateContent) {
      // Format on next tick to ensure state is updated
      setTimeout(() => {
        // Trigger format
        let formatted = templateContent;
        
        // Add newlines around tags and Handlebars blocks
        formatted = formatted
          .replace(/>\s*</g, '>\n<')
          .replace(/(\{\{#(?:each|if|unless)[^}]*\}\})/g, '\n$1\n')
          .replace(/(\{\{\/(?:each|if|unless)\}\})/g, '\n$1\n')
          .replace(/(\{\{else\}\})/g, '\n$1\n');
        
        // Split and clean
        let lines = formatted.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        // Add indentation
        let indent = 0;
        const indentedLines = [];
        
        for (let line of lines) {
          // Decrease indent for closing tags/blocks
          if (line.match(/^<\//) || line.match(/^\{\{\/(?:each|if|unless)\}\}/)) {
            indent = Math.max(0, indent - 1);
          }
          
          indentedLines.push('  '.repeat(indent) + line);
          
          // Check if this is an opening tag/block that should increase indent
          const isOpeningTag = line.match(/^<([a-z][a-z0-9]*)\b[^>]*>$/i) && !line.match(/<\/\1>/);
          const isHandlebarsBlock = line.match(/^\{\{#(?:each|if|unless)/);
          const isSelfClosing = line.match(/\/>$/);
          
          if ((isOpeningTag || isHandlebarsBlock) && !isSelfClosing) {
            indent++;
          }
        }
        
        formatted = indentedLines.join('\n');
        setTemplateContent(formatted);
      }, 10);
    }
    setEditorMode(newMode);
  }, [visualEditor, templateContent, editorMode]);

  // Insert variable into visual editor
  const insertVariableInVisual = useCallback((variable) => {
    if (visualEditor) {
      visualEditor.chain().focus().insertContent(
        `<span class="variable-chip" style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.875rem;">${variable}</span>`
      ).run();
    }
  }, [visualEditor]);

  // Validate template and update preview on content or theme change
  useEffect(() => {
    if (templateContent) {
      const result = validateTemplate(templateContent);
      setValidation(result);
      
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
          Välj ett hjul ovan för att se förhandsvisning med riktiga data.
        </div>`, theme));
      }
    }
  }, [templateContent, wheelData, pageData, organizationData, selectedTheme]);

  const handleSave = async () => {
    if (!validation.valid) {
      alert('Åtgärda mallfel innan du sparar');
      return;
    }

    if (!name.trim()) {
      alert('Ange ett mallnamn');
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
      alert('Kunde inte spara mall: ' + error.message);
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
      alert('Kunde inte exportera PDF: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Insert variable - handles both code and visual mode
  const insertVariable = useCallback((variable) => {
    if (editorMode === 'visual') {
      insertVariableInVisual(variable);
    } else {
      const textarea = document.getElementById('template-editor');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = templateContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setTemplateContent(before + variable + after);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  }, [editorMode, insertVariableInVisual, templateContent]);

  // Insert layout block - handles both code and visual mode
  const insertBlock = useCallback((blockHtml) => {
    if (editorMode === 'visual' && visualEditor) {
      visualEditor.chain().focus().insertContent(blockHtml).run();
    } else {
      const textarea = document.getElementById('template-editor');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = templateContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const formattedBlock = '\n' + blockHtml + '\n';
      setTemplateContent(before + formattedBlock + after);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + formattedBlock.length, start + formattedBlock.length);
      }, 0);
    }
  }, [editorMode, visualEditor, templateContent]);

  // Insert resizable columns - only works in visual mode
  const insertColumns = useCallback((preset) => {
    if (editorMode === 'visual' && visualEditor) {
      // Map presets to column counts for the ColumnExtension
      const presetToColumns = {
        '50-50': 2,
        '33-33-33': 3,
        '25-25-25-25': 4,
        '66-33': 2,
        '33-66': 2,
      };
      const columnCount = presetToColumns[preset] || 2;
      visualEditor.chain().focus().setColumns(columnCount).run();
    } else {
      // In code mode, insert static HTML version
      const presetMap = {
        '50-50': `<div class="two-columns">
  <div><p>Kolumn 1</p></div>
  <div><p>Kolumn 2</p></div>
</div>`,
        '33-33-33': `<div class="three-columns">
  <div><p>Kolumn 1</p></div>
  <div><p>Kolumn 2</p></div>
  <div><p>Kolumn 3</p></div>
</div>`,
        '25-25-25-25': `<div class="four-columns">
  <div><p>Kolumn 1</p></div>
  <div><p>Kolumn 2</p></div>
  <div><p>Kolumn 3</p></div>
  <div><p>Kolumn 4</p></div>
</div>`,
        '66-33': `<div class="sidebar-layout">
  <div><p>Huvudinnehåll</p></div>
  <div><p>Sidofält</p></div>
</div>`,
        '33-66': `<div class="sidebar-layout" style="grid-template-columns: 1fr 2fr;">
  <div><p>Sidofält</p></div>
  <div><p>Huvudinnehåll</p></div>
</div>`,
      };
      insertBlock(presetMap[preset] || presetMap['50-50']);
    }
  }, [editorMode, visualEditor, insertBlock]);

  // Handle block insertion - routes to correct function based on block type
  const handleBlockInsert = useCallback((block) => {
    if (block.isResizable && block.preset) {
      insertColumns(block.preset);
    } else {
      insertBlock(block.html);
    }
  }, [insertBlock, insertColumns]);

  // Icon button component for toolbar
  const IconButton = ({ onClick, active, disabled, title, children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition-all ${
        active 
          ? 'bg-blue-100 text-blue-700' 
          : disabled 
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="template-editor h-full flex flex-col bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title input */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-lg font-semibold border-0 border-b-2 border-transparent focus:border-blue-500 focus:ring-0 bg-transparent"
              placeholder="Mallnamn..."
            />
            {!validation.valid && (
              <span className="text-red-500" title={validation.error}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>

          {/* Center: 3-Mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => handleModeSwitch('visual')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                editorMode === 'visual' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visuell redigering med designade element"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Redigera
              </span>
            </button>
            <button
              onClick={() => handleModeSwitch('code')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                editorMode === 'code' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Redigera HTML/Handlebars-kod"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Kod
              </span>
            </button>
            <button
              onClick={() => handleModeSwitch('preview')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                editorMode === 'preview' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Förhandsgranska med verklig data"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Förhandsvisa
              </span>
            </button>
          </div>

          {/* Right: Icon buttons */}
          <div className="flex items-center gap-1">
            {/* Only show sidebar toggle when not in preview mode */}
            {editorMode !== 'preview' && (
              <IconButton 
                onClick={() => setShowSidebar(!showSidebar)} 
                active={showSidebar}
                title="Verktygspanel (Block & Variabler)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </IconButton>
            )}
            <IconButton 
              onClick={() => setShowSettings(!showSettings)} 
              active={showSettings}
              title="Inställningar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </IconButton>
            
            <div className="w-px h-6 bg-gray-300 mx-2" />
            
            <IconButton 
              onClick={handleExportPreview}
              disabled={!preview || isExporting}
              title="Exportera PDF"
            >
              {isExporting ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </IconButton>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              disabled={!validation.valid || !name.trim() || isSaving}
              className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sparar...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Spara
                </>
              )}
            </button>
          </div>
        </div>

        {/* Settings panel (collapsible) */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="custom">Anpassad</option>
                <option value="monthly">Månatlig</option>
                <option value="activity">Aktivitet</option>
                <option value="summary">Sammanfattning</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Designschema</label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(DESIGN_THEMES).map(([key, t]) => (
                    <option key={key} value={key}>{t.name}</option>
                  ))}
                </select>
                <div className="flex gap-0.5">
                  {['primary', 'secondary', 'accent'].map(c => (
                    <div 
                      key={c}
                      className="w-4 h-4 rounded-full border border-gray-300" 
                      style={{ background: theme.colors[c] }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Beskrivning</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Valfri beskrivning av mallen"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools (only in edit modes) */}
        {showSidebar && editorMode !== 'preview' && (
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
            {/* Sidebar tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setSidebarTab('blocks')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  sidebarTab === 'blocks' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                  </svg>
                  Block
                </span>
                {sidebarTab === 'blocks' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
              <button
                onClick={() => setSidebarTab('variables')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  sidebarTab === 'variables' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Variabler
                </span>
                {sidebarTab === 'variables' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            </div>

            {/* Sidebar content */}
            <div className="flex-1 overflow-y-auto">
              {sidebarTab === 'blocks' ? (
                <div className="p-3">
                  <p className="text-xs text-gray-500 mb-3">Klicka för att infoga block vid markören. <span className="text-blue-500">↔</span> = storlek kan ändras</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LAYOUT_BLOCKS.map(block => (
                      <button
                        key={block.id}
                        onClick={() => handleBlockInsert(block)}
                        className={`p-2 bg-gray-50 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group ${block.isResizable ? 'border-blue-200' : 'border-gray-200'}`}
                        title={block.isResizable ? `${block.name} (klicka & dra för att ändra storlek)` : block.name}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">{block.icon}</span>
                          <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 truncate">{block.name}</span>
                          {block.isResizable && (
                            <span className="ml-auto text-[9px] px-1 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">↔</span>
                          )}
                        </div>
                        <div className="h-10 overflow-hidden rounded bg-white p-1 border border-gray-100">
                          {block.preview}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-4 text-xs">
                  <p className="text-gray-500">Klicka för att infoga variabel</p>
                  
                  {/* Wheel & Page variables */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Hjul & Sida
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { var: '{{wheel.title}}', label: 'Hjultitel' },
                        { var: '{{wheel.year}}', label: 'Hjulets år' },
                        { var: '{{page.title}}', label: 'Sidtitel' },
                        { var: '{{page.year}}', label: 'Sidans år' },
                        { var: '{{currentDate}}', label: 'Idag' },
                      ].map(v => (
                        <button 
                          key={v.var}
                          onClick={() => insertVariable(v.var)} 
                          className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition text-left truncate"
                          title={v.var}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Statistics */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Statistik
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { var: '{{stats.totalItems}}', label: 'Antal aktiviteter' },
                        { var: '{{stats.totalRings}}', label: 'Antal ringar' },
                        { var: '{{stats.totalActivityGroups}}', label: 'Antal grupper' },
                        { var: '{{stats.totalLabels}}', label: 'Antal etiketter' },
                      ].map(v => (
                        <button 
                          key={v.var}
                          onClick={() => insertVariable(v.var)} 
                          className="px-2 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded transition text-left truncate"
                          title={v.var}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Loops */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Loopar (listor)
                    </h4>
                    <div className="space-y-1">
                      <button 
                        onClick={() => insertVariable('{{#each activityGroups}}\n<div class="section" style="border-left-color: {{color}}">\n  <h3>{{name}}</h3>\n  <p>{{itemCount}} aktiviteter</p>\n  {{#each items}}\n  <div class="item">\n    <span class="item-name">{{name}}</span>\n    <span class="item-meta">{{formatDate startDate}} - {{formatDate endDate}}</span>\n  </div>\n  {{/each}}\n</div>\n{{/each}}')} 
                        className="w-full px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition text-left"
                      >
                        🔄 Aktivitetsgrupper → items
                      </button>
                      <button 
                        onClick={() => insertVariable('{{#each months}}\n<div class="card">\n  <h3>{{name}}</h3>\n  <p>{{itemCount}} aktiviteter</p>\n  {{#each items}}\n  <p>• {{name}}</p>\n  {{/each}}\n</div>\n{{/each}}')} 
                        className="w-full px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition text-left"
                      >
                        📅 Månader → items
                      </button>
                      <button 
                        onClick={() => insertVariable('{{#each rings}}\n<div class="section">\n  <h3>{{name}} ({{type}})</h3>\n  <p>{{itemCount}} aktiviteter</p>\n  {{#each items}}\n  <p>• {{name}}</p>\n  {{/each}}\n</div>\n{{/each}}')} 
                        className="w-full px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition text-left"
                      >
                        ⭕ Ringar → items
                      </button>
                      <button 
                        onClick={() => insertVariable('{{#each labels}}\n<div class="card">\n  <h3 style="color: {{color}}">{{name}}</h3>\n  <p>{{itemCount}} aktiviteter</p>\n</div>\n{{/each}}')} 
                        className="w-full px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition text-left"
                      >
                        🏷️ Etiketter → items
                      </button>
                      <button 
                        onClick={() => insertVariable('{{#each items}}\n<div class="item">\n  <span class="item-name">{{name}}</span>\n  <span class="item-meta">{{ringName}} | {{activityName}}</span>\n  <span class="item-meta">{{formatDate startDate}} - {{formatDate endDate}}</span>\n  {{#if description}}<p>{{description}}</p>{{/if}}\n</div>\n{{/each}}')} 
                        className="w-full px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition text-left"
                      >
                        📋 Alla aktiviteter (detaljerat)
                      </button>
                    </div>
                  </div>

                  {/* Item fields (in loops) */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                      Aktivitetsfält (i loopar)
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { var: '{{name}}', label: 'Namn' },
                        { var: '{{startDate}}', label: 'Startdatum' },
                        { var: '{{endDate}}', label: 'Slutdatum' },
                        { var: '{{description}}', label: 'Beskrivning' },
                        { var: '{{time}}', label: 'Tid' },
                        { var: '{{ringName}}', label: 'Ringnamn' },
                        { var: '{{ringColor}}', label: 'Ringfärg' },
                        { var: '{{activityName}}', label: 'Gruppnamn' },
                        { var: '{{activityColor}}', label: 'Gruppfärg' },
                        { var: '{{labelName}}', label: 'Etikettnamn' },
                        { var: '{{labelColor}}', label: 'Etikettfärg' },
                        { var: '{{itemCount}}', label: 'Antal items' },
                      ].map(v => (
                        <button 
                          key={v.var}
                          onClick={() => insertVariable(v.var)} 
                          className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded transition text-left truncate"
                          title={v.var}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Helpers */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      Hjälpfunktioner
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={() => insertVariable('{{formatDate startDate}}')} className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded transition text-left" title="Formatera datum (sv-SE)">formatDate</button>
                      <button onClick={() => insertVariable('{{formatDateTime startDate}}')} className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded transition text-left" title="Datum + tid">formatDateTime</button>
                      <button onClick={() => insertVariable('{{uppercase name}}')} className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded transition text-left" title="VERSALER">uppercase</button>
                      <button onClick={() => insertVariable('{{lowercase name}}')} className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded transition text-left" title="gemener">lowercase</button>
                      <button onClick={() => insertVariable('{{truncate description 100}}')} className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded transition text-left" title="Korta av text">truncate</button>
                      <button onClick={() => insertVariable('{{pluralize count "aktivitet" "aktiviteter"}}')} className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded transition text-left" title="Singular/plural">pluralize</button>
                    </div>
                  </div>

                  {/* Conditionals */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                      Villkor & Logik
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={() => insertVariable('{{#if items}}\n  ...\n{{else}}\n  <p>Inga aktiviteter</p>\n{{/if}}')} className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded transition text-left">#if...else</button>
                      <button onClick={() => insertVariable('{{#unless items}}\n  <p>Tomt</p>\n{{/unless}}')} className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded transition text-left">#unless</button>
                      <button onClick={() => insertVariable('{{#ifEquals type "outer"}}...{{/ifEquals}}')} className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded transition text-left" title="Jämför värden">ifEquals</button>
                      <button onClick={() => insertVariable('{{add a b}}')} className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded transition text-left" title="Addition">add</button>
                    </div>
                  </div>

                  {/* Layout */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                      Layout & Print
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={() => insertVariable('<div class="page-break"></div>')} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition text-left">Sidbrytning</button>
                      <button onClick={() => insertVariable('<div class="no-break">\n  ...\n</div>')} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition text-left">Ingen brytning</button>
                      <button onClick={() => insertVariable('<div class="section">\n  ...\n</div>')} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition text-left">Sektion</button>
                      <button onClick={() => insertVariable('<div class="card">\n  ...\n</div>')} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition text-left">Kort</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Editor Area - 3 modes */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Visual Editor Mode */}
          {editorMode === 'visual' && (
            <>
              <VisualEditorToolbar editor={visualEditor} showOutlines={showOutlines} setShowOutlines={setShowOutlines} />
              <div className="flex-1 overflow-auto bg-gray-100 p-6">
                <div className="mx-auto bg-white shadow-xl" style={{ width: '794px', minHeight: '1123px' }}>
                  <style>{`
                    .ProseMirror {
                      padding: 48px 64px;
                      min-height: 1123px;
                      outline: none;
                      background: white;
                    }
                    /* Global drag handle styles */
                    .drag-handle {
                      position: fixed;
                      opacity: 1;
                      transition: opacity 0.2s ease, background-color 0.2s ease;
                      border-radius: 4px;
                      background: #f1f5f9;
                      border: 1px solid #e2e8f0;
                      width: 20px;
                      height: 20px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: grab;
                      z-index: 50;
                      user-select: none;
                    }
                    .drag-handle:hover {
                      background: #e2e8f0;
                      border-color: #cbd5e1;
                    }
                    .drag-handle:active {
                      cursor: grabbing;
                      background: #cbd5e1;
                    }
                    .drag-handle::before {
                      content: '⋮⋮';
                      font-size: 10px;
                      color: #64748b;
                      letter-spacing: -2px;
                    }
                    /* Drop indicator line */
                    .ProseMirror-dropcursor {
                      border-left: 2px solid #3b82f6 !important;
                      margin-left: -1px;
                    }
                    .ProseMirror p { margin-bottom: 0.75rem; line-height: 1.7; color: #1e293b; }
                    .ProseMirror h1 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 0.5rem; }
                    .ProseMirror h2 { font-size: 1.5rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #3b82f6; }
                    .ProseMirror h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: #64748b; }
                    .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
                    .ProseMirror li { margin-bottom: 0.25rem; }
                    .ProseMirror blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; margin: 1rem 0; background: #f8fafc; padding: 1rem; border-radius: 0 8px 8px 0; }
                    .ProseMirror .variable-chip { 
                      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); 
                      color: #1e40af; 
                      padding: 4px 10px; 
                      border-radius: 6px; 
                      font-family: 'JetBrains Mono', 'Courier New', monospace; 
                      font-size: 0.85rem;
                      border: 1px solid #93c5fd;
                      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                      white-space: nowrap;
                    }
                    /* Design classes for visual preview */
                    .ProseMirror .section { margin: 1.5rem 0; padding: 1.25rem; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6; }
                    .ProseMirror .card { margin: 0.75rem 0; padding: 1.25rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                    .ProseMirror .item { margin: 0.5rem 0; padding: 0.75rem 1rem; background: #f8fafc; border-left: 4px solid #0ea5e9; border-radius: 0 6px 6px 0; }
                    .ProseMirror .stats-grid { display: flex; gap: 1rem; margin: 1.5rem 0; }
                    .ProseMirror .stat-box { flex: 1; text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .ProseMirror .footer { margin-top: 3rem; padding-top: 1rem; border-top: 2px solid #e2e8f0; color: #64748b; font-size: 0.875rem; }
                    /* Grid layouts */
                    .ProseMirror .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 1rem 0; }
                    .ProseMirror .three-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; }
                    .ProseMirror .four-columns { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1rem 0; }
                    .ProseMirror .sidebar-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; margin: 1rem 0; }
                    /* Column extension styles */
                    .ProseMirror .column-block {
                      width: 100%;
                      display: grid;
                      grid-auto-flow: column;
                      grid-auto-columns: 1fr;
                      gap: 24px;
                      padding: 8px 0;
                      margin: 1rem 0;
                    }
                    .ProseMirror .column {
                      overflow: auto;
                      border: 1px #cbd5e1 dashed;
                      border-radius: 8px;
                      padding: 8px;
                      min-height: 100px;
                    }
                    ${showOutlines ? `
                    /* ALL ELEMENTS get visible borders when editing */
                    .ProseMirror > * {
                      position: relative;
                      outline: 1px dashed #cbd5e1 !important;
                      outline-offset: 2px !important;
                      margin-bottom: 0.75rem;
                    }
                    .ProseMirror > h1 {
                      outline-color: #3b82f6 !important;
                    }
                    .ProseMirror > h2 {
                      outline-color: #8b5cf6 !important;
                    }
                    .ProseMirror > h3 {
                      outline-color: #06b6d4 !important;
                    }
                    .ProseMirror > p {
                      outline-color: #94a3b8 !important;
                    }
                    .ProseMirror > ul, .ProseMirror > ol {
                      outline-color: #f59e0b !important;
                    }
                    /* Element type labels */
                    .ProseMirror > h1::before { content: 'H1'; position: absolute; top: -8px; left: 0; font-size: 8px; font-weight: 700; color: white; background: #3b82f6; padding: 1px 4px; border-radius: 2px; z-index: 10; }
                    .ProseMirror > h2::before { content: 'H2'; position: absolute; top: -8px; left: 0; font-size: 8px; font-weight: 700; color: white; background: #8b5cf6; padding: 1px 4px; border-radius: 2px; z-index: 10; }
                    .ProseMirror > h3::before { content: 'H3'; position: absolute; top: -8px; left: 0; font-size: 8px; font-weight: 700; color: white; background: #06b6d4; padding: 1px 4px; border-radius: 2px; z-index: 10; }
                    .ProseMirror > p::before { content: 'P'; position: absolute; top: -8px; left: 0; font-size: 8px; font-weight: 700; color: white; background: #64748b; padding: 1px 4px; border-radius: 2px; z-index: 10; }
                    .ProseMirror > ul::before { content: 'UL'; position: absolute; top: -8px; left: 0; font-size: 8px; font-weight: 700; color: white; background: #f59e0b; padding: 1px 4px; border-radius: 2px; z-index: 10; }
                    .ProseMirror > ol::before { content: 'OL'; position: absolute; top: -8px; left: 0; font-size: 8px; font-weight: 700; color: white; background: #f59e0b; padding: 1px 4px; border-radius: 2px; z-index: 10; }
                    .ProseMirror > blockquote::before { content: 'QUOTE'; position: absolute; top: -8px; left: 0; font-size: 8px; font-weight: 700; color: white; background: #10b981; padding: 1px 4px; border-radius: 2px; z-index: 10; }
                    /* Custom class elements with stronger borders */
                    .ProseMirror .section, .ProseMirror .card, .ProseMirror .item, 
                    .ProseMirror .stat-box, .ProseMirror .footer,
                    .ProseMirror .two-columns, .ProseMirror .three-columns, 
                    .ProseMirror .four-columns, .ProseMirror .sidebar-layout,
                    .ProseMirror .stats-grid {
                      outline: 2px dashed #3b82f6 !important;
                      outline-offset: 2px !important;
                    }
                    .ProseMirror .section::after { content: 'SECTION'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #3b82f6; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    .ProseMirror .card::after { content: 'CARD'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #8b5cf6; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    .ProseMirror .item::after { content: 'ITEM'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #0ea5e9; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    .ProseMirror .stats-grid::after { content: 'STATS GRID'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #10b981; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    .ProseMirror .stat-box::after { content: 'STAT'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #10b981; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    .ProseMirror .footer::after { content: 'FOOTER'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #64748b; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    .ProseMirror .two-columns::after { content: '2 COLUMNS'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #f59e0b; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    .ProseMirror .three-columns::after { content: '3 COLUMNS'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #f59e0b; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    .ProseMirror .four-columns::after { content: '4 COLUMNS'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #f59e0b; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    .ProseMirror .sidebar-layout::after { content: 'SIDEBAR LAYOUT'; position: absolute; top: 4px; right: 4px; font-size: 9px; font-weight: 700; color: white; background: #f59e0b; padding: 2px 6px; border-radius: 3px; z-index: 10; }
                    /* Child elements in grid layouts */
                    .ProseMirror .two-columns > *, .ProseMirror .three-columns > *, .ProseMirror .four-columns > *, .ProseMirror .sidebar-layout > * {
                      outline: 1px solid #cbd5e1 !important;
                      outline-offset: -1px !important;
                      min-height: 80px;
                      padding: 12px !important;
                      background: rgba(248, 250, 252, 0.8) !important;
                      position: relative;
                    }
                    .ProseMirror .two-columns > *::before, .ProseMirror .three-columns > *::before, .ProseMirror .four-columns > *::before, .ProseMirror .sidebar-layout > *::before {
                      content: 'COLUMN';
                      position: absolute;
                      bottom: 4px;
                      right: 4px;
                      font-size: 8px;
                      font-weight: 600;
                      color: #94a3b8;
                      background: white;
                      padding: 1px 4px;
                      border-radius: 2px;
                      border: 1px solid #cbd5e1;
                    }
                    ` : ''}
                  `}</style>
                  <EditorContent editor={visualEditor} className="h-full" />
                </div>
              </div>
            </>
          )}

          {/* Code Editor Mode */}
          {editorMode === 'code' && (
            <>
              <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400 font-mono">HTML / Handlebars</span>
                  <button
                    onClick={formatCode}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition flex items-center gap-1"
                    title="Formatera kod (indentation)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                    Formatera
                  </button>
                </div>
                {validation.valid ? (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Giltig syntax
                  </span>
                ) : (
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {validation.error}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-auto" style={{ background: '#1d1f21' }}>
                <CodeEditor
                  value={templateContent}
                  onValueChange={code => setTemplateContent(code)}
                  highlight={code => highlightCode(code)}
                  padding={16}
                  style={{
                    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                    fontSize: 14,
                    lineHeight: 1.6,
                    minHeight: '100%',
                  }}
                  className="code-editor-container"
                  textareaId="template-editor"
                  placeholder="Skriv din mall här... Använd {{variabler}} och {{#each loops}}...{{/each}}"
                />
              </div>
              <style>{`
                .code-editor-container {
                  min-height: 100%;
                }
                .code-editor-container textarea {
                  outline: none !important;
                }
                .code-editor-container pre {
                  min-height: 100%;
                }
                /* Custom Handlebars/HTML highlighting */
                .token.tag { color: #e06c75; }
                .token.attr-name { color: #d19a66; }
                .token.attr-value { color: #98c379; }
                .token.punctuation { color: #abb2bf; }
                .token.comment { color: #5c6370; font-style: italic; }
                .token.handlebars-delimiter { color: #c678dd; font-weight: bold; }
                .token.handlebars-variable { color: #61afef; }
                .token.handlebars-helper { color: #c678dd; }
                .token.handlebars-block { color: #e5c07b; }
              `}</style>
            </>
          )}

          {/* Preview Mode */}
          {editorMode === 'preview' && (
            <div className="flex-1 flex flex-col bg-gray-100">
              <div className="bg-gray-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Förhandsvisning</span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">{theme.name}</span>
                </div>
                <span className="text-xs text-gray-500">A4-format (210×297mm)</span>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {preview ? (
                  <div className="mx-auto" style={{ maxWidth: '794px' }}>
                    <iframe
                      srcDoc={preview}
                      className="bg-white shadow-2xl mx-auto border-0 w-full rounded-sm"
                      style={{ height: '1123px' }}
                      title="Template Preview"
                    />
                    <p className="text-center text-xs text-gray-500 mt-4">
                      Detta visar hur rapporten ser ut med verklig data från det valda hjulet
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-600 mb-1">Ingen förhandsvisning tillgänglig</p>
                      <p className="text-xs text-gray-500">Välj ett hjul ovan för att se rapporten med verklig data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
