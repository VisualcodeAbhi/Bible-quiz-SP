import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import ConfirmModal from '../components/ConfirmModal';
import UserAvatar from '../components/UserAvatar';
import { compressAvatar } from '../lib/imageCompressor';
import { bookNameMap } from '../bookNames';
import { soundService } from '../services/soundService';

import { App } from '@capacitor/app';
import { Toast } from '@capacitor/toast';
import appSettings from '../assets/data/appSettings.json';

// Global variable removed
// let hasShownSplash = false;

const Home = () => {
    const navigate = useNavigate();
    const { 
        lives, 
        maxLives, 
        nextRestoreTime, 
        userName, 
        userPhoto, 
        updateProfile, 
        nameLocked, 
        infiniteLivesUntil, 
        isLoggedIn, 
        resetProgress, 
        totallyResetGame, 
        session,
        streak,
        isStreakFrozen,
        streakStatus,
        bookmarks,
        toggleBookmark,
        soundEnabled,
        toggleSound,
        vibrateEnabled,
        toggleVibrate
    } = useGame();

    // Edit Modal States
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingPhoto, setIsEditingPhoto] = useState(false);

    // Bookmarks & Streak Modals
    const [showBookmarksModal, setShowBookmarksModal] = useState(false);
    const [revealedBookmarkAnswers, setRevealedBookmarkAnswers] = useState({});
    const [showStreakModal, setShowStreakModal] = useState(false);

    // Reset Modal State
    const [showResetModal, setShowResetModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    const [isEditingNameInline, setIsEditingNameInline] = React.useState(false);
    const [isPhotoSaving, setIsPhotoSaving] = React.useState(false);
    const [photoSaved, setPhotoSaved] = React.useState(false);

    const handleSaveInlineName = async () => {
        if (editName && editName.trim()) {
            await updateProfile(editName.trim().slice(0, 13), null);
        }
        setIsEditingNameInline(false);
    };

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

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoSaved(false);
            try {
                const compressed = await compressAvatar(file, 160, 0.75);
                if (compressed) {
                    setEditPhoto(compressed);
                }
            } catch (err) {
                console.error("Error compressing photo:", err);
            }
        }
    };

    const saveName = async () => {
        if (editName && editName.trim()) {
            await updateProfile(editName.trim().slice(0, 13), null);
        }
        setIsEditingName(false);
    };

    const savePhoto = async () => {
        if (!editPhoto || isPhotoSaving) return;
        setIsPhotoSaving(true);
        try {
            await updateProfile(null, editPhoto);
            setPhotoSaved(true);
        } catch (err) {
            console.error("Error saving photo:", err);
        } finally {
            setIsPhotoSaving(false);
        }
    };

    const openNameEdit = () => {
        setEditName(userName);
        setIsEditingName(true);
    };

    const openPhotoEdit = () => {
        setEditPhoto(userPhoto);
        setEditName(userName || '');
        setPhotoSaved(false);
        setIsPhotoSaving(false);
        setIsEditingNameInline(false);
        setIsEditingPhoto(true);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsEditingPhoto(false);
        setIsEditingNameInline(false);

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
    const [selectedDifficulty, setSelectedDifficulty] = React.useState('beginner');
    const [showTestamentModal, setShowTestamentModal] = React.useState(false);
    const [showLockedModal, setShowLockedModal] = React.useState(false);
    const [lockedMessage, setLockedMessage] = React.useState("");

    const intermediateEnabled = Boolean(appSettings?.intermediateEnabled);
    const advancedEnabled = Boolean(appSettings?.advancedEnabled);

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
        } catch (e) {
            setShowLockedModal(true);
        }
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
                <div onClick={openPhotoEdit} style={{ margin: '0 20px', cursor: 'pointer', pointerEvents: 'auto' }}>
                    <UserAvatar
                        src={userPhoto}
                        name={userName || 'User'}
                        size={60}
                        fontSize="24px"
                        border="2px solid white"
                        style={{ boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}
                    />
                </div>

                {/* User Name Badge & Streak (Click to edit NAME - if unlocked) */}
                <div style={{
                    position: 'absolute',
                    top: '46px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    pointerEvents: 'auto'
                }}>
                    <div onClick={openNameEdit} style={{
                        background: 'white',
                        color: 'black',
                        padding: '6px 18px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        border: '2px solid #00bcd4',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        cursor: nameLocked ? 'default' : 'pointer',
                        pointerEvents: nameLocked ? 'none' : 'auto',
                        fontSize: '14px',
                        whiteSpace: 'nowrap'
                    }}>
                        {userName}
                    </div>

                    {/* Streak Badge Pill */}
                    <div 
                        onClick={() => {
                            soundService.playClick();
                            setShowStreakModal(true);
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: isStreakFrozen 
                                ? 'linear-gradient(135deg, #0284c7, #38bdf8)' 
                                : 'linear-gradient(135deg, rgba(255, 152, 0, 0.95), rgba(244, 67, 54, 0.95))',
                            color: 'white',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            boxShadow: isStreakFrozen 
                                ? '0 0 10px rgba(56, 189, 248, 0.6)' 
                                : '0 2px 6px rgba(244, 67, 54, 0.4)',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease'
                        }}
                        title={isStreakFrozen ? "Streak is Frozen! Play today to save it!" : "Daily Streak Info"}
                    >
                        <span>{isStreakFrozen ? '🧊' : '🔥'}</span>
                        <span>{streak} {streak === 1 ? 'Day' : 'Days'}{isStreakFrozen ? ' (Frozen)' : ''}</span>
                    </div>
                </div>

                {/* Right Side: Lives, Timer, Store, Statistics, Leaderboard & Bookmarks */}
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
                    <div onClick={() => { soundService.playClick(); navigate('/store'); }} style={{
                        marginTop: '8px',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(5px)',
                        borderRadius: '50%',
                        width: '38px',
                        height: '38px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        pointerEvents: 'auto'
                    }} title="Store">
                        <span style={{ fontSize: '18px' }}>🛒</span>
                    </div>

                    {/* Statistics Icon */}
                    <div onClick={() => { soundService.playClick(); navigate('/statistics'); }} style={{
                        marginTop: '8px',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(5px)',
                        borderRadius: '50%',
                        width: '38px',
                        height: '38px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        pointerEvents: 'auto'
                    }} title="My Statistics">
                        <span style={{ fontSize: '18px' }}>📊</span>
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
                            maxLength={13}
                            style={{ width: '100%', padding: '10px', marginBottom: '20px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => setIsEditingName(false)} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '5px' }}>Cancel</button>
                            <button onClick={saveName} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Profile & Settings Modal */}
            {isEditingPhoto && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 10000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '15px'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '24px 20px',
                        borderRadius: '16px',
                        width: '92%',
                        maxWidth: '350px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        textAlign: 'center',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                        position: 'relative'
                    }}>
                        {/* Close / Cancel Button "X" */}
                        <button
                            onClick={() => {
                                setEditPhoto(userPhoto);
                                setPhotoSaved(false);
                                setIsPhotoSaving(false);
                                setIsEditingNameInline(false);
                                setIsEditingPhoto(false);
                            }}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                background: '#f0f0f0',
                                border: 'none',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                fontSize: '16px',
                                cursor: 'pointer',
                                color: '#555',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold'
                            }}
                            title="Cancel / Close"
                        >
                            ✕
                        </button>

                        <h2 style={{ color: '#1a1a1a', margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700' }}>
                            Profile & Settings
                        </h2>

                        {/* Top Profile Summary: Photo on Left, Name with Pencil & Streak on Right */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            marginBottom: editPhoto !== userPhoto ? '12px' : '20px',
                            padding: '0 6px'
                        }}>
                            {/* Left: Avatar with Camera Badge & Tap Hint */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                <label
                                    htmlFor="profile-photo-input"
                                    style={{
                                        position: 'relative',
                                        display: 'inline-block',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }}
                                >
                                    <input
                                        id="profile-photo-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        width: '105px',
                                        height: '105px',
                                        borderRadius: '50%',
                                        background: '#f5f7fa',
                                        overflow: 'hidden',
                                        border: '3px solid #00bcd4',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        position: 'relative'
                                    }}>
                                        {editPhoto ? (
                                            <img src={editPhoto} alt="Profile Preview" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ color: '#888', fontSize: '36px' }}>📷</span>
                                        )}
                                    </div>
                                    {/* Camera Badge Icon on bottom-right */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '2px',
                                        right: '2px',
                                        background: '#2196F3',
                                        color: 'white',
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                        border: '2px solid white'
                                    }}>
                                        📷
                                    </div>
                                </label>
                                <div style={{ fontSize: '11px', color: '#777', marginTop: '6px' }}>
                                    Tap photo to choose new
                                </div>
                            </div>

                            {/* Right: Name (Editable with Pencil) & Streak */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                                flex: 1,
                                minWidth: 0,
                                paddingLeft: '6px'
                            }}>
                                {/* Name + Pencil Button */}
                                {isEditingNameInline ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveInlineName();
                                                if (e.key === 'Escape') setIsEditingNameInline(false);
                                            }}
                                            placeholder="Enter Name"
                                            maxLength={13}
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '6px 8px',
                                                fontSize: '15px',
                                                borderRadius: '6px',
                                                border: '2px solid #00bcd4',
                                                outline: 'none',
                                                color: '#1a1a1a',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveInlineName}
                                            style={{
                                                background: '#4CAF50',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 8px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: 'bold',
                                                flexShrink: 0
                                            }}
                                            title="Save"
                                        >
                                            ✓
                                        </button>
                                        <button
                                            onClick={() => setIsEditingNameInline(false)}
                                            style={{
                                                background: '#e0e0e0',
                                                color: '#333',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 8px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                flexShrink: 0
                                            }}
                                            title="Cancel"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => {
                                            setEditName(userName || '');
                                            setIsEditingNameInline(true);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            maxWidth: '100%'
                                        }}
                                        title="Tap to edit name"
                                    >
                                        <span style={{
                                            fontSize: '20px',
                                            fontWeight: '700',
                                            color: '#1a1a1a',
                                            lineHeight: 1.2,
                                            wordBreak: 'break-word',
                                            textAlign: 'left'
                                        }}>
                                            {userName || 'User'}
                                        </span>
                                        <span style={{
                                            fontSize: '16px',
                                            color: '#666',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            ✏️
                                        </span>
                                    </div>
                                )}

                                {/* Streak Display: Flame + Streak Number */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginTop: '12px'
                                }}>
                                    <span style={{ fontSize: '32px', lineHeight: 1 }}>{isStreakFrozen ? '🧊' : '🔥'}</span>
                                    <span style={{ fontSize: '26px', fontWeight: '800', color: isStreakFrozen ? '#0284c7' : '#1a1a1a', lineHeight: 1 }}>
                                        {streak || 0}
                                    </span>
                                    {isStreakFrozen && (
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            color: '#0284c7',
                                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                            padding: '2px 8px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(56, 189, 248, 0.3)'
                                        }}>
                                            Frozen (Play today to save!)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Save Photo Button (Shown when user has selected a new photo or just saved) */}
                        {(photoSaved || (editPhoto && editPhoto !== userPhoto)) && (
                            <button
                                onClick={photoSaved || isPhotoSaving ? undefined : savePhoto}
                                disabled={isPhotoSaving || photoSaved}
                                style={{
                                    width: '100%',
                                    padding: '11px',
                                    background: photoSaved 
                                        ? 'linear-gradient(135deg, #10b981, #059669)'
                                        : isPhotoSaving 
                                        ? '#94a3b8' 
                                        : 'linear-gradient(135deg, #11998e, #38ef7d)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: 'bold',
                                    marginBottom: '16px',
                                    cursor: photoSaved ? 'default' : (isPhotoSaving ? 'wait' : 'pointer'),
                                    boxShadow: photoSaved 
                                        ? '0 4px 12px rgba(16, 185, 129, 0.4)'
                                        : '0 4px 12px rgba(56, 239, 125, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {isPhotoSaving ? (
                                    <span>⏳ Saving...</span>
                                ) : photoSaved ? (
                                    <span>✓ Saved</span>
                                ) : (
                                    <span>💾 Save New Photo</span>
                                )}
                            </button>
                        )}

                        {/* Sound & Vibration Controls Section */}
                        <div style={{
                            background: '#f8f9fa',
                            borderRadius: '12px',
                            padding: '12px',
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            border: '1px solid #e9ecef',
                            textAlign: 'left'
                        }}>
                            {/* Sound Control */}
                            <div
                                onClick={() => {
                                    toggleSound();
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    background: soundEnabled ? 'rgba(76, 175, 80, 0.08)' : 'white',
                                    border: soundEnabled ? '1.5px solid #4CAF50' : '1px solid #ddd',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '22px' }}>{soundEnabled ? '🔊' : '🔇'}</span>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#222' }}>Sound Effects</div>
                                        <div style={{ fontSize: '11px', color: soundEnabled ? '#2e7d32' : '#888' }}>
                                            {soundEnabled ? 'Audio ON' : 'Muted'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    width: '42px',
                                    height: '24px',
                                    background: soundEnabled ? '#4CAF50' : '#ccc',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    transition: 'background 0.2s ease'
                                }}>
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        position: 'absolute',
                                        top: '3px',
                                        left: soundEnabled ? '21px' : '3px',
                                        transition: 'left 0.2s ease',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                    }} />
                                </div>
                            </div>

                            {/* Vibration Control */}
                            <div
                                onClick={() => {
                                    toggleVibrate();
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    background: vibrateEnabled ? 'rgba(33, 150, 243, 0.08)' : 'white',
                                    border: vibrateEnabled ? '1.5px solid #2196F3' : '1px solid #ddd',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '22px' }}>{vibrateEnabled ? '📳' : '📴'}</span>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#222' }}>Haptic Vibration</div>
                                        <div style={{ fontSize: '11px', color: vibrateEnabled ? '#1976d2' : '#888' }}>
                                            {vibrateEnabled ? 'Vibration ON' : 'Vibration OFF'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    width: '42px',
                                    height: '24px',
                                    background: vibrateEnabled ? '#2196F3' : '#ccc',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    transition: 'background 0.2s ease'
                                }}>
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        position: 'absolute',
                                        top: '3px',
                                        left: vibrateEnabled ? '21px' : '3px',
                                        transition: 'left 0.2s ease',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* User Email & Reset Data */}
                        {isLoggedIn ? (
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

                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: '#f44336',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Logout
                                    </button>
                                    <button
                                        onClick={() => setShowResetModal(true)}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: '#ff9800',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Reset Data
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#d32f2f', // Red
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        marginTop: '10px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete Account
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Reset / Sign Out
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="container" style={{ animation: 'fadeIn 1s ease-in', paddingTop: '100px' /* Push content down due to header */ }}>
                <img src="/images/Logo1.png" alt="Telugu Bible Quiz Logo" className="logo" />
                <h1>Telugu<br/>Bible Quiz</h1>
                <div className="btn-group">
                    {/* Beginner Option */}
                    <button
                        className="action-btn"
                        onClick={() => {
                            setSelectedDifficulty('beginner');
                            setShowTestamentModal(true);
                        }}
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
                            border: '2px solid #38ef7d',
                            boxShadow: '0 6px 16px rgba(56, 239, 125, 0.25)'
                        }}
                    >
                        <span className="btn-main-text" style={{ color: '#11998e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🌱 Beginner
                        </span>
                    </button>

                    {/* Intermediate Option (Controlled by appSettings.json) */}
                    <button
                        className="action-btn"
                        onClick={() => {
                            if (intermediateEnabled) {
                                setSelectedDifficulty('intermediate');
                                setShowTestamentModal(true);
                            } else {
                                handleLockedLevelClick('intermediate');
                            }
                        }}
                        style={intermediateEnabled ? {
                            background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
                            border: '2px solid #f59e0b',
                            boxShadow: '0 6px 16px rgba(245, 158, 11, 0.25)'
                        } : {
                            background: 'rgba(255, 255, 255, 0.55)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            opacity: 0.85
                        }}
                    >
                        <span className="btn-main-text" style={{ color: intermediateEnabled ? '#d97706' : '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {intermediateEnabled ? '⚡' : '🔒'} Intermediate
                        </span>
                    </button>

                    {/* Advanced Option (Controlled by appSettings.json) */}
                    <button
                        className="action-btn"
                        onClick={() => {
                            if (advancedEnabled) {
                                setSelectedDifficulty('advanced');
                                setShowTestamentModal(true);
                            } else {
                                handleLockedLevelClick('advanced');
                            }
                        }}
                        style={advancedEnabled ? {
                            background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
                            border: '2px solid #ef4444',
                            boxShadow: '0 6px 16px rgba(239, 68, 68, 0.25)'
                        } : {
                            background: 'rgba(255, 255, 255, 0.55)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            opacity: 0.85
                        }}
                    >
                        <span className="btn-main-text" style={{ color: advancedEnabled ? '#dc2626' : '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {advancedEnabled ? '🔥' : '🔒'} Advanced
                        </span>
                    </button>
                </div>

                {/* Secondary Quick Action Cards: Leaderboard & Bookmarks */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    width: '100%',
                    maxWidth: '360px',
                    marginTop: '16px'
                }}>
                    {/* Leaderboard Card */}
                    <div 
                        onClick={() => {
                            soundService.playClick();
                            navigate('/statistics', { state: { tab: 'leaderboard' } });
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.18)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 215, 0, 0.45)',
                            borderRadius: '16px',
                            padding: '12px 10px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                            transition: 'transform 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>🏆</span>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>Leaderboard</span>
                        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px' }}>Global Ranks</span>
                    </div>

                    {/* Saved Questions (Bookmarks) Card */}
                    <div 
                        onClick={() => {
                            soundService.playClick();
                            setShowBookmarksModal(true);
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.18)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.35)',
                            borderRadius: '16px',
                            padding: '12px 10px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                            transition: 'transform 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>⭐</span>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>Saved ({bookmarks.length})</span>
                        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px' }}>Review Questions</span>
                    </div>
                </div>
            </div>

            {/* Testament Selection Modal */}
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
                            Select Testament {selectedDifficulty !== 'beginner' && `(${selectedDifficulty.toUpperCase()})`}
                        </h2>
                        <p style={{ color: '#666', margin: '0 0 25px 0', fontSize: '14px' }}>
                            నిబంధనను ఎంచుకోండి
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button
                                className="action-btn"
                                onClick={() => {
                                    setShowTestamentModal(false);
                                    const path = selectedDifficulty === 'beginner' ? '/ot' : `/${selectedDifficulty}/ot`;
                                    navigate(path);
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
                                    const path = selectedDifficulty === 'beginner' ? '/nt' : `/${selectedDifficulty}/nt`;
                                    navigate(path);
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

            {/* Confirmation Modals */}

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

            {/* Bookmarks / Saved Difficult Questions Modal */}
            {showBookmarksModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                        color: 'white',
                        padding: '24px 20px',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '420px',
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        position: 'relative'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⭐</span> Saved Questions ({bookmarks.length})
                                </h2>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>కష్టమైన ప్రశ్నల సమాహారం</span>
                            </div>
                            <button
                                onClick={() => setShowBookmarksModal(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    color: '#cbd5e1',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* List */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                            {bookmarks.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
                                    <h3 style={{ color: '#f1f5f9', margin: '0 0 6px 0', fontSize: '16px' }}>No saved questions yet</h3>
                                    <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                                        During any quiz, tap the star (☆) button at the top-right of a question to save it here for quick review!
                                    </p>
                                </div>
                            ) : (
                                bookmarks.map((b, idx) => {
                                    const isRevealed = revealedBookmarkAnswers[idx];
                                    const correctOptionText = Array.isArray(b.options) && typeof b.correct === 'number'
                                        ? b.options[b.correct]
                                        : 'Answer saved';

                                    return (
                                        <div key={idx} style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '16px',
                                            padding: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    color: '#38ef7d',
                                                    background: 'rgba(56, 239, 125, 0.15)',
                                                    padding: '2px 8px',
                                                    borderRadius: '8px'
                                                }}>
                                                    {bookNameMap[b.bookName] || b.bookName || 'Bible'} • Ch {b.level || '1'}
                                                </span>

                                                <button
                                                    onClick={() => toggleBookmark(b)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#f87171',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        fontWeight: '600'
                                                    }}
                                                    title="Remove bookmark"
                                                >
                                                    🗑️ Remove
                                                </button>
                                            </div>

                                            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.4, color: '#f1f5f9', fontWeight: '500' }}>
                                                {b.question}
                                            </p>

                                            {/* Answer Reveal Toggle */}
                                            {isRevealed ? (
                                                <div style={{
                                                    background: 'rgba(56, 239, 125, 0.15)',
                                                    border: '1px solid rgba(56, 239, 125, 0.3)',
                                                    borderRadius: '10px',
                                                    padding: '8px 12px',
                                                    fontSize: '13px',
                                                    color: '#4ade80',
                                                    fontWeight: 'bold'
                                                }}>
                                                    ✓ సరైన సమాధానం: {correctOptionText}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        soundService.playClick();
                                                        setRevealedBookmarkAnswers(prev => ({ ...prev, [idx]: true }));
                                                    }}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.08)',
                                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                                        borderRadius: '8px',
                                                        color: '#93c5fd',
                                                        padding: '6px 10px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        alignSelf: 'flex-start'
                                                    }}
                                                >
                                                    👁️ Show Answer
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Streak Info Modal */}
            {showStreakModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                        color: 'white',
                        padding: '28px 24px',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '340px',
                        textAlign: 'center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255, 152, 0, 0.3)'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                            {isStreakFrozen ? '🧊' : (streak > 0 ? '🔥' : '🌱')}
                        </div>
                        <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '800' }}>
                            {isStreakFrozen ? `${streak} Day Streak Frozen!` : (streak > 0 ? `${streak} Day Streak!` : 'Start Your Streak!')}
                        </h2>
                        <p style={{ color: isStreakFrozen ? '#38bdf8' : '#fdba74', fontSize: '13px', fontWeight: '600', margin: '0 0 16px 0' }}>
                            {isStreakFrozen ? 'నిన్న ఆడలేదు - స్ట్రీక్ ఫ్రీజ్ అయ్యింది!' : (streak > 0 ? 'ప్రతిరోజూ బైబిల్ జ్ఞానాన్ని పెంచుకోండి' : 'ఈరోజే మీ డైలీ స్ట్రీక్ ప్రారంభించండి')}
                        </p>
                        <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                            {isStreakFrozen 
                                ? `You missed yesterday, but your ${streak}-day streak is protected today! Play at least one quiz chapter today to thaw and keep your streak burning before it collapses tomorrow!`
                                : (streak > 0 
                                    ? 'Play at least one quiz chapter every day to keep your streak burning and build a strong daily Bible reading habit!' 
                                    : 'Complete any quiz chapter today to ignite your streak and build an inspiring daily habit!')}
                        </p>
                        <button
                            onClick={() => {
                                soundService.playClick();
                                setShowStreakModal(false);
                            }}
                            style={{
                                background: isStreakFrozen
                                    ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                                    : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '14px',
                                padding: '12px 28px',
                                fontSize: '15px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                width: '100%',
                                boxShadow: isStreakFrozen 
                                    ? '0 4px 15px rgba(2, 132, 199, 0.4)' 
                                    : '0 4px 15px rgba(249, 115, 22, 0.4)'
                            }}
                        >
                            {isStreakFrozen ? 'Play Now to Save Streak!' : 'Keep Playing!'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
