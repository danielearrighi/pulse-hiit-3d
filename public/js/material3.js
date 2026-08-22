(function() {
  if (window.Material3) return;

  class Material3Engine {
    constructor() {
      this.snackbarContainer = null;
      this.init();
    }

    init() {
      const setup = () => {
        this.initRipple();
        this.initScrollElevation();
        this.initInputFloatingLabels();
        this.initDialogBackdrops();
        this.createSnackbarContainer();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
      } else {
        setup();
      }

      document.addEventListener('turbo:load', () => {
        this.initInputFloatingLabels();
        this.initDialogBackdrops();
        this.createSnackbarContainer();
      });
    }

  // Ripple Effect Handler (M3 State Layer)
  initRipple() {
    document.addEventListener('pointerdown', (e) => {
      const target = e.target.closest('.md-btn, .md-card, .md-chip, .md-ripple-surface, .md-bottom-nav__item, .md-nav-rail__item, .md-segmented-button__btn');
      if (!target || target.disabled) return;

      const rect = target.getBoundingClientRect();
      const wave = document.createElement('span');
      wave.className = 'md-ripple-wave';

      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      wave.style.width = wave.style.height = `${size}px`;
      wave.style.left = `${x}px`;
      wave.style.top = `${y}px`;

      target.appendChild(wave);

      setTimeout(() => {
        if (wave.parentElement) wave.remove();
      }, 650);
    });
  }

  // Top App Bar Scroll Elevation
  initScrollElevation() {
    const topBar = document.querySelector('.md-top-app-bar');
    if (!topBar) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        topBar.classList.add('scrolled');
      } else {
        topBar.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // Floating Labels for Outlined Text Fields
  initInputFloatingLabels() {
    const checkValue = (input) => {
      if (input.value && input.value.trim() !== '') {
        input.classList.add('has-value');
      } else {
        input.classList.remove('has-value');
      }
    };

    document.querySelectorAll('.md-input, .md-select').forEach(input => {
      checkValue(input);
      input.addEventListener('input', () => checkValue(input));
      input.addEventListener('change', () => checkValue(input));
      input.addEventListener('blur', () => checkValue(input));
    });
  }

  // Dialog Backdrop click-to-close
  initDialogBackdrops() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('md-dialog-backdrop') || e.target.classList.contains('md-sheet-backdrop')) {
        this.closeDialog(e.target.id);
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openBackdrop = document.querySelector('.md-dialog-backdrop.open, .md-sheet-backdrop.open');
        if (openBackdrop) {
          this.closeDialog(openBackdrop.id);
        }
      }
    });
  }

  openDialog(dialogId) {
    const el = document.getElementById(dialogId);
    if (el) {
      el.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  closeDialog(dialogId) {
    const el = document.getElementById(dialogId);
    if (el) {
      el.classList.remove('open');
      const anyOtherOpen = document.querySelector('.md-dialog-backdrop.open, .md-sheet-backdrop.open');
      if (!anyOtherOpen) {
        document.body.style.overflow = '';
      }
    }
  }

  createSnackbarContainer() {
    let container = document.querySelector('.md-snackbar-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'md-snackbar-container';
      document.body.appendChild(container);
    }
    this.snackbarContainer = container;
  }

  showSnackbar(options) {
    const { message, duration = 4000, actionText, onAction } = typeof options === 'string' ? { message: options } : options;
    if (!this.snackbarContainer) this.createSnackbarContainer();

    const snackbar = document.createElement('div');
    snackbar.className = 'md-snackbar';

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    snackbar.appendChild(textSpan);

    if (actionText && onAction) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'md-btn md-btn-text';
      actionBtn.style.color = 'var(--md-sys-color-primary)';
      actionBtn.style.padding = '0 0.5rem';
      actionBtn.style.height = '32px';
      actionBtn.textContent = actionText;
      actionBtn.addEventListener('click', () => {
        onAction();
        snackbar.remove();
      });
      snackbar.appendChild(actionBtn);
    }

    this.snackbarContainer.appendChild(snackbar);

    setTimeout(() => {
      snackbar.style.opacity = '0';
      snackbar.style.transform = 'translateY(10px)';
      snackbar.style.transition = 'all 0.3s ease';
      setTimeout(() => snackbar.remove(), 300);
    }, duration);
  }
}

  window.Material3 = new Material3Engine();
})();
