import React from 'react';

const ScreenRestriction = ({ children }) => {
    return (
        <div style={{
            width: '100%',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#050714',
            overflow: 'hidden'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '430px',
                height: '100vh',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.8)'
            }}>
                {children}
            </div>
        </div>
    );
};

export default ScreenRestriction;

