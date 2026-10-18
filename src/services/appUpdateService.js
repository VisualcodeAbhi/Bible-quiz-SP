import { supabase } from '../lib/supabaseClient';

export const CURRENT_VERSION_CODE = 13;
export const CURRENT_VERSION_NAME = "1.2.3";
export const PLAY_STORE_PACKAGE = "com.telugubiblequiz.app";
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
export const PLAY_STORE_MARKET_URI = `market://details?id=${PLAY_STORE_PACKAGE}`;

const REMOTE_GITHUB_CONFIG_URL = `https://raw.githubusercontent.com/VisualcodeAbhi/Bible-quiz-SP/main/app_version.json`;

const DISMISS_KEY_VER = 'bibleQuiz_dismissed_update_version';
const DISMISS_KEY_TIME = 'bibleQuiz_dismissed_update_time';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours snooze

/**
 * Snoozes update popup when user clicks "Remind Me Later" for 24 hours
 */
export const dismissUpdatePrompt = (versionName) => {
    try {
        localStorage.setItem(DISMISS_KEY_VER, String(versionName || ''));
        localStorage.setItem(DISMISS_KEY_TIME, Date.now().toString());
    } catch (e) {}
};

export const isUpdateDismissed = (versionName) => {
    try {
        const savedVer = localStorage.getItem(DISMISS_KEY_VER);
        const savedTime = parseInt(localStorage.getItem(DISMISS_KEY_TIME) || '0', 10);
        if (savedVer === String(versionName) && (Date.now() - savedTime < DISMISS_DURATION_MS)) {
            return true;
        }
    } catch (e) {}
    return false;
};

/**
 * Checks for updates against GitHub Raw config and Supabase app_config.
 * Merges both sources and checks if a newer version is available.
 */
export const checkForAppUpdate = async () => {
    let latestCode = 0;
    let minCode = 0;
    let latestName = CURRENT_VERSION_NAME;
    let isForced = false;
    let releaseNotes = [];
    let storeUrl = PLAY_STORE_URL;

    // 1. Fetch remote version from GitHub Raw repository
    try {
        const ghResponse = await fetch(`${REMOTE_GITHUB_CONFIG_URL}?_t=${Date.now()}`, {
            cache: 'no-store'
        });
        if (ghResponse.ok) {
            const ghData = await ghResponse.json();
            if (ghData && ghData.latest_version_code) {
                const code = Number(ghData.latest_version_code);
                if (code > latestCode) {
                    latestCode = code;
                    latestName = ghData.latest_version_name || latestName;
                    minCode = Number(ghData.min_required_version_code || 0);
                    isForced = Boolean(ghData.force_update);
                    if (Array.isArray(ghData.release_notes) && ghData.release_notes.length > 0) {
                        releaseNotes = ghData.release_notes;
                    }
                    if (ghData.store_url) {
                        storeUrl = ghData.store_url;
                    }
                }
            }
        }
    } catch (e) {
        // Quiet fail - will proceed with Supabase or fallback
    }

    // 2. Fetch app version configuration from Supabase table 'app_config'
    try {
        const { data: sbData, error: sbError } = await supabase
            .from('app_config')
            .select('*')
            .eq('id', 'android_version')
            .maybeSingle();

        if (sbData && !sbError) {
            const code = Number(sbData.latest_version_code || 0);
            if (code > latestCode) {
                latestCode = code;
                latestName = sbData.latest_version_name || latestName;
                minCode = Number(sbData.min_required_version_code || 0);
                isForced = Boolean(sbData.force_update);
                if (Array.isArray(sbData.release_notes) && sbData.release_notes.length > 0) {
                    releaseNotes = sbData.release_notes;
                } else if (typeof sbData.release_notes === 'string') {
                    releaseNotes = [sbData.release_notes];
                }
                if (sbData.store_url) {
                    storeUrl = sbData.store_url;
                }
            }
        }
    } catch (e) {
        // Quiet fail
    }

    // Default release notes if none provided
    if (releaseNotes.length === 0) {
        releaseNotes = [
            "కొత్త ప్రొఫైల్ సెట్టింగ్‌లు (Profile photo & 13-char name edit)",
            "సౌండ్ మరియు వైబ్రేషన్ కంట్రోల్స్ (Independent Sound & Haptics)",
            "మరిన్ని ప్రశ్నలు మరియు వేగవంతమైన పనితీరు (Bug fixes & performance improvements)"
        ];
    }

    // Compare against current running version
    const updateAvailable = latestCode > CURRENT_VERSION_CODE;
    const forceRequired = CURRENT_VERSION_CODE < minCode || isForced;

    // Check if user clicked "Remind Me Later" for this version in last 24h
    if (updateAvailable && !forceRequired && isUpdateDismissed(latestName)) {
        return {
            updateAvailable: false,
            isDismissed: true
        };
    }

    // Check if user clicked "Remind Me Later" for this version in last 24h
    if (updateAvailable && !forceRequired && isUpdateDismissed(latestName)) {
        return {
            updateAvailable: false,
            isDismissed: true
        };
    }

    if (updateAvailable) {
        return {
            updateAvailable: true,
            isForced: forceRequired,
            latestVersion: latestName,
            latestCode,
            currentVersion: CURRENT_VERSION_NAME,
            currentCode: CURRENT_VERSION_CODE,
            notes: releaseNotes,
            url: storeUrl
        };
    }

    return {
        updateAvailable: false,
        isForced: false,
        latestVersion: CURRENT_VERSION_NAME,
        latestCode: CURRENT_VERSION_CODE,
        currentVersion: CURRENT_VERSION_NAME,
        currentCode: CURRENT_VERSION_CODE,
        notes: [],
        url: PLAY_STORE_URL
    };
};

/**
 * Launches the Google Play Store directly on the user's Android phone.
 */
export const openPlayStore = (customUrl) => {
    const playUrl = customUrl || PLAY_STORE_URL;
    try {
        // Try opening native Google Play Store app first via market:// scheme
        window.location.href = PLAY_STORE_MARKET_URI;
        
        // Fallback to web Play Store URL if market intent takes time
        setTimeout(() => {
            try {
                window.open(playUrl, '_system');
            } catch (err) {
                window.open(playUrl, '_blank');
            }
        }, 600);
    } catch (e) {
        try {
            window.open(playUrl, '_system');
        } catch (err) {
            window.open(playUrl, '_blank');
        }
    }
};
