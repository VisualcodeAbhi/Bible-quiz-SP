import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import Loader from './components/Loader';
import ScreenRestriction from './components/ScreenRestriction';
import UpdateModal from './components/UpdateModal';
import { ntFiles } from './ntFiles';
import { AdMobService } from './services/admob';
import { checkForAppUpdate } from './services/appUpdateService';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const OldTestament = lazy(() => import('./pages/OT'));
const NewTestament = lazy(() => import('./pages/NT'));
const Levels = lazy(() => import('./pages/Levels'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Store = lazy(() => import('./pages/Store'));
const Auth = lazy(() => import('./pages/Auth'));

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const [checkingSession, setCheckingSession] = React.useState(true);
    const [updateData, setUpdateData] = React.useState(null);

    // Deep link processor helper
    const processAuthUrl = async (url) => {
        if (!url) return;
        try {
            const { supabase } = await import('./lib/supabaseClient');

            // Check for Access Token / Refresh Token (Implicit Flow)
            if (url.includes('access_token=') || url.includes('refresh_token=')) {
                const hashIndex = url.indexOf('#');
                const queryIndex = url.indexOf('?');
                let paramsString = '';
                if (hashIndex !== -1) {
                    paramsString = url.substring(hashIndex + 1);
                } else if (queryIndex !== -1) {
                    paramsString = url.substring(queryIndex + 1);
                }

                const params = new URLSearchParams(paramsString);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    if (!error && data?.session) {
                        navigate('/', { replace: true });
                        return;
                    }
                }
            }

            // Check for PKCE Code
            if (url.includes('code=')) {
                const queryStr = url.split('?')[1] || url.split('#')[1] || '';
                const params = new URLSearchParams(queryStr);
                const code = params.get('code');
                if (code) {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (!error && data?.session) {
                        navigate('/', { replace: true });
                        return;
                    }
                }
            }

            // General session check fallback after redirect
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/', { replace: true });
            }
        } catch (e) {
            console.error("Auth URL processing error:", e);
        }
    };

    // 1. Initial Session Check, App Update Check & AdMob Init
    useEffect(() => {
        // Check for Google Play Store updates
        checkForAppUpdate().then((info) => {
            if (info && info.updateAvailable) {
                setUpdateData(info);
            }
        });

        // Initialize AdMob
        const initAdMob = async () => {
            await AdMobService.initialize();
            await AdMobService.registerListeners();
        };
        initAdMob();

        // Check active session on startup
        import('./lib/supabaseClient').then(({ supabase }) => {
            const minDelay = new Promise(resolve => setTimeout(resolve, 800));
            const sessionCheck = supabase.auth.getSession();

            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve('timeout'), 4000);
            });

            Promise.race([
                Promise.all([sessionCheck, minDelay]),
                timeoutPromise
            ]).then(([res]) => {
                setCheckingSession(false);
                if (res?.data?.session && location.pathname === '/auth') {
                    navigate('/', { replace: true });
                }
            });

            // Global Auth State Change Listener
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (session && (window.location.pathname === '/auth' || location.pathname === '/auth')) {
                    navigate('/', { replace: true });
                }
            });

            return () => subscription.unsubscribe();
        });
    }, [navigate]);

    // 2. Control Banner visibility based on active page (hide on /auth)
    useEffect(() => {
        if (location.pathname === '/auth') {
            AdMobService.hideBanner();
        } else {
            AdMobService.showBanner();
        }
    }, [location.pathname]);

    // 3. Deep Link & App State Resume Handlers (Native Google OAuth)
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let urlOpenListener;
        let appStateListener;

        const registerNativeListeners = async () => {
            // A. Deep Link Listener
            urlOpenListener = await CapacitorApp.addListener('appUrlOpen', async (data) => {
                if (!data?.url) return;
                const urlString = data.url;

                if (urlString.includes('biblequiz://') || urlString.includes('com.telugubiblequiz.app://')) {
                    const { supabase } = await import('./lib/supabaseClient');

                    if (urlString.includes('code=')) {
                        try {
                            const urlObj = new URL(urlString.replace('biblequiz://', 'https://dummy.app/').replace('com.telugubiblequiz.app://', 'https://dummy.app/'));
                            const code = urlObj.searchParams.get('code');
                            if (code) {
                                const { data: exchangeData } = await supabase.auth.exchangeCodeForSession(code);
                                if (exchangeData?.session) {
                                    if (window.location.pathname === '/auth' || location.pathname === '/auth') {
                                        navigate('/', { replace: true });
                                    }
                                    return;
                                }
                            }
                        } catch (e) {
                            console.error("PKCE Code exchange error", e);
                        }
                    }

                    if (urlString.includes('access_token=')) {
                        try {
                            const separator = urlString.includes('#') ? '#' : '?';
                            const params = new URLSearchParams(urlString.split(separator)[1]);
                            const accessToken = params.get('access_token');
                            const refreshToken = params.get('refresh_token');
                            if (accessToken && refreshToken) {
                                await supabase.auth.setSession({
                                    access_token: accessToken,
                                    refresh_token: refreshToken
                                });
                                if (window.location.pathname === '/auth' || location.pathname === '/auth') {
                                    navigate('/', { replace: true });
                                }
                                return;
                            }
                        } catch (e) {
                            console.error("Token set session error", e);
                        }
                    }

                    const { data: { session } } = await supabase.auth.getSession();
                    if (session && (window.location.pathname === '/auth' || location.pathname === '/auth')) {
                        navigate('/', { replace: true });
                    }
                }
            });

            // B. App Resume Listener (when returning from Chrome)
            appStateListener = await CapacitorApp.addListener('appStateChange', async (state) => {
                if (state.isActive) {
                    const { supabase } = await import('./lib/supabaseClient');
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session && (location.pathname === '/auth' || window.location.pathname === '/auth')) {
                        navigate('/', { replace: true });
                    }
                }
            });
        };

        registerNativeListeners();

        return () => {
            if (urlOpenListener) urlOpenListener.remove();
            if (appStateListener) appStateListener.remove();
        };
    }, [navigate, location.pathname]);

    // 4. Unified Back Button Handler
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        let lastBackPress = 0;
        let backListener;

        const setupBackListener = async () => {
            backListener = await CapacitorApp.addListener('backButton', async () => {
                if (location.pathname === "/") {
                    const now = Date.now();
                    if (now - lastBackPress < 2000) {
                        CapacitorApp.exitApp();
                    } else {
                        lastBackPress = now;
                        import('@capacitor/toast').then(({ Toast }) => {
                            Toast.show({
                                text: 'Press back again to exit',
                                duration: 'short'
                            });
                        });
                    }
                } else if (location.pathname === "/auth") {
                    // Exit from auth screen if no active session
                    CapacitorApp.exitApp();
                } else if (location.pathname.startsWith('/levels/')) {
                    if (location.state && location.state.from === 'list') {
                        navigate(-1);
                    } else {
                        const pathParts = location.pathname.split('/');
                        if (pathParts.length >= 3) {
                            const bookId = pathParts[2];
                            if (ntFiles.includes(bookId)) navigate('/nt', { replace: true });
                            else navigate('/ot', { replace: true });
                        } else navigate(-1);
                    }
                } else {
                    navigate(-1);
                }
            });
        };

        setupBackListener();

        return () => {
            if (backListener) backListener.remove();
        };
    }, [navigate, location.pathname, location.state]);

    if (checkingSession) return <Loader />;

    return (
        <div className="app-container">
            <Suspense fallback={<Loader />}>
                <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/" element={<Home />} />
                    <Route path="/ot" element={<OldTestament />} />
                    <Route path="/nt" element={<NewTestament />} />
                    <Route path="/levels/:book" element={<Levels />} />
                    <Route path="/quiz/:book/:level" element={<Quiz />} />
                    <Route path="/statistics" element={<Statistics />} />
                    <Route path="/store" element={<Store />} />
                </Routes>
            </Suspense>
        </div>
    );
}

import GameProvider from './context/GameContext';

// ... (existing imports)

import SplashAnimation from './components/SplashAnimation';

import StarryBackground from './components/StarryBackground';

function App() {
    const [isLoading, setIsLoading] = React.useState(true);

    // We can remove the window.load listener because SplashAnimation handles the delay/transition
    // But if you want to ensure assets are loaded, we can keep a check, 
    // but usually Lottie is the "Loading" phase.

    if (isLoading) {
        // Pass onComplete to hide splash
        return <SplashAnimation onComplete={() => setIsLoading(false)} />;
    }

    return (
        <GameProvider>
            <ScreenRestriction>
                <StarryBackground />
                <Router>
                    <AppContent />
                </Router>
            </ScreenRestriction>
        </GameProvider>
    );
}

export default App;


