import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { memo } from 'react';
import { Target } from 'lucide-react';

function Hero() {
  const { t } = useTranslation(['landing']);
  
  // View icons with taglines
  const viewIcons = [
    { 
      id: 'wheel', 
      icon: <Target className="w-8 h-8" />,
      useImg: false,
      tagline: t('landing:hero.viewTaglines.wheel', 'See the big picture'),
      delay: '0s',
      color: 'from-[#00A4A6] to-[#36C2C6]',
    },
    { 
      id: 'list', 
      icon: '/icons/timeline-svgrepo-com.svg',
      useImg: true,
      tagline: t('landing:hero.viewTaglines.list', 'Find it fast'),
      delay: '0.2s',
      color: 'from-[#9FCB3E] to-[#336B3E]',
    },
    { 
      id: 'kanban', 
      icon: '/icons/kanban-svgrepo-com.svg',
      useImg: true,
      tagline: t('landing:hero.viewTaglines.kanban', 'Track progress'),
      delay: '0.4s',
      color: 'from-[#2D4EC8] to-[#36C2C6]',
    },
    { 
      id: 'timeline', 
      icon: '/icons/roadmap-timeline-svgrepo-com.svg',
      useImg: true,
      tagline: t('landing:hero.viewTaglines.timeline', 'Plan ahead'),
      delay: '0.6s',
      color: 'from-[#36C2C6] to-[#00A4A6]',
    },
  ];
  
  return (
    <section className="relative bg-[#1B2A63] overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="/banner.webp"
          alt="YearWheel Planning"
          className="w-full h-full object-cover"
          loading="eager"
          width="2030"
          height="4284"
        />
        {/* Deep navy blue to teal gradient overlay - using logo colors */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1B2A63]/95 via-[#1B2A63]/85 to-[#2E9E97]/70"></div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12">
          <div className="max-w-2xl flex-shrink-0">
          {/* Badge - using teal from logo */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A4A6]/10 backdrop-blur-sm border border-[#36C2C6]/30 rounded-full mb-6">
            <svg className="w-4 h-4 text-[#36C2C6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-sm font-medium text-[#A4E6E0]">{t('landing:hero.badge')}</span>
          </div>

          {/* Main Heading - white with teal accent */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            {t('landing:hero.title1')}{' '}
            <span className="text-[#36C2C6]">{t('landing:hero.title2')}</span>
          </h1>

          {/* Description */}
          <ul className="text-xl text-[#A4E6E0]/90 mb-8 leading-relaxed space-y-3">
            {t('landing:hero.description', { returnObjects: true }).map((line, index) => (
              <li key={index} className="flex items-start">
                <span className="text-[#36C2C6] mr-3">–</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {/* CTA Buttons - using logo colors */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-[#00A4A6] hover:bg-[#2E9E97] rounded-sm shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {t('landing:hero.ctaPrimary')}
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <button
              onClick={() => {
                const demoSection = document.getElementById('demo-section');
                demoSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden md:inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-[#36C2C6]/30 rounded-sm transition-all duration-200"
            >
              <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('landing:hero.ctaSecondary')}
            </button>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-8 pt-8 border-t border-[#36C2C6]/20">
            <div>
              <div className="text-3xl font-bold text-white">{t('landing:hero.stats.free.value')}</div>
              <div className="text-sm text-[#A4E6E0]/70 mt-1">{t('landing:hero.stats.free.label')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{t('landing:hero.stats.wheels.value')}</div>
              <div className="text-sm text-[#A4E6E0]/70 mt-1">{t('landing:hero.stats.wheels.label')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{t('landing:hero.stats.premium.value')}</div>
              <div className="text-sm text-[#A4E6E0]/70 mt-1">{t('landing:hero.stats.premium.label')}</div>
            </div>
          </div>
          </div>
          
          {/* Animated View Icons - Right Side - Diagonal Layout */}
          <div className="hidden lg:flex flex-col justify-center gap-0 flex-shrink-0 min-w-[450px] pointer-events-auto">
            {/* Badge Label */}
            <div className="mb-8 flex justify-end">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A4A6]/10 backdrop-blur-sm border border-[#36C2C6]/30 rounded-full">
                <svg className="w-3.5 h-3.5 text-[#36C2C6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="text-xs font-medium text-[#A4E6E0] uppercase tracking-wide">
                  {t('landing:hero.viewsLabel', '4 ways to view your data')}
                </span>
              </div>
            </div>
            
            {/* Icons in fixed diagonal - independent of text length */}
            <div className="relative">
              {viewIcons.map((view, index) => (
                <div
                  key={view.id}
                  className="group animate-slide-in-diagonal flex items-center gap-5 mb-5"
                  style={{ 
                    animationDelay: view.delay,
                    animationFillMode: 'both',
                    paddingLeft: `${index * 70}px`,
                  }}
                >
                  {/* Main icon - white with subtle transparent background */}
                  <div className="relative w-20 h-20 bg-white/5 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 animate-float cursor-pointer border border-white/10 flex-shrink-0"
                    style={{ 
                      animationDelay: view.delay,
                      animationDuration: `${3 + index * 0.5}s`
                    }}
                  >
                    {/* Subtle glow on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${view.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`}></div>
                    
                    {view.useImg ? (
                      <img 
                        src={view.icon} 
                        alt="" 
                        className="w-10 h-10 relative z-10 group-hover:scale-110 transition-transform duration-300"
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                    ) : (
                      <span className="text-white relative z-10 group-hover:scale-110 transition-transform duration-300">
                        {view.icon}
                      </span>
                    )}
                  </div>
                  
                  {/* Text label - always visible */}
                  <div className="whitespace-nowrap flex-shrink-0">
                    <p className="text-base font-bold text-white drop-shadow-lg leading-tight">
                      {t(`landing:views.${view.id}.title`)}
                    </p>
                    <p className="text-base text-[#A4E6E0]/90 drop-shadow-lg leading-tight">
                      {view.tagline}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Animation keyframes */}
      <style>{`
        @keyframes slide-in-diagonal {
          0% {
            opacity: 0;
            transform: translate(80px, -80px) scale(0.3) rotate(-20deg);
          }
          60% {
            transform: translate(-8px, 8px) scale(1.05) rotate(3deg);
          }
          80% {
            transform: translate(3px, -3px) scale(0.98) rotate(-1deg);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1.3);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.5);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-slide-in-diagonal {
          animation: slide-in-diagonal 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .animate-float {
          animation: float ease-in-out infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </section>
  );
}

export default memo(Hero);
