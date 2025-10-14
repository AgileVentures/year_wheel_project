import { useTranslation } from 'react-i18next';
import { Check, X, Sparkles, Users, Share2, Layers, Palette, History, FileImage, Calendar, ListChecks, BarChart3, Smartphone, CreditCard, Target, Wrench } from 'lucide-react';

function ComparisonTable() {
  const { t } = useTranslation(['comparison', 'common']);

  const features = [
    {
      icon: Sparkles,
      key: 'aiAssistant',
      highlight: true
    },
    {
      icon: Users,
      key: 'realtime',
      highlight: true
    },
    {
      icon: Share2,
      key: 'shareLinks',
      highlight: true
    },
    {
      icon: Layers,
      key: 'dynamicRings',
      highlight: false
    },
    {
      icon: History,
      key: 'versionHistory',
      highlight: false
    },
    {
      icon: FileImage,
      key: 'exportFormats',
      highlight: false
    },
    {
      icon: CreditCard,
      key: 'pricing',
      highlight: true
    }
  ];

  const StatusIcon = ({ status }) => {
    if (status === 'yes') {
      return (
        <div className="inline-flex w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 items-center justify-center shadow-sm">
          <Check className="w-5 h-5 text-white" strokeWidth={3} />
        </div>
      );
    }
    if (status === 'no') {
      return (
        <div className="inline-flex w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 items-center justify-center shadow-sm">
          <X className="w-5 h-5 text-white" strokeWidth={3} />
        </div>
      );
    }
    if (status === 'partial') {
      return (
        <div className="inline-flex w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 items-center justify-center shadow-sm">
          <Wrench className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
      );
    }
    return null;
  };

  return (
    <section id="comparison-section" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A4A6]/10 backdrop-blur-sm border border-[#36C2C6]/30 rounded-full text-sm font-semibold mb-6">
            <BarChart3 size={16} className="text-[#36C2C6]" />
            <span className="text-[#2E9E97]">{t('comparison:badge')}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t('comparison:title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('comparison:subtitle')}
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-sm shadow-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr,1fr,1fr] gap-8 px-8 py-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <div className="flex items-center">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {t('comparison:columnHeaders.feature')}
              </div>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-10 w-auto mb-2" />
              <div className="text-xs font-medium text-gray-500">{t('comparison:columnHeaders.yearwheelTagline')}</div>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <div className="font-bold text-xl text-gray-800 mb-1">{t('comparison:columnHeaders.competitor')}</div>
              <div className="text-xs text-gray-500">{t('comparison:columnHeaders.competitorTagline')}</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const yearwheelStatus = t(`comparison:features.${feature.key}.yearwheel.status`);
              const competitorStatus = t(`comparison:features.${feature.key}.competitor.status`);

              return (
                <div
                  key={feature.key}
                  className={`grid grid-cols-[2fr,1fr,1fr] gap-6 p-6 transition-all duration-200 ${
                    feature.highlight 
                      ? 'bg-gradient-to-r from-[#A4E6E0]/10 to-[#36C2C6]/5 hover:from-[#A4E6E0]/20 hover:to-[#36C2C6]/10' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Feature Name */}
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-sm flex items-center justify-center flex-shrink-0 bg-gray-100 border border-gray-200">
                      <Icon className="text-gray-600" size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-base mb-1">
                        {t(`comparison:features.${feature.key}.name`)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t(`comparison:features.${feature.key}.description`)}
                      </div>
                    </div>
                  </div>

                  {/* YearWheel Column */}
                  <div className="flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <StatusIcon status={yearwheelStatus} />
                      <div className="text-sm text-gray-700 font-medium leading-relaxed">
                        {t(`comparison:features.${feature.key}.yearwheel.text`)}
                      </div>
                    </div>
                  </div>

                  {/* Competitor Column */}
                  <div className="flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <StatusIcon status={competitorStatus} />
                      <div className="text-sm text-gray-600 leading-relaxed">
                        {t(`comparison:features.${feature.key}.competitor.text`)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="bg-gradient-to-r from-[#A4E6E0]/20 to-[#36C2C6]/10 p-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              <span className="font-semibold text-gray-900">{t('comparison:footer.note')}</span>{' '}
              {t('comparison:footer.disclaimer')}
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1B2A63] via-[#2D4EC8] to-[#00A4A6] rounded-sm p-10 shadow-2xl">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
            
            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t('comparison:cta.title')}
              </h3>
              <p className="text-[#A4E6E0] text-lg mb-8 max-w-2xl mx-auto">
                {t('comparison:cta.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="#auth-section"
                  className="px-8 py-4 bg-white hover:bg-[#A4E6E0] text-[#1B2A63] rounded-sm font-bold text-lg transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 transform"
                >
                  {t('comparison:cta.primary')}
                </a>
                <a
                  href="#pricing-section"
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-sm font-semibold text-lg transition-all duration-200 backdrop-blur-sm border-2 border-white/30"
                >
                  {t('comparison:cta.secondary')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ComparisonTable;
