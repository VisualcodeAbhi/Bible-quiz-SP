import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { bookNameMap } from '../bookNames';
import Loader from '../components/Loader';
import { ntFiles } from '../ntFiles';
import { useGame } from '../context/GameContext';
import { loadQuizBookData } from '../lib/quizDataLoader';

const Levels = () => {
    const { difficulty, book: bookFile } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { progress, getProgressForDifficulty } = useGame();
    const [bookData, setBookData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookName, setBookName] = useState("");

    const basePath = difficulty ? `/${difficulty}` : '';
    const diffLabel = difficulty === 'intermediate' ? ' (Intermediate)' : difficulty === 'advanced' ? ' (Advanced)' : '';

    const handleBack = () => {
        if (location.state?.from === 'list') {
            navigate(-1);
        } else {
            if (ntFiles.includes(bookFile)) {
                navigate(`${basePath}/nt`, { replace: true });
            } else {
                navigate(`${basePath}/ot`, { replace: true });
            }
        }
    };

    useEffect(() => {
        const loadData = async () => {
            const minDelay = new Promise(resolve => setTimeout(resolve, 800));
            try {
                const [data] = await Promise.all([
                    loadQuizBookData(bookFile, difficulty),
                    minDelay
                ]);

                setBookData(data);
                setBookName(data.bookName);
            } catch (error) {
                console.error("Failed to load book data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [bookFile, difficulty]);

    if (loading) return <Loader />;
    if (!bookData) return <div className="error-text">Book data not found.</div>;

    // Use difficulty-scoped progress from context
    const bookProgress = getProgressForDifficulty
        ? getProgressForDifficulty(difficulty, bookName)
        : (progress[bookName] || {});

    const levels = [];
    const totalChapters = bookData.chapters;

    for (let i = 1; i <= totalChapters; i++) {
        const progressData = bookProgress[i];
        const isCompleted = progressData && progressData.completed;
        const isUnlocked = i === 1 || (bookProgress[i - 1] && bookProgress[i - 1].completed);

        // Calculate Stars (Scale of 1-5)
        let stars = 0;
        if (isCompleted) {
            if (progressData.score !== undefined && progressData.total) {
                const pct = (progressData.score / progressData.total) * 100;
                if (pct >= 95) stars = 5;      // Near Perfect
                else if (pct >= 80) stars = 4; // Very Good (4/5)
                else if (pct >= 60) stars = 3; // Good (3/5)
                else if (pct >= 40) stars = 2; // Pass
                else stars = 1;                // Barely Pass
            } else {
                stars = 1;
            }
        }

        levels.push({
            level: i,
            completed: isCompleted,
            unlocked: isUnlocked,
            stars: stars
        });
    }

    return (
        <div className="levels-bg-wrapper">
            <div className="container" style={{ justifyContent: 'flex-start' }}>
                <header>
                    <div className="menu-icon" onClick={handleBack}>&#8592;</div>
                    <h1 id="book-title">{bookNameMap[bookName] || bookName} Levels{diffLabel}</h1>
                </header>

                <div className="grid-container" id="levels-grid">
                    {levels.map((lvl) => (
                        <button
                            key={lvl.level}
                            className="level-btn"
                            style={{
                                opacity: lvl.unlocked ? 1 : 0.5,
                                cursor: lvl.unlocked ? 'pointer' : 'not-allowed',
                                background: lvl.completed ? "linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)" : undefined,
                                color: lvl.completed ? 'white' : 'black',
                                position: 'relative',
                                overflow: 'visible',
                                marginBottom: '15px'
                            }}
                            onClick={() => {
                                if (lvl.unlocked) {
                                    navigate(`${basePath}/quiz/${bookFile}/${lvl.level}`);
                                }
                            }}
                        >
                            {lvl.unlocked ? (
                                <>
                                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{lvl.level}</span>
                                    {lvl.completed && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-12px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'flex-end',
                                            height: '20px', // Fixed height for transforms
                                            width: '120px',
                                            pointerEvents: 'none',
                                            filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.5))'
                                        }}>
                                            {/* 1 Star: Centered */}
                                            {lvl.stars === 1 && (
                                                <span style={{ fontSize: '18px', transform: 'translateY(2px)' }}>⭐</span>
                                            )}

                                            {/* 2 Stars: Split */}
                                            {lvl.stars === 2 && (
                                                <>
                                                    <span style={{ fontSize: '16px', transform: 'translate(-2px, 0px) rotate(-10deg)' }}>⭐</span>
                                                    <span style={{ fontSize: '16px', transform: 'translate(2px, 0px) rotate(10deg)' }}>⭐</span>
                                                </>
                                            )}

                                            {/* 3 Stars: Balanced Arc */}
                                            {lvl.stars === 3 && (
                                                <>
                                                    <span style={{ fontSize: '14px', transform: 'translate(2px, -3px) rotate(-20deg)' }}>⭐</span>
                                                    <span style={{ fontSize: '18px', transform: 'translateY(2px)', zIndex: 2 }}>⭐</span>
                                                    <span style={{ fontSize: '14px', transform: 'translate(-2px, -3px) rotate(20deg)' }}>⭐</span>
                                                </>
                                            )}

                                            {/* 4 Stars: Wide Arc */}
                                            {lvl.stars === 4 && (
                                                <>
                                                    <span style={{ fontSize: '12px', transform: 'translate(4px, -6px) rotate(-25deg)' }}>⭐</span>
                                                    <span style={{ fontSize: '15px', transform: 'translate(1px, 0px) rotate(-10deg)' }}>⭐</span>
                                                    <span style={{ fontSize: '15px', transform: 'translate(-1px, 0px) rotate(10deg)' }}>⭐</span>
                                                    <span style={{ fontSize: '12px', transform: 'translate(-4px, -6px) rotate(25deg)' }}>⭐</span>
                                                </>
                                            )}

                                            {/* 5 Stars: Full Arc */}
                                            {lvl.stars === 5 && (
                                                <>
                                                    <span style={{ fontSize: '12px', transform: 'translate(6px, -8px) rotate(-30deg)' }}>⭐</span>
                                                    <span style={{ fontSize: '14px', transform: 'translate(3px, -2px) rotate(-15deg)' }}>⭐</span>
                                                    <span style={{ fontSize: '18px', transform: 'translateY(2px)', zIndex: 2 }}>⭐</span>
                                                    <span style={{ fontSize: '14px', transform: 'translate(-3px, -2px) rotate(15deg)' }}>⭐</span>
                                                    <span style={{ fontSize: '12px', transform: 'translate(-6px, -8px) rotate(30deg)' }}>⭐</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span style={{ fontSize: '30px' }}>🔒</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Levels;
