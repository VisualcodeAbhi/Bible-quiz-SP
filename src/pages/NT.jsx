import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookNameMap } from '../bookNames';

const books = [
    { id: 'Matthew', name: 'Matthew', file: 'Matthewdata' },
    { id: 'Mark', name: 'Mark', file: 'Markdata' },
    { id: 'Luke', name: 'Luke', file: 'Lukedata' },
    { id: 'John', name: 'John', file: 'Johndata' },
    { id: 'Acts', name: 'Acts', file: 'Actsdata' },
    { id: 'Romans', name: 'Romans', file: 'Romansdata' },
    { id: '1Corinthians', name: '1 Corinthians', file: '1Corinthiansdata' },
    { id: '2Corinthians', name: '2 Corinthians', file: '2Corinthiansdata' },
    { id: 'Galatians', name: 'Galatians', file: 'Galatiansdata' },
    { id: 'Ephesians', name: 'Ephesians', file: 'Ephesiansdata' },
    { id: 'Philippians', name: 'Philippians', file: 'Philippiansdata' },
    { id: 'Colossians', name: 'Colossians', file: 'Colossiansdata' },
    { id: '1Thessalonians', name: '1 Thessalonians', file: '1Thessaloniansdata' },
    { id: '2Thessalonians', name: '2 Thessalonians', file: '2Thessaloniansdata' },
    { id: '1Timothy', name: '1 Timothy', file: '1Timothydata' },
    { id: '2Timothy', name: '2 Timothy', file: '2Timothydata' },
    { id: 'Titus', name: 'Titus', file: 'Titusdata' },
    { id: 'Philemon', name: 'Philemon', file: 'Philemondata' },
    { id: 'Hebrews', name: 'Hebrews', file: 'Hebrewsdata' },
    { id: 'James', name: 'James', file: 'Jamesdata' },
    { id: '1Peter', name: '1 Peter', file: '1Peterdata' },
    { id: '2Peter', name: '2 Peter', file: '2Peterdata' },
    { id: '1John', name: '1 John', file: '1Johndata' },
    { id: '2John', name: '2 John', file: '2Johndata' },
    { id: '3John', name: '3 John', file: '3Johndata' },
    { id: 'Jude', name: 'Jude', file: 'Judedata' },
    { id: 'Revelation', name: 'Revelation', file: 'Revelationdata' },
];

import Loader from '../components/Loader';

const NewTestament = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    if (loading) return <Loader />;

    return (
        <div className="books-bg-wrapper">
            <div className="container">
                <header style={{ marginTop: "-10px" }}>
                    <div className="menu-icon" onClick={() => navigate(-1)}>&#8592;</div>
                    <h1>New Testament</h1>
                </header>
                <div style={{ width: '100%', textAlign: 'center', marginTop: '-20px' }}>
                    {books.map((book) => (
                        <Link
                            to={`/levels/${book.file}`}
                            state={{ from: 'list' }}
                            key={book.id}
                            className="book-link box"
                        >
                            {bookNameMap[book.name] || book.name}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NewTestament;
