/**
 * Screen Wake Lock Service to keep mobile screens active during workouts
 */

class WakeLockService {
  constructor() {
    this.wakeLock = null;
  }

  get isActive() {
    return !!(this.wakeLock && !this.wakeLock.released);
  }

  async request() {
    try {
      if ('wakeLock' in navigator && (!this.wakeLock || this.wakeLock.released)) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch (err) {
      console.warn('[WakeLock] Screen Wake Lock not acquired:', err);
    }
  }

  async release() {
    try {
      if (this.wakeLock && !this.wakeLock.released) {
        await this.wakeLock.release();
      }
    } catch (err) {
      console.warn('[WakeLock] Error releasing Wake Lock:', err);
    } finally {
      this.wakeLock = null;
    }
  }
}

export const wakeLock = new WakeLockService();
export default wakeLock;
