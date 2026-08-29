import { Capacitor } from '@capacitor/core';
import { 
    AdMob, 
    BannerAdSize, 
    BannerAdPosition, 
    RewardAdPluginEvents
} from '@capacitor-community/admob';

// TEST IDs (Replace with REAL IDs for Production)
// REAL IDs (Production)
const TEST_BANNER_ID = 'ca-app-pub-5979451943443465/2259938960'; // REAL USER ID
// const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111'; // GOOGLE TEST ID
const TEST_REWARD_ID = 'ca-app-pub-5979451943443465/8561607522';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-5979451943443465/5980278852'; // REAL INTERSTITIAL ID
const APP_OPEN_ID = 'ca-app-pub-5979451943443465/6845803814'; // REAL APP OPEN ID

export const AdMobService = {
    initialized: false,

    async initialize() {
        if (!Capacitor.isNativePlatform()) return;
        if (this.initialized) return;
        try {
            await AdMob.initialize({
                requestTrackingAuthorization: true,
                initializeForTesting: false, // DISABLE TEST MODE
            });
            this.initialized = true;
            console.log('AdMob Initialized');
        } catch (e) {
            console.error('AdMob Init Fail:', e);
        }
    },

    async showAppOpen() {
        if (!Capacitor.isNativePlatform()) return;
        try {
           await AdMob.prepareAppOpenAd({
               adId: APP_OPEN_ID,
               isTesting: false
           });
           await AdMob.showAppOpenAd();
        } catch (e) {
           console.error("App Open Ad Fail", e);
        }
    },

    async showBanner() {
        if (!Capacitor.isNativePlatform()) return;
        try {
            const options = {
                adId: TEST_BANNER_ID,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: false // DISABLE TEST MODE
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
        // Register Global Listeners
        const handleReward = (reward) => {
            console.log("Ad Rewarded", reward);
            if (this.currentRewardResolve) {
                this.currentRewardResolve(true);
                this.currentRewardResolve = null;
            }
        };

        // Try both event names for compatibility
        if (RewardAdPluginEvents.Rewarded) {
            await AdMob.addListener(RewardAdPluginEvents.Rewarded, handleReward);
        }
        if (RewardAdPluginEvents.OnRewarded) {
            await AdMob.addListener(RewardAdPluginEvents.OnRewarded, handleReward);
        }

        await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
             console.log("Ad Dismissed");
             // Resume Banner if it disappeared
             this.showBanner();
             
             // Only resolve false if we haven't resolved true yet
             if (this.currentRewardResolve) {
                 this.currentRewardResolve(false);
                 this.currentRewardResolve = null;
             }
        });
        
        await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
            console.error("Ad Failed Load", err);
            if (this.currentRewardResolve) {
                this.currentRewardResolve(false);
                this.currentRewardResolve = null;
            }
        });
    },

    currentRewardResolve: null,

    async showRewardVideo() {
        if (!Capacitor.isNativePlatform()) return true;
        return new Promise(async (resolve) => {
            this.currentRewardResolve = resolve;
            try {
                await AdMob.prepareRewardVideoAd({
                    adId: TEST_REWARD_ID,
                    isTesting: false // DISABLE TEST MODE
                });
                await AdMob.showRewardVideoAd();
            } catch (e) {
                console.error("Show Reward Error", e);
                resolve(false);
                this.currentRewardResolve = null;
            }
        });
    },
    
    async showInterstitial() {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await AdMob.prepareInterstitial({
                adId: TEST_INTERSTITIAL_ID,
                isTesting: false // DISABLE TEST MODE (Use Real ID for release)
            });
            await AdMob.showInterstitial();
        } catch(e) {
            console.error("Interstitial Fail", e);
        }
    }
};
