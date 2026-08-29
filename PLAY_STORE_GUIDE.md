# God's Quiz App - Play Store & Earning Guide

## 1. Your Release File
I have generated the **Signed App Bundle** for you.
**File Location**: `android/app/build/outputs/bundle/release/app-release.aab`

You will upload **ONLY this file** to the Google Play Console.

## 2. Keystore Information (IMPORTANT)
I created a secure key for you to sign the app. You MUST keep this safe.
*   **File**: `android/app/release-key.jks`
*   **Password**: `123456`
*   **Alias**: `quiz-alias`

**WARNING**: If you lose this file or forget the password, you will NEVER be able to update this app on the Play Store again. Back it up to Google Drive or email it to yourself!

## 3. How to Upload to Play Store
1.  Go to [Google Play Console](https://play.google.com/console).
2.  Create an account ($25 fee).
3.  Click **Create App**.
4.  Fill in App Name ("Telugu Bible Quiz"), Default Language, etc.
5.  Go to **Production** -> **Create new release**.
6.  Upload the `app-release.aab` file mentioned above.
7.  Complete the **Store Listing** (Title, Description, Screenshots).
8.  Complete **App Content** (Privacy Policy, Ads declaration, etc.).
    *   **Privacy Policy**: You need a URL. You can generate a free one online (e.g., Flycricket) or use a GitHub Gist.
    *   **Ads**: Select "Yes, my app contains ads".
    *   **Data Safety**: Select "Yes" (Collects email for Auth, Device ID for AdMob).

## 4. How to Earn Money (AdMob)
1.  Go to [AdMob](https://apps.admob.com).
2.  Go to **Apps** -> **Add App**.
3.  Select "Android" -> "Yes, the app is listed on a supported app store" (Once Play Store is live).
4.  Copy your **App ID** and replace it in your code if you haven't (currently using Test IDs is fine for review, but switch to Real IDs before launch layout if possible, or just link it later).
    *   *Note: I left Test IDs in the code for safety. You should create REAL Ad Units in AdMob (Banner, Rewarded) and replace the IDs in `src/services/admob.js`.*
5.  **Payment**: Add your Bank Details in AdMob -> Payments. You get paid when you reach $100 (approx. ₹8000).

## 5. Next Steps
*   **Change Ad Units**: Before you launch effectively, create REAL Ad IDs on AdMob and update `src/services/admob.js` (Lines 11 & 12).
*   **Screenshots**: Take nice screenshots of your app (Title screen, Quiz, Store) for the Play Store listing.

**Good luck with your app!** 🚀
