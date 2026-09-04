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
                zIndex: 10
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
                    cursor: 'pointer'
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
                    cursor: nameLocked ? 'default' : 'pointer'
                }}>
                    {userName}
                </div>

                {/* Lives & Timer */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '0' }}>
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
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.4)'
                    }}>
                        <span style={{ fontSize: '20px' }}>🛒</span>
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
                                color: '#999',
                                cursor: 'pointer',
                                padding: '5px'
                            }}
                        >
                            ✕
                        </button>

                        <h2 style={{ color: 'black', margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>Edit Profile</h2>

                        <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'center' }}>
                            <label style={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    style={{ display: 'none' }}
                                />
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    border: '4px solid #fff',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                                    overflow: 'hidden',
                                    background: '#eee',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    {editPhoto ? (
                                        <img src={editPhoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '30px', color: '#aaa' }}>📷</span>
                                    )}
                                </div>
                            </label>
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
                    <button className="action-btn" onClick={() => navigate('/ot')}>
                        <span className="btn-main-text">పాత నిబంధన</span>
                        <span className="btn-eng-text">Old Testament</span>
                    </button>
                    <button className="action-btn" onClick={() => navigate('/nt')}>
                        <span className="btn-main-text">కొత్త నిబంధన</span>
                        <span className="btn-eng-text">New Testament</span>
                    </button>
                    <button className="action-btn" onClick={() => navigate('/statistics')}>
                        <span className="btn-main-text">గణాంకాలు</span>
                        <span className="btn-eng-text">Statistics</span>
                    </button>
                </div>

                {/* Login Prompt for Guests */}
                {!isLoggedIn && (
                    <button
                        onClick={() => navigate('/auth')}
                        style={{
                            marginTop: '25px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            color: 'white',
                            padding: '15px 30px',
                            borderRadius: '50px',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            animation: 'float 3s ease-in-out infinite'
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <span>☁️</span> To store the data login now
                    </button>
                )}
            </div>

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
