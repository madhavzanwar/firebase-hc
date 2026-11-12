import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import mr from './mr.json';
import { isLang, type Lang } from '../lib/i18n-types';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('lablens.lang');
    if (isLang(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2);
  return isLang(nav) ? nav : 'en';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi }, mr: { translation: mr } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
