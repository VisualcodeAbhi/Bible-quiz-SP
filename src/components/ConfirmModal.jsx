import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDanger = false, showCancel = true }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            // ... (keep existing styles)
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '25px',
                borderRadius: '20px',
                width: '85%',
                maxWidth: '350px',
                textAlign: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                {/* ... keep content ... */}
                <div style={{
                    fontSize: '40px',
                    marginBottom: '15px'
                }}>
                    {isDanger ? '⚠️' : '❓'}
                </div>

                <h2 style={{
                    margin: '0 0 10px 0',
                    color: '#333',
                    fontSize: '22px'
                }}>
                    {title}
                </h2>

                <p style={{
                    color: '#666',
                    marginBottom: '25px',
                    fontSize: '16px',
                    lineHeight: '1.5'
                }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    {showCancel && (
                        <button
                            onClick={onCancel}
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: 'none',
                                background: '#f0f0f0',
                                color: '#333',
                                borderRadius: '12px',
                                fontWeight: '600',
                                fontSize: '16px',
                                cursor: 'pointer'
                            }}
                        >
                            {cancelText}
                        </button>
                    )}

                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            padding: '12px',
                            border: 'none',
                            background: isDanger ? '#ff4d4d' : '#4CAF50',
                            color: 'white',
                            borderRadius: '12px',
                            fontWeight: '600',
                            fontSize: '16px',
                            cursor: 'pointer',
                            boxShadow: isDanger ? '0 4px 15px rgba(255, 77, 77, 0.3)' : '0 4px 15px rgba(76, 175, 80, 0.3)'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div >
    );
};

export default ConfirmModal;
