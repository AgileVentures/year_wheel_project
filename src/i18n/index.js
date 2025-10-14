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
      },
    },
    lng: 'sv', // Default language
    fallbackLng: 'sv', // Fallback to Swedish
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'yearwheel_language',
    },
  });

export default i18n;
