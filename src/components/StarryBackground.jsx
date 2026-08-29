import React, { useEffect, useRef } from 'react';
import '../styles/StarryBackground.css';

const StarryBackground = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Clear existing content to prevent duplicates if effect runs twice
        container.innerHTML = '';

        // Reduce star count for mobile performance
        const starCount = 100;

        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            // ... (rest is same logic, implicit in replacement if I don't change it? No I must provide content)
            star.className = 'star';

            // Random position
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';

            // Random size (1-3px)
            const size = Math.random() * 2 + 1;
            star.style.width = size + 'px';
            star.style.height = size + 'px';

            // Random animation duration (2-5s)
            const duration = Math.random() * 3 + 2;
            star.style.setProperty('--duration', duration + 's');

            // Random glow
            const glow = Math.random() * 3 + 2;
            star.style.setProperty('--glow', glow + 'px');
            star.style.setProperty('--color', 'rgba(255, 255, 255, 0.8)');

            // Random delay
            star.style.animationDelay = Math.random() * 5 + 's';

            container.appendChild(star);
        }

        // Shooting stars logic
        const createShootingStar = () => {
            if (!container) return;
            const shootingStar = document.createElement('div');
            shootingStar.className = 'shooting-star';

            // Start logic matches background.html
            shootingStar.style.left = Math.random() * 120 + '%';
            shootingStar.style.top = Math.random() * 50 - 20 + '%';

            container.appendChild(shootingStar);

            setTimeout(() => {
                shootingStar.remove();
            }, 3000);
        };

        const interval = setInterval(createShootingStar, 3000);

        return () => {
            clearInterval(interval);
            if (container) container.innerHTML = '';
        };
    }, []);

    return <div className="stars-container" ref={containerRef}></div>;
};

export default StarryBackground;
