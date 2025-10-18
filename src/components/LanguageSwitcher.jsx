import { useTranslation } from 'react-i18next';
import { memo } from 'react';

// SVG flag components for better cross-platform support
const SwedishFlag = memo(() => (
  <svg className="w-5 h-4" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="16" height="10" fill="#006AA7"/>
    <rect x="5" width="2" height="10" fill="#FECC00"/>
    <rect y="4" width="16" height="2" fill="#FECC00"/>
  </svg>
));

const BritishFlag = memo(() => (
  <svg className="w-5 h-4" viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="30" fill="#012169"/>
    <path d="M0 0L60 30M60 0L0 30" stroke="white" strokeWidth="6"/>
    <path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" strokeWidth="4"/>
    <path d="M30 0V30M0 15H60" stroke="white" strokeWidth="10"/>
    <path d="M30 0V30M0 15H60" stroke="#C8102E" strokeWidth="6"/>
  </svg>
));

SwedishFlag.displayName = 'SwedishFlag';
BritishFlag.displayName = 'BritishFlag';

const languages = {
  sv: {
    FlagComponent: SwedishFlag,
    name: 'Svenska',
    code: 'SV'
  },
  en: {
    FlagComponent: BritishFlag,
    name: 'English',
    code: 'EN'
  }
};

function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const currentLang = languages[i18n.language] || languages.sv;
  const otherLang = i18n.language === 'sv' ? languages.en : languages.sv;
  const FlagComponent = currentLang.FlagComponent;

  const toggleLanguage = () => {
    const newLang = i18n.language === 'sv' ? 'en' : 'sv';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-sm transition-colors ${className}`}
      title={`${otherLang.name}`}
      aria-label={`Switch language to ${otherLang.name}`}
    >
      <span className="flex items-center" role="img" aria-label={currentLang.name}>
        <FlagComponent />
      </span>
      <span className="text-sm font-medium hidden sm:inline">{currentLang.code}</span>
    </button>
  );
}

export default memo(LanguageSwitcher);
