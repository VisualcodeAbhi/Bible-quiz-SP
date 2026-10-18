import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Audio Sound Effects & Haptics Engine using Native Web Audio API & Capacitor Haptics
// 100% offline, 0 bytes download, ultra-snappy 60fps arcade audio

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.soundEnabled = localStorage.getItem('bibleQuiz_soundEnabled') !== 'false';
        this.vibrateEnabled = localStorage.getItem('bibleQuiz_vibrateEnabled') !== 'false';
        this._globalHapticsInitialized = false;
        this.initGlobalClickHaptics();
    }

    init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    isSoundEnabled() {
        return this.soundEnabled;
    }

    isVibrateEnabled() {
        return this.vibrateEnabled;
    }

    isEnabled() {
        return this.soundEnabled;
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('bibleQuiz_soundEnabled', this.soundEnabled ? 'true' : 'false');
        if (this.soundEnabled) {
            this.init();
            this.playClick();
        }
        return this.soundEnabled;
    }

    toggle() {
        return this.toggleSound();
    }

    toggleVibrate() {
        this.vibrateEnabled = !this.vibrateEnabled;
        localStorage.setItem('bibleQuiz_vibrateEnabled', this.vibrateEnabled ? 'true' : 'false');
        if (this.vibrateEnabled) {
            this.vibrate('medium');
        }
        return this.vibrateEnabled;
    }

    // --- Global Click & Tap Haptics & Sound Listener for Button Clicks ---
    initGlobalClickHaptics() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (this._globalHapticsInitialized) return;
        this._globalHapticsInitialized = true;

        // Auto-unlock Web Audio on first user gesture
        const unlockAudio = () => {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        };
        document.addEventListener('pointerdown', unlockAudio, { capture: true, once: true, passive: true });
        document.addEventListener('touchstart', unlockAudio, { capture: true, once: true, passive: true });
        document.addEventListener('click', unlockAudio, { capture: true, once: true, passive: true });

        let lastFeedbackTime = 0;

        const isButtonTarget = (target) => {
            if (!target) return false;

            // 1. Native HTML buttons, links, or button inputs
            const nativeBtn = target.closest('button, a, input[type="button"], input[type="submit"], input[type="reset"]');
            if (nativeBtn) return true;

            // 2. ARIA roles for buttons, tabs, switches
            const roleBtn = target.closest('[role="button"], [role="tab"], [role="switch"]');
            if (roleBtn) return true;

            // 3. Classes representing buttons and interactive action cards
            const classBtn = target.closest(
                '.btn, .action-btn, .option-btn, .level-btn, .nav-btn, .close-btn, .back-btn, ' +
                '.tab-btn, .toggle-switch, .menu-icon, .book-link, .box, .pill-badge'
            );
            if (classBtn) return true;

            // 4. Element specifically has class containing 'btn' or 'button'
            let el = target;
            let depth = 0;
            while (el && el !== document.body && depth < 4) {
                const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
                if (cls.includes('btn') || cls.includes('button')) {
                    return true;
                }
                el = el.parentElement;
                depth++;
            }

            return false;
        };

        const handleInteraction = (e) => {
            if (!this.vibrateEnabled && !this.soundEnabled) return;
            const now = Date.now();
            if (now - lastFeedbackTime < 70) return; // Prevent double trigger on rapid touch/click

            const target = e.target;
            if (!target) return;

            if (isButtonTarget(target)) {
                lastFeedbackTime = now;
                this.playClick(); // Triggers BOTH sound AND haptic vibration for button clicks!
            }
        };

        // Pointerdown for instant tactile response on mobile; click as desktop/fallback
        document.addEventListener('pointerdown', handleInteraction, { capture: true, passive: true });
        document.addEventListener('click', handleInteraction, { capture: true, passive: true });
    }

    // --- Haptic Vibrations (Native Capacitor Haptics + Web fallback) ---
    async vibrate(type = 'light') {
        if (!this.vibrateEnabled) return;
        try {
            if (type === 'light') {
                try {
                    await Haptics.impact({ style: ImpactStyle.Light });
                } catch (e) {
                    await Haptics.vibrate({ duration: 25 }).catch(() => {});
                }
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(25);
                }
                return;
            } else if (type === 'medium') {
                try {
                    await Haptics.impact({ style: ImpactStyle.Medium });
                } catch (e) {
                    await Haptics.vibrate({ duration: 45 }).catch(() => {});
                }
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(45);
                }
                return;
            } else if (type === 'heavy') {
                try {
                    await Haptics.impact({ style: ImpactStyle.Heavy });
                } catch (e) {
                    await Haptics.vibrate({ duration: 70 }).catch(() => {});
                }
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(70);
                }
                return;
            } else if (type === 'success') {
                try {
                    await Haptics.notification({ type: NotificationType.Success });
                } catch (e) {
                    await Haptics.vibrate({ duration: 60 }).catch(() => {});
                }
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate([40, 60, 40]);
                }
                return;
            } else if (type === 'error') {
                try {
                    await Haptics.notification({ type: NotificationType.Error });
                } catch (e) {
                    await Haptics.vibrate({ duration: 90 }).catch(() => {});
                }
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate([60, 50, 60]);
                }
                return;
            } else if (typeof type === 'number') {
                await Haptics.vibrate({ duration: type }).catch(() => {});
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(type);
                }
                return;
            }
        } catch (e) {
            // Capacitor Haptics plugin unavailable (e.g. standard browser)
        }

        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                const pattern = Array.isArray(type) ? type : (typeof type === 'number' ? type : 30);
                navigator.vibrate(pattern);
            }
        } catch (e) {}
    }

    // --- Sound Synthesizers ---
    // 1. Soft click on tapping option/button
    playClick() {
        this.vibrate('light');
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(160, now + 0.06);

            gain.gain.setValueAtTime(0.30, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.06);
        } catch (e) {}
    }

    // 2. Harmonious joyful chime on Correct answer
    playCorrect() {
        this.vibrate('success');
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Major chord sparkle (E5, G#5, B5)
            const notes = [659.25, 830.61, 987.77];
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const startTime = now + (i * 0.08);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.001, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.35);
            });
        } catch (e) {}
    }

    // 3. Gentle wooden thud / buzzer on Wrong answer
    playWrong() {
        this.vibrate('error');
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {}
    }

    // 4. Clock Tick during last 5 seconds of countdown
    playTick() {
        this.vibrate('light');
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, now);
            osc.frequency.exponentialRampToValueAtTime(700, now + 0.03);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.03);
        } catch (e) {}
    }

    // 5. Victory Fanfare when level completes
    playFanfare() {
        this.vibrate('success');
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // C5, E5, G5, C6 triumph arpeggio
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const start = now + (idx * 0.12);
                const duration = idx === notes.length - 1 ? 0.7 : 0.25;

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, start);

                gain.gain.setValueAtTime(0.001, start);
                gain.gain.linearRampToValueAtTime(0.25, start + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(start);
                osc.stop(start + duration);
            });
        } catch (e) {}
    }
}

export const soundService = new SoundEngine();
