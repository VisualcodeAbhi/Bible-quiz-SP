import React from 'react';
import { openPlayStore, dismissUpdatePrompt } from '../services/appUpdateService';

const UpdateModal = ({ updateData, onClose }) => {
    if (!updateData || !updateData.updateAvailable) return null;

    const { latestVersion, isForced, notes, url } = updateData;

    const handleRemindLater = () => {
        dismissUpdatePrompt(latestVersion);
        if (onClose) onClose();
    };

    return (
        <div 
            onClick={(e) => {
                if (!isForced && e.target === e.currentTarget) {
                    handleRemindLater();
                }
            }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 5, 20, 0.85)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '20px',
                boxSizing: 'border-box'
            }}
        >
            <div style={{
                background: 'linear-gradient(145deg, #131d36, #0a1022)',
                border: '1px solid rgba(255, 215, 0, 0.35)',
                borderRadius: '24px',
                padding: '28px 22px',
                maxWidth: '380px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 215, 0, 0.15)',
                color: '#ffffff',
                position: 'relative',
                animation: 'fadeInScale 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                {/* Rocket Icon / Play Store Badge */}
                <div style={{
                    width: '72px',
                    height: '72px',
                    margin: '0 auto 14px auto',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ffb703, #fb8500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(251, 133, 0, 0.45)',
                    fontSize: '34px'
                }}>
                    🚀
                </div>

                <h2 style={{
                    margin: '0 0 4px 0',
                    fontSize: '20px',
                    fontWeight: '800',
                    background: 'linear-gradient(90deg, #ffd700, #ffb703)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.3px'
                }}>
                    కొత్త అప్‌డేట్ వచ్చింది!
                </h2>
                <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#94a3b8',
                    marginBottom: '10px'
                }}>
                    New Update Available!
                </div>

                <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(255, 215, 0, 0.15)',
                    color: '#ffd700',
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '14px',
                    border: '1px solid rgba(255, 215, 0, 0.3)'
                }}>
                    Version {latestVersion} is live on Google Play
                </div>

                <p style={{
                    fontSize: '13px',
                    color: '#cbd5e1',
                    lineHeight: '1.5',
                    margin: '0 0 20px 0'
                }}>
                    మెరుగైన అనుభవం మరియు కొత్త ఫీచర్ల కోసం దయచేసి యాప్‌ను అప్‌డేట్ చేయండి.
                </p>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={() => openPlayStore(url)}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #06d6a0, #048a66)',
                            border: 'none',
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: '15px',
                            cursor: 'pointer',
                            boxShadow: '0 6px 20px rgba(6, 214, 160, 0.35)',
                            transition: 'transform 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <span>ఇప్పుడే అప్‌డేట్ చేయండి (Update Now)</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
                        </svg>
                    </button>

                    {!isForced && (
                        <button
                            onClick={handleRemindLater}
                            style={{
                                width: '100%',
                                padding: '11px',
                                borderRadius: '14px',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#94a3b8',
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            తర్వాత చేస్తాను (Remind Me Later)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdateModal;
