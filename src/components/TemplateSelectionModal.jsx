import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Calendar, Copy, Eye } from 'lucide-react';
import { fetchTemplateWheels } from '../services/wheelService';
import { supabase } from '../lib/supabase';
import WheelLoader from './WheelLoader';

/**
 * TemplateSelectionModal - Modal for selecting and using templates in the editor
 * Similar to the template functionality in TemplateShowcase but for editor use
 */
function TemplateSelectionModal({ isOpen, onClose, onTemplateSelect }) {
  const { t } = useTranslation(['common', 'editor']);
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ringColors, setRingColors] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await fetchTemplateWheels();
      setTemplates(data);

      // Load colors for each template
      const colors = {};
      for (const template of data) {
        const { data: activityGroups } = await supabase
          .from('activity_groups')
          .select('color')
          .eq('wheel_id', template.id)
          .eq('visible', true)
          .limit(3);

        colors[template.id] = activityGroups && activityGroups.length > 0
          ? activityGroups.map(g => g.color)
          : ['#e0e7ff', '#dbeafe', '#e5e7eb'];
      }
      setRingColors(colors);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate && onTemplateSelect) {
      onTemplateSelect(selectedTemplate.id);
      onClose();
    }
  };

  const handlePreviewTemplate = (templateId) => {
    // Open template in new tab for preview
    window.open(`/preview-wheel/${templateId}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-sm">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('editor:templateModal.title', { defaultValue: 'Välj mall' })}
              </h2>
              <p className="text-sm text-gray-600">
                {t('editor:templateModal.description', { 
                  defaultValue: 'Välj en befintlig mall som utgångspunkt för ditt hjul'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <WheelLoader size="sm" className="mx-auto" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {t('editor:templateModal.noTemplates', { 
                  defaultValue: 'Inga mallar tillgängliga för tillfället'
                })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => {
                const colors = ringColors[template.id] || ['#e0e7ff', '#dbeafe', '#e5e7eb'];
                const isSelected = selectedTemplate?.id === template.id;
                
                return (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`bg-white rounded-sm shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden border-2 ${
                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent hover:border-indigo-200'
                    }`}
                  >
                    {/* Wheel Preview */}
                    <div className="aspect-square bg-gray-50 flex items-center justify-center p-8 group-hover:bg-gray-100 transition-colors">
                      <svg viewBox="0 0 360 360" className="transform -rotate-90 w-full h-full">
                        {/* Background */}
                        <circle cx="180" cy="180" r="175" fill="#fafafa" />
                        
                        {/* Outer ring */}
                        <circle 
                          cx="180" 
                          cy="180" 
                          r="165" 
                          fill="none" 
                          stroke={colors[0]} 
                          strokeWidth="28" 
                        />
                        
                        {/* Middle ring */}
                        <circle 
                          cx="180" 
                          cy="180" 
                          r="132" 
                          fill="none" 
                          stroke={colors[1]} 
                          strokeWidth="26" 
                        />
                        
                        {/* Inner ring */}
                        <circle 
                          cx="180" 
                          cy="180" 
                          r="102" 
                          fill="none" 
                          stroke={colors[2]} 
                          strokeWidth="24" 
                        />
                        
                        {/* Month ring */}
                        <circle cx="180" cy="180" r="86" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                        
                        {/* Week ring */}
                        <circle cx="180" cy="180" r="78" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                        
                        {/* Center */}
                        <circle cx="180" cy="180" r="72" fill="white" />
                      </svg>
                    </div>

                    {/* Template Info */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {template.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewTemplate(template.id);
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          title={t('editor:templateModal.preview', { defaultValue: 'Förhandsgranska' })}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('common:labels.year', { defaultValue: 'År' })}: {template.year}
                      </p>
                      {isSelected && (
                        <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
                          <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                          {t('editor:templateModal.selected', { defaultValue: 'Vald' })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
          >
            {t('common:actions.cancel', { defaultValue: 'Avbryt' })}
          </button>
          <button
            onClick={handleUseTemplate}
            disabled={!selectedTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy size={16} />
            {t('editor:templateModal.useTemplate', { defaultValue: 'Använd mall' })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateSelectionModal;