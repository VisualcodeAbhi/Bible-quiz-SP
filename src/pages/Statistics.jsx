import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookNameMap } from '../bookNames';

const Statistics = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({});

    useEffect(() => {
        const data = JSON.parse(localStorage.getItem('bibleQuizProgress')) || {};
        setStats(data);
    }, []);

    let totalLevelsCompleted = 0;
    let totalBooksStarted = 0;

    Object.keys(stats).forEach(book => {
        const levels = stats[book];
        const completedCount = Object.values(levels).filter(l => l.completed).length;
        if (completedCount > 0) totalBooksStarted++;
        totalLevelsCompleted += completedCount;
    });

    return (
        <div className="stats-bg-wrapper">
            <div className="container" style={{ height: 'auto', minHeight: '100vh' }}>
                <header>
                    <div className="menu-icon" onClick={() => navigate('/')}>&#8592;</div>
                    <h1>గణాంకాలు (Statistics)</h1>
                </header>

                <div style={{ padding: '0 20px', marginBottom: '20px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Roboto', fontSize: '16px', margin: 0, lineHeight: '1.6', marginBottom: '10px' }}>
                        "ప్రయాసపడి భారము మోసికొనుచున్న సమస్త జనులారా, నా యొద్దకు రండి; నేను మీకు విశ్రాంతి కలుగజేతును."
                    </p>
                    <p style={{ marginTop: '5px', fontWeight: 'bold', color: '#ffc107' }}>- మత్తయి 11:28</p>
                </div>

                <div className="stats-card" style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '20px',
                    borderRadius: '15px',
                    width: '90%',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <h2>పూర్తయిన మొత్తం లెవల్స్</h2>
                    <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffc107' }}>{totalLevelsCompleted}</div>
                </div>

                <div className="stats-list" style={{ width: '90%' }}>
                    <h3>గ్రంథాల ప్రగతి (Book Progress)</h3>
                    {Object.keys(stats).length === 0 ? (
                        <p style={{ color: '#cbd5e1' }}>ఇంకా ఎటువంటి ప్రగతి లేదు. క్విజ్ ప్రారంభించండి!</p>
                    ) : (
                        Object.keys(stats).map(book => {
                            const completed = Object.values(stats[book]).filter(l => l.completed).length;
                            const teluguBookName = bookNameMap[book] || book;
                            return (
                                <div key={book} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '10px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <span style={{ fontWeight: '500' }}>{teluguBookName}</span>
                                    <span style={{ color: '#ffc107' }}>{completed} లెవల్స్ పూర్తయ్యాయి</span>
                                </div>
                            );
                        })
                    )}
                </div>

                <button className="action-btn" onClick={() => {
                    if (confirm("మీరు నిజంగా మీ మొత్తం ప్రగతిని రీసెట్ చేయాలనుకుంటున్నారా?")) {
                        localStorage.removeItem('bibleQuizProgress');
                        setStats({});
                    }
                }} style={{ marginTop: '40px', background: '#F44336', color: 'white' }}>
                    <span className="btn-main-text" style={{ fontSize: '18px' }}>ప్రగతిని రీసెట్ చేయండి</span>
                </button>
            </div>
        </div>
    );
};

export default Statistics;
