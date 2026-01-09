import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import Swedish translations
import svCommon from './locales/sv/common.json';
import svDashboard from './locales/sv/dashboard.json';
import svEditor from './locales/sv/editor.json';
import svTeams from './locales/sv/teams.json';
import svAuth from './locales/sv/auth.json';
import svSubscription from './locales/sv/subscription.json';
import svLanding from './locales/sv/landing.json';
import svIntegration from './locales/sv/integration.json';
import svComparison from './locales/sv/comparison.json';
import svAdmin from './locales/sv/admin.json';
import svExport from './locales/sv/export.json';
import svSupport from './locales/sv/support.json';
import svNotifications from './locales/sv/notifications.json';
import svAffiliate from './locales/sv/affiliate.json';
import svZoom from './locales/sv/zoom.json';
import svNewsletter from './locales/sv/newsletter.json';
import svQuiz from './locales/sv/quiz.json';
import svSmartImport from './locales/sv/smartImport.json';
import svToast from './locales/sv/toast.json';
import svConflict from './locales/sv/conflict.json';
import svReports from './locales/sv/reports.json';
import svTimeline from './locales/sv/timeline.json';

// Import English translations
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enEditor from './locales/en/editor.json';
import enTeams from './locales/en/teams.json';
import enAuth from './locales/en/auth.json';
import enSubscription from './locales/en/subscription.json';
import enLanding from './locales/en/landing.json';
import enIntegration from './locales/en/integration.json';
import enComparison from './locales/en/comparison.json';
import enAdmin from './locales/en/admin.json';
import enExport from './locales/en/export.json';
import enSupport from './locales/en/support.json';
import enNotifications from './locales/en/notifications.json';
import enAffiliate from './locales/en/affiliate.json';
import enZoom from './locales/en/zoom.json';
import enNewsletter from './locales/en/newsletter.json';
import enQuiz from './locales/en/quiz.json';
import enSmartImport from './locales/en/smartImport.json';
import enToast from './locales/en/toast.json';
import enConflict from './locales/en/conflict.json';
import enReports from './locales/en/reports.json';
import enTimeline from './locales/en/timeline.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      sv: {
        common: svCommon,
        dashboard: svDashboard,
        editor: svEditor,
        teams: svTeams,
        auth: svAuth,
        subscription: svSubscription,
        landing: svLanding,
        integration: svIntegration,
        comparison: svComparison,
        admin: svAdmin,
        export: svExport,
        support: svSupport,
        notifications: svNotifications,
        affiliate: svAffiliate,
        zoom: svZoom,
        newsletter: svNewsletter,
        quiz: svQuiz,
        smartImport: svSmartImport,
        toast: svToast,
        conflict: svConflict,
        reports: svReports,
        timeline: svTimeline,
      },
      en: {
        common: enCommon,
        dashboard: enDashboard,
        editor: enEditor,
        teams: enTeams,
        auth: enAuth,
        subscription: enSubscription,
        landing: enLanding,
        integration: enIntegration,
        comparison: enComparison,
        admin: enAdmin,
        export: enExport,
        support: enSupport,
        notifications: enNotifications,
        affiliate: enAffiliate,
        zoom: enZoom,
        newsletter: enNewsletter,
        quiz: enQuiz,
        smartImport: enSmartImport,
        toast: enToast,
        conflict: enConflict,
        reports: enReports,
        timeline: enTimeline,
      },
    },
    lng: undefined, // Don't set default - let detector choose
    fallbackLng: 'en', // Fallback to English for all non-Swedish languages
    supportedLngs: ['sv', 'en'], // Only support Swedish and English
    load: 'languageOnly', // Load 'sv' instead of 'sv-SE'
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'yearwheel_language',
      convertDetectedLanguage: (lng) => {
        // If detected language starts with 'sv', use Swedish
        // Otherwise, use English
        return lng.toLowerCase().startsWith('sv') ? 'sv' : 'en';
      },
    },
  });

// Expose i18n for testing
if (typeof window !== 'undefined') {
  window.__i18n = i18n;
}

export default i18n;
