import React, { useState, useEffect } from 'react';

// Generates a consistent, vibrant gradient based on user's name
const GRADIENTS = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo -> Purple
    'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', // Blue -> Cyan
    'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', // Pink -> Rose
    'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald -> Green
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber -> Orange
    'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', // Purple -> Pink
    'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)', // Sky -> Blue
    'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', // Teal -> Dark Teal
];

const getGradientForName = (name) => {
    if (!name || typeof name !== 'string') return GRADIENTS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % GRADIENTS.length;
    return GRADIENTS[index];
};

const getInitial = (name) => {
    if (!name || typeof name !== 'string') return '';
    const clean = name.trim();
    if (!clean) return '';
    return clean.charAt(0).toUpperCase();
};

export const UserAvatar = ({
    src,
    name,
    size = 38,
    fontSize,
    border,
    style = {},
    className = '',
    onClick
}) => {
    const [hasError, setHasError] = useState(false);

    // Reset error state if the src prop changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    const initial = getInitial(name);
    const bgGradient = getGradientForName(name || 'User');
    const calculatedFontSize = fontSize || `${Math.max(12, Math.round(size * 0.44))}px`;

    const containerStyle = {
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        background: bgGradient,
        boxSizing: 'border-box',
        ...(border ? { border } : {}),
        ...style
    };

    // If image source is present and has not errored out, render image with referrerPolicy
    if (src && !hasError && typeof src === 'string' && src.trim() !== '') {
        return (
            <div className={className} style={containerStyle} onClick={onClick}>
                <img
                    src={src}
                    alt={name || 'Avatar'}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => setHasError(true)}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                />
            </div>
        );
    }

    // Fallback: Initial Letter with vibrant modern gradient background
    return (
        <div className={className} style={containerStyle} onClick={onClick}>
            {initial ? (
                <span
                    style={{
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: calculatedFontSize,
                        lineHeight: 1,
                        textTransform: 'uppercase',
                        textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                >
                    {initial}
                </span>
            ) : (
                <span
                    style={{
                        fontSize: calculatedFontSize,
                        lineHeight: 1,
                        display: 'inline-block'
                    }}
                >
                    👤
                </span>
            )}
        </div>
    );
};

export default UserAvatar;
