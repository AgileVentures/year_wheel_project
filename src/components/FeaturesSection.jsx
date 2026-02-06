import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Sparkles, Calendar, Copy, TrendingUp, Users, Zap, Download, History, MessageSquare, Share2, Bell } from 'lucide-react';

function FeaturesSection() {
  const { t } = useTranslation(['landing']);

  return (
    <section id="features-section" className="py-20 px-4 sm:px-6 lg:px-8 scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('landing:features.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('landing:features.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 - AI Assistant (PREMIUM) */}
          <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border-2 border-[#36C2C6] hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-[#9FCB3E] text-[#1a3d1f] px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
              <Crown size={12} />
              {t('landing:features.premium')}
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-[#00A4A6] to-[#2D4EC8] rounded-sm flex items-center justify-center mb-6">
              <Sparkles className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.aiAssistant.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.aiAssistant.description')}
            </p>
          </div>

          {/* Feature 2 - Google Integration (PREMIUM) */}
          <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border-2 border-[#2D4EC8] hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-[#9FCB3E] text-[#1a3d1f] px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
              <Crown size={12} />
              {t('landing:features.premium')}
            </div>
            <div className="w-12 h-12 bg-[#2D4EC8] rounded-sm flex items-center justify-center mb-6">
              <Calendar className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.googleIntegration.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.googleIntegration.description')}
            </p>
          </div>

          {/* Feature 3 - SmartCopy (PREMIUM) */}
          <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border-2 border-[#00A4A6] hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-[#9FCB3E] text-[#1a3d1f] px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
              <Crown size={12} />
              {t('landing:features.premium')}
            </div>
            <div className="w-12 h-12 bg-[#00A4A6] rounded-sm flex items-center justify-center mb-6">
              <Copy className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.smartCopy.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.smartCopy.description')}
            </p>
          </div>

          {/* Feature 5 - Circular Overview */}
          <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border border-[#36C2C6]/30 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#00A4A6] rounded-sm flex items-center justify-center mb-6">
              <TrendingUp className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.circularOverview.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.circularOverview.description')}
            </p>
          </div>

          {/* Feature 6 - Real-time Collaboration */}
          <div className="bg-gradient-to-br from-[#9FCB3E]/20 to-white p-8 rounded-sm border border-[#9FCB3E]/30 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#336B3E] rounded-sm flex items-center justify-center mb-6">
              <Users className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.realTimeCollaboration.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.realTimeCollaboration.description')}
            </p>
          </div>

          {/* Feature 7 - Smart Rings */}
          <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border border-[#2E9E97]/30 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#2E9E97] rounded-sm flex items-center justify-center mb-6">
              <Zap className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.smartRings.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.smartRings.description')}
            </p>
          </div>

          {/* Feature 8 - High Quality Export */}
          <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border border-[#36C2C6]/30 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#36C2C6] rounded-sm flex items-center justify-center mb-6">
              <Download className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.highQualityExport.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.highQualityExport.description')}
            </p>
          </div>

          {/* Feature 9 - Version History (PREMIUM) */}
          <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border-2 border-[#2D4EC8] hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-[#9FCB3E] text-[#1a3d1f] px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
              <Crown size={12} />
              {t('landing:features.premium')}
            </div>
            <div className="w-12 h-12 bg-[#2D4EC8] rounded-sm flex items-center justify-center mb-6">
              <History className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.versionHistory.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.versionHistory.description')}
            </p>
          </div>

          {/* Feature 10 - Version History (PREMIUM) */}
          <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border-2 border-[#2D4EC8] hover:shadow-xl transition-all relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-[#9FCB3E] text-[#1a3d1f] px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
              <Crown size={12} />
              {t('landing:features.premium')}
            </div>
            <div className="w-12 h-12 bg-[#2D4EC8] rounded-sm flex items-center justify-center mb-6">
              <History className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.versionHistory.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.versionHistory.description')}
            </p>
          </div>

          {/* Feature 9 - Comments */}
          <div className="bg-gradient-to-br from-[#9FCB3E]/20 to-white p-8 rounded-sm border border-[#336B3E]/30 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#336B3E] rounded-sm flex items-center justify-center mb-6">
              <MessageSquare className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.comments.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.comments.description')}
            </p>
          </div>

          {/* Feature 11 - Multiple Share Modes */}
          <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border border-[#00A4A6]/30 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#00A4A6] rounded-sm flex items-center justify-center mb-6">
              <Share2 className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t('landing:features.multipleShareModes.title')}
            </h3>
            <p className="text-gray-600">
              {t('landing:features.multipleShareModes.description')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(FeaturesSection);