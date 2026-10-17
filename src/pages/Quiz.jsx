import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { bookNameMap } from '../bookNames';
import Loader from '../components/Loader';
import { useGame } from '../context/GameContext';
import { AdMobService } from '../services/admob';
import { soundService } from '../services/soundService';
import { Toast } from '@capacitor/toast';
import ConfirmModal from '../components/ConfirmModal';

// Helper function to gamble/shuffle both options and questions
const shuffleQuestionsAndOptions = (rawQuestions) => {
    if (!Array.isArray(rawQuestions)) return [];

    // Map each question: clone options, randomize options with Fisher-Yates, and re-compute correct answer index
    const preparedQuestions = rawQuestions.map(q => {
        const originalOptions = Array.isArray(q.options) ? [...q.options] : [];
        const correctIdx = typeof q.correct === 'number' && q.correct >= 0 && q.correct < originalOptions.length ? q.correct : 0;
        const correctAnswerText = originalOptions[correctIdx];

        // Fisher-Yates shuffle options array
        const shuffledOptions = [...originalOptions];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = shuffledOptions[i];
            shuffledOptions[i] = shuffledOptions[j];
            shuffledOptions[j] = temp;
        }

        const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);
        return {
            ...q,
            options: shuffledOptions,
            correct: newCorrectIndex !== -1 ? newCorrectIndex : 0
        };
    });

    // Fisher-Yates shuffle the question list itself
    for (let i = preparedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = preparedQuestions[i];
        preparedQuestions[i] = preparedQuestions[j];
        preparedQuestions[j] = temp;
    }

    return preparedQuestions;
};

import { loadQuizBookData } from '../lib/quizDataLoader';

const Quiz = () => {
    const { difficulty, book: bookFile, level } = useParams();
    const navigate = useNavigate();
    const { 
        lives, 
        deductLife, 
        hints, 
        consumeHint, 
        addHints, 
        updateLevelProgress, 
        getProgressForDifficulty, 
        progress,
        soundEnabled,
        toggleSound,
        bookmarks,
        toggleBookmark,
        isBookmarked,
        streak,
        recordDailyPlay
    } = useGame();

    const basePath = difficulty ? `/${difficulty}` : '';

    const [bookData, setBookData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(30);
    const [quizFinished, setQuizFinished] = useState(false);
    const [quizFailedLives, setQuizFailedLives] = useState(false);

    // Feedback State
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackType, setFeedbackType] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    // Hints State
    const [disabledOptions, setDisabledOptions] = useState([]);

    const timerRef = useRef(null);

    // Modal State
    const [showAdFailModal, setShowAdFailModal] = useState(false);

    // Load Data
    useEffect(() => {
        // Preload Interstitial Ad in background
        AdMobService.prepareInterstitial().catch(() => {});

        const loadData = async () => {
            const minDelay = new Promise(resolve => setTimeout(resolve, 800));
            // Reset state
            setQuizFinished(false);
            setQuizFailedLives(false);
            setCurrentQuestionIndex(0);
            setScore(0);
            setTimer(30);
            setShowConfetti(false);
            setSelectedOption(null);
            setIsCorrect(null);
            setShowFeedback(false);
            setDisabledOptions([]);

            try {
                const [data] = await Promise.all([
                    loadQuizBookData(bookFile, difficulty),
                    minDelay
                ]);

                setBookData(data);

                const levelQuestions = data.levels?.[level];
                if (levelQuestions) {
                    setQuestions(shuffleQuestionsAndOptions(levelQuestions));
                } else {
                    console.error("Level not found");
                }
            } catch (error) {
                console.error("Failed to load book data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [bookFile, level, difficulty]);

    // Cleanup options on question change
    useEffect(() => {
        setDisabledOptions([]);
    }, [currentQuestionIndex]);

    // Timer Logic
    useEffect(() => {
        if (loading || quizFinished || quizFailedLives || selectedOption !== null) return;

        if (lives <= 0 && !quizFailedLives) {
            // Logic handled in render check
        }

        if (timer > 0) {
            if (timer <= 5) {
                soundService.playTick();
            }
            timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
        } else {
            handleOptionClick(-1);
        }
        return () => clearTimeout(timerRef.current);
    }, [timer, loading, quizFinished, quizFailedLives, selectedOption]);

    const handleOptionClick = (index) => {
        if (selectedOption !== null) return;
        if (timerRef.current) clearTimeout(timerRef.current);

        setSelectedOption(index);
        const currentQuestion = questions[currentQuestionIndex];
        const correct = index === currentQuestion?.correct;

        soundService.playClick();
        if (correct) {
            soundService.playCorrect();
        } else {
            soundService.playWrong();
        }

        setIsCorrect(correct);
        setFeedbackType(correct ? 'correct' : 'wrong');
        setShowFeedback(true);

        const newScore = correct ? score + 1 : score;
        if (correct) {
            setScore(newScore);
            setShowConfetti(true);
        } else {
            deductLife();
        }

        const isLastQuestion = currentQuestionIndex >= questions.length - 1;
        const delay = isLastQuestion ? 500 : 700;

        setTimeout(() => {
            setShowFeedback(false);
            setShowConfetti(false);

            if (!isLastQuestion) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedOption(null);
                setIsCorrect(null);
                setTimer(30);
            } else {
                finishQuiz(newScore);
            }
        }, delay);
    };

    const [adLoadingAction, setAdLoadingAction] = useState(null); // 'skip' or 'hint' or null

    // ...

    const handleHint = async () => {
        if (selectedOption !== null) return;

        if (hints > 0) {
            const success = consumeHint();
            if (success) {
                const currentQuestion = questions[currentQuestionIndex];
                handleOptionClick(currentQuestion.correct);
            }
        } else {
            // No Hints - Direct Ad Load
            setAdLoadingAction('hint');
            const success = await AdMobService.showRewardVideo();
            setAdLoadingAction(null);

            if (success) {
                addHints(1);
                await Toast.show({
                    text: 'Reward: 1 Hint Added! Tap bulb to use.',
                    duration: 'short',
                    position: 'center'
                });
            } else {
                // If failed, maybe offer Store redirect?
                setShowAdFailModal(true);
            }
        }
    };

    // ...

    if (loading) return <Loader />;

    if (lives <= 0 && !quizFinished && selectedOption === null) {
        return (
            <div className="container" style={{ justifyContent: 'center', textAlign: 'center' }}>
                <img src="/images/Logo1.png" alt="Quiz Logo" className="logo" style={{ width: '200px', marginBottom: '20px' }} />
                <h2>Out of Lives!</h2>
                <p>You need lives to play. Wait for them to restore.</p>
                <div style={{ fontSize: '40px' }}>📕</div>
                <button className="action-btn" onClick={() => navigate('/store', { replace: true })} style={{ marginTop: '20px' }}>
                    <span className="btn-main-text">Go Store</span>
                </button>
            </div>
        );
    }

    // ...

    const handleSkip = async () => {
        if (selectedOption !== null) return;

        // Direct Ad Load
        setAdLoadingAction('skip');
        const success = await AdMobService.showRewardVideo();
        setAdLoadingAction(null);

        if (success) {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setTimer(30);
            } else {
                finishQuiz(score);
            }
        } else {
            await Toast.show({
                text: 'Ad failed or closed early. Skip cancelled.',
                duration: 'short'
            });
        }
    };

    // ...

    const finishQuiz = (finalScore) => {
        setScore(finalScore);
        setQuizFinished(true);
        const passed = (finalScore / questions.length) >= 0.5;
        if (passed) {
            soundService.playFanfare();
        }
        recordDailyPlay();
        saveProgress(finalScore, passed);
    };

    const saveProgress = (finalScore, passed) => {
        const bookName = bookData.bookName;
        // Use Context for progress logic, delegating save to GameContext useEffect
        const bookProgress = getProgressForDifficulty
            ? getProgressForDifficulty(difficulty, bookName)
            : ((progress || {})[bookName] || {});

        const previousData = bookProgress[level] || {};
        const wasCompleted = previousData.completed;

        const newData = {
            completed: wasCompleted || passed,
            score: finalScore
        };

        updateLevelProgress(bookName, level, newData, difficulty);
    };



    if (!questions.length) return <div>No questions for this level.</div>;

    if (quizFinished) {
        const passed = (score / questions.length) >= 0.5;

        return (
            <div className="container">
                {passed && <Confetti recycle={false} numberOfPieces={120} gravity={0.3} />}

                <img src="/images/Logo1.png" alt="Quiz Logo" className="logo" style={{ width: '200px', marginBottom: '20px' }} />

                <div className="scoreboard" style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 style={{
                        fontSize: '36px',
                        marginBottom: '10px',
                        color: 'white',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        {passed ? "Congratulations!" : "Try Again!"}
                    </h2>

                    <div className="score-box" style={{
                        background: passed
                            ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                            : 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)',
                        padding: '30px 50px',
                        borderRadius: '25px',
                        marginBottom: '20px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                        color: 'white'
                    }}>
                        <p className="score-text" style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>
                            Score: {score} / {questions.length}
                        </p>
                    </div>

                    {streak > 0 && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.25), rgba(244, 67, 54, 0.25))',
                            border: '1px solid rgba(255, 152, 0, 0.6)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            color: '#ffb74d',
                            padding: '10px 22px',
                            borderRadius: '30px',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            marginBottom: '25px',
                            boxShadow: '0 4px 16px rgba(255, 152, 0, 0.25)'
                        }}>
                            <span style={{ fontSize: '20px' }}>🔥</span>
                            <span>{streak} Day Streak! ప్రతిరోజూ సాధన!</span>
                        </div>
                    )}

                    <div className="btn-group">
                        {parseInt(level) < bookData.chapters && passed && (
                            <button className="action-btn" onClick={() => {
                                AdMobService.showInterstitial().catch(() => {});
                                navigate(`${basePath}/quiz/${bookFile}/${parseInt(level) + 1}`, { replace: true });
                            }}>
                                <span className="btn-main-text">Next Level</span>
                            </button>
                        )}
                        {!passed && (
                            <button className="action-btn" onClick={() => {
                                // Reset for Retry and reshuffle
                                const levelQuestions = bookData?.levels?.[level] || [];
                                setQuestions(shuffleQuestionsAndOptions(levelQuestions));
                                setQuizFinished(false);
                                setCurrentQuestionIndex(0);
                                setScore(0);
                                setTimer(30);
                                setShowConfetti(false);
                                setSelectedOption(null);
                                setIsCorrect(null);
                                setShowFeedback(false);
                                setDisabledOptions([]);
                            }}>
                                <span className="btn-main-text">Retry</span>
                            </button>
                        )}
                        <button className="action-btn" onClick={() => {
                            AdMobService.showInterstitial().catch(() => {});
                            navigate('/');
                        }}>
                            <span className="btn-main-text">Home</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];



    return (
        <div className="quiz-bg-wrapper">
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <div className="quiz-wrapper">
                {/* ... (Feedback Overlay & Confetti preserved) ... */}
                {showFeedback && (
                    <div className="feedback-overlay" style={{
                        display: 'flex',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 100,
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        pointerEvents: 'none',
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                    }}>
                        <div className={`feedback-icon ${feedbackType}`} style={{
                            fontSize: '90px',
                            fontWeight: 'bold',
                            color: feedbackType === 'correct' ? '#4CAF50' : '#F44336',
                            textShadow: feedbackType === 'correct' ? '0 0 25px rgba(76, 175, 80, 0.9)' : '0 0 25px rgba(244, 67, 54, 0.9)',
                            animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}>
                            {feedbackType === 'correct' ? '✓' : '✗'}
                        </div>

                        {/* Scripture Context Card - Commented out for now (will discuss later) */}
                        {/*
                        <div style={{
                            marginTop: '16px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            borderRadius: '16px',
                            padding: '12px 24px',
                            color: 'white',
                            textAlign: 'center',
                            maxWidth: '85%',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>
                                📖 లేఖన భాగం (Scripture)
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px', fontFamily: 'Mandali, sans-serif' }}>
                                {bookNameMap[bookData.bookName] || bookData.bookName} - అధ్యాయము {level}
                            </div>
                            {feedbackType === 'wrong' && questions[currentQuestionIndex] && (
                                <div style={{ fontSize: '15px', color: '#81C784', marginTop: '6px', fontWeight: 'bold' }}>
                                    సరైనది: {questions[currentQuestionIndex].options[questions[currentQuestionIndex].correct]}
                                </div>
                            )}
                        </div>
                        */}
                    </div>
                )}

                {showFeedback && feedbackType === 'correct' && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 99 }}>
                        <Confetti recycle={false} numberOfPieces={100} gravity={0.5} />
                    </div>
                )}

                {(() => {
                    const timerProgress = Math.max(0, Math.min(30, timer));
                    const timerCircumference = 131.95;
                    const timerOffset = timerCircumference * (1 - timerProgress / 30);
                    const timerState = timer > 10 ? 'safe' : timer > 5 ? 'warning' : 'danger';

                    return (
                        <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="back-arrow" onClick={() => navigate(-1)} style={{ marginRight: 0 }}>&#8592;</div>
                                <div onClick={adLoadingAction === 'hint' ? null : handleHint} style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '20px',
                                    padding: '8px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    cursor: 'pointer',
                                    border: hints > 0 ? '1px solid gold' : '1px solid #999',
                                    transition: 'transform 0.1s',
                                    zIndex: 10
                                }}
                                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                                    title="Get a Hint"
                                >
                                    {adLoadingAction === 'hint' ? (
                                        <div style={{
                                            border: '2px solid #fff', borderTop: '2px solid transparent',
                                            borderRadius: '50%', width: '14px', height: '14px',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '18px' }}>💡</span>
                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{hints}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="title-container" style={{ textAlign: 'center', width: 'auto', flex: 1, padding: '0 8px' }}>
                                <h1 id="book-title" style={{ fontSize: '18px', margin: 0 }}>{bookNameMap[bookData.bookName] || bookData.bookName}</h1>
                                <div className="chapter-info" style={{ fontSize: '12px', color: '#fff' }}>Ch {level} - {currentQuestionIndex + 1}/{questions.length}</div>
                            </div>

                            <div className={`premium-timer ${timerState}`} style={{ margin: 0, flexShrink: 0 }}>
                                <svg viewBox="0 0 50 50">
                                    <circle className="premium-timer-track" cx="25" cy="25" r="21" />
                                    <circle
                                        className="premium-timer-bar"
                                        cx="25"
                                        cy="25"
                                        r="21"
                                        strokeDasharray={timerCircumference}
                                        strokeDashoffset={timerOffset}
                                    />
                                </svg>
                                <span className="premium-timer-text">{timer}</span>
                            </div>
                        </header>
                    );
                })()}

                <div className="quiz-content" style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start', /* LIFT UP: Start from top */
                    paddingTop: '30px', /* Offset from header */
                    width: '100%',
                    alignItems: 'center',
                    paddingBottom: '80px' /* Space for Skip btn */
                }}>
                    <img src="/images/Logo1.png" alt="Quiz Logo" style={{ width: '220px', height: 'auto', marginBottom: '20px' }} />

                    <div className="question-box" style={{ position: 'relative' }}>
                        {/* Bookmark Question Star */}
                        <button
                            type="button"
                            className="bookmark-btn"
                            onClick={() => toggleBookmark({
                                question: currentQuestion.question,
                                options: currentQuestion.options,
                                correct: currentQuestion.correct,
                                bookName: bookData?.bookName,
                                level,
                                difficulty: difficulty || 'beginner'
                            })}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '10px',
                                background: isBookmarked(currentQuestion.question) ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                                border: isBookmarked(currentQuestion.question) ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.25)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: isBookmarked(currentQuestion.question) ? '#ffd700' : 'rgba(255,255,255,0.6)',
                                fontSize: '16px',
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                            title={isBookmarked(currentQuestion.question) ? "Saved in Bookmarks" : "Save this Question"}
                            aria-label="Bookmark Question"
                        >
                            {isBookmarked(currentQuestion.question) ? '★' : '☆'}
                        </button>
                        <p style={{ paddingRight: '22px' }}>{currentQuestion.question}</p>
                    </div>

                    <div className="options-container">
                        {currentQuestion.options.map((option, idx) => {
                            let className = "option-btn";
                            const isDisabled = disabledOptions.includes(idx);
                            const optionLabel = String.fromCharCode(65 + idx);

                            if (selectedOption !== null) {
                                if (idx === currentQuestion.correct) className += " correct";
                                if (idx === selectedOption && idx !== currentQuestion.correct) className += " wrong";
                            }

                            if (isDisabled) {
                                return <div key={idx} style={{ visibility: 'hidden', height: '60px', margin: '5px', width: '100%' }}></div>;
                            }

                            return (
                                <button
                                    key={idx}
                                    className={className}
                                    onClick={() => handleOptionClick(idx)}
                                    disabled={selectedOption !== null}
                                >
                                    <span className="option-badge">{optionLabel}</span>
                                    <span className="option-text">{option}</span>
                                    <span className="option-spacer" aria-hidden="true" />
                                </button>
                            );
                        })}
                    </div>

                    {/* SKIP BUTTON */}
                    <button
                        onClick={handleSkip}
                        disabled={selectedOption !== null || adLoadingAction === 'skip'}
                        style={{
                            marginTop: 'auto', /* Push to bottom of flex container */
                            marginBottom: '20px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: '1px solid white',
                            backdropFilter: 'blur(5px)',
                            color: 'white',
                            padding: '10px 30px',
                            borderRadius: '30px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                        }}
                    >
                        {adLoadingAction === 'skip' ? (
                            <>
                                <div style={{
                                    border: '3px solid #fff', borderTop: '3px solid transparent',
                                    borderRadius: '50%', width: '18px', height: '18px',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                <span>Loading Ad...</span>
                            </>
                        ) : (
                            <>
                                <span>📺</span> Skip Question
                            </>
                        )}
                    </button>

                </div>
            </div>

            <ConfirmModal
                isOpen={showAdFailModal}
                title="Ad Failed"
                message="Video Ad failed to load. Do you want to go to the Store to buy hints instead?"
                confirmText="Go to Store"
                cancelText="Cancel"
                onConfirm={() => {
                    setShowAdFailModal(false);
                    navigate('/store');
                }}
                onCancel={() => setShowAdFailModal(false)}
            />
        </div >
    );
};

export default Quiz;
