/**
 * Shared Navigation & Auth Controller for Material 3 Layout (Top App Bar, Bottom Nav, Rail, Auth Sheet)
 */

class SharedNav {
  constructor() {
    this.currentUser = null;
    this.activePage = this.detectActivePage();
  }

  detectActivePage() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('builder')) return 'builder';
    if (path.includes('editor')) return 'editor';
    if (path.includes('library')) return 'library';
    if (path.includes('admin')) return 'admin';
    if (path.includes('player')) return 'player';
    return 'dashboard';
  }

  async init() {
    if (window.i18n) {
      await window.i18n.init();
    }

    this.currentUser = await window.API.getMe();
    this.renderNavigationRail();
    this.renderTopAppBar();
    this.renderBottomNav();
    this.renderAuthModal();
    this.initEvents();

    window.addEventListener('languageChanged', () => {
      this.updateLanguageUI();
    });
  }

  isAdmin() {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele');
  }

  isSuperUser() {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'superuser';
  }

  canManage3D() {
    return this.isAdmin() || this.isSuperUser();
  }

  getRoleBadgeHtml(user) {
    if (!user) return '';
    if (user.role === 'admin' || (user.username && user.username.toLowerCase() === 'daniele')) {
      return '<span class="md-badge md-badge-primary" style="font-size: 0.65rem; padding: 1px 6px;">Admin</span>';
    }
    if (user.role === 'superuser') {
      return '<span class="md-badge md-badge-super" style="font-size: 0.65rem; padding: 1px 6px;">Super</span>';
    }
    return '';
  }

  renderNavigationRail() {
    const railContainer = document.getElementById('navRailContainer');
    if (!railContainer) return;

    const t = window.t || (k => k);
    const currentLang = window.i18n?.currentLang || 'it';

    railContainer.innerHTML = `
      <aside class="md-nav-rail">
        <div class="md-nav-rail__header">
          <a href="/" style="text-decoration: none; color: inherit;">
            <span class="material-symbols-rounded brand-flame" style="color: var(--md-sys-color-primary); font-size: 2rem;">local_fire_department</span>
          </a>
        </div>
        <div class="md-nav-rail__items">
          <a href="/" class="md-nav-rail__item ${this.activePage === 'dashboard' ? 'active' : ''}">
            <div class="md-nav-rail__indicator">
              <span class="material-symbols-rounded ${this.activePage === 'dashboard' ? 'filled' : ''}">grid_view</span>
            </div>
            <span class="md-nav-rail__label" data-i18n="app.nav_label.dashboard">${t('app.nav_label.dashboard')}</span>
          </a>

          <a href="/builder" class="md-nav-rail__item ${this.activePage === 'builder' ? 'active' : ''}">
            <div class="md-nav-rail__indicator">
              <span class="material-symbols-rounded ${this.activePage === 'builder' ? 'filled' : ''}">bolt</span>
            </div>
            <span class="md-nav-rail__label" data-i18n="app.nav_label.builder">${t('app.nav_label.builder')}</span>
          </a>

          <a href="/editor" class="md-nav-rail__item ${this.activePage === 'editor' ? 'active' : ''}">
            <div class="md-nav-rail__indicator">
              <span class="material-symbols-rounded ${this.activePage === 'editor' ? 'filled' : ''}">accessibility_new</span>
            </div>
            <span class="md-nav-rail__label" data-i18n="app.nav_label.editor">${t('app.nav_label.editor')}</span>
          </a>

          <a href="/library" class="md-nav-rail__item ${this.activePage === 'library' ? 'active' : ''}">
            <div class="md-nav-rail__indicator">
              <span class="material-symbols-rounded ${this.activePage === 'library' ? 'filled' : ''}">fitness_center</span>
            </div>
            <span class="md-nav-rail__label" data-i18n="app.nav_label.library">${t('app.nav_label.library')}</span>
          </a>
        </div>

        <div class="md-nav-rail__footer">
          <button type="button" class="md-nav-rail__item" id="railLangToggleBtn" title="${currentLang === 'it' ? 'Passa a Inglese' : 'Switch to English'}">
            <div class="md-nav-rail__indicator">
              <span class="material-symbols-rounded">language</span>
            </div>
            <span class="md-nav-rail__label" style="font-weight: 700;">${currentLang === 'it' ? 'IT' : 'EN'}</span>
          </button>
        </div>
      </aside>
    `;
  }

  renderTopAppBar() {
    const headerContainer = document.getElementById('topAppBarContainer');
    if (!headerContainer) return;

    const t = window.t || (k => k);
    const user = this.currentUser;

    headerContainer.innerHTML = `
      <header class="md-top-app-bar">
        <div class="md-top-app-bar__leading">
          <a href="/" class="md-top-app-bar__logo">
            <span class="material-symbols-rounded brand-flame" style="color: var(--md-sys-color-primary);">local_fire_department</span>
            <span class="brand-title">Pulse HIIT 3D</span>
          </a>
        </div>
        <div class="md-top-app-bar__actions">
          <!-- User Auth Profile Button -->
          <div id="sharedAuthProfileBtn">
            ${user ? `
              <button type="button" class="user-profile-chip md-ripple-surface" id="openProfileSheetBtn" title="${t('app.auth.profile_title')}">
                <span class="material-symbols-rounded filled" style="font-size: 20px; color: var(--md-sys-color-primary);">account_circle</span>
                <span class="user-profile-chip__name">${user.username}</span>
                ${this.getRoleBadgeHtml(user)}
              </button>
            ` : `
              <button id="openAuthBtn" class="md-btn md-btn-filled" style="height: 38px; padding: 0 1rem; font-size: 0.88rem;">
                <span class="material-symbols-rounded" style="font-size: 18px;">login</span>
                <span data-i18n="app.auth.login">${t('app.auth.login')}</span>
              </button>
            `}
          </div>
        </div>
      </header>
    `;
  }

  renderBottomNav() {
    const bottomNavContainer = document.getElementById('bottomNavContainer');
    if (!bottomNavContainer) return;

    const t = window.t || (k => k);

    bottomNavContainer.innerHTML = `
      <nav class="md-bottom-nav">
        <a href="/" class="md-bottom-nav__item ${this.activePage === 'dashboard' ? 'active' : ''}">
          <div class="md-bottom-nav__indicator">
            <span class="material-symbols-rounded ${this.activePage === 'dashboard' ? 'filled' : ''}">grid_view</span>
          </div>
          <span class="md-bottom-nav__label" data-i18n="app.nav_label.dashboard">${t('app.nav_label.dashboard')}</span>
        </a>

        <a href="/builder" class="md-bottom-nav__item ${this.activePage === 'builder' ? 'active' : ''}">
          <div class="md-bottom-nav__indicator">
            <span class="material-symbols-rounded ${this.activePage === 'builder' ? 'filled' : ''}">bolt</span>
          </div>
          <span class="md-bottom-nav__label" data-i18n="app.nav_label.builder">${t('app.nav_label.builder')}</span>
        </a>

        <a href="/editor" class="md-bottom-nav__item ${this.activePage === 'editor' ? 'active' : ''}">
          <div class="md-bottom-nav__indicator">
            <span class="material-symbols-rounded ${this.activePage === 'editor' ? 'filled' : ''}">accessibility_new</span>
          </div>
          <span class="md-bottom-nav__label" data-i18n="app.nav_label.editor">${t('app.nav_label.editor')}</span>
        </a>

        <a href="/library" class="md-bottom-nav__item ${this.activePage === 'library' ? 'active' : ''}">
          <div class="md-bottom-nav__indicator">
            <span class="material-symbols-rounded ${this.activePage === 'library' ? 'filled' : ''}">fitness_center</span>
          </div>
          <span class="md-bottom-nav__label" data-i18n="app.nav_label.library">${t('app.nav_label.library')}</span>
        </a>
      </nav>
    `;
  }

  renderAuthModal() {
    let authContainer = document.getElementById('sharedAuthModal');
    if (!authContainer) {
      authContainer = document.createElement('div');
      authContainer.id = 'sharedAuthModal';
      document.body.appendChild(authContainer);
    }

    const t = window.t || (k => k);
    const currentLang = window.i18n?.currentLang || 'it';
    const user = this.currentUser;

    authContainer.innerHTML = `
      <!-- Login & Register Sheet -->
      <div class="md-sheet-backdrop" id="authSheetBackdrop">
        <div class="md-bottom-sheet" style="max-width: 480px; margin: 0 auto; left: 0; right: 0;">
          <div class="md-sheet__handle"></div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div class="md-segmented-button">
              <button type="button" class="md-segmented-button__btn active" id="authTabLogin" data-i18n="app.auth.login">
                <span class="material-symbols-rounded" style="font-size: 18px;">login</span> ${t('app.auth.login')}
              </button>
              <button type="button" class="md-segmented-button__btn" id="authTabRegister" data-i18n="app.auth.register">
                <span class="material-symbols-rounded" style="font-size: 18px;">person_add</span> ${t('app.auth.register')}
              </button>
            </div>
            <button type="button" class="md-btn-icon" id="authSheetCloseBtn">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <!-- Login Form -->
          <form id="authLoginForm">
            <div class="md-field-group">
              <input type="text" id="loginUsernameInput" class="md-input" required placeholder=" ">
              <label class="md-field-label" for="loginUsernameInput" data-i18n="app.auth.username_email">${t('app.auth.username_email')}</label>
            </div>
            <div class="md-field-group">
              <input type="password" id="loginPasswordInput" class="md-input" required placeholder=" ">
              <label class="md-field-label" for="loginPasswordInput" data-i18n="app.auth.password">${t('app.auth.password')}</label>
            </div>
            <button type="submit" class="md-btn md-btn-filled" style="width: 100%; height: 48px; margin-top: 0.5rem;" data-i18n="app.auth.login">
              ${t('app.auth.login')}
            </button>
          </form>

          <!-- Register Form -->
          <form id="authRegisterForm" style="display: none;">
            <div class="md-field-group">
              <input type="text" id="regUsernameInput" class="md-input" required placeholder=" ">
              <label class="md-field-label" for="regUsernameInput" data-i18n="app.auth.username">${t('app.auth.username')}</label>
            </div>
            <div class="md-field-group">
              <input type="email" id="regEmailInput" class="md-input" required placeholder=" ">
              <label class="md-field-label" for="regEmailInput" data-i18n="app.auth.email">${t('app.auth.email')}</label>
            </div>
            <div class="md-field-group">
              <input type="password" id="regPasswordInput" class="md-input" required placeholder=" ">
              <label class="md-field-label" for="regPasswordInput" data-i18n="app.auth.password">${t('app.auth.password')}</label>
            </div>
            <button type="submit" class="md-btn md-btn-filled" style="width: 100%; height: 48px; margin-top: 0.5rem;" data-i18n="app.auth.register_account">
              ${t('app.auth.register_account')}
            </button>
          </form>

          <!-- Language Selector inside Auth Sheet -->
          <div class="sheet-lang-section">
            <div class="sheet-lang-label">
              <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary);">language</span>
              <span data-i18n="app.language_label">${t('app.language_label', { defaultValue: 'Lingua' })}</span>
            </div>
            <div class="md-segmented-button">
              <button type="button" class="md-segmented-button__btn ${currentLang === 'it' ? 'active' : ''}" data-lang="it">IT</button>
              <button type="button" class="md-segmented-button__btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
            </div>
          </div>
        </div>
      </div>

      <!-- User Profile & Settings Sheet -->
      <div class="md-sheet-backdrop" id="profileSheetBackdrop">
        <div class="md-bottom-sheet" style="max-width: 480px; margin: 0 auto; left: 0; right: 0;">
          <div class="md-sheet__handle"></div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--md-sys-color-on-surface); margin: 0;" data-i18n="app.auth.profile_title">
              ${t('app.auth.profile_title', { defaultValue: 'Profilo & Impostazioni' })}
            </h3>
            <button type="button" class="md-btn-icon" id="profileSheetCloseBtn">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          ${user ? `
            <div class="profile-card">
              <div class="profile-avatar">
                ${user.username ? user.username[0].toUpperCase() : 'U'}
              </div>
              <div class="profile-details">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <strong style="font-size: 1rem; color: var(--md-sys-color-on-surface);">${user.username}</strong>
                  ${this.getRoleBadgeHtml(user)}
                </div>
                <div style="font-size: 0.85rem; color: var(--md-sys-color-on-surface-variant); margin-top: 2px;">
                  ${user.email || ''}
                </div>
              </div>
            </div>
          ` : ''}

          <div class="profile-setting-row">
            <div class="sheet-lang-label">
              <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary);">language</span>
              <span data-i18n="app.language_label">${t('app.language_label', { defaultValue: 'Lingua' })}</span>
            </div>
            <div class="md-segmented-button">
              <button type="button" class="md-segmented-button__btn ${currentLang === 'it' ? 'active' : ''}" data-lang="it">Italiano</button>
              <button type="button" class="md-segmented-button__btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">English</button>
            </div>
          </div>

          ${this.isAdmin() ? `
            <div class="profile-admin-section" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--md-sys-color-outline-variant);">
              <a href="/admin" class="md-btn md-btn-tonal" style="width: 100%; height: 48px; display: flex; align-items: center; justify-content: space-between; text-decoration: none; padding: 0 1rem; border-radius: 12px; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 22px;">group</span>
                  <span style="font-weight: 600; color: var(--md-sys-color-on-surface);" data-i18n="app.nav_label.admin">${t('app.nav_label.admin', { defaultValue: 'Utenti' })}</span>
                </div>
                <span class="material-symbols-rounded" style="color: var(--md-sys-color-on-surface-variant); font-size: 20px;">chevron_right</span>
              </a>
            </div>
          ` : ''}

          <button type="button" class="md-btn md-btn-danger" id="profileLogoutBtn" style="width: 100%; height: 48px; margin-top: 1.25rem;">
            <span class="material-symbols-rounded">logout</span>
            <span data-i18n="app.auth.logout">${t('app.auth.logout')}</span>
          </button>
        </div>
      </div>
    `;

    if (window.Material3) {
      window.Material3.initInputFloatingLabels();
    }
  }

  initEvents() {
    // Open Auth Sheet
    document.addEventListener('click', (e) => {
      if (e.target.closest('#openAuthBtn')) {
        window.Material3.openDialog('authSheetBackdrop');
      }
      if (e.target.closest('#authSheetCloseBtn')) {
        window.Material3.closeDialog('authSheetBackdrop');
      }
      if (e.target.closest('#openProfileSheetBtn')) {
        window.Material3.openDialog('profileSheetBackdrop');
      }
      if (e.target.closest('#profileSheetCloseBtn')) {
        window.Material3.closeDialog('profileSheetBackdrop');
      }
      if (e.target.closest('#logoutBtn') || e.target.closest('#profileLogoutBtn')) {
        window.Material3.closeDialog('profileSheetBackdrop');
        this.handleLogout();
      }
      if (e.target.closest('#railLangToggleBtn')) {
        const newLang = (window.i18n?.currentLang === 'it') ? 'en' : 'it';
        if (window.i18n) {
          window.i18n.setLanguage(newLang);
        }
      }
      const langBtn = e.target.closest('[data-lang]');
      if (langBtn) {
        const lang = langBtn.getAttribute('data-lang');
        if (window.i18n && lang) {
          window.i18n.setLanguage(lang);
        }
      }
    });

    // Toggle Login / Register
    document.addEventListener('click', (e) => {
      const loginTab = e.target.closest('#authTabLogin');
      const regTab = e.target.closest('#authTabRegister');
      const loginForm = document.getElementById('authLoginForm');
      const regForm = document.getElementById('authRegisterForm');

      if (loginTab) {
        document.getElementById('authTabLogin').classList.add('active');
        document.getElementById('authTabRegister').classList.remove('active');
        if (loginForm) loginForm.style.display = 'block';
        if (regForm) regForm.style.display = 'none';
      } else if (regTab) {
        document.getElementById('authTabRegister').classList.add('active');
        document.getElementById('authTabLogin').classList.remove('active');
        if (loginForm) loginForm.style.display = 'none';
        if (regForm) regForm.style.display = 'block';
      }
    });

    // Login Submit
    document.addEventListener('submit', async (e) => {
      if (e.target.id === 'authLoginForm') {
        e.preventDefault();
        const username = document.getElementById('loginUsernameInput').value.trim();
        const password = document.getElementById('loginPasswordInput').value;

        try {
          const user = await window.API.login(username, password);
          this.currentUser = user;
          window.Material3.closeDialog('authSheetBackdrop');
          window.Material3.showSnackbar(`Bentornato, ${user.username}!`);
          this.renderTopAppBar();
          this.renderBottomNav();
          this.renderNavigationRail();
          this.renderAuthModal();
          window.dispatchEvent(new CustomEvent('authChanged', { detail: { user } }));
        } catch (err) {
          window.Material3.showSnackbar(err.message || 'Login fallito');
        }
      }

      if (e.target.id === 'authRegisterForm') {
        e.preventDefault();
        const username = document.getElementById('regUsernameInput').value.trim();
        const email = document.getElementById('regEmailInput').value.trim();
        const password = document.getElementById('regPasswordInput').value;

        try {
          const user = await window.API.register(username, email, password);
          this.currentUser = user;
          window.Material3.closeDialog('authSheetBackdrop');
          window.Material3.showSnackbar(`Account creato con successo, benvenuto ${user.username}!`);
          this.renderTopAppBar();
          this.renderBottomNav();
          this.renderNavigationRail();
          this.renderAuthModal();
          window.dispatchEvent(new CustomEvent('authChanged', { detail: { user } }));
        } catch (err) {
          window.Material3.showSnackbar(err.message || 'Registrazione fallita');
        }
      }
    });
  }

  async handleLogout() {
    await window.API.logout();
    this.currentUser = null;
    window.Material3.showSnackbar('Disconnesso con successo');
    this.renderTopAppBar();
    this.renderBottomNav();
    this.renderNavigationRail();
    this.renderAuthModal();
    window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: null } }));
  }

  updateLanguageUI() {
    this.renderNavigationRail();
    this.renderTopAppBar();
    this.renderBottomNav();
    this.renderAuthModal();
  }
}

window.sharedNav = new SharedNav();
document.addEventListener('DOMContentLoaded', () => {
  window.sharedNav.init();
});
