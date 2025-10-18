import { memo } from 'react';
import { useTranslation } from 'react-i18next';

function MobileDemoMessage() {
  const { t } = useTranslation(['landing']);

  return (
    <section className="md:hidden py-16 px-4 bg-gradient-to-br from-[#A4E6E0] via-[#36C2C6] to-[#00A4A6] text-white">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-sm p-8 border border-white/20">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">
            {t('landing:mobileMessage.title')}
          </h2>
          <p className="text-lg text-white/90 mb-6">
            {t('landing:mobileMessage.description')}
          </p>
          <p className="text-sm text-white/80">
            {t('landing:mobileMessage.demoNote')}
          </p>
        </div>
      </div>
    </section>
  );
}

export default memo(MobileDemoMessage);