/**
 * App versioning & automatic update handling.
 *
 * The version is declared manually in `public/assets/version.json` and read by
 * Vite at build time (`__APP_VERSION__`). Express serves the same file at
 * `/assets/version.json` (no-store). Whenever the running bundle version differs
 * from the deployed one, the client is stale: persisted caches are purged and
 * the page is hard-reloaded, so users never have to clear their cache manually.
 */

export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const CHECK_INTERVAL_MS = 60 * 1000;
const INITIAL_DELAY_MS = 3 * 1000;
const RELOAD_GUARD_KEY = 'app_reload_target';

// The update check is a production-only concern: during development the bundle
// version is frozen at Vite startup while the served version.json can change,
// which would otherwise trigger spurious reloads.
const IS_PRODUCTION =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;

let started = false;
let reloadBlocked = false;

/**
 * Remove caches that are keyed by the app version but belong to an older build
 * (i18n translations and categories live in localStorage and would otherwise
 * survive a release).
 */
function purgeStaleCaches() {
  try {
    Object.keys(localStorage).forEach((key) => {
      const isVersionedCache = key.startsWith('app_i18n_') || key.startsWith('app_categories');
      if (isVersionedCache && !key.includes(APP_VERSION)) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    // localStorage unavailable (private mode, etc.) - nothing to purge.
  }
}

// Runs as soon as this module is evaluated, i.e. before useI18n/useCategories
// read their synchronous localStorage cache.
purgeStaleCaches();

/**
 * Prevent the automatic reload while it would be destructive (e.g. a workout is
 * in progress). The next scheduled check will reload once unblocked.
 */
export function setAutoReloadBlocked(blocked) {
  reloadBlocked = !!blocked;
}

async function fetchDeployedVersion() {
  try {
    const res = await fetch(`/assets/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.version ? String(data.version) : null;
  } catch (e) {
    return null;
  }
}

function doReload() {
  try {
    // Cache-busting query forces a fresh document fetch even behind aggressive
    // proxies; hashed assets then guarantee the new bundles are pulled in.
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now().toString(36));
    window.location.replace(url.toString());
  } catch (e) {
    window.location.reload();
  }
}

function hardReload() {
  try {
    if ('caches' in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {})
        .finally(doReload);
      return;
    }
  } catch (e) {
    // CacheStorage unavailable - fall through to a plain reload.
  }
  doReload();
}

/**
 * Poll the deployed build id and hard-reload the client when it changes.
 * Safe to call multiple times: only the first call has any effect.
 */
export function startUpdateCheck() {
  if (started || !IS_PRODUCTION || typeof window === 'undefined') return;
  started = true;

  const check = async () => {
    if (document.visibilityState === 'hidden') return;
    const deployed = await fetchDeployedVersion();

    if (!deployed || deployed === APP_VERSION) {
      // Up to date: clear any previous reload guard.
      try { sessionStorage.removeItem(RELOAD_GUARD_KEY); } catch (e) {}
      return;
    }
    if (reloadBlocked) return;

    // Avoid a reload loop if a proxy keeps serving an inconsistent version.
    try {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === deployed) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, deployed);
    } catch (e) {}

    hardReload();
  };

  window.setInterval(check, CHECK_INTERVAL_MS);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  window.setTimeout(check, INITIAL_DELAY_MS);
}
