import { supabase } from '../lib/supabaseClient';

export const CURRENT_VERSION_CODE = 4;
export const CURRENT_VERSION_NAME = "1.0.3";
export const PLAY_STORE_PACKAGE = "com.telugubiblequiz.app";
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
export const PLAY_STORE_MARKET_URI = `market://details?id=${PLAY_STORE_PACKAGE}`;

/**
 * Checks for updates against Supabase or remote config.
 */
export const checkForAppUpdate = async () => {
    try {
        // 1. Attempt to fetch app version configuration from Supabase table 'app_config'
        const { data, error } = await supabase
            .from('app_config')
            .select('*')
            .eq('id', 'android_version')
            .maybeSingle();

        if (data && !error) {
            const latestCode = Number(data.latest_version_code || 1);
            const minCode = Number(data.min_required_version_code || 1);
            const latestName = data.latest_version_name || "1.0.1";
            const isForced = CURRENT_VERSION_CODE < minCode || Boolean(data.force_update);
            const updateAvailable = latestCode > CURRENT_VERSION_CODE;

            if (updateAvailable) {
                return {
                    updateAvailable: true,
                    isForced,
                    latestVersion: latestName,
                    notes: Array.isArray(data.release_notes) 
                        ? data.release_notes 
                        : [data.release_notes || "New chapters, enhanced performance, and bug fixes!"],
                    url: data.store_url || PLAY_STORE_URL
                };
            }
        }
    } catch (e) {
        console.warn("Update check error:", e);
    }

    return {
        updateAvailable: false,
        isForced: false,
        latestVersion: CURRENT_VERSION_NAME,
        notes: [],
        url: PLAY_STORE_URL
    };
};

/**
 * Launches the Google Play Store directly on the user's Android phone.
 */
export const openPlayStore = (customUrl) => {
    try {
        // Try opening native Google Play Store app first via market:// scheme
        window.location.href = PLAY_STORE_MARKET_URI;
        
        // Fallback to web Play Store URL if market:// takes too long
        setTimeout(() => {
            window.open(customUrl || PLAY_STORE_URL, '_blank');
        }, 800);
    } catch (e) {
        window.open(customUrl || PLAY_STORE_URL, '_blank');
    }
};
