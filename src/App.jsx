import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import Loader from './components/Loader';
import ScreenRestriction from './components/ScreenRestriction';
import { ntFiles } from './ntFiles';
import { AdMobService } from './services/admob';

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

    // Initial Session Check & AdMob Init
    useEffect(() => {
        // Initialize AdMob
        const initAdMob = async () => {
            await AdMobService.initialize();
            await AdMobService.registerListeners();
        };
        initAdMob();

        // Dynamically manage Banner ad visibility based on route
        if (location.pathname === '/auth') {
            AdMobService.hideBanner();
        } else {
            AdMobService.showBanner();
        }

        import('./lib/supabaseClient').then(({ supabase }) => {
            const minDelay = new Promise(resolve => setTimeout(resolve, 1000));
            const sessionCheck = supabase.auth.getSession();

            // Timeout to prevent infinite loading
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve('timeout'), 5000);
            });

            Promise.race([
                Promise.all([sessionCheck, minDelay]),
                timeoutPromise
            ]).then((result) => {
                if (result === 'timeout') {
                    import('@capacitor/toast').then(({ Toast }) => {
                        Toast.show({
                            text: 'Process taking too long. Check internet connection.',
                            duration: 'long'
                        });
                    });
                }
                setCheckingSession(false);
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                if (session && location.pathname === '/auth') {
                    navigate('/', { replace: true });
                }
            });

            return () => subscription.unsubscribe();
        });
    }, []);

    // Control Banner visibility based on active page (hide on /auth)
    useEffect(() => {
        if (location.pathname === '/auth') {
            AdMobService.hideBanner();
        } else {
            AdMobService.showBanner();
        }
    }, [location.pathname]);

    // Deep Link Handler
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        CapacitorApp.addListener('appUrlOpen', data => {
            // data.url contains the URL that opened the app
            if (data.url.includes('biblequiz://auth')) {
                navigate('/auth');
            }
        });
    }, [navigate]);

    // Unified Back Button Handler
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        let lastBackPress = 0;

        const setupListener = async () => {
            // Remove any existing listeners first to be safe (though this runs only once ideally)
            await CapacitorApp.removeAllListeners();

            await CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
                if (location.pathname === "/") {
                    // Double Tap to Exit Logic
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
                    // From Auth, probably exit app if they can't go back? 
                    // Or navigate Home? But Home checks auth.
                    // Let's allow Double Back on Auth too or just Exit.
                    // Standard: Exit.
                    CapacitorApp.exitApp();
                } else if (location.pathname.startsWith('/levels/')) {
                    // Custom navigation for Levels -> Book selection
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
                    // Default: Go Back
                    navigate(-1);
                }
            });
        };
        setupListener();

        return () => {
            CapacitorApp.removeAllListeners();
        };
    }, [navigate, location]);

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


