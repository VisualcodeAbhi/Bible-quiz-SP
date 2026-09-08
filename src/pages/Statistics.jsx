import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { supabase } from '../lib/supabaseClient';
import { 
    BIBLE_BOOKS, 
    TOTAL_BIBLE_CHAPTERS, 
    TOTAL_OT_CHAPTERS, 
    TOTAL_NT_CHAPTERS, 
    TOTAL_OT_BOOKS, 
    TOTAL_NT_BOOKS, 
    TOTAL_BIBLE_BOOKS 
} from '../bibleBooksData';

const Statistics = () => {
    const navigate = useNavigate();
    const { progress, userName, userPhoto, session } = useGame();

    const [activeTab, setActiveTab] = useState('myStats'); // 'myStats' | 'leaderboard'
    const [bookFilter, setBookFilter] = useState('all'); // 'all' | 'completed' | 'inProgress' | 'notStarted'
    const [searchQuery, setSearchQuery] = useState('');

    // Leaderboard state
    const [leaderboardUsers, setLeaderboardUsers] = useState([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [leaderboardError, setLeaderboardError] = useState(null);

    // Helper: Normalize book progress lookup
    const getBookProgressData = (book, userProgressMap) => {
        if (!userProgressMap) return {};
        return (
            userProgressMap[book.name] ||
            userProgressMap[book.id] ||
            userProgressMap[book.file] ||
            userProgressMap[book.teluguName] ||
            {}
        );
    };

    // Calculate Personal Stats
    const statsData = useMemo(() => {
        let totalLevelsCompleted = 0;
        let totalBooksCompleted = 0;
        let otLevelsCompleted = 0;
        let otBooksCompleted = 0;
        let ntLevelsCompleted = 0;
        let ntBooksCompleted = 0;
        let totalScore = 0;
        let totalStars = 0;

        const detailedBooks = BIBLE_BOOKS.map(book => {
            const bookProg = getBookProgressData(book, progress);
            let completedInBook = 0;
            let bookScore = 0;
            let bookStars = 0;

            Object.entries(bookProg).forEach(([lvl, data]) => {
                if (data?.completed) {
                    completedInBook++;
                    const lvlScore = Number(data.score) || 0;
                    bookScore += lvlScore;

                    // Calculate stars (1-5)
                    if (data.total && data.score !== undefined) {
                        const pct = (data.score / data.total) * 100;
                        if (pct >= 95) bookStars += 5;
                        else if (pct >= 80) bookStars += 4;
                        else if (pct >= 60) bookStars += 3;
                        else if (pct >= 40) bookStars += 2;
                        else bookStars += 1;
                    } else {
                        bookStars += 1;
                    }
                }
            });

            const isBookFinished = completedInBook >= book.chapters && book.chapters > 0;
            const completionPercent = Math.min(100, Math.round((completedInBook / book.chapters) * 100));

            totalLevelsCompleted += completedInBook;
            totalScore += bookScore;
            totalStars += bookStars;

            if (isBookFinished) {
                totalBooksCompleted++;
            }

            if (book.testament === 'OT') {
                otLevelsCompleted += completedInBook;
                if (isBookFinished) otBooksCompleted++;
            } else {
                ntLevelsCompleted += completedInBook;
                if (isBookFinished) ntBooksCompleted++;
            }

            return {
                ...book,
                completedChapters: completedInBook,
                isCompleted: isBookFinished,
                completionPercent,
                score: bookScore,
                stars: bookStars
            };
        });

        const overallPercent = Math.min(100, ((totalLevelsCompleted / TOTAL_BIBLE_CHAPTERS) * 100).toFixed(1));
        const otPercent = Math.min(100, ((otLevelsCompleted / TOTAL_OT_CHAPTERS) * 100).toFixed(1));
        const ntPercent = Math.min(100, ((ntLevelsCompleted / TOTAL_NT_CHAPTERS) * 100).toFixed(1));

        // Spiritual Title / Rank badge based on completion
        let rankTitle = "🌱 ఆరంభ అన్వేషకుడు (Beginner)";
        if (totalLevelsCompleted >= 300) rankTitle = "👑 బైబిల్ విజేత (Bible Champion)";
        else if (totalLevelsCompleted >= 150) rankTitle = "⚔️ బైబిల్ యోధుడు (Bible Warrior)";
        else if (totalLevelsCompleted >= 50) rankTitle = "📜 బైబిల్ విద్యార్థి (Bible Scholar)";
        else if (totalLevelsCompleted >= 15) rankTitle = "📖 ఆత్మీయ అన్వేషకుడు (Spiritual Seeker)";

        return {
            totalLevelsCompleted,
            totalBooksCompleted,
            otLevelsCompleted,
            otBooksCompleted,
            ntLevelsCompleted,
            ntBooksCompleted,
            totalScore,
            totalStars,
            overallPercent,
            otPercent,
            ntPercent,
            rankTitle,
            detailedBooks
        };
    }, [progress]);

    // Fetch Leaderboard from Supabase
    const fetchLeaderboard = async () => {
        setLoadingLeaderboard(true);
        setLeaderboardError(null);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, game_data, updated_at');

            if (error) throw error;

            if (data && Array.isArray(data)) {
                const parsedUsers = data.map(row => {
                    const gd = row.game_data || {};
                    const uProg = gd.progress || {};
                    const uName = gd.userName || "Player";
                    const uPhoto = gd.userPhoto || null;

                    let uLevelsCompleted = 0;
                    let uBooksCompleted = 0;
                    let uScore = 0;

                    BIBLE_BOOKS.forEach(b => {
                        const bData = getBookProgressData(b, uProg);
                        let compCount = 0;
                        Object.values(bData).forEach(lvl => {
                            if (lvl?.completed) {
                                compCount++;
                                uScore += Number(lvl.score) || 0;
                            }
                        });
                        uLevelsCompleted += compCount;
                        if (compCount >= b.chapters && b.chapters > 0) {
                            uBooksCompleted++;
                        }
                    });

                    return {
                        id: row.id,
                        name: uName,
                        photo: uPhoto,
                        levelsCompleted: uLevelsCompleted,
                        booksCompleted: uBooksCompleted,
                        totalScore: uScore,
                        isCurrent: session?.user?.id === row.id
                    };
                });

                // Sort by levels completed DESC, then total score DESC
                parsedUsers.sort((a, b) => {
                    if (b.levelsCompleted !== a.levelsCompleted) {
                        return b.levelsCompleted - a.levelsCompleted;
                    }
                    return b.totalScore - a.totalScore;
                });

                setLeaderboardUsers(parsedUsers);
            }
        } catch (err) {
            console.error("Leaderboard fetch error:", err);
            setLeaderboardError("లీడర్‌బోర్డ్ లోడ్ చేయడం సాధ్యం కాలేదు.");
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            fetchLeaderboard();
        }
    }, [activeTab]);

    // Filter books list
    const filteredBooks = useMemo(() => {
        return statsData.detailedBooks.filter(b => {
            const matchesSearch = 
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.teluguName.includes(searchQuery);

            if (!matchesSearch) return false;

            if (bookFilter === 'completed') return b.isCompleted;
            if (bookFilter === 'inProgress') return b.completedChapters > 0 && !b.isCompleted;
            if (bookFilter === 'notStarted') return b.completedChapters === 0;
            return true;
        });
    }, [statsData.detailedBooks, bookFilter, searchQuery]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0b111e 0%, #162447 50%, #1f4068 100%)',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
            paddingBottom: '80px',
            boxSizing: 'border-box'
        }}>
            {/* Top Navigation Header */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: 'rgba(11, 17, 30, 0.85)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '45px 20px 15px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div 
                    onClick={() => navigate('/')} 
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                >
                    ←
                </div>

                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px' }}>
                        గణాంకాలు & ర్యాంకులు
                    </h1>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Player Statistics & Leaderboard</span>
                </div>

                {/* Profile Pill */}
                <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #38ef7d',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {userPhoto ? (
                        <img src={userPhoto} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: '18px' }}>👤</span>
                    )}
                </div>
            </div>

            {/* Container */}
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 18px' }}>
                
                {/* Tab Switcher */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '4px',
                    borderRadius: '16px',
                    marginBottom: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <button
                        onClick={() => setActiveTab('myStats')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: activeTab === 'myStats' 
                                ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' 
                                : 'transparent',
                            color: activeTab === 'myStats' ? '#fff' : '#94a3b8',
                            boxShadow: activeTab === 'myStats' ? '0 4px 12px rgba(56, 239, 125, 0.3)' : 'none'
                        }}
                    >
                        📊 నా గణాంకాలు (My Stats)
                    </button>

                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: activeTab === 'leaderboard' 
                                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                                : 'transparent',
                            color: activeTab === 'leaderboard' ? '#fff' : '#94a3b8',
                            boxShadow: activeTab === 'leaderboard' ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
                        }}
                    >
                        🏆 లీడర్‌బోర్డ్ (Top Players)
                    </button>
                </div>

                {/* TAB 1: MY STATS */}
                {activeTab === 'myStats' && (
                    <>
                        {/* Hero Profile & Bible Completion Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '24px',
                            padding: '24px 20px',
                            marginBottom: '20px',
                            textAlign: 'center',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.35)'
                        }}>
                            <div style={{
                                display: 'inline-block',
                                padding: '4px 14px',
                                background: 'rgba(56, 239, 125, 0.2)',
                                border: '1px solid #38ef7d',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#38ef7d',
                                marginBottom: '12px'
                            }}>
                                {statsData.rankTitle}
                            </div>

                            <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '800' }}>
                                {userName || "Player"}
                            </h2>
                            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#cbd5e1' }}>
                                సమగ్ర బైబిల్ క్విజ్ పురోగతి
                            </p>

                            {/* Circular Percentage Progress Visual */}
                            <div style={{
                                width: '110px',
                                height: '110px',
                                borderRadius: '50%',
                                background: 'conic-gradient(#38ef7d ' + (statsData.overallPercent * 3.6) + 'deg, rgba(255,255,255,0.1) 0deg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                                padding: '6px'
                            }}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    background: '#0f172a',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <span style={{ fontSize: '22px', fontWeight: '800', color: '#38ef7d' }}>
                                        {statsData.overallPercent}%
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>పూర్తయింది</span>
                                </div>
                            </div>

                            <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', fontWeight: '600' }}>
                                మొత్తం <span style={{ color: '#38ef7d', fontWeight: 'bold' }}>{statsData.totalLevelsCompleted}</span> / {TOTAL_BIBLE_CHAPTERS} అధ్యాయాలు పూర్తయ్యాయి
                            </p>
                        </div>

                        {/* 4 Quick Stat Metric Cards */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px',
                            marginBottom: '20px'
                        }}>
                            {/* Card 1: Levels */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.07)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '18px',
                                padding: '16px 14px',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '26px' }}>🏆</span>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#38ef7d', marginTop: '4px' }}>
                                    {statsData.totalLevelsCompleted}
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                    లెవల్స్ పూర్తయ్యాయి
                                </div>
                            </div>

                            {/* Card 2: Books */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.07)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '18px',
                                padding: '16px 14px',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '26px' }}>📖</span>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#60a5fa', marginTop: '4px' }}>
                                    {statsData.totalBooksCompleted} / {TOTAL_BIBLE_BOOKS}
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                    గ్రంథాలు పూర్తయ్యాయి
                                </div>
                            </div>

                            {/* Card 3: Stars */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.07)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '18px',
                                padding: '16px 14px',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '26px' }}>⭐</span>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
                                    {statsData.totalStars}
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                    మొత్తం నక్షత్రాలు
                                </div>
                            </div>

                            {/* Card 4: Score */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.07)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '18px',
                                padding: '16px 14px',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '26px' }}>🎯</span>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#ec4899', marginTop: '4px' }}>
                                    {statsData.totalScore}
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                    మొత్తం పాయింట్లు
                                </div>
                            </div>
                        </div>

                        {/* Testament Breakdown Section */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '20px',
                            padding: '18px',
                            marginBottom: '22px'
                        }}>
                            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                                📜 నిబంధనల వారీగా ప్రగతి (Testaments)
                            </h3>

                            {/* Old Testament */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: '600' }}>పాత నిబంధన (Old Testament)</span>
                                    <span style={{ color: '#38ef7d', fontWeight: '700' }}>{statsData.otPercent}%</span>
                                </div>
                                <div style={{
                                    height: '10px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    overflow: 'hidden',
                                    marginBottom: '4px'
                                }}>
                                    <div style={{
                                        width: `${statsData.otPercent}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #11998e, #38ef7d)',
                                        borderRadius: '8px',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                                    <span>{statsData.otLevelsCompleted} / {TOTAL_OT_CHAPTERS} అధ్యాయాలు</span>
                                    <span>{statsData.otBooksCompleted} / {TOTAL_OT_BOOKS} గ్రంథాలు పూర్తి</span>
                                </div>
                            </div>

                            {/* New Testament */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: '600' }}>క్రొత్త నిబంధన (New Testament)</span>
                                    <span style={{ color: '#60a5fa', fontWeight: '700' }}>{statsData.ntPercent}%</span>
                                </div>
                                <div style={{
                                    height: '10px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    overflow: 'hidden',
                                    marginBottom: '4px'
                                }}>
                                    <div style={{
                                        width: `${statsData.ntPercent}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                        borderRadius: '8px',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                                    <span>{statsData.ntLevelsCompleted} / {TOTAL_NT_CHAPTERS} అధ్యాయాలు</span>
                                    <span>{statsData.ntBooksCompleted} / {TOTAL_NT_BOOKS} గ్రంథాలు పూర్తి</span>
                                </div>
                            </div>
                        </div>

                        {/* Book-by-Book Breakdown List */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                                    📚 గ్రంథాల వారీగా వివరాలు
                                </h3>
                                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                    {filteredBooks.length} గ్రంథాలు
                                </span>
                            </div>

                            {/* Search Box */}
                            <input
                                type="text"
                                placeholder="గ్రంథం పేరు వెతకండి (Search Book)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '14px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    marginBottom: '12px',
                                    boxSizing: 'border-box'
                                }}
                            />

                            {/* Filter Chips */}
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
                                {[
                                    { id: 'all', label: 'అన్నీ (All)' },
                                    { id: 'completed', label: '✅ పూర్తయినవి' },
                                    { id: 'inProgress', label: '⏳ ప్రగతిలో ఉన్నవి' },
                                    { id: 'notStarted', label: '⭕ ప్రారంభించనివి' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setBookFilter(f.id)}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '20px',
                                            border: 'none',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            background: bookFilter === f.id ? '#38ef7d' : 'rgba(255,255,255,0.08)',
                                            color: bookFilter === f.id ? '#0b111e' : '#cbd5e1'
                                        }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Books Cards Grid/List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {filteredBooks.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '30px',
                                        background: 'rgba(255,255,255,0.04)',
                                        borderRadius: '16px',
                                        color: '#94a3b8'
                                    }}>
                                        ఎటువంటి గ్రంథాలు కనుగొనబడలేదు.
                                    </div>
                                ) : (
                                    filteredBooks.map(book => (
                                        <div 
                                            key={book.id}
                                            onClick={() => navigate(`/levels/${book.file}`, { state: { from: 'stats' } })}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: book.isCompleted 
                                                    ? '1px solid rgba(56, 239, 125, 0.4)' 
                                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '16px',
                                                padding: '14px 16px',
                                                cursor: 'pointer',
                                                transition: 'transform 0.15s ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                                                        {book.teluguName}
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '6px' }}>
                                                        ({book.name})
                                                    </span>
                                                </div>

                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    padding: '3px 10px',
                                                    borderRadius: '12px',
                                                    background: book.isCompleted 
                                                        ? 'rgba(56, 239, 125, 0.2)' 
                                                        : book.completedChapters > 0 
                                                            ? 'rgba(96, 165, 250, 0.2)' 
                                                            : 'rgba(255, 255, 255, 0.08)',
                                                    color: book.isCompleted ? '#38ef7d' : book.completedChapters > 0 ? '#60a5fa' : '#94a3b8'
                                                }}>
                                                    {book.isCompleted ? '✅ పూర్తి' : `${book.completedChapters} / ${book.chapters}`}
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div style={{
                                                height: '6px',
                                                borderRadius: '4px',
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${book.completionPercent}%`,
                                                    height: '100%',
                                                    background: book.isCompleted 
                                                        ? '#38ef7d' 
                                                        : 'linear-gradient(90deg, #11998e, #38ef7d)',
                                                    borderRadius: '4px'
                                                }} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 2: LEADERBOARD / ALL PLAYERS */}
                {activeTab === 'leaderboard' && (
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                                🏆 గ్లోబల్ లీడర్‌బోర్డ్ (Top Players)
                            </h2>
                            <button
                                onClick={fetchLeaderboard}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '6px 12px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Refresh
                            </button>
                        </div>

                        {loadingLeaderboard ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div style={{
                                    border: '3px solid rgba(255,255,255,0.2)',
                                    borderTop: '3px solid #f59e0b',
                                    borderRadius: '50%',
                                    width: '30px',
                                    height: '30px',
                                    animation: 'spin 1s linear infinite',
                                    margin: '0 auto 10px'
                                }} />
                                <span style={{ color: '#94a3b8', fontSize: '14px' }}>ప్లేయర్ల డేటా లోడ్ అవుతోంది...</span>
                            </div>
                        ) : leaderboardError ? (
                            <div style={{
                                padding: '20px',
                                textAlign: 'center',
                                background: 'rgba(239, 68, 68, 0.15)',
                                borderRadius: '16px',
                                color: '#fca5a5'
                            }}>
                                {leaderboardError}
                            </div>
                        ) : leaderboardUsers.length === 0 ? (
                            <div style={{
                                padding: '30px',
                                textAlign: 'center',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '16px',
                                color: '#cbd5e1'
                            }}>
                                ఇంకా ఏ ప్లేయర్ డేటా నమోదు కాలేదు.
                            </div>
                        ) : (
                            <>
                                {/* Top 3 Podium Visual (if 3 or more users) */}
                                {leaderboardUsers.length >= 3 && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'flex-end',
                                        gap: '10px',
                                        marginBottom: '25px',
                                        paddingTop: '20px'
                                    }}>
                                        {/* Rank 2 (Silver) */}
                                        <div style={{
                                            flex: 1,
                                            maxWidth: '105px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '16px 16px 8px 8px',
                                            padding: '12px 6px',
                                            textAlign: 'center',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                                        }}>
                                            <div style={{ fontSize: '20px' }}>🥈</div>
                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '50%',
                                                margin: '0 auto 6px',
                                                overflow: 'hidden',
                                                border: '2px solid #cbd5e1',
                                                background: '#334155'
                                            }}>
                                                {leaderboardUsers[1]?.photo ? (
                                                    <img src={leaderboardUsers[1].photo} alt="P2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ lineHeight: '42px', fontSize: '18px' }}>👤</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {leaderboardUsers[1]?.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold' }}>
                                                {leaderboardUsers[1]?.levelsCompleted} Levels
                                            </div>
                                        </div>

                                        {/* Rank 1 (Gold) */}
                                        <div style={{
                                            flex: 1.15,
                                            maxWidth: '120px',
                                            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.25) 0%, rgba(255, 255, 255, 0.08) 100%)',
                                            border: '2px solid #f59e0b',
                                            borderRadius: '20px 20px 8px 8px',
                                            padding: '16px 8px',
                                            textAlign: 'center',
                                            transform: 'translateY(-10px)',
                                            boxShadow: '0 8px 25px rgba(245, 158, 11, 0.35)'
                                        }}>
                                            <div style={{ fontSize: '26px', transform: 'translateY(-6px)' }}>👑</div>
                                            <div style={{
                                                width: '50px',
                                                height: '50px',
                                                borderRadius: '50%',
                                                margin: '0 auto 6px',
                                                overflow: 'hidden',
                                                border: '2px solid #f59e0b',
                                                background: '#334155'
                                            }}>
                                                {leaderboardUsers[0]?.photo ? (
                                                    <img src={leaderboardUsers[0].photo} alt="P1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ lineHeight: '50px', fontSize: '22px' }}>👤</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#fef08a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {leaderboardUsers[0]?.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold' }}>
                                                {leaderboardUsers[0]?.levelsCompleted} Levels
                                            </div>
                                        </div>

                                        {/* Rank 3 (Bronze) */}
                                        <div style={{
                                            flex: 1,
                                            maxWidth: '105px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid #d97706',
                                            borderRadius: '16px 16px 8px 8px',
                                            padding: '12px 6px',
                                            textAlign: 'center',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                                        }}>
                                            <div style={{ fontSize: '20px' }}>🥉</div>
                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '50%',
                                                margin: '0 auto 6px',
                                                overflow: 'hidden',
                                                border: '2px solid #d97706',
                                                background: '#334155'
                                            }}>
                                                {leaderboardUsers[2]?.photo ? (
                                                    <img src={leaderboardUsers[2].photo} alt="P3" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ lineHeight: '42px', fontSize: '18px' }}>👤</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {leaderboardUsers[2]?.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>
                                                {leaderboardUsers[2]?.levelsCompleted} Levels
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Ranked User List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {leaderboardUsers.map((user, idx) => {
                                        const rank = idx + 1;
                                        return (
                                            <div
                                                key={user.id || idx}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '12px 14px',
                                                    background: user.isCurrent 
                                                        ? 'rgba(56, 239, 125, 0.15)' 
                                                        : 'rgba(255, 255, 255, 0.05)',
                                                    border: user.isCurrent 
                                                        ? '2px solid #38ef7d' 
                                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                                    borderRadius: '16px'
                                                }}
                                            >
                                                {/* Left: Rank & Avatar & Name */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{
                                                        width: '26px',
                                                        fontSize: '15px',
                                                        fontWeight: '800',
                                                        color: rank === 1 ? '#f59e0b' : rank === 2 ? '#cbd5e1' : rank === 3 ? '#d97706' : '#94a3b8'
                                                    }}>
                                                        #{rank}
                                                    </span>

                                                    <div style={{
                                                        width: '38px',
                                                        height: '38px',
                                                        borderRadius: '50%',
                                                        overflow: 'hidden',
                                                        background: '#1e293b',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1px solid rgba(255,255,255,0.2)'
                                                    }}>
                                                        {user.photo ? (
                                                            <img src={user.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <span>👤</span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: '700', color: user.isCurrent ? '#38ef7d' : '#fff' }}>
                                                            {user.name} {user.isCurrent && '(నేను)'}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                            {user.booksCompleted} గ్రంథాలు పూర్తి
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Score & Levels */}
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#38ef7d' }}>
                                                        {user.levelsCompleted} <span style={{ fontSize: '11px', color: '#94a3b8' }}>లెవల్స్</span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>
                                                        {user.totalScore} pts
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Statistics;
