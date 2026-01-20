import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchTemplates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate,
  renderTemplate,
  buildTemplateContext,
  exportToPDF
} from '../services/templateService';
import TemplateEditor from './TemplateEditor';
import VisualTemplateEditor from './VisualTemplateEditor';

/**
 * TemplateManager - Browse, create, edit, and use report templates
 */
export default function TemplateManager({ 
  wheelData, 
  pageData, 
  organizationData,
  onClose 
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'editor', 'visual-editor', 'preview'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [editorType, setEditorType] = useState('visual'); // 'visual' | 'code'

  useEffect(() => {
    loadTemplates();
  }, [wheelData?.id]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchTemplates(wheelData?.id);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      alert('Kunde inte ladda mallar');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = (type = 'visual') => {
    setSelectedTemplate(null);
    setEditorType(type);
    setView(type === 'visual' ? 'visual-editor' : 'editor');
  };

  const handleEditTemplate = (template, type = 'visual') => {
    if (template.is_system) {
      // Clone system template for editing
      setSelectedTemplate({
        ...template,
        id: null,
        is_system: false,
        name: `${template.name} (Kopia)`,
        user_id: null
      });
    } else {
      setSelectedTemplate(template);
    }
    setEditorType(type);
    setView(type === 'visual' ? 'visual-editor' : 'editor');
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      if (selectedTemplate?.id) {
        await updateTemplate(selectedTemplate.id, templateData);
      } else {
        // Create user-wide template (wheel_id = null) by default
        // User can choose to make it wheel-specific later
        await createTemplate({
          ...templateData,
          wheel_id: null // null = visible on all wheels for this user
        });
      }
      await loadTemplates();
      setView('list');
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Är du säker på att du vill ta bort denna mall?')) {
      return;
    }

    try {
      await deleteTemplate(templateId);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Kunde inte ta bort mall');
    }
  };

  const handleGenerateReport = async (template) => {
    setGeneratingPDF(true);
    try {
      const context = buildTemplateContext(wheelData, pageData, organizationData);
      const html = renderTemplate(template.template_content, context);
      const filename = `${template.name.replace(/\s+/g, '_').toLowerCase()}_${wheelData.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      await exportToPDF(html, filename);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Kunde inte generera rapport: ' + error.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
    setView('preview');
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const systemTemplates = filteredTemplates.filter(t => t.is_system);
  const userTemplates = filteredTemplates.filter(t => !t.is_system);

  // Visual editor (GrapesJS)
  if (view === 'visual-editor') {
    return (
      <div className="h-full">
        <VisualTemplateEditor
          template={selectedTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setView('list');
            setSelectedTemplate(null);
          }}
          wheelData={wheelData}
          pageData={pageData}
          organizationData={organizationData}
        />
      </div>
    );
  }

  // Code editor (original)
  if (view === 'editor') {
    return (
      <div className="h-full">
        <TemplateEditor
          template={selectedTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setView('list');
            setSelectedTemplate(null);
          }}
          wheelData={wheelData}
          pageData={pageData}
          organizationData={organizationData}
        />
      </div>
    );
  }

  if (view === 'preview' && selectedTemplate) {
    const context = buildTemplateContext(wheelData, pageData, organizationData);
    const preview = renderTemplate(selectedTemplate.template_content, context);

    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{selectedTemplate.name}</h2>
            <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerateReport(selectedTemplate)}
              disabled={generatingPDF}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
            >
              {generatingPDF ? 'Genererar...' : 'Generera PDF'}
            </button>
            <button
              onClick={() => {
                setView('list');
                setSelectedTemplate(null);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
            >
              Stäng
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 bg-gray-50">
          <div 
            className="bg-white shadow-lg max-w-4xl mx-auto"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Rapportmallar</h2>
          <div className="flex gap-2">
            <div className="relative group">
              <button
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition flex items-center gap-2"
              >
                <span>+</span>
                Skapa ny mall
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => handleCreateTemplate('visual')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 rounded-t-lg border-b border-gray-100"
                >
                  <div className="font-medium text-gray-900">Visuell editor</div>
                  <div className="text-xs text-gray-500">Dra och släpp-redigering</div>
                </button>
                <button
                  onClick={() => handleCreateTemplate('code')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 rounded-b-lg"
                >
                  <div className="font-medium text-gray-900">Kod-editor</div>
                  <div className="text-xs text-gray-500">HTML + Handlebars</div>
                </button>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
              >
                Stäng
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök mallar..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Alla kategorier</option>
            <option value="custom">Anpassad</option>
            <option value="monthly">Månatlig</option>
            <option value="activity">Aktivitet</option>
            <option value="summary">Sammanfattning</option>
          </select>
        </div>
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Laddar mallar...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* System templates */}
            {systemTemplates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Systemmallar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEditTemplate}
                      onDelete={null}
                      onPreview={handlePreviewTemplate}
                      onGenerate={handleGenerateReport}
                      isGenerating={generatingPDF}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* User templates */}
            {userTemplates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Mina mallar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEditTemplate}
                      onDelete={handleDeleteTemplate}
                      onPreview={handlePreviewTemplate}
                      onGenerate={handleGenerateReport}
                      isGenerating={generatingPDF}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {searchQuery || filterCategory !== 'all' 
                    ? 'Inga mallar matchar dina filter'
                    : 'Inga mallar än'
                  }
                </p>
                {(!searchQuery && filterCategory === 'all') && (
                  <button
                    onClick={handleCreateTemplate}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition"
                  >
                    Skapa din första mall
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template, onEdit, onDelete, onPreview, onGenerate, isGenerating }) {
  const [showEditMenu, setShowEditMenu] = useState(false);
  const editMenuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editMenuRef.current && !editMenuRef.current.contains(event.target)) {
        setShowEditMenu(false);
      }
    };
    if (showEditMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEditMenu]);

  const categoryColors = {
    custom: 'bg-gray-100 text-gray-700',
    monthly: 'bg-blue-100 text-blue-700',
    activity: 'bg-green-100 text-green-700',
    summary: 'bg-purple-100 text-purple-700'
  };

  const categoryLabels = {
    custom: 'Anpassad',
    monthly: 'Månatlig',
    activity: 'Aktivitet',
    summary: 'Sammanfattning'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
          <p className="text-sm text-gray-500 line-clamp-2">{template.description}</p>
        </div>
        {template.is_system && (
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            System
          </span>
        )}
      </div>

      <div className="mb-4">
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${categoryColors[template.category] || categoryColors.custom}`}>
          {categoryLabels[template.category] || template.category}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onPreview(template)}
          className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
        >
          Förhandsvisning
        </button>
        <button
          onClick={() => onGenerate(template)}
          disabled={isGenerating}
          className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
        >
          {isGenerating ? '...' : 'Generera'}
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        {/* Edit/Copy dropdown */}
        <div className="relative flex-1" ref={editMenuRef}>
          <button
            onClick={() => setShowEditMenu(!showEditMenu)}
            className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition flex items-center justify-center gap-1"
          >
            {template.is_system ? 'Kopiera' : 'Redigera'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showEditMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => {
                  onEdit(template, 'visual');
                  setShowEditMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Visuell editor
              </button>
              <button
                onClick={() => {
                  onEdit(template, 'code');
                  setShowEditMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Kodeditor
              </button>
            </div>
          )}
        </div>
        {onDelete && !template.is_system && (
          <button
            onClick={() => onDelete(template.id)}
            className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
          >
            Ta bort
          </button>
        )}
      </div>
    </div>
  );
}
