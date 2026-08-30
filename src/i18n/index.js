import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { isRTL } from '../utils/scriptDirection.js';

import en from './en.json';
import ur from './ur.json';
import ar from './ar.json';
import tr from './tr.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import hi from './hi.json';
import zh from './zh.json';
import ru from './ru.json';
import fa from './fa.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', fontClass: 'font-sans' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', fontClass: 'font-urdu' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', fontClass: 'font-arabic' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', fontClass: 'font-sans' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', fontClass: 'font-sans' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', fontClass: 'font-sans' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', fontClass: 'font-sans' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', fontClass: 'font-hindi' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', dir: 'ltr', fontClass: 'font-cjk' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', fontClass: 'font-sans' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl', fontClass: 'font-arabic' },
];

const resources = {
  en: { translation: en },
  ur: { translation: ur },
  ar: { translation: ar },
  tr: { translation: tr },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  hi: { translation: hi },
  zh: { translation: zh },
  ru: { translation: ru },
  fa: { translation: fa },
};

/**
 * Detect the initial language from local storage, browser preferences, or default to English.
 */
export function getInitialLanguage() {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('preferredLanguage');
  if (saved && resources[saved]) return saved;

  const browserLang = (navigator.language || navigator.userLanguage || '').split('-')[0].toLowerCase();
  if (browserLang && resources[browserLang]) return browserLang;

  return 'en';
}

const initialLng = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
  });

/**
 * Update app-wide language immediately, update HTML direction and lang attribute, and persist in localStorage.
 * @param {string} langCode 
 */
export function setAppLanguage(langCode) {
  if (!langCode || !resources[langCode]) {
    langCode = 'en';
  }

  i18n.changeLanguage(langCode);

  if (typeof document !== 'undefined') {
    const rtl = isRTL(langCode);
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = langCode;
    document.documentElement.setAttribute('data-lang', langCode);

    try {
      localStorage.setItem('preferredLanguage', langCode);
    } catch {
      // Ignore storage write errors (e.g. private mode quota)
    }

    window.dispatchEvent(new CustomEvent('qc:languageChanged', { detail: { lang: langCode, rtl } }));
  }
}

// Ensure document root attributes match initial language on load
if (typeof document !== 'undefined') {
  const initialRtl = isRTL(initialLng);
  document.documentElement.dir = initialRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = initialLng;
  document.documentElement.setAttribute('data-lang', initialLng);
}

export default i18n;
