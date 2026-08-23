(function() {
  if (window.i18n) return;

  class I18nManager {
    constructor() {
      this.currentLang = localStorage.getItem('app_lang') || 'it';
      this.fallbackLang = 'en';
      this.translations = {};
      this.initialized = false;
      this.selectorInitialized = false;

      // Synchronous instant cache retrieval (0ms latency, zero flash)
      try {
        const cached = localStorage.getItem(`app_i18n_${this.currentLang}`);
        if (cached) {
          this.translations = JSON.parse(cached);
          this.initialized = true;
          document.documentElement.lang = this.currentLang;
        }
      } catch (e) {
        console.warn('[i18n] Failed reading cache from localStorage:', e);
      }
    }

    async init() {
      if (!this.initialized || Object.keys(this.translations).length === 0) {
        await this.loadLanguage(this.currentLang);
      } else {
        // Revalidate in background without blocking UI
        this.loadLanguage(this.currentLang, true).catch(() => {});
      }

      this.translatePage();
      this.initLanguageSelector();
      this.bindTurboEvents();
    }

    async loadLanguage(lang, background = false) {
      try {
        const res = await fetch(`/locales/${lang}.json?v=2026.2`);
        if (!res.ok) throw new Error(`Locale file /locales/${lang}.json returned status ${res.status}`);
        const data = await res.json();
        this.translations = data;
        this.currentLang = lang;
        this.initialized = true;

        // Update LocalStorage cache & Cookie
        try {
          localStorage.setItem('app_lang', lang);
          localStorage.setItem(`app_i18n_${lang}`, JSON.stringify(data));
        } catch (e) {
          console.warn('[i18n] Could not write to localStorage:', e);
        }

        document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = lang;

        this.translatePage();
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
        if (key) {
          el.textContent = this.t(key);
        }
      });

      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
          el.placeholder = this.t(key);
        }
      });

      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
          el.title = this.t(key);
        }
      });

      document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label');
        if (key) {
          el.setAttribute('aria-label', this.t(key));
        }
      });

      document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) {
          el.innerHTML = this.t(key);
        }
      });

      // Translate document title if title has data-i18n
      const titleEl = document.querySelector('title[data-i18n]');
      if (titleEl) {
        const key = titleEl.getAttribute('data-i18n');
        document.title = this.t(key);
      }
    }

    async setLanguage(lang) {
      if (lang === this.currentLang && Object.keys(this.translations).length > 0) return;
      await this.loadLanguage(lang);
      this.translatePage();
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
    }

    initLanguageSelector() {
      if (this.selectorInitialized) return;
      this.selectorInitialized = true;

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

    bindTurboEvents() {
      // Translate on every Turbo page visit automatically
      document.addEventListener('turbo:load', () => {
        this.translatePage();
      });

      document.addEventListener('turbo:render', () => {
        this.translatePage();
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

  // Auto-run translatePage as early as DOM is interactive
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.i18n.init();
    });
  } else {
    window.i18n.init();
  }
})();
