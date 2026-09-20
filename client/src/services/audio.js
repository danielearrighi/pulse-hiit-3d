/**
 * Web Audio Synthesizer with Dynamics Compressor for Mobile-Loud Beeps & Cues
 */

class AudioService {
  constructor() {
    this.audioCtx = null;
    this.compressor = null;
    this.unlocked = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (!this.compressor) {
        // Dynamics compressor to boost loudness and prevent clipping distortion on mobile speakers
        this.compressor = this.audioCtx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
        this.compressor.knee.setValueAtTime(40, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);
        this.compressor.connect(this.audioCtx.destination);
      }
      this.unlocked = true;
    }
  }

  unlock() {
    this.init();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  playBeep(freq = 800, duration = 0.18, type = 'triangle', volume = 0.85, delay = 0) {
    try {
      this.unlock();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime + delay;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      const attackTime = 0.008;
      const releaseTime = duration > 0.3 ? Math.min(0.35, duration * 0.5) : 0.025;
      const sustainEnd = Math.max(now + attackTime, now + duration - releaseTime);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + attackTime);
      gain.gain.setValueAtTime(volume, sustainEnd);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      if (this.compressor) {
        gain.connect(this.compressor);
      } else {
        gain.connect(this.audioCtx.destination);
      }

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('[Audio] Beep playback failed:', e);
    }
  }

  /**
   * Double beep at 10 seconds remaining (warning cue)
   */
  playTenSecondsWarning() {
    this.playBeep(750, 0.12, 'triangle', 0.85);
    setTimeout(() => {
      this.playBeep(950, 0.15, 'triangle', 0.85);
    }, 150);
  }

  /**
   * 3, 2, 1 countdown beeps
   */
  playCountdownBeep() {
    this.playBeep(880, 0.18, 'triangle', 0.9);
  }

  /**
   * Loud transition beep when a timer completes
   */
  playStepTransitionBeep() {
    this.playBeep(1320, 0.40, 'triangle', 0.95);
  }

  /**
   * Start / resume work beep
   */
  playStartBeep() {
    this.playBeep(1200, 0.35, 'triangle', 0.9);
  }

  /**
   * Rest / recovery phase entry beep
   */
  playRestBeep() {
    this.playBeep(520, 0.25, 'triangle', 0.85);
  }

  /**
   * Workout completed fanfare (Do - Mi - Sol - Doooo triumph)
   */
  playFinishFanfare() {
    try {
      this.unlock();
      // Notes: Do5 (C5), Mi5 (E5), Sol5 (G5), Do6 (C6)
      // Arpeggio leading to a rich celebratory major chord sustain
      this.playBeep(523.25, 0.12, 'triangle', 0.85, 0.00); // Do (C5)
      this.playBeep(659.25, 0.12, 'triangle', 0.85, 0.14); // Mi (E5)
      this.playBeep(783.99, 0.12, 'triangle', 0.85, 0.28); // Sol (G5)

      // Final sustained "Doooo" with harmonic C-major chord depth
      this.playBeep(1046.50, 0.75, 'triangle', 0.90, 0.42); // High Do (C6)
      this.playBeep(783.99, 0.70, 'triangle', 0.55, 0.42);  // Sol (G5)
      this.playBeep(659.25, 0.70, 'triangle', 0.45, 0.42);  // Mi (E5)
      this.playBeep(523.25, 0.70, 'triangle', 0.35, 0.42);  // Do (C5 root)
    } catch (e) {
      console.warn('[Audio] Fanfare failed:', e);
    }
  }
}

export const audio = new AudioService();
export default audio;
