import { useTranslation } from 'react-i18next';

const languages = {
  sv: {
    flag: '🇸🇪',
    name: 'Svenska',
    code: 'SV'
  },
  en: {
    flag: '🇬🇧',
    name: 'English',
    code: 'EN'
  }
};

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const currentLang = languages[i18n.language] || languages.sv;
  const otherLang = i18n.language === 'sv' ? languages.en : languages.sv;

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
      <span className="text-xl leading-none" role="img" aria-label={currentLang.name}>
        {currentLang.flag}
      </span>
      <span className="text-sm font-medium hidden sm:inline">{currentLang.code}</span>
    </button>
  );
}
