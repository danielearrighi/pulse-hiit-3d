/**
 * Attesa del caricamento dei web font (Google Fonts + Material Symbols).
 *
 * Nota sui domini:
 *  - fonts.googleapis.com serve il CSS con le regole @font-face;
 *  - fonts.gstatic.com   serve i file font (.woff2/.ttf) referenziati da quel CSS.
 *
 * Finche' i font non sono pronti, le icone Material Symbols vengono mostrate
 * come testo (es. "directions_run"), per questo attendiamo prima di rivelare l'app.
 *
 * Il timeout di sicurezza evita di bloccare l'app se la rete non e' disponibile
 * (es. PWA offline): in quel caso si prosegue con i font di fallback.
 */
const FONT_TIMEOUT_MS = 8000;

const REQUIRED_FONTS = [
  "400 24px 'Material Symbols Rounded'",
  "400 16px 'Google Sans'",
  "500 16px 'Google Sans'",
  "700 16px 'Google Sans'",
  "400 16px 'Roboto'",
  "700 16px 'Roboto'"
];

export function waitForFonts(timeout = FONT_TIMEOUT_MS) {
  if (typeof document === 'undefined' || !document.fonts) {
    return Promise.resolve();
  }

  const fontsReady = Promise.all(
    REQUIRED_FONTS.map((font) => document.fonts.load(font).catch(() => null))
  )
    .then(() => document.fonts.ready)
    .catch(() => {});

  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeout));

  return Promise.race([fontsReady, timeoutPromise]).catch(() => {});
}
