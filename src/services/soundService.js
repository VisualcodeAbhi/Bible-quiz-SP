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

    // --- Global Click & Tap Haptics Listener for All Clicks ---
    initGlobalClickHaptics() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (this._globalHapticsInitialized) return;
        this._globalHapticsInitialized = true;

        let lastFeedbackTime = 0;

        const handleInteraction = (e) => {
            if (!this.vibrateEnabled) return;
            const now = Date.now();
            if (now - lastFeedbackTime < 75) return; // Prevent double trigger on rapid touch/click

            const target = e.target;
            if (!target) return;

            // Traverse up to find if clicked element or any parent is interactive
            let el = target;
            let isClickable = false;
            let depth = 0;

            while (el && el !== document.body && depth < 6) {
                const tag = el.tagName;
                if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
                    isClickable = true;
                    break;
                }
                if (el.getAttribute) {
                    const role = el.getAttribute('role');
                    if (role === 'button' || role === 'tab' || role === 'checkbox' || role === 'switch' || role === 'link') {
                        isClickable = true;
                        break;
                    }
                    if (el.getAttribute('data-clickable') !== null || el.getAttribute('tabindex') !== null) {
                        isClickable = true;
                        break;
                    }
                }
                if (el.onclick || (el.style && el.style.cursor === 'pointer')) {
                    isClickable = true;
                    break;
                }
                const className = typeof el.className === 'string' ? el.className.toLowerCase() : '';
                if (className.includes('btn') || className.includes('card') || className.includes('option') || 
                    className.includes('item') || className.includes('pill') || className.includes('tab') ||
                    className.includes('close') || className.includes('icon') || className.includes('badge') ||
                    className.includes('toggle') || className.includes('podium') || className.includes('level') ||
                    className.includes('clickable')) {
                    isClickable = true;
                    break;
                }
                try {
                    const comp = window.getComputedStyle(el);
                    if (comp && comp.cursor === 'pointer') {
                        isClickable = true;
                        break;
                    }
                } catch (err) {}

                el = el.parentElement;
                depth++;
            }

            if (isClickable) {
                lastFeedbackTime = now;
                this.vibrate('light');
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
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.05);
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
