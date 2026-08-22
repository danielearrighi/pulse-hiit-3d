/**
 * Client-Side i18n Internationalization Manager
 */

class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('app_lang') || 'it';
    this.translations = {};
    this.fallbackLang = 'en';
    this.initialized = false;
  }

  async init() {
    await this.loadLanguage(this.currentLang);
    this.initialized = true;
    this.translatePage();
    this.initLanguageSelector();
  }

  async loadLanguage(lang) {
    try {
      const res = await fetch(`/locales/${lang}.json`);
      if (!res.ok) throw new Error(`Locale file /locales/${lang}.json returned status ${res.status}`);
      this.translations = await res.json();
      this.currentLang = lang;
      localStorage.setItem('app_lang', lang);
      document.cookie = `lang=${lang}; path=/; max-age=31536000`;
      document.documentElement.lang = lang;
    } catch (err) {
      console.warn(`[i18n] Failed to load language "${lang}", falling back:`, err);
      if (lang !== this.fallbackLang) {
        await this.loadLanguage(this.fallbackLang);
      }
    }
  }

  t(key, params = {}) {
    if (!key) return '';
    const keys = key.split('.');
    let val = this.translations;
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

  translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = this.t(key);
    });
  }

  async setLanguage(lang) {
    if (lang === this.currentLang && Object.keys(this.translations).length > 0) return;
    await this.loadLanguage(lang);
    this.translatePage();
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
  }

  initLanguageSelector() {
    this.renderLanguageSwitcher('langSwitcher');

    // Global listener for segmented or button language switches
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lang]');
      if (btn) {
        const lang = btn.getAttribute('data-lang');
        if (lang && lang !== this.currentLang) {
          this.setLanguage(lang);
        }
      }
    });
  }

  renderLanguageSwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <select class="md-select lang-select-m3" aria-label="Seleziona lingua / Select language" style="height: 38px; width: 95px; padding: 0.2rem 1.6rem 0.2rem 0.6rem; font-size: 0.85rem; border-radius: var(--md-shape-full); background-color: var(--md-sys-color-surface-container);">
        <option value="it" ${this.currentLang === 'it' ? 'selected' : ''}>IT</option>
        <option value="en" ${this.currentLang === 'en' ? 'selected' : ''}>EN</option>
      </select>
    `;

    const selectEl = container.querySelector('.lang-select-m3');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        this.setLanguage(e.target.value);
      });
    }
  }
}

window.i18n = new I18nManager();
window.t = (key, params) => window.i18n.t(key, params);
