import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { bookNameMap } from '../bookNames';
import Loader from '../components/Loader';
import { useGame } from '../context/GameContext';
import { AdMobService } from '../services/admob';
import { Toast } from '@capacitor/toast';
import ConfirmModal from '../components/ConfirmModal';

const Quiz = () => {
    const { book: bookFile, level } = useParams();
    const navigate = useNavigate();
    const { lives, deductLife, hints, consumeHint, addHints, updateLevelProgress, progress } = useGame();

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
                const [module] = await Promise.all([
                    import(`../assets/data/${bookFile}.json`),
                    minDelay
                ]);

                const data = module.default || module;
                setBookData(data);

                const levelQuestions = data.levels[level];
                if (levelQuestions) {
                    // Fisher-Yates shuffle
                    const shuffled = [...levelQuestions];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    setQuestions(shuffled);
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
    }, [bookFile, level]);

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
            timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
        } else {
            handleOptionClick(-1);
        }
        return () => clearTimeout(timerRef.current);
    }, [timer, loading, quizFinished, quizFailedLives, selectedOption]);

    const handleOptionClick = (index) => {
        if (selectedOption !== null) return;

        setSelectedOption(index);
        const currentQuestion = questions[currentQuestionIndex];
        const correct = index === currentQuestion.correct;

        setIsCorrect(correct);
        setFeedbackType(correct ? 'correct' : 'wrong');
        setShowFeedback(true);

        if (correct) {
            setScore(s => s + 1);
            setShowConfetti(true);
        } else {
            deductLife();
        }

        setTimeout(() => {
            setShowFeedback(false);
            setShowConfetti(false);

            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedOption(null);
                setIsCorrect(null);
                setTimer(30);
            } else {
                finishQuiz(correct ? score + 1 : score);
            }
        }, 2500);
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

    const finishQuiz = async (finalScore) => {
        // Show Interstitial Ad upon completion
        try {
            await AdMobService.showInterstitial();
        } catch (e) {
            console.error("Interstitial Ad failed:", e);
        }

        setQuizFinished(true);
        const passed = (finalScore / questions.length) >= 0.5;
        saveProgress(finalScore, passed);
    };

    const saveProgress = (finalScore, passed) => {
        const bookName = bookData.bookName;
        // Use Context for progress logic, delegating save to GameContext useEffect
        const userProgress = progress || {};
        const bookProgress = userProgress[bookName] || {};

        const previousData = bookProgress[level] || {};
        const wasCompleted = previousData.completed;

        const newData = {
            completed: wasCompleted || passed,
            score: finalScore
        };

        updateLevelProgress(bookName, level, newData);
    };



    if (!questions.length) return <div>No questions for this level.</div>;

    if (quizFinished) {
        const passed = (score / questions.length) >= 0.5;

        return (
            <div className="container">
                {passed && <Confetti recycle={true} numberOfPieces={200} />}

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
                        marginBottom: '30px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                        color: 'white'
                    }}>
                        <p className="score-text" style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>
                            Score: {score} / {questions.length}
                        </p>
                    </div>

                    <div className="btn-group">
                        {parseInt(level) < bookData.chapters && passed && (
                            <button className="action-btn" onClick={() => {
                                navigate(`/quiz/${bookFile}/${parseInt(level) + 1}`, { replace: true });
                            }}>
                                <span className="btn-main-text">Next Level</span>
                            </button>
                        )}
                        {!passed && (
                            <button className="action-btn" onClick={() => {
                                // Reset for Retry
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
                        <button className="action-btn" onClick={() => navigate('/')}>
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
                        justifyContent: 'center',
                        alignItems: 'center',
                        pointerEvents: 'none',
                        background: 'rgba(0,0,0,0.3)'
                    }}>
                        <div className={`feedback-icon ${feedbackType}`} style={{
                            fontSize: '100px',
                            fontWeight: 'bold',
                            color: feedbackType === 'correct' ? '#4CAF50' : '#F44336',
                            textShadow: feedbackType === 'correct' ? '0 0 20px rgba(76, 175, 80, 0.8)' : '0 0 20px rgba(244, 67, 54, 0.8)',
                            animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}>
                            {feedbackType === 'correct' ? '✓' : '✗'}
                        </div>
                    </div>
                )}

                {showFeedback && feedbackType === 'correct' && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 99 }}>
                        <Confetti recycle={false} numberOfPieces={100} gravity={0.5} />
                    </div>
                )}

                <header className="header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

                    <div className="title-container" style={{ textAlign: 'center', width: 'auto', flex: 1 }}>
                        <h1 id="book-title" style={{ fontSize: '18px', margin: 0 }}>{bookNameMap[bookData.bookName] || bookData.bookName}</h1>
                        <div className="chapter-info" style={{ fontSize: '12px', color: '#fff' }}>Ch {level} - {currentQuestionIndex + 1}/{questions.length}</div>
                    </div>
                    <div className="timer-circle" style={{ margin: 0, justifySelf: 'end' }}>{timer}</div>
                </header>

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

                    <div className="question-box">
                        <p>{currentQuestion.question}</p>
                    </div>

                    <div className="options-container">
                        {currentQuestion.options.map((option, idx) => {
                            let className = "option-btn";
                            const isDisabled = disabledOptions.includes(idx);

                            if (selectedOption !== null) {
                                if (idx === currentQuestion.correct) className += " correct";
                                if (idx === selectedOption && idx !== currentQuestion.correct) className += " wrong";
                            }

                            if (isDisabled) {
                                return <div key={idx} style={{ visibility: 'hidden', height: '50px', margin: '5px', width: '100%' }}></div>;
                            }

                            return (
                                <button
                                    key={idx}
                                    className={className}
                                    onClick={() => handleOptionClick(idx)}
                                    disabled={selectedOption !== null}
                                >
                                    {option}
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
