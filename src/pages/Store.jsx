import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import ConfirmModal from '../components/ConfirmModal';
import { AdMobService } from '../services/admob';
import { Toast } from '@capacitor/toast';
// import { supabase } from '../lib/supabaseClient'; // Not needed for ads

const Store = () => {
    const navigate = useNavigate();
    const { addHints, addLife, activateInfiniteLives } = useGame();

    // Modal State unused now
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        confirmText: "Confirm"
    });
    const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

    const [loadingAd, setLoadingAd] = React.useState(null); // 'life', 'hint', 'infinite', 'bulk-hints'

    // Ad Progress State
    const [progress30, setProgress30] = useState(0); // 30 Mins (5 Ads)
    const [progress60, setProgress60] = useState(0); // 60 Mins (10 Ads)
    const [adsWatchedHints, setAdsWatchedHints] = useState(0);

    // Single Ad Watcher
    const handleWatchSingle = async (type) => {
        setLoadingAd(type);
        const success = await AdMobService.showRewardVideo();
        setLoadingAd(null);

        if (success) {
            if (type === 'life') {
                addLife();
                await Toast.show({ text: 'Reward: 1 Life Added!', duration: 'short' });
            } else {
                addHints(1);
                await Toast.show({ text: 'Reward: 1 Hint Added!', duration: 'short' });
            }
        } else {
            await Toast.show({ text: 'Ad failed or closed early.', duration: 'short' });
        }
    };

    // Chain Ad Watcher
    const handleWatchChain = async (target) => {
        setLoadingAd(target);

        // Determine current progress for Toast
        let currentCount = 0;
        let targetCount = 5;
        if (target === 'infinite-30') { currentCount = progress30; targetCount = 5; }
        if (target === 'infinite-60') { currentCount = progress60; targetCount = 10; }
        if (target === 'bulk-hints') { currentCount = adsWatchedHints; targetCount = 5; }

        await Toast.show({ text: `Loading Ad ${currentCount + 1}/${targetCount}...`, duration: 'short' });

        const success = await AdMobService.showRewardVideo();
        setLoadingAd(null);

        if (success) {
            if (target === 'infinite-30') {
                const newCount = progress30 + 1;
                if (newCount >= 5) {
                    activateInfiniteLives(30);
                    setProgress30(0);
                    setModalConfig({
                        isOpen: true,
                        title: "🎉 Congratulations!",
                        message: "You completed all 5 ads! 30 Minutes of Infinite Lives is now active. Enjoy playing without losing lives!",
                        confirmText: "Awesome!",
                        icon: "🎉",
                        showCancel: false,
                        onConfirm: closeModal
                    });
                } else {
                    setProgress30(newCount);
                    await Toast.show({ text: `Great! ${newCount}/5 Ads Watched.`, duration: 'short' });
                }
            } else if (target === 'infinite-60') {
                const newCount = progress60 + 1;
                if (newCount >= 10) {
                    activateInfiniteLives(60);
                    setProgress60(0);
                    setModalConfig({
                        isOpen: true,
                        title: "🎉 Congratulations!",
                        message: "You completed all 10 ads! 1 Hour of Infinite Lives is now active. Enjoy uninterrupted quiz time!",
                        confirmText: "Awesome!",
                        icon: "🎉",
                        showCancel: false,
                        onConfirm: closeModal
                    });
                } else {
                    setProgress60(newCount);
                    await Toast.show({ text: `Great! ${newCount}/10 Ads Watched.`, duration: 'short' });
                }
            } else if (target === 'bulk-hints') {
                const newCount = adsWatchedHints + 1;
                if (newCount >= 5) {
                    addHints(6);
                    setAdsWatchedHints(0);
                    setModalConfig({
                        isOpen: true,
                        title: "🎉 Congratulations!",
                        message: "You completed all 5 ads! 6 Bonus Hints have been added to your account.",
                        confirmText: "Awesome!",
                        icon: "💡",
                        showCancel: false,
                        onConfirm: closeModal
                    });
                } else {
                    setAdsWatchedHints(newCount);
                    await Toast.show({ text: `Great! ${newCount}/5 Ads Watched.`, duration: 'short' });
                }
            }
        } else {
            await Toast.show({ text: 'Ad failed. Progress saved.', duration: 'short' });
        }
    };

    return (
        <div className="books-bg-wrapper">
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <div className="container" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
                <header style={{ marginTop: "-10px", width: '90%', maxWidth: '400px', display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <div className="menu-icon" onClick={() => navigate(-1)} style={{ fontSize: '30px', cursor: 'pointer' }}>&#8592;</div>
                    <h1 style={{ flex: 1, margin: 0, textAlign: 'center' }}>Store</h1>
                    <div style={{ width: '30px' }}></div>
                </header>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    width: '100%',
                    maxWidth: '400px'
                }}>
                    {/* Watch Ad -> 1 Life */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(10px)',
                        padding: '15px 20px',
                        borderRadius: '20px',
                        width: '90%',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ textAlign: 'left' }}>
                            <h3 style={{ color: 'white', margin: 0 }}>Get 1 Life</h3>
                            <span style={{ color: '#aaa', fontSize: '12px' }}>Watch 1 Ad</span>
                        </div>
                        <button
                            onClick={() => handleWatchSingle('life')}
                            disabled={loadingAd === 'life'}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '10px',
                                background: loadingAd === 'life' ? '#666' : '#2196F3',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                minWidth: '80px',
                                display: 'flex', justifyContent: 'center'
                            }}
                        >
                            {loadingAd === 'life' ? '...' : 'Watch'}
                        </button>
                    </div>

                    {/* Watch Ad -> 1 Hint */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(10px)',
                        padding: '15px 20px',
                        borderRadius: '20px',
                        width: '90%',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ textAlign: 'left' }}>
                            <h3 style={{ color: 'white', margin: 0 }}>Get 1 Hint</h3>
                            <span style={{ color: '#aaa', fontSize: '12px' }}>Watch 1 Ad</span>
                        </div>
                        <button
                            onClick={() => handleWatchSingle('hint')}
                            disabled={loadingAd === 'hint'}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '10px',
                                background: loadingAd === 'hint' ? '#666' : '#9C27B0',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                minWidth: '80px',
                                display: 'flex', justifyContent: 'center'
                            }}
                        >
                            {loadingAd === 'hint' ? '...' : 'Watch'}
                        </button>
                    </div>

                    {/* 30 Mins Infinite Lives (5 ADS) */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        padding: '25px',
                        borderRadius: '20px',
                        width: '90%',
                        textAlign: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                    }}>
                        <div style={{ fontSize: '50px', marginBottom: '10px' }}>⏳❤️</div>
                        <h2 style={{ color: 'white', margin: '10px 0', fontSize: '24px' }}>30 Mins Infinite Lives</h2>
                        <p style={{ color: '#eee', marginBottom: '15px', fontSize: '14px' }}>
                            Watch 5 Ads to unlock!
                        </p>

                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '10px', height: '10px', width: '100%', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(progress30 / 5) * 100}%`,
                                    height: '100%',
                                    background: '#FFD700',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <p style={{ marginTop: '5px', fontSize: '12px' }}>{progress30}/5 Ads Watched</p>
                        </div>

                        <button
                            onClick={() => handleWatchChain('infinite-30')}
                            disabled={loadingAd === 'infinite-30'}
                            style={{
                                width: '100%',
                                padding: '15px',
                                border: 'none',
                                borderRadius: '12px',
                                background: loadingAd === 'infinite-30' ? '#666' : 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                                color: '#333',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                            }}
                        >
                            {loadingAd === 'infinite-30' ? 'Loading Ad...' : 'Watch Ad to Progress'}
                        </button>
                    </div>

                    {/* 1 Hour Infinite Lives (10 ADS) */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        padding: '25px',
                        borderRadius: '20px',
                        width: '90%',
                        textAlign: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                    }}>
                        <div style={{ fontSize: '50px', marginBottom: '10px' }}>♾️❤️</div>
                        <h2 style={{ color: 'white', margin: '10px 0', fontSize: '24px' }}>1 Hour Infinite Lives</h2>
                        <p style={{ color: '#eee', marginBottom: '15px', fontSize: '14px' }}>
                            Watch 10 Ads to unlock!
                        </p>

                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '10px', height: '10px', width: '100%', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(progress60 / 10) * 100}%`,
                                    height: '100%',
                                    background: '#00bcd4',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <p style={{ marginTop: '5px', fontSize: '12px' }}>{progress60}/10 Ads Watched</p>
                        </div>

                        <button
                            onClick={() => handleWatchChain('infinite-60')}
                            disabled={loadingAd === 'infinite-60'}
                            style={{
                                width: '100%',
                                padding: '15px',
                                border: 'none',
                                borderRadius: '12px',
                                background: loadingAd === 'infinite-60' ? '#666' : 'linear-gradient(135deg, #00bcd4 0%, #2196F3 100%)',
                                color: 'white',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(0, 188, 212, 0.3)',
                            }}
                        >
                            {loadingAd === 'infinite-60' ? 'Loading Ad...' : 'Watch Ad to Progress'}
                        </button>
                    </div>

                    {/* 6 Hints Product Card (5 ADS) */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        padding: '25px',
                        borderRadius: '20px',
                        width: '90%',
                        textAlign: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                    }}>
                        <div style={{ fontSize: '50px', marginBottom: '10px' }}>💡</div>
                        <h2 style={{ color: 'white', margin: '10px 0', fontSize: '24px' }}>6 Hints</h2>
                        <p style={{ color: '#eee', marginBottom: '15px', fontSize: '14px' }}>
                            Watch 5 Ads to unlock!
                        </p>

                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '10px', height: '10px', width: '100%', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(adsWatchedHints / 5) * 100}%`,
                                    height: '100%',
                                    background: '#4CAF50',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <p style={{ marginTop: '5px', fontSize: '12px' }}>{adsWatchedHints}/5 Ads Watched</p>
                        </div>

                        <button
                            onClick={() => handleWatchChain('bulk-hints')}
                            disabled={loadingAd === 'bulk-hints'}
                            style={{
                                width: '100%',
                                padding: '15px',
                                border: 'none',
                                borderRadius: '12px',
                                background: loadingAd === 'bulk-hints' ? '#666' : 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
                                color: 'white',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                            }}
                        >
                            {loadingAd === 'bulk-hints' ? 'Loading Ad...' : 'Watch Ad to Progress'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={closeModal}
                confirmText={modalConfig.confirmText}
                showCancel={modalConfig.showCancel !== undefined ? modalConfig.showCancel : true}
                icon={modalConfig.icon}
            />
        </div>
    );
};

export default Store;
