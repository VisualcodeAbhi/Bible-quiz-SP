import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
                    <h1>Statistics</h1>
                </header>

                <div style={{ padding: '0 20px', marginBottom: '20px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Roboto', fontSize: '16px', margin: 0, lineHeight: '1.6', marginBottom: '10px' }}>
                        "Come to me, all you who are weary and burdened, and I will give you rest."
                    </p>
                    <p style={{ marginTop: '5px', fontWeight: 'bold' }}>- Matthew 11:28</p>

                </div>

                <div className="stats-card" style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '20px',
                    borderRadius: '15px',
                    width: '90%',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <h2>Total Levels Completed</h2>
                    <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffc107' }}>{totalLevelsCompleted}</div>
                </div>

                <div className="stats-list" style={{ width: '90%' }}>
                    <h3>Book Progress</h3>
                    {Object.keys(stats).length === 0 ? (
                        <p>No progress yet. Start a quiz!</p>
                    ) : (
                        Object.keys(stats).map(book => {
                            const completed = Object.values(stats[book]).filter(l => l.completed).length;
                            return (
                                <div key={book} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '10px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <span>{book}</span>
                                    <span style={{ color: '#f2f2f2ff' }}>{completed} Levels</span>
                                </div>
                            );
                        })
                    )}
                </div>

                <button className="action-btn" onClick={() => {
                    if (confirm("Are you sure you want to reset all progress?")) {
                        localStorage.removeItem('bibleQuizProgress');
                        setStats({});
                    }
                }} style={{ marginTop: '40px', background: '#F44336', color: 'white' }}>
                    <span className="btn-main-text" style={{ fontSize: '18px' }}>Reset Progress</span>
                </button>
            </div>
        </div>
    );
};

export default Statistics;
