import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { fetchLandingPageTemplates } from '../services/wheelService';
import { supabase } from '../lib/supabase';

function TemplateShowcase() {
  const { t, i18n } = useTranslation(['landing', 'common']);
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ringColors, setRingColors] = useState({});

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await fetchLandingPageTemplates();
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

  const handleTemplateClick = (templateId) => {
    navigate(`/preview-wheel/${templateId}`);
  };

  // Don't render if no templates
  if (!loading && templates.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            {t('landing:templates.badge', { defaultValue: 'Mallar' })}
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('landing:templates.title', { defaultValue: 'Inspireras av verkliga exempel' })}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t('landing:templates.description', {
              defaultValue: 'Våra mallar bygger på riktiga planeringar från företag och föreningar. Oavsett bransch - undervisning, HR, marknadsföring eller finans - finns en mall som matchar dina behov. Använd dem som inspiration för ditt årshjul.'
            })}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map((template) => {
              const colors = ringColors[template.id] || ['#e0e7ff', '#dbeafe', '#e5e7eb'];
              return (
                <div
                  key={template.id}
                  onClick={() => handleTemplateClick(template.id)}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('common:labels.year', { defaultValue: 'År' })}: {template.year}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default TemplateShowcase;
