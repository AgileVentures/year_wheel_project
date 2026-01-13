import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, ArrowRight } from 'lucide-react';

/**
 * ViewsSection Component
 * 
 * Landing page section showcasing the 4 different views:
 * - Wheel (circular annual view)
 * - List (structured task view)
 * - Kanban (board view)
 * - Timeline (Gantt-style view)
 * 
 * Uses the same SVG icons as the app navigation for consistency.
 */
function ViewsSection() {
  const { t } = useTranslation(['landing']);

  const views = [
    {
      id: 'wheel',
      icon: <Target className="w-8 h-8" />,
      useImg: false,
      color: 'from-[#00A4A6] to-[#2D4EC8]',
      borderColor: 'border-[#00A4A6]',
      bgColor: 'from-[#A4E6E0]/30 to-[#A4E6E0]/10',
    },
    {
      id: 'list',
      icon: '/icons/timeline-svgrepo-com.svg',
      useImg: true,
      color: 'from-[#336B3E] to-[#9FCB3E]',
      borderColor: 'border-[#9FCB3E]',
      bgColor: 'from-[#9FCB3E]/30 to-[#9FCB3E]/10',
    },
    {
      id: 'kanban',
      icon: '/icons/kanban-svgrepo-com.svg',
      useImg: true,
      color: 'from-[#2D4EC8] to-[#36C2C6]',
      borderColor: 'border-[#2D4EC8]',
      bgColor: 'from-[#2D4EC8]/20 to-[#36C2C6]/10',
    },
    {
      id: 'timeline',
      icon: '/icons/roadmap-timeline-svgrepo-com.svg',
      useImg: true,
      color: 'from-[#36C2C6] to-[#00A4A6]',
      borderColor: 'border-[#36C2C6]',
      bgColor: 'from-[#36C2C6]/30 to-[#A4E6E0]/10',
    },
  ];

  return (
    <section id="views-section" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-[#00A4A6]/10 text-[#00A4A6] text-sm font-semibold rounded-full mb-4">
            {t('landing:views.badge')}
          </span>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('landing:views.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('landing:views.subtitle')}
          </p>
        </div>

        {/* Views Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {views.map((view) => (
            <div
              key={view.id}
              className={`relative group bg-gradient-to-br ${view.bgColor} p-6 rounded-sm border-2 ${view.borderColor} hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Icon */}
              <div className={`w-16 h-16 bg-gradient-to-br ${view.color} rounded-sm flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {view.useImg ? (
                  <img 
                    src={view.icon} 
                    alt="" 
                    className="w-8 h-8"
                    style={{ filter: 'brightness(0) invert(1)' }}
                  />
                ) : (
                  <span className="text-white">{view.icon}</span>
                )}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t(`landing:views.${view.id}.title`)}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {t(`landing:views.${view.id}.description`)}
              </p>

              {/* Use case tags */}
              <div className="flex flex-wrap gap-2">
                {t(`landing:views.${view.id}.useCases`, { returnObjects: true }).map((useCase, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-white/60 text-gray-700 text-xs rounded-full"
                  >
                    {useCase}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <button
            onClick={() => {
              const authSection = document.getElementById('auth-section');
              authSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00A4A6] to-[#2D4EC8] text-white rounded-sm shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <span className="font-semibold text-lg">{t('landing:views.ctaRegister', 'Registrera dig')}</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default memo(ViewsSection);
