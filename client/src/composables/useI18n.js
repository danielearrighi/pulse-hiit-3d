import { ref, shallowRef } from 'vue';

const initialLang = localStorage.getItem('app_lang') || 'it';
const currentLang = ref(initialLang);
const translations = shallowRef({});
const isInitialized = ref(false);

// Synchronously load cache for zero-latency initial render (0ms FOUC)
try {
  const cached = localStorage.getItem(`app_i18n_${initialLang}`);
  if (cached) {
    translations.value = JSON.parse(cached);
    isInitialized.value = true;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = initialLang;
    }
  }
} catch (e) {
  console.warn('[useI18n] Failed reading cache from localStorage:', e);
}

export function useI18n() {
  async function loadLanguage(lang, background = false) {
    try {
      const res = await fetch(`/locales/${lang}.json?v=2026.2`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      translations.value = data;
      currentLang.value = lang;
      isInitialized.value = true;

      try {
        localStorage.setItem('app_lang', lang);
        localStorage.setItem(`app_i18n_${lang}`, JSON.stringify(data));
      } catch (e) {
        console.warn('[useI18n] Could not write to localStorage:', e);
      }

      document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    } catch (err) {
      console.warn(`[useI18n] Failed to load language "${lang}":`, err);
      if (lang !== 'en') {
        await loadLanguage('en');
      }
    }
  }

  async function init() {
    if (!isInitialized.value || Object.keys(translations.value).length === 0) {
      await loadLanguage(currentLang.value);
    } else {
      // Background revalidation
      loadLanguage(currentLang.value, true).catch(() => {});
    }
  }

  async function setLanguage(lang) {
    if (lang === currentLang.value && Object.keys(translations.value).length > 0) return;
    await loadLanguage(lang);
  }

  function t(key, params = {}) {
    if (!key) return '';
    const keys = key.split('.');
    let val = translations.value;
    for (const k of keys) {
      val = (val && typeof val === 'object') ? val[k] : undefined;
    }
    if (val === null || val === undefined) {
      if (params && params.defaultValue !== undefined) {
        return params.defaultValue;
      }
      return key;
    }
    let text = val;
    if (typeof text === 'string') {
      Object.keys(params).forEach(p => {
        if (p !== 'defaultValue') {
          text = text.replace(new RegExp(`{{\\s*${p}\\s*}}`, 'g'), params[p]);
        }
      });
    }
    return text;
  }

  return {
    currentLang,
    translations,
    isInitialized,
    init,
    setLanguage,
    t
  };
}
