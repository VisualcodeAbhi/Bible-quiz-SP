import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';
import ConfirmModal from '../components/ConfirmModal';
import { compressAvatar, dataUrlToBlob } from '../lib/imageCompressor';
import { soundService } from '../services/soundService';

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

    // Sound & Haptics state
    const [soundEnabled, setSoundEnabled] = useState(() => soundService.isSoundEnabled());
    const [vibrateEnabled, setVibrateEnabled] = useState(() => soundService.isVibrateEnabled());

    const toggleSound = () => {
        const newState = soundService.toggleSound();
        setSoundEnabled(newState);
        return newState;
    };

    const toggleVibrate = () => {
        const newState = soundService.toggleVibrate();
        setVibrateEnabled(newState);
        return newState;
    };

    // Bookmarks / Saved Tricky Questions
    const [bookmarks, setBookmarks] = useState(() => {
        try {
            const saved = localStorage.getItem('bibleQuiz_bookmarks');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const isBookmarked = (questionText) => {
        return bookmarks.some(b => b.question === questionText);
    };

    const toggleBookmark = (questionItem) => {
        setBookmarks(prev => {
            const exists = prev.some(b => b.question === questionItem.question);
            let updated;
            if (exists) {
                updated = prev.filter(b => b.question !== questionItem.question);
            } else {
                updated = [
                    {
                        ...questionItem,
                        savedAt: Date.now()
                    },
                    ...prev
                ];
            }
            localStorage.setItem('bibleQuiz_bookmarks', JSON.stringify(updated));
            if (saveToCloudRef.current) {
                saveToCloudRef.current({ bookmarks: updated });
            }
            return updated;
        });
    };

    // Helper: Local date string (YYYY-MM-DD)
    const getTodayDateStr = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Helper: Days difference between two YYYY-MM-DD date strings
    const getDaysDiff = (dateStr1, dateStr2) => {
        if (!dateStr1 || !dateStr2) return 999;
        const [y1, m1, d1] = dateStr1.split('-').map(Number);
        const [y2, m2, d2] = dateStr2.split('-').map(Number);
        if (isNaN(y1) || isNaN(y2)) return 999;
        const utc1 = Date.UTC(y1, m1 - 1, d1);
        const utc2 = Date.UTC(y2, m2 - 1, d2);
        return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
    };

    // Daily Streak state with Freeze (Day 2) & Collapse (Day 3+)
    const [streakData, setStreakData] = useState(() => {
        try {
            const todayStr = getTodayDateStr();
            const lastPlay = localStorage.getItem('bibleQuiz_lastPlayDate');
            const storedCount = parseInt(localStorage.getItem('bibleQuiz_streak') || '0', 10);
            const count = isNaN(storedCount) ? 0 : storedCount;

            if (!lastPlay || count === 0) {
                return { streak: 0, status: 'collapsed', isFrozen: false, isPlayedToday: false };
            }

            const diff = getDaysDiff(lastPlay, todayStr);
            if (diff === 0) {
                return { streak: count, status: 'active', isFrozen: false, isPlayedToday: true };
            } else if (diff === 1) {
                return { streak: count, status: 'active', isFrozen: false, isPlayedToday: false };
            } else if (diff === 2) {
                // User did not play on 2nd day -> FROZEN (streak protected!)
                return { streak: count, status: 'frozen', isFrozen: true, isPlayedToday: false };
            } else {
                // User did not play on 3rd day or more -> COLLAPSE (streak resets)
                localStorage.setItem('bibleQuiz_streak', '0');
                return { streak: 0, status: 'collapsed', isFrozen: false, isPlayedToday: false };
            }
        } catch (e) {
            return { streak: 0, status: 'collapsed', isFrozen: false, isPlayedToday: false };
        }
    });

    const streak = streakData.streak;
    const streakStatus = streakData.status;
    const isStreakFrozen = streakData.isFrozen;
    const isPlayedToday = streakData.isPlayedToday;

    const recordDailyPlay = () => {
        try {
            const todayStr = getTodayDateStr();
            const lastPlay = localStorage.getItem('bibleQuiz_lastPlayDate');
            const diff = getDaysDiff(lastPlay, todayStr);

            if (diff === 0 && streakData.streak > 0) {
                // Already counted today
                return streakData.streak;
            }

            let newStreak = 1;
            if (diff === 1) {
                // Played yesterday -> advance streak
                newStreak = (streakData.streak || 0) + 1;
            } else if (diff === 2) {
                // Was FROZEN -> Playing today thaws & advances streak!
                newStreak = (streakData.streak || 0) + 1;
            } else {
                // Collapsed / First play -> start fresh at 1
                newStreak = 1;
            }

            const nextData = {
                streak: newStreak,
                status: 'active',
                isFrozen: false,
                isPlayedToday: true
            };

            setStreakData(nextData);
            localStorage.setItem('bibleQuiz_streak', newStreak.toString());
            localStorage.setItem('bibleQuiz_lastPlayDate', todayStr);

            // Immediately store streak on Supabase
            saveToCloud({
                streak: newStreak,
                lastPlayDate: todayStr,
                streakStatus: 'active'
            });

            return newStreak;
        } catch (e) {
            return streakData.streak;
        }
    };

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
        localStorage.removeItem('bibleQuiz_bookmarks');
        localStorage.removeItem('bibleQuiz_streak');
        setBookmarks([]);
        setStreakData({ streak: 0, status: 'collapsed', isFrozen: false, isPlayedToday: false });
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

    // --- Realtime & Cloud Synchronization Refs ---
    const isApplyingCloudUpdateRef = React.useRef(false);
    const lastClientSaveTokenRef = React.useRef(null);
    const saveToCloudRef = React.useRef(null);
    const isHiddenAccountRef = React.useRef(false);

    // --- Helper: Apply Cloud State to React & LocalStorage safely without loops ---
    const applyCloudState = (rawCloudData) => {
        if (!rawCloudData) return;

        let cloudData = rawCloudData;
        if (typeof rawCloudData === 'string') {
            try {
                cloudData = JSON.parse(rawCloudData);
            } catch (e) {
                console.error("Failed to parse cloudData string:", e);
                return;
            }
        }

        // Retain hidden account flag if configured in Supabase
        if (cloudData.hidden !== undefined) isHiddenAccountRef.current = !!cloudData.hidden;
        if (cloudData.is_hidden !== undefined) isHiddenAccountRef.current = !!cloudData.is_hidden;

        // Lock to prevent auto-save writebacks from echoing this cloud state
        isApplyingCloudUpdateRef.current = true;

        if (cloudData.lives !== undefined) {
            const l = Math.min(Math.max(0, Number(cloudData.lives)), MAX_LIVES);
            setLives(l);
            localStorage.setItem('bibleQuiz_lives', l.toString());
        }
        if (cloudData.nextRestoreTime !== undefined) {
            setNextRestoreTime(cloudData.nextRestoreTime);
            if (cloudData.nextRestoreTime) localStorage.setItem('bibleQuiz_restoreTime', cloudData.nextRestoreTime.toString());
            else localStorage.removeItem('bibleQuiz_restoreTime');
        }
        if (cloudData.hints !== undefined) {
            const h = Math.max(0, Number(cloudData.hints));
            setHints(h);
            localStorage.setItem('bibleQuiz_hints', h.toString());
        }
        if (cloudData.userName !== undefined && cloudData.userName !== null) {
            const nameStr = String(cloudData.userName).trim().slice(0, 13);
            if (nameStr) {
                setUserName(nameStr);
                localStorage.setItem('bibleQuiz_userName', nameStr);
            }
        }
        if (cloudData.userPhoto !== undefined) {
            setUserPhoto(cloudData.userPhoto);
            if (cloudData.userPhoto) localStorage.setItem('bibleQuiz_userPhoto', cloudData.userPhoto);
            else localStorage.removeItem('bibleQuiz_userPhoto');
        }
        if (cloudData.progress && typeof cloudData.progress === 'object') {
            setProgress(cloudData.progress);
            localStorage.setItem('bibleQuizProgress', JSON.stringify(cloudData.progress));
        }
        if (cloudData.infiniteLivesUntil !== undefined) {
            const inf = cloudData.infiniteLivesUntil ? Number(cloudData.infiniteLivesUntil) : null;
            if (inf && inf > Date.now()) {
                setInfiniteLivesUntil(inf);
                localStorage.setItem('bibleQuiz_infiniteLivesUntil', inf.toString());
            } else {
                setInfiniteLivesUntil(null);
                localStorage.removeItem('bibleQuiz_infiniteLivesUntil');
            }
        }
        if (cloudData.bookmarks && Array.isArray(cloudData.bookmarks)) {
            setBookmarks(cloudData.bookmarks);
            localStorage.setItem('bibleQuiz_bookmarks', JSON.stringify(cloudData.bookmarks));
        }

        // Streak reconciliation
        if (cloudData.streak !== undefined) {
            const cloudStreak = Math.max(0, Number(cloudData.streak || 0));
            const todayStr = getTodayDateStr();
            const lastPlay = cloudData.lastPlayDate;
            let status = cloudData.streakStatus || 'active';
            let isFrozen = status === 'frozen';
            let isPlayedToday = false;

            if (lastPlay) {
                const diff = getDaysDiff(lastPlay, todayStr);
                if (diff === 0) {
                    status = 'active';
                    isFrozen = false;
                    isPlayedToday = true;
                } else if (diff === 1) {
                    status = 'active';
                    isFrozen = false;
                    isPlayedToday = false;
                } else if (diff === 2) {
                    status = 'frozen';
                    isFrozen = true;
                    isPlayedToday = false;
                } else {
                    status = 'collapsed';
                    isFrozen = false;
                    isPlayedToday = false;
                }
            }

            setStreakData({
                streak: cloudStreak,
                status,
                isFrozen,
                isPlayedToday
            });
            localStorage.setItem('bibleQuiz_streak', cloudStreak.toString());
            if (lastPlay) localStorage.setItem('bibleQuiz_lastPlayDate', lastPlay);
            else localStorage.removeItem('bibleQuiz_lastPlayDate');
        }

        setTimeout(() => {
            isApplyingCloudUpdateRef.current = false;
        }, 1200);
    };

    // --- Helper: State Sync strictly from Cloud Profile on initial launch ---
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
                .maybeSingle();

            let cloud = data?.game_data || {};

            // 3. Save new active session token to cloud
            const newGameData = { ...cloud, active_session_token: localToken };
            await supabase.from('profiles').upsert({ id: userId, game_data: newGameData, updated_at: new Date() });

            // 4. Determine clean user profile values (strictly for this account)
            const meta = activeSession?.user?.user_metadata || {};
            const googleName = meta.full_name || meta.name || meta.display_name;
            const defaultName = googleName || activeSession?.user?.email?.split('@')[0] || "Player";
            const googlePhoto = meta.avatar_url || meta.picture || null;

            const storedLocalName = localStorage.getItem('bibleQuiz_userName');
            const userLives = cloud.lives !== undefined ? cloud.lives : MAX_LIVES;
            const userRestoreTime = cloud.nextRestoreTime || null;
            const userHints = cloud.hints !== undefined ? cloud.hints : 5;
            const userProfileName = (cloud.userName && cloud.userName !== "Guest") 
                ? cloud.userName 
                : (storedLocalName && storedLocalName !== "Guest" ? storedLocalName : defaultName);
            let userPhoto = cloud.userPhoto || googlePhoto || localStorage.getItem('bibleQuiz_userPhoto') || null;
            if (userPhoto && typeof userPhoto === 'string' && userPhoto.startsWith('data:image') && userPhoto.length > 3500) {
                try {
                    const compressed = await compressAvatar(userPhoto, 96, 0.6);
                    if (compressed && compressed.length < userPhoto.length) {
                        userPhoto = compressed;
                        localStorage.setItem('bibleQuiz_userPhoto', compressed);
                        if (activeSession?.user?.id) {
                            supabase.from('profiles').update({
                                game_data: {
                                    ...cloud,
                                    userPhoto: compressed,
                                    last_updated: Date.now()
                                },
                                updated_at: new Date()
                            }).eq('id', activeSession.user.id).then(() => {
                                console.log("Auto-shrunk bloated cloud avatar in database to", compressed.length, "bytes!");
                            });
                        }
                    }
                } catch (err) {
                    console.warn("Avatar auto-compression failed:", err);
                }
            }
            const userProgress = cloud.progress || {};
            const userInfinite = (cloud.infiniteLivesUntil && parseInt(cloud.infiniteLivesUntil, 10) > Date.now()) ? parseInt(cloud.infiniteLivesUntil, 10) : null;
            if (cloud.hidden !== undefined) isHiddenAccountRef.current = !!cloud.hidden;
            if (cloud.is_hidden !== undefined) isHiddenAccountRef.current = !!cloud.is_hidden;
            // 5. Update React State
            isApplyingCloudUpdateRef.current = true;
            setLives(userLives);
            setNextRestoreTime(userRestoreTime);
            setHints(userHints);
            setUserName(userProfileName);
            setUserPhoto(userPhoto);
            setNameLocked(false);
            setProgress(userProgress);
            setInfiniteLivesUntil(userInfinite);
            setBookmarks(userBookmarks);

            // 6. Update LocalStorage strictly with this user's data
            localStorage.setItem('bibleQuiz_lives', userLives.toString());
            if (userRestoreTime) localStorage.setItem('bibleQuiz_restoreTime', userRestoreTime.toString());
            else localStorage.removeItem('bibleQuiz_restoreTime');
            localStorage.setItem('bibleQuiz_userName', userProfileName);
            if (userPhoto) localStorage.setItem('bibleQuiz_userPhoto', userPhoto);
            else localStorage.removeItem('bibleQuiz_userPhoto');
            localStorage.setItem('bibleQuiz_nameLocked', 'false');
            localStorage.setItem('bibleQuiz_hints', userHints.toString());
            localStorage.setItem('bibleQuizProgress', JSON.stringify(userProgress));
            if (userInfinite) localStorage.setItem('bibleQuiz_infiniteLivesUntil', userInfinite.toString());
            else localStorage.removeItem('bibleQuiz_infiniteLivesUntil');
            localStorage.setItem('bibleQuiz_bookmarks', JSON.stringify(userBookmarks));

            // Restore Cloud Streak & Reconcile with Local Streak
            const localStoredStreak = parseInt(localStorage.getItem('bibleQuiz_streak') || '0', 10);
            const localLastPlay = localStorage.getItem('bibleQuiz_lastPlayDate');
            const todayStr = getTodayDateStr();

            let finalStreak = 0;
            let finalStatus = 'collapsed';
            let finalFrozen = false;
            let finalPlayedToday = false;
            let finalLastPlay = null;

            if (cloud.streak !== undefined && cloud.lastPlayDate) {
                const cloudStreak = Number(cloud.streak || 0);
                const diff = getDaysDiff(cloud.lastPlayDate, todayStr);
                if (diff <= 1) {
                    finalStreak = cloudStreak;
                    finalStatus = 'active';
                    finalFrozen = false;
                    finalPlayedToday = diff === 0;
                    finalLastPlay = cloud.lastPlayDate;
                } else if (diff === 2) {
                    finalStreak = cloudStreak;
                    finalStatus = 'frozen';
                    finalFrozen = true;
                    finalPlayedToday = false;
                    finalLastPlay = cloud.lastPlayDate;
                } else {
                    finalStreak = 0;
                    finalStatus = 'collapsed';
                    finalFrozen = false;
                    finalPlayedToday = false;
                    finalLastPlay = null;
                }
            }

            // If local streak was active and higher, preserve local streak
            if (localStoredStreak > 0 && localLastPlay) {
                const localDiff = getDaysDiff(localLastPlay, todayStr);
                if (localDiff <= 2 && localStoredStreak >= finalStreak) {
                    finalStreak = localStoredStreak;
                    finalStatus = localDiff === 2 ? 'frozen' : 'active';
                    finalFrozen = localDiff === 2;
                    finalPlayedToday = localDiff === 0;
                    finalLastPlay = localLastPlay;
                }
            }

            setStreakData({
                streak: finalStreak,
                status: finalStatus,
                isFrozen: finalFrozen,
                isPlayedToday: finalPlayedToday
            });
            localStorage.setItem('bibleQuiz_streak', finalStreak.toString());
            if (finalLastPlay) {
                localStorage.setItem('bibleQuiz_lastPlayDate', finalLastPlay);
            } else {
                localStorage.removeItem('bibleQuiz_lastPlayDate');
            }

            // If cloud streak was missing or outdated, update cloud immediately!
            if (cloud.streak === undefined || Number(cloud.streak || 0) < finalStreak) {
                supabase.from('profiles').update({
                    game_data: {
                        ...newGameData,
                        streak: finalStreak,
                        lastPlayDate: finalLastPlay,
                        streakStatus: finalStatus,
                        last_updated: Date.now()
                    },
                    updated_at: new Date()
                }).eq('id', userId).then(() => {
                    console.log("Streaks stored and synchronized to Supabase!");
                }).catch(e => console.error("Streak sync error:", e));
            }

            setIsCloudLoaded(true);
            setTimeout(() => {
                isApplyingCloudUpdateRef.current = false;
            }, 1200);
        } catch (err) {
            console.error("Error syncing:", err);
            isApplyingCloudUpdateRef.current = false;
        }
    };

    // --- Realtime Two-Way Sync from Supabase ---
    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase
            .channel('profile_realtime_sync_' + session.user.id)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${session.user.id}`
                },
                (payload) => {
                    let rawData = payload.new?.game_data;
                    if (typeof rawData === 'string') {
                        try {
                            rawData = JSON.parse(rawData);
                        } catch (e) {
                            console.error("Failed to parse game_data string:", e);
                        }
                    }

                    const newGameData = {
                        ...(rawData && typeof rawData === 'object' ? rawData : {}),
                        ...(payload.new?.userName !== undefined ? { userName: payload.new.userName } : {}),
                        ...(payload.new?.lives !== undefined ? { lives: payload.new.lives } : {}),
                        ...(payload.new?.hints !== undefined ? { hints: payload.new.hints } : {}),
                        ...(payload.new?.streak !== undefined ? { streak: payload.new.streak } : {})
                    };

                    if (!newGameData || Object.keys(newGameData).length === 0) return;

                    // If this payload has the token of our own local save in flight, ignore the echo
                    if (lastClientSaveTokenRef.current && newGameData.client_save_token === lastClientSaveTokenRef.current) {
                        lastClientSaveTokenRef.current = null;
                        return;
                    }

                    console.log("⚡ Realtime profile update received from Supabase:", newGameData);
                    applyCloudState(newGameData);
                }
            )
            .subscribe((status, err) => {
                if (err) console.warn("Supabase Realtime subscription error:", err);
                else console.log("Realtime profile sync channel status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    // --- Refetch from Cloud on App Resume / Foreground ---
    const refetchFromCloud = async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('game_data')
                .eq('id', session.user.id)
                .maybeSingle();

            if (!error && data?.game_data) {
                let rawData = data.game_data;
                if (typeof rawData === 'string') {
                    try { rawData = JSON.parse(rawData); } catch (e) {}
                }
                console.log("🔄 Synced data from Supabase on foreground resume:", rawData);
                applyCloudState(rawData);
            }
        } catch (e) {
            console.warn("Foreground sync error:", e);
        }
    };

    useEffect(() => {
        if (!session?.user?.id) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refetchFromCloud();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', refetchFromCloud);

        let appListenerSub = null;
        import('@capacitor/app').then(({ App }) => {
            App.addListener('appStateChange', (state) => {
                if (state.isActive) {
                    refetchFromCloud();
                } else if (session && isCloudLoaded) {
                    saveToCloud();
                }
            }).then(sub => {
                appListenerSub = sub;
            });
        });

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', refetchFromCloud);
            if (appListenerSub && appListenerSub.remove) appListenerSub.remove();
        };
    }, [session?.user?.id, isCloudLoaded]);

    // --- Persistence (Local + Cloud) ---
    const saveToCloud = async (customOverrides = {}) => {
        if (!session || !isCloudLoaded || isApplyingCloudUpdateRef.current) return;

        const now = Date.now();
        const saveToken = 'save_' + now + '_' + Math.random().toString(36).substr(2, 6);
        lastClientSaveTokenRef.current = saveToken;

        // Safety timeout to clear token after 4 seconds
        setTimeout(() => {
            if (lastClientSaveTokenRef.current === saveToken) {
                lastClientSaveTokenRef.current = null;
            }
        }, 4000);

        const localToken = localStorage.getItem('bibleQuiz_sessionToken');
        const currentStreakCount = parseInt(localStorage.getItem('bibleQuiz_streak') || '0', 10);
        const currentLastPlay = localStorage.getItem('bibleQuiz_lastPlayDate') || null;

        const gameData = {
            lives,
            nextRestoreTime,
            hints,
            userName,
            userPhoto,
            progress,
            infiniteLivesUntil,
            bookmarks,
            streak: !isNaN(currentStreakCount) && currentStreakCount > 0 ? currentStreakCount : (streakData.streak || 0),
            lastPlayDate: currentLastPlay,
            streakStatus: streakData.status || 'active',
            active_session_token: localToken,
            last_updated: now,
            client_save_token: saveToken,
            ...(isHiddenAccountRef.current ? { hidden: true } : {}),
            ...customOverrides
        };

        try {
            await supabase
                .from('profiles')
                .upsert({
                    id: session.user.id,
                    game_data: gameData,
                    updated_at: new Date()
                });
        } catch (e) {
            console.error("Error saving game data to Supabase:", e);
        }
    };
    saveToCloudRef.current = saveToCloud;

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
        localStorage.setItem('bibleQuiz_bookmarks', JSON.stringify(bookmarks));

        // Cloud Save (Debounced) - Only if not currently applying an update from cloud
        if (session && isCloudLoaded && !isApplyingCloudUpdateRef.current) {
            const timeout = setTimeout(() => saveToCloud(), 1000);
            return () => clearTimeout(timeout);
        }
    }, [lives, nextRestoreTime, userName, userPhoto, nameLocked, hints, infiniteLivesUntil, progress, bookmarks, streakData.streak, session, isCloudLoaded]);

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
        const now = Date.now();
        setInfiniteLivesUntil(prev => {
            const baseTime = (prev && prev > now) ? prev : now;
            const nextTime = baseTime + addedMs;
            saveToCloud({ infiniteLivesUntil: nextTime, lives: MAX_LIVES, nextRestoreTime: null });
            return nextTime;
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
        setHints(h => {
            const next = h + amount;
            saveToCloud({ hints: next });
            return next;
        });
    };

    const updateProfile = async (name, photo) => {
        let updatedName = userName;
        let updatedPhoto = userPhoto;

        if (name && name.trim()) {
            updatedName = name.trim().slice(0, 13);
            setUserName(updatedName);
            localStorage.setItem('bibleQuiz_userName', updatedName);
        }
        if (photo) {
            const compressedPhoto = await compressAvatar(photo, 96, 0.6);
            let finalPhoto = compressedPhoto;

            // Attempt upload to Supabase Storage 'avatars' bucket if configured
            if (session?.user?.id && compressedPhoto && compressedPhoto.startsWith('data:image')) {
                try {
                    const blob = dataUrlToBlob(compressedPhoto);
                    if (blob) {
                        const filePath = `${session.user.id}.jpg`;
                        const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(filePath, blob, {
                                contentType: 'image/jpeg',
                                upsert: true
                            });

                        if (!uploadError) {
                            const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                            if (pubData?.publicUrl) {
                                finalPhoto = `${pubData.publicUrl}?t=${Date.now()}`;
                            }
                        }
                    }
                } catch (storageErr) {
                    console.log("Storage bucket upload skipped, keeping compact data URL:", storageErr);
                }
            }

            updatedPhoto = finalPhoto;
            setUserPhoto(finalPhoto);
            if (finalPhoto) localStorage.setItem('bibleQuiz_userPhoto', finalPhoto);
            else localStorage.removeItem('bibleQuiz_userPhoto');
        }

        // Force Immediate Cloud Save
        if (session) {
            await saveToCloud({
                userName: updatedName,
                userPhoto: updatedPhoto
            });
        }
    };

    const addLife = () => {
        setLives(l => {
            const next = l < MAX_LIVES ? l + 1 : l;
            saveToCloud({ lives: next });
            return next;
        });
    };

    const updateLevelProgress = (bookName, level, data, difficulty = 'beginner') => {
        setProgress(prev => {
            const diffKey = (difficulty || 'beginner').toLowerCase();
            const currentDiffProgress = prev[diffKey] || (diffKey === 'beginner' ? prev : {}) || {};
            const currentBookProgress = currentDiffProgress[bookName] || {};

            const updatedProgress = {
                ...prev,
                [diffKey]: {
                    ...currentDiffProgress,
                    [bookName]: {
                        ...currentBookProgress,
                        [level]: data
                    }
                },
                // Backwards-compatible root level mirror for beginner
                ...(diffKey === 'beginner' ? {
                    [bookName]: {
                        ...(prev[bookName] || {}),
                        [level]: data
                    }
                } : {})
            };

            saveToCloud({ progress: updatedProgress });
            return updatedProgress;
        });
    };

    const getProgressForDifficulty = (difficulty = 'beginner', bookName = null) => {
        const diffKey = (difficulty || 'beginner').toLowerCase();
        const diffProgress = progress[diffKey] || (diffKey === 'beginner' ? progress : {}) || {};
        if (bookName) {
            return diffProgress[bookName] || {};
        }
        return diffProgress;
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
            await saveToCloud({
                lives: defaultLives,
                hints: defaultHints,
                progress: {},
                nextRestoreTime: null
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
        getProgressForDifficulty,
        resetProgress,
        totallyResetGame, // EXPOCED
        session,
        isLoggedIn: !!session,
        soundEnabled,
        toggleSound,
        vibrateEnabled,
        toggleVibrate,
        bookmarks,
        toggleBookmark,
        isBookmarked,
        streak,
        streakStatus,
        isStreakFrozen,
        isPlayedToday,
        recordDailyPlay,
        refetchFromCloud,
        refreshFromCloud: refetchFromCloud,
        saveToCloud
    };

    return (
        <GameContext.Provider value={value}>
            {children}
            {/* Session Expired Modal - Commented out for now
            <ConfirmModal
                isOpen={showLogoutModal}
                title="Session Expired"
                message="You have been logged out because this account was logged in on another device."
                onConfirm={handleLogoutConfirm}
                confirmText="OK"
                showCancel={false}
                isDanger={true}
            />
            */}
        </GameContext.Provider>
    );
};

export default GameProvider;
