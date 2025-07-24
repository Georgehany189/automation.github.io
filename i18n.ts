import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    resources: {
      en: {
        translation: require('../public/locales/en/translation.json'),
      },
      ar: {
        translation: require('../public/locales/ar/translation.json'),
      },
      // Add more languages as needed
    },
    // Options for LanguageDetector
    detection: {
      order: ['queryString', 'cookie', 'userBrowser', 'htmlTag', 'localStorage', 'sessionStorage'],
      caches: ['cookie'],
    },
  });

export default i18n;
