import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';
import ConfirmModal from '../components/ConfirmModal';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

const MAX_LIVES = 5;
const RESTORE_TIME_MS = 15 * 60 * 1000; // 15 minutes

export const GameProvider = ({ children }) => {
    // --- State ---
    const [lives, setLives] = useState(MAX_LIVES);
    const [nextRestoreTime, setNextRestoreTime] = useState(null);
    const [userName, setUserName] = useState("Guest");
    const [userPhoto, setUserPhoto] = useState(null); // URL or base64
    const [nameLocked, setNameLocked] = useState(false);
    const [hints, setHints] = useState(5); // Default 5 hints
    const [infiniteLivesUntil, setInfiniteLivesUntil] = useState(null); // Timestamp
    const [progress, setProgress] = useState({}); // { BookName: { 1: { completed: true } } }

    // UI State
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Cloud Sync State
    const [session, setSession] = useState(null);
    const [isCloudLoaded, setIsCloudLoaded] = useState(false);

    // Helper: Reset all in-memory state and localStorage to fresh defaults
    const clearAllLocalStateAndStorage = () => {
        setLives(MAX_LIVES);
        setNextRestoreTime(null);
        setUserName("Guest");
        setUserPhoto(null);
        setNameLocked(false);
        setHints(5);
        setInfiniteLivesUntil(null);
        setProgress({});
        setIsCloudLoaded(false);
        setSession(null);

        localStorage.removeItem('bibleQuiz_userId');
        localStorage.removeItem('bibleQuiz_sessionToken');
        localStorage.removeItem('bibleQuiz_lives');
        localStorage.removeItem('bibleQuiz_restoreTime');
        localStorage.removeItem('bibleQuiz_userName');
        localStorage.removeItem('bibleQuiz_userPhoto');
        localStorage.removeItem('bibleQuiz_nameLocked');
        localStorage.removeItem('bibleQuiz_hints');
        localStorage.removeItem('bibleQuiz_infiniteLivesUntil');
        localStorage.removeItem('bibleQuizProgress');
    };

    // --- Loading & Initial Sync ---
    useEffect(() => {
        // 1. Load LocalStorage First (Instant UI)
        try {
            const storedLives = localStorage.getItem('bibleQuiz_lives');
            const storedRestoreTime = localStorage.getItem('bibleQuiz_restoreTime');
            const storedName = localStorage.getItem('bibleQuiz_userName');
            const storedPhoto = localStorage.getItem('bibleQuiz_userPhoto');
            const storedLock = localStorage.getItem('bibleQuiz_nameLocked');
            const storedHints = localStorage.getItem('bibleQuiz_hints');
            const storedInfinite = localStorage.getItem('bibleQuiz_infiniteLivesUntil');
            const storedProgress = localStorage.getItem('bibleQuizProgress');

            if (storedLives !== null) setLives(Math.min(parseInt(storedLives, 10), MAX_LIVES));
            if (storedRestoreTime) setNextRestoreTime(parseInt(storedRestoreTime, 10));
            if (storedName) setUserName(storedName);
            if (storedPhoto) setUserPhoto(storedPhoto);
            if (storedLock === 'true') setNameLocked(true);
            if (storedHints !== null) setHints(parseInt(storedHints, 10));
            if (storedProgress) setProgress(JSON.parse(storedProgress));
            if (storedInfinite) {
                const infiniteTime = parseInt(storedInfinite, 10);
                if (!isNaN(infiniteTime) && infiniteTime > Date.now()) {
                    setInfiniteLivesUntil(infiniteTime);
                }
            }
        } catch (e) {
            console.error("Local load error", e);
        }

        // 2. Check Session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSession(session);
                syncFullState(session.user.id, session);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                clearAllLocalStateAndStorage();
            } else if (session) {
                setSession(session);
                syncFullState(session.user.id, session);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // --- Realtime Session Check (Single Device Enforcement) ---
    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase
            .channel('session_check_' + session.user.id)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${session.user.id}`
                },
                (payload) => {
                    const newGameData = payload.new.game_data;
                    const localToken = localStorage.getItem('bibleQuiz_sessionToken');
                    if (newGameData && newGameData.active_session_token && newGameData.active_session_token !== localToken) {
                        // Immediately wipe local data and notify user
                        clearAllLocalStateAndStorage();
                        setShowLogoutModal(true);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session]);

    // --- Helper: State Sync strictly from Cloud Profile ---
    const syncFullState = async (userId, currentAuthSession = null) => {
        try {
            const activeSession = currentAuthSession || session;

            // 1. Generate fresh session token for this device login (Takeover)
            const localToken = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('bibleQuiz_sessionToken', localToken);
            localStorage.setItem('bibleQuiz_userId', userId);

            // 2. Fetch existing cloud profile
            const { data } = await supabase
                .from('profiles')
                .select('game_data')
                .eq('id', userId)
                .single();

            let cloud = data?.game_data || {};

            // 3. Save new active session token to cloud
            const newGameData = { ...cloud, active_session_token: localToken };
            await supabase.from('profiles').upsert({ id: userId, game_data: newGameData, updated_at: new Date() });

            // 4. Determine clean user profile values (strictly for this account)
            const defaultName = activeSession?.user?.user_metadata?.display_name || activeSession?.user?.email?.split('@')[0] || "Player";
            const userLives = cloud.lives !== undefined ? cloud.lives : MAX_LIVES;
            const userRestoreTime = cloud.nextRestoreTime || null;
            const userHints = cloud.hints !== undefined ? cloud.hints : 5;
            const userProfileName = (cloud.userName && cloud.userName !== "Guest") ? cloud.userName : defaultName;
            const userPhoto = cloud.userPhoto || null;
            const userNameLocked = cloud.nameLocked !== undefined ? !!cloud.nameLocked : false;
            const userProgress = cloud.progress || {};
            const userInfinite = (cloud.infiniteLivesUntil && parseInt(cloud.infiniteLivesUntil, 10) > Date.now()) ? parseInt(cloud.infiniteLivesUntil, 10) : null;

            // 5. Update React State
            setLives(userLives);
            setNextRestoreTime(userRestoreTime);
            setHints(userHints);
            setUserName(userProfileName);
            setUserPhoto(userPhoto);
            setNameLocked(userNameLocked);
            setProgress(userProgress);
            setInfiniteLivesUntil(userInfinite);

            // 6. Update LocalStorage strictly with this user's data
            localStorage.setItem('bibleQuiz_lives', userLives);
            if (userRestoreTime) localStorage.setItem('bibleQuiz_restoreTime', userRestoreTime);
            else localStorage.removeItem('bibleQuiz_restoreTime');
            localStorage.setItem('bibleQuiz_userName', userProfileName);
            if (userPhoto) localStorage.setItem('bibleQuiz_userPhoto', userPhoto);
            else localStorage.removeItem('bibleQuiz_userPhoto');
            localStorage.setItem('bibleQuiz_nameLocked', userNameLocked);
            localStorage.setItem('bibleQuiz_hints', userHints);
            localStorage.setItem('bibleQuizProgress', JSON.stringify(userProgress));
            if (userInfinite) localStorage.setItem('bibleQuiz_infiniteLivesUntil', userInfinite);
            else localStorage.removeItem('bibleQuiz_infiniteLivesUntil');

            setIsCloudLoaded(true);
        } catch (err) {
            console.error("Error syncing:", err);
        }
    };

    // --- Persistence (Local + Cloud) ---
    const saveToCloud = async () => {
        if (!session || !isCloudLoaded) return;

        const localToken = localStorage.getItem('bibleQuiz_sessionToken');

        const gameData = {
            lives,
            nextRestoreTime, // Persist timer target
            hints,
            userName,
            userPhoto,
            progress,
            infiniteLivesUntil, // Add this field
            active_session_token: localToken, // Persist the token
            last_updated: Date.now()
        };

        await supabase
            .from('profiles')
            .upsert({
                id: session.user.id,
                game_data: gameData,
                updated_at: new Date()
            });
    };

    useEffect(() => {
        // Local Save (Always)
        localStorage.setItem('bibleQuiz_lives', lives);
        if (nextRestoreTime) localStorage.setItem('bibleQuiz_restoreTime', nextRestoreTime);
        else localStorage.removeItem('bibleQuiz_restoreTime');
        localStorage.setItem('bibleQuiz_userName', userName);
        if (userPhoto) localStorage.setItem('bibleQuiz_userPhoto', userPhoto);
        localStorage.setItem('bibleQuiz_nameLocked', nameLocked);
        localStorage.setItem('bibleQuiz_hints', hints);
        localStorage.setItem('bibleQuizProgress', JSON.stringify(progress));
        if (infiniteLivesUntil) localStorage.setItem('bibleQuiz_infiniteLivesUntil', infiniteLivesUntil);
        else localStorage.removeItem('bibleQuiz_infiniteLivesUntil');

        // Cloud Save (Debounced)
        if (session && isCloudLoaded) {
            const timeout = setTimeout(saveToCloud, 1000); // Reduced to 1s
            return () => clearTimeout(timeout);
        }
    }, [lives, nextRestoreTime, userName, userPhoto, nameLocked, hints, infiniteLivesUntil, progress, session, isCloudLoaded]);

    // Force Save on App Background
    useEffect(() => {
        const handleAppStateChange = async (state) => {
            if (!state.isActive && session && isCloudLoaded) {
                // App went to background - Save Immediately
                await saveToCloud();
            }
        };

        import('@capacitor/app').then(({ App }) => {
            App.addListener('appStateChange', handleAppStateChange);
        });

        // No cleanup for listener easy here, but strictly OK for Context which lives forever
    }, [session, isCloudLoaded, lives, hints, userName, userPhoto, progress]);

    // --- Timer Loop (Unified) ---
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();

            // Check Infinite (using variable available in closure if dep works)
            if (infiniteLivesUntil) {
                if (now >= infiniteLivesUntil) {
                    setInfiniteLivesUntil(null);
                } else {
                    if (lives < MAX_LIVES) setLives(MAX_LIVES);
                    if (nextRestoreTime) setNextRestoreTime(null);
                }
                return;
            }

            // Check Normal Lives Restoration
            if (lives < MAX_LIVES) {
                if (!nextRestoreTime) {
                    // Start timer if not running
                    setNextRestoreTime(now + RESTORE_TIME_MS);
                } else if (now >= nextRestoreTime) {
                    // Timer finished! Check how many lives we earned while app might have been closed/backgrounded
                    const timeSinceDue = now - nextRestoreTime;

                    const extraLives = Math.floor(timeSinceDue / RESTORE_TIME_MS);
                    const totalLivesToAdd = 1 + extraLives;

                    setLives(prev => {
                        const newTotal = prev + totalLivesToAdd;
                        if (newTotal >= MAX_LIVES) {
                            setNextRestoreTime(null);
                            return MAX_LIVES;
                        } else {
                            const nextTarget = nextRestoreTime + (totalLivesToAdd * RESTORE_TIME_MS);
                            setNextRestoreTime(nextTarget);
                            return newTotal;
                        }
                    });
                }
            } else {
                if (nextRestoreTime) setNextRestoreTime(null);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [lives, nextRestoreTime, infiniteLivesUntil]);


    // --- Actions ---
    const deductLife = () => {
        if (infiniteLivesUntil && Date.now() < infiniteLivesUntil) return true;
        if (lives > 0) {
            setLives(l => l - 1);
            if (lives === MAX_LIVES) setNextRestoreTime(Date.now() + RESTORE_TIME_MS);
            return true;
        }
        return false;
    };

    const activateInfiniteLives = (durationMinutes = 60) => {
        const addedMs = durationMinutes * 60 * 1000;
        setInfiniteLivesUntil(prev => {
            const now = Date.now();
            const baseTime = (prev && prev > now) ? prev : now;
            return baseTime + addedMs;
        });
        setLives(MAX_LIVES);
        setNextRestoreTime(null);
    };

    const consumeHint = () => {
        if (hints > 0) {
            setHints(h => h - 1);
            return true;
        }
        return false;
    };

    const addHints = (amount) => {
        setHints(h => h + amount);
    };

    const updateProfile = (name, photo) => {
        if (name && !nameLocked) {
            setUserName(name);
            setNameLocked(true);
        }
        if (photo) setUserPhoto(photo);
    };

    const addLife = () => {
        setLives(l => (l < MAX_LIVES ? l + 1 : l));
    };

    const updateLevelProgress = (bookName, level, data) => {
        setProgress(prev => ({
            ...prev,
            [bookName]: {
                ...(prev[bookName] || {}),
                [level]: data
            }
        }));
    };

    const resetProgress = async () => {
        const defaultLives = MAX_LIVES;
        const defaultHints = 5;

        setProgress({});
        setLives(defaultLives);
        setHints(defaultHints);
        setNextRestoreTime(null);

        // Clear Local
        localStorage.removeItem('bibleQuizProgress');

        // Force Cloud Save immediately
        if (session) {
            const gameData = {
                lives: defaultLives,
                hints: defaultHints,
                userName,
                userPhoto,
                progress: {},
                last_updated: Date.now()
            };
            await supabase
                .from('profiles')
                .upsert({
                    id: session.user.id,
                    game_data: gameData,
                    updated_at: new Date()
                });
        }
    };

    const handleLogoutConfirm = async () => {
        setShowLogoutModal(false);
        clearAllLocalStateAndStorage();
        await supabase.auth.signOut();
        window.location.href = '/auth';
    };

    const totallyResetGame = async () => {
        // 1. Reset State Memory
        setLives(MAX_LIVES);
        setUserName("Guest");
        setUserPhoto(null);
        setNameLocked(false);
        setHints(5);
        setProgress({});
        setNextRestoreTime(null);
        setInfiniteLivesUntil(null);

        // 2. Clear Local Storage
        localStorage.clear();

        // 3. Cloud Sign Out
        await supabase.auth.signOut();
        setSession(null);
    };

    const value = {
        lives,
        maxLives: MAX_LIVES,
        nextRestoreTime,
        userName,
        userPhoto,
        nameLocked,
        hints,
        infiniteLivesUntil,
        progress,
        activateInfiniteLives,
        deductLife,
        consumeHint,
        addHints,
        addLife,
        updateProfile,
        updateLevelProgress,
        resetProgress,
        totallyResetGame, // EXPOCED
        session,
        isLoggedIn: !!session
    };

    return (
        <GameContext.Provider value={value}>
            {children}
            <ConfirmModal
                isOpen={showLogoutModal}
                title="Session Expired"
                message="You have been logged out because this account was logged in on another device."
                onConfirm={handleLogoutConfirm}
                confirmText="OK"
                showCancel={false}
                isDanger={true}
            />
        </GameContext.Provider>
    );
};

export default GameProvider;
