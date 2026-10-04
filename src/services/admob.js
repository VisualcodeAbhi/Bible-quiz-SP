import { Capacitor } from '@capacitor/core';
import { 
    AdMob, 
    BannerAdSize, 
    BannerAdPosition, 
    RewardAdPluginEvents,
    BannerAdPluginEvents,
    InterstitialAdPluginEvents
} from '@capacitor-community/admob';

// Set to true for Debugging & Testing on device (guarantees 100% ad fill without policy violations)
// Set to false for Production release on Google Play Store
export const USE_TEST_ADS = false;

// Google Official Test Ad Unit IDs
const GOOGLE_TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const GOOGLE_TEST_REWARD = 'ca-app-pub-3940256099942544/5224354917';
const GOOGLE_TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';
const GOOGLE_TEST_APP_OPEN = 'ca-app-pub-3940256099942544/9257395921';

// Real Production IDs (Linked to Google Play Store)
const PROD_BANNER_ID = 'ca-app-pub-5979451943443465/2149227517';
const PROD_REWARD_ID = 'ca-app-pub-5979451943443465/5029532560';
const PROD_INTERSTITIAL_ID = 'ca-app-pub-5979451943443465/1090287551';
const PROD_APP_OPEN_ID = 'ca-app-pub-5979451943443465/6845803814';

// Active IDs based on Mode
const BANNER_ID = USE_TEST_ADS ? GOOGLE_TEST_BANNER : PROD_BANNER_ID;
const REWARD_ID = USE_TEST_ADS ? GOOGLE_TEST_REWARD : PROD_REWARD_ID;
const INTERSTITIAL_ID = USE_TEST_ADS ? GOOGLE_TEST_INTERSTITIAL : PROD_INTERSTITIAL_ID;
const APP_OPEN_ID = USE_TEST_ADS ? GOOGLE_TEST_APP_OPEN : PROD_APP_OPEN_ID;

export const AdMobService = {
    initialized: false,
    initPromise: null,
    currentRewardResolve: null,

    async initialize() {
        if (!Capacitor.isNativePlatform()) return;
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                await AdMob.initialize({
                    requestTrackingAuthorization: true,
                    testingDevices: [
                        'A0C6D8DE1F5997F81CBCA1D752A9CFAD',
                        'DE136F7E37B8BE9B3BFED855B11962D3'
                    ],
                    initializeForTesting: USE_TEST_ADS
                });
                this.initialized = true;
                console.log('AdMob Initialized (Test Mode:', USE_TEST_ADS, ')');
            } catch (e) {
                console.error('AdMob Init Fail:', e);
            }
        })();

        return this.initPromise;
    },

    async showBanner() {
        if (!Capacitor.isNativePlatform()) return;
        try {
            if (!this.initialized) {
                await this.initialize();
            }
            const options = {
                adId: BANNER_ID,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: USE_TEST_ADS
            };
            await AdMob.showBanner(options);
        } catch (e) {
            console.error('Show Banner Fail:', e);
        }
    },

    async hideBanner() {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await AdMob.hideBanner();
        } catch (e) {}
    },

    async registerListeners() {
        if (!Capacitor.isNativePlatform()) return;

        const handleReward = (reward) => {
            console.log("Ad Rewarded", reward);
            if (this.currentRewardResolve) {
                this.currentRewardResolve(true);
                this.currentRewardResolve = null;
            }
        };

        if (BannerAdPluginEvents?.FailedToLoad) {
            await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err) => {
                console.error("Banner Ad Failed to Load:", JSON.stringify(err));
            });
        }
        if (BannerAdPluginEvents?.Loaded) {
            await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
                console.log("Banner Ad Loaded successfully");
            });
        }

        if (RewardAdPluginEvents?.Rewarded) {
            await AdMob.addListener(RewardAdPluginEvents.Rewarded, handleReward);
        }
        if (RewardAdPluginEvents?.OnRewarded) {
            await AdMob.addListener(RewardAdPluginEvents.OnRewarded, handleReward);
        }

        await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
            console.log("Ad Dismissed");
            this.showBanner();
            if (this.currentRewardResolve) {
                this.currentRewardResolve(false);
                this.currentRewardResolve = null;
            }
        });
        
        await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
            console.error("Reward Ad Failed to Load:", JSON.stringify(err));
            if (this.currentRewardResolve) {
                this.currentRewardResolve(false);
                this.currentRewardResolve = null;
            }
        });

        if (InterstitialAdPluginEvents?.FailedToLoad) {
            await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err) => {
                console.error("Interstitial Ad Failed to Load:", JSON.stringify(err));
            });
        }
    },

    async showRewardVideo() {
        if (!Capacitor.isNativePlatform()) return true;
        if (!this.initialized) await this.initialize();
        return new Promise(async (resolve) => {
            this.currentRewardResolve = resolve;
            try {
                await AdMob.prepareRewardVideoAd({
                    adId: REWARD_ID,
                    isTesting: USE_TEST_ADS
                });
                await AdMob.showRewardVideoAd();
            } catch (e) {
                console.error("Show Reward Error", e);
                resolve(false);
                this.currentRewardResolve = null;
            }
        });
    },
    
    async prepareInterstitial() {
        if (!Capacitor.isNativePlatform()) return;
        try {
            if (!this.initialized) await this.initialize();
            await AdMob.prepareInterstitial({
                adId: INTERSTITIAL_ID,
                isTesting: USE_TEST_ADS
            });
        } catch(e) {
            console.error("Prepare Interstitial Fail", e);
        }
    },
    
    async showInterstitial() {
        if (!Capacitor.isNativePlatform()) return;
        if (!this.initialized) await this.initialize();
        try {
            await AdMob.showInterstitial();
        } catch(e) {
            // Fallback prepare and show if not preloaded
            try {
                await AdMob.prepareInterstitial({
                    adId: INTERSTITIAL_ID,
                    isTesting: USE_TEST_ADS
                });
                await AdMob.showInterstitial();
            } catch(err) {
                console.error("Interstitial Fail", err);
            }
        }
    }
};
