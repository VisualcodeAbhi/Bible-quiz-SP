import React from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import ConfirmModal from '../components/ConfirmModal';

import { App } from '@capacitor/app';
import { Toast } from '@capacitor/toast';

// Global variable removed
// let hasShownSplash = false;

const Home = () => {
    const navigate = useNavigate();
    const { lives, maxLives, nextRestoreTime, userName, userPhoto, updateProfile, nameLocked, infiniteLivesUntil, isLoggedIn, resetProgress, totallyResetGame, session } = useGame();
    // ...
    // ... inside modal render ... (context will match TargetContent)


    // Splash logic removed (handled by App.jsx)

    // Edit Modal States
    const [isEditingName, setIsEditingName] = React.useState(false);
    const [isEditingPhoto, setIsEditingPhoto] = React.useState(false);

    // Reset Modal State
    const [showResetModal, setShowResetModal] = React.useState(false);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);

    const handleDeleteConfirm = async () => {
        try {
            // 1. Call Supabase Function (Delete User)
            const { error } = await supabase.rpc('delete_user');

            if (error) {
                console.error("Delete failed", error);
                alert("Account Deletion Error: " + error.message);
                // Continue to wipe local data anyway
            }

            // 2. Wipe State & Local Storage & Session via Context
            await totallyResetGame();

            // 3. Force Redirect to Auth Page
            window.location.replace('/auth');
        } catch (e) {
            console.error("Delete Error", e);
            localStorage.clear();
            window.location.replace('/auth');
        }
    };

    // Temp State for Edits
    const [editName, setEditName] = React.useState("");
    const [editPhoto, setEditPhoto] = React.useState(null);

    // Local timer state for display
    const [restoreTimeLeft, setRestoreTimeLeft] = React.useState("");
    const [infiniteTimeLeft, setInfiniteTimeLeft] = React.useState("");

    // Timer Interval for Restore Display
    React.useEffect(() => {
        if (!nextRestoreTime) {
            setRestoreTimeLeft("");
            return;
        }
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = nextRestoreTime - now;
            if (diff <= 0) {
                setRestoreTimeLeft("");
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setRestoreTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [nextRestoreTime]);

    // Timer Interval for Infinite Lives Display
    React.useEffect(() => {
        if (!infiniteLivesUntil) {
            setInfiniteTimeLeft("");
            return;
        }
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = infiniteLivesUntil - now;
            if (diff <= 0) {
                setInfiniteTimeLeft("");
            } else {
                const totalSec = Math.floor(diff / 1000);
                const hours = Math.floor(totalSec / 3600);
                const minutes = Math.floor((totalSec % 3600) / 60);
                const seconds = totalSec % 60;
                if (hours > 0) {
                    setInfiniteTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
                } else {
                    setInfiniteTimeLeft(`${minutes}m ${seconds}s`);
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [infiniteLivesUntil]);



    // ... (handlers for photo/name edit unchanged)

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditPhoto(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const saveName = async () => {
        if (editName && editName.trim()) {
            await updateProfile(editName.trim(), null);
        }
        setIsEditingName(false);
    };

    const savePhoto = async () => {
        if (editPhoto) {
            await updateProfile(null, editPhoto);
        }
        setIsEditingPhoto(false);
    };

    const openNameEdit = () => {
        setEditName(userName);
        setIsEditingName(true);
    };

    const openPhotoEdit = () => {
        setEditPhoto(userPhoto);
        setIsEditingPhoto(true);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsEditingPhoto(false);

        // Clear Local Storage to prevent data leak to next user
        localStorage.removeItem('bibleQuiz_lives');
        localStorage.removeItem('bibleQuiz_restoreTime');
        localStorage.removeItem('bibleQuiz_userName');
        localStorage.removeItem('bibleQuiz_userPhoto');
        localStorage.removeItem('bibleQuiz_nameLocked');
        localStorage.removeItem('bibleQuiz_hints');
        localStorage.removeItem('bibleQuizProgress');
        localStorage.removeItem('bibleQuiz_infiniteLivesUntil');

        window.location.reload();
    };

    const handleResetConfirm = () => {
        resetProgress();
        setIsEditingPhoto(false);
        setShowResetModal(false);
    };

    // Splash render block removed



    // Difficulty & Modal States
    const [showTestamentModal, setShowTestamentModal] = React.useState(false);
    const [showLockedModal, setShowLockedModal] = React.useState(false);
    const [lockedMessage, setLockedMessage] = React.useState("");

    const handleLockedLevelClick = async (levelType) => {
        const msg = levelType === 'advanced'
            ? 'Complete the Intermediate level to unlock'
            : 'Complete the Beginner level to unlock';

        setLockedMessage(msg);
        try {
            await Toast.show({
                text: msg,
                duration: 'long',
                position: 'center'
            });
        } catch (e) {}
        setShowLockedModal(true);
    };

    return (
        <div className="home-bg-wrapper">
            {/* Header Overlay */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                padding: '45px 20px 10px 20px', // Increased top padding for safe area
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start', // Align top items
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                {/* Profile Circle (Click to edit PHOTO) */}
                <div onClick={openPhotoEdit} style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    margin: '0 20px', // Removed vertical margin to align better with expanded header
                    background: '#999',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    border: '2px solid white',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    pointerEvents: 'auto'
                }}>
                    {userPhoto ? (
                        <img src={userPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: '12px', color: 'white' }}>profile</span>
                    )}
                </div>

                {/* User Name Badge (Click to edit NAME - if unlocked) */}
                <div onClick={openNameEdit} style={{
                    position: 'absolute',
                    top: '55px', // Adjusted for new header padding
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'white',
                    color: 'black',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    border: '2px solid #00bcd4',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    cursor: nameLocked ? 'default' : 'pointer',
                    pointerEvents: nameLocked ? 'none' : 'auto'
                }}>
                    {userName}
                </div>

                {/* Right Side: Lives, Timer, Store & Statistics */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '0', pointerEvents: 'auto' }}>
                    {/* Lives Container */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.3)',
                        padding: '5px',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        alignItems: 'center'
                    }}>
                        {infiniteLivesUntil ? (
                            // Show Infinity Symbol
                            <div style={{ fontSize: '30px', color: 'gold', textShadow: '0 0 5px black' }}>
                                ♾️❤️
                            </div>
                        ) : (
                            // Render 5 lives vertically
                            Array.from({ length: maxLives }).map((_, i) => (
                                <span key={i} style={{ fontSize: '20px' }}>
                                    {i < lives ? '📖' : '📕'}
                                </span>
                            ))
                        )}
                    </div>

                    {/* Timer below lives if active */}
                    {infiniteLivesUntil && infiniteTimeLeft ? (
                        <div style={{ color: 'black', fontWeight: 'bold', marginTop: '5px', background: 'gold', padding: '2px 5px', borderRadius: '4px', fontSize: '12px' }}>
                            {infiniteTimeLeft}
                        </div>
                    ) : (
                        restoreTimeLeft && (
                            <div style={{ color: 'black', fontWeight: 'bold', marginTop: '5px', background: 'rgba(255,255,255,0.7)', padding: '2px 5px', borderRadius: '4px', fontSize: '12px' }}>
                                {restoreTimeLeft}
                            </div>
                        )
                    )}

                    {/* Store Cart Icon */}
                    <div onClick={() => navigate('/store')} style={{
                        marginTop: '10px',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(5px)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        pointerEvents: 'auto'
                    }} title="Store">
                        <span style={{ fontSize: '20px' }}>🛒</span>
                    </div>

                    {/* Statistics Icon (Below Store Button) */}
                    <div onClick={() => navigate('/statistics')} style={{
                        marginTop: '8px',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(5px)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        pointerEvents: 'auto'
                    }} title="Statistics">
                        <span style={{ fontSize: '20px' }}>📊</span>
                    </div>
                </div>
            </div>

            {/* Edit Name Modal */}
            {isEditingName && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '80%', maxWidth: '300px', textAlign: 'center' }}>
                        <h2 style={{ color: 'black', marginTop: 0 }}>Edit Name</h2>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Enter Name"
                            maxLength={15}
                            style={{ width: '100%', padding: '10px', marginBottom: '20px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setIsEditingName(false)} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '5px' }}>Cancel</button>
                            <button onClick={saveName} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Photo Modal */}
            {isEditingPhoto && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '25px',
                        borderRadius: '15px',
                        width: '85%',
                        maxWidth: '320px',
                        textAlign: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        position: 'relative'
                    }}>
                        {/* Close Button "X" */}
                        <button
                            onClick={() => setIsEditingPhoto(false)}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'none',
                                border: 'none',
                                fontSize: '20px',
                                cursor: 'pointer',
                                color: '#666'
                            }}
                        >
                            ✕
                        </button>

                        <h2 style={{ color: 'black', marginTop: 0, marginBottom: '20px' }}>Profile Photo</h2>

                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: '#f0f0f0',
                            margin: '0 auto 20px',
                            overflow: 'hidden',
                            border: '3px solid #eee',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            {editPhoto ? (
                                <img src={editPhoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ color: '#aaa', fontSize: '30px' }}>📷</span>
                            )}
                        </div>

                        {/* Top Actions: Choose & Logout */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
                            <label style={{
                                padding: '10px 15px',
                                background: '#2196F3',
                                color: 'white',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}>
                                Choose New
                                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                            </label>

                            <button
                                onClick={handleLogout}
                                style={{
                                    padding: '10px 15px',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Logout
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '15px' }}>
                            <button onClick={() => setIsEditingPhoto(false)} style={{ padding: '10px 25px', background: '#ccc', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: '500', color: '#333' }}>Cancel</button>
                            <button onClick={savePhoto} style={{ padding: '10px 25px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: '500' }}>Save</button>
                        </div>

                        {/* User Email & Reset Data */}
                        {isLoggedIn && (
                            <>
                                {/* Email Display */}
                                {session?.user?.email && (
                                    <div style={{
                                        marginBottom: '10px',
                                        color: '#666',
                                        fontSize: '14px',
                                        wordBreak: 'break-all',
                                        background: '#f5f5f5',
                                        padding: '5px',
                                        borderRadius: '5px'
                                    }}>
                                        {session.user.email}
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowResetModal(true)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#ff9800',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        fontSize: '16px',
                                        marginTop: '5px'
                                    }}
                                >
                                    Reset My Data
                                </button>

                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#d32f2f', // Red
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        fontSize: '16px',
                                        marginTop: '10px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Delete Account
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="container" style={{ animation: 'fadeIn 1s ease-in', paddingTop: '100px' /* Push content down due to header */ }}>
                <img src="/images/Logo1.png" alt="Telugu Bible Quiz Logo" className="logo" />
                <h1>Telugu<br/>Bible Quiz</h1>
                <div className="btn-group">
                    {/* Beginner Option (Unlocked) */}
                    <button
                        className="action-btn"
                        onClick={() => setShowTestamentModal(true)}
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
                            border: '2px solid #38ef7d',
                            boxShadow: '0 6px 16px rgba(56, 239, 125, 0.25)'
                        }}
                    >
                        <span className="btn-main-text" style={{ color: '#11998e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🌱 Beginner
                        </span>
                        <span className="btn-sub-text" style={{ color: '#444' }}>
                            ఆరంభ స్థాయి
                        </span>
                    </button>

                    {/* Intermediate Option (Locked) */}
                    <button
                        className="action-btn"
                        onClick={() => handleLockedLevelClick('intermediate')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.55)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            opacity: 0.85
                        }}
                    >
                        <span className="btn-main-text" style={{ color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🔒 Intermediate
                        </span>
                        <span className="btn-sub-text" style={{ color: '#666' }}>
                            మధ్యస్థ స్థాయి
                        </span>
                    </button>

                    {/* Advanced Option (Locked) */}
                    <button
                        className="action-btn"
                        onClick={() => handleLockedLevelClick('advanced')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.55)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            opacity: 0.85
                        }}
                    >
                        <span className="btn-main-text" style={{ color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🔒 Advanced
                        </span>
                        <span className="btn-sub-text" style={{ color: '#666' }}>
                            ఉన్నత స్థాయి
                        </span>
                    </button>
                </div>
            </div>

            {/* Testament Selection Modal for Beginner Mode */}
            {showTestamentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'linear-gradient(180deg, #ffffff 0%, #f4f6fb 100%)',
                        padding: '30px 20px',
                        borderRadius: '24px',
                        width: '88%',
                        maxWidth: '360px',
                        textAlign: 'center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        position: 'relative',
                        border: '1px solid rgba(255, 255, 255, 0.8)'
                    }}>
                        {/* Close button */}
                        <button
                            onClick={() => setShowTestamentModal(false)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'rgba(0,0,0,0.05)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                fontSize: '16px',
                                color: '#666',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>

                        <div style={{ fontSize: '36px', marginBottom: '10px' }}>📖</div>
                        <h2 style={{ color: '#1a237e', margin: '0 0 5px 0', fontSize: '22px', fontWeight: 'bold' }}>
                            Select Testament
                        </h2>
                        <p style={{ color: '#666', margin: '0 0 25px 0', fontSize: '14px' }}>
                            నిబంధనను ఎంచుకోండి
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button
                                className="action-btn"
                                onClick={() => {
                                    setShowTestamentModal(false);
                                    navigate('/ot');
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #d4b483 0%, #b08d55 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '14px 20px',
                                    borderRadius: '16px',
                                    boxShadow: '0 6px 15px rgba(176, 141, 85, 0.35)'
                                }}
                            >
                                <span className="btn-main-text" style={{ color: '#fff', fontSize: '20px' }}>
                                    పాత నిబంధన
                                </span>
                                <span className="btn-sub-text" style={{ color: '#f0f0f0', fontSize: '13px' }}>
                                    Old Testament (39 Books)
                                </span>
                            </button>

                            <button
                                className="action-btn"
                                onClick={() => {
                                    setShowTestamentModal(false);
                                    navigate('/nt');
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '14px 20px',
                                    borderRadius: '16px',
                                    boxShadow: '0 6px 15px rgba(102, 126, 234, 0.35)'
                                }}
                            >
                                <span className="btn-main-text" style={{ color: '#fff', fontSize: '20px' }}>
                                    కొత్త నిబంధన
                                </span>
                                <span className="btn-sub-text" style={{ color: '#f0f0f0', fontSize: '13px' }}>
                                    New Testament (27 Books)
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Level Locked Alert Modal */}
            <ConfirmModal
                isOpen={showLockedModal}
                title="Level Locked"
                message={lockedMessage}
                onConfirm={() => setShowLockedModal(false)}
                confirmText="OK"
                showCancel={false}
                icon="🔒"
            />

            <ConfirmModal
                isOpen={showResetModal}
                title="Reset Data"
                message="Are you sure you want to RESET all progress? This cannot be undone."
                onConfirm={handleResetConfirm}
                onCancel={() => setShowResetModal(false)}
                confirmText="Yes, Reset"
                isDanger={true}
            />

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Account"
                message="Are you sure you want to DELETE your account? All data will be permanently lost."
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteModal(false)}
                confirmText="Delete Forever"
                isDanger={true}
            />
        </div>
    );
};

export default Home;
