import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

export function TestProviders({ children, locale = 'sv' }) {
  i18n.changeLanguage(locale);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function withTestProviders(children, locale = 'sv') {
  return <TestProviders locale={locale}>{children}</TestProviders>;
}
