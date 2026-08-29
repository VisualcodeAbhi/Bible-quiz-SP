import React, { useState, useEffect } from 'react';
import './screenRestriction.css';

const ScreenRestriction = ({ children }) => {
    // Set max width for tablet (iPad Pro 12.9 is 1024px width in portrait, usually treated as tablet)
    // Common desktop breakpoint is often considered > 1024px.
    const MAX_WIDTH = 1024;

    const [isBigScreen, setIsBigScreen] = useState(window.innerWidth > MAX_WIDTH);

    useEffect(() => {
        const handleResize = () => {
            setIsBigScreen(window.innerWidth > MAX_WIDTH);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup listener
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isBigScreen) {
        return (
            <div className="restriction-container">
                <div className="restriction-content">
                    <span className="phone-icon">📱</span>
                    <h1>Mobile & Tablet Only</h1>
                    <p>
                        This application is optimized for smaller screens.<br />
                        Please open it on your mobile phone or tablet, or resize your browser window to a smaller width.
                    </p>
                </div>
            </div>
        );
    }

    return children;
};

export default ScreenRestriction;
