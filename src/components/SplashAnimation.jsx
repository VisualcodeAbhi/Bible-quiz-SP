import React, { useEffect, useRef } from 'react';
import Lottie from 'lottie-react';
import animationData from '../assets/data/dxrsApLtZ3.json';

const SplashAnimation = ({ onComplete }) => {
    const lottieRef = useRef();

    useEffect(() => {
        // Fallback: If animation is stuck or undefined, finish after 3.5s
        const timer = setTimeout(() => {
            onComplete();
        }, 3500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#02ffb7ff', // Match App Theme
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
        }}>
            <div style={{ width: '90%', maxWidth: '500px' }}>
                <Lottie
                    lottieRef={lottieRef}
                    animationData={animationData}
                    loop={false}
                    onComplete={() => {
                        // Small delay before unmounting to ensure smoothness
                        setTimeout(onComplete, 200);
                    }}
                />
            </div>
        </div>
    );
};

export default SplashAnimation;
