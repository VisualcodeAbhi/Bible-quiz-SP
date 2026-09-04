import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import bookAnimation from '../assets/data/book_loader.json';

const SplashAnimation = ({ onComplete }) => {
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // Animation plays smoothly for 2.4 seconds, then initiates gentle fade-out
        const timer = setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
                onComplete();
            }, 450);
        }, 2200);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(ellipse at center, #1b214f 0%, #0c0f24 70%, #060814 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            opacity: isFadingOut ? 0 : 1,
            transition: 'opacity 0.45s ease-out',
            pointerEvents: 'none',
            overflow: 'hidden'
        }}>
            {/* Ambient Divine Glow */}
            <div style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 215, 0, 0.22) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%)',
                filter: 'blur(35px)',
                animation: 'pulseGlow 2.5s infinite alternate ease-in-out'
            }} />

            {/* Book Lottie Animation */}
            <div style={{
                position: 'relative',
                width: '210px',
                height: '210px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                filter: 'drop-shadow(0 10px 25px rgba(255, 215, 0, 0.35))'
            }}>
                <Lottie
                    animationData={bookAnimation}
                    loop={true}
                    autoplay={true}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            {/* App Branding & Verse */}
            <div style={{
                marginTop: '18px',
                textAlign: 'center',
                position: 'relative',
                zIndex: 2,
                padding: '0 20px'
            }}>
                <h1 style={{
                    margin: '0 0 10px 0',
                    fontSize: '30px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #FFF9D2 0%, #FFD700 50%, #FFA500 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '1px',
                    textShadow: '0 2px 14px rgba(255, 215, 0, 0.45)',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    తెలుగు బైబిల్ క్విజ్
                </h1>
                
                <p style={{
                    margin: '0 0 16px 0',
                    marginTop: '20px',
                    fontSize: '13px',
                    color: '#94a3b8',
                    letterSpacing: '2.5px',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                }}>
                    Telugu Bible Quiz
                </p>
            </div>

            {/* Bottom Loading Indicator */}
            <div style={{
                position: 'absolute',
                bottom: 'calc(35px + env(safe-area-inset-bottom, 0px))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
            }}>
                <div style={{
                    width: '120px',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, #6366f1, #ffd700, #38ef7d)',
                        borderRadius: '4px',
                        animation: 'loadingProgress 1.8s ease-in-out infinite'
                    }} />
                </div>
                <span style={{
                    fontSize: '11px',
                    color: '#64748b',
                    letterSpacing: '1px',
                    fontWeight: '500'
                }}>
                    Loading...
                </span>
            </div>

            <style>{`
                @keyframes pulseGlow {
                    0% { transform: scale(0.9); opacity: 0.6; }
                    100% { transform: scale(1.15); opacity: 1; }
                }
                @keyframes loadingProgress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default SplashAnimation;
