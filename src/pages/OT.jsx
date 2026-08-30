import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookNameMap } from '../bookNames';

const books = [
    { id: 'Genesis', name: 'Genesis', file: 'Gdata' },
    { id: 'Exodus', name: 'Exodus', file: 'Edata' },
    { id: 'Leviticus', name: 'Leviticus', file: 'Ldata' },
    { id: 'Numbers', name: 'Numbers', file: 'Ndata' },
    { id: 'Deuteronomy', name: 'Deuteronomy', file: 'Ddata' },
    { id: 'Joshua', name: 'Joshua', file: 'Joshdata' },
    { id: 'Judges', name: 'Judges', file: 'Judgdata' },
    { id: 'Ruth', name: 'Ruth', file: 'Ruthdata' },
    { id: '1Samuel', name: '1 Samuel', file: '1Samdata' },
    { id: '2Samuel', name: '2 Samuel', file: '2Samdata' },
    { id: '1Kings', name: '1 Kings', file: '1Kingsdata' },
    { id: '2Kings', name: '2 Kings', file: '2Kingsdata' },
    { id: '1Chronicles', name: '1 Chronicles', file: '1Chrdata' },
    { id: '2Chronicles', name: '2 Chronicles', file: '2Chrdata' },
    { id: 'Ezra', name: 'Ezra', file: 'Ezradata' },
    { id: 'Nehemiah', name: 'Nehemiah', file: 'Nehdata' },
    // { id: 'Tobit', name: 'Tobit', file: 'Tobitdata' },
    // { id: 'Judith', name: 'Judith', file: 'Judithdata' },
    { id: 'Esther', name: 'Esther', file: 'Estherdata' },
    // { id: '1Maccabees', name: '1 Maccabees', file: '1Maccabees' },
    // { id: '2Maccabees', name: '2 Maccabees', file: '2Maccabeesdata' },
    { id: 'Job', name: 'Job', file: 'Jobdata' },
    { id: 'Psalms', name: 'Psalms', file: 'Psalmsdata' },
    { id: 'Proverbs', name: 'Proverbs', file: 'Proverbsdata' },
    { id: 'Ecclesiastes', name: 'Ecclesiastes', file: 'Ecclesiastesdata' },
    { id: 'SongofSolomon', name: 'Song of Solomon', file: 'SongofSolomondata' },
    // { id: 'Wisdom', name: 'Wisdom', file: 'Wisdomdata' },
    // { id: 'Sirach', name: 'Sirach', file: 'Sirachdata' },
    { id: 'Isaiah', name: 'Isaiah', file: 'Isaiahdata' },
    { id: 'Jeremiah', name: 'Jeremiah', file: 'Jeremiahdata' },
    { id: 'Lamentations', name: 'Lamentations', file: 'Lamentationsdata' },
    // { id: 'Baruch', name: 'Baruch', file: 'Baruchdata' },
    { id: 'Ezekiel', name: 'Ezekiel', file: 'Ezekieldata' },
    { id: 'Daniel', name: 'Daniel', file: 'Danieldata' },
    { id: 'Hosea', name: 'Hosea', file: 'Hoseadata' },
    { id: 'Joel', name: 'Joel', file: 'Joeldata' },
    { id: 'Amos', name: 'Amos', file: 'Amosdata' },
    { id: 'Obadiah', name: 'Obadiah', file: 'Obadiahdata' },
    { id: 'Jonah', name: 'Jonah', file: 'Jonahdata' },
    { id: 'Micah', name: 'Micah', file: 'Micahdata' },
    { id: 'Nahum', name: 'Nahum', file: 'Nahumdata' },
    { id: 'Habakkuk', name: 'Habakkuk', file: 'Habakkukdata' },
    { id: 'Zephaniah', name: 'Zephaniah', file: 'Zephaniahdata' },
    { id: 'Haggai', name: 'Haggai', file: 'Haggaidata' },
    { id: 'Zechariah', name: 'Zechariah', file: 'Zechariahdata' },
    { id: 'Malachi', name: 'Malachi', file: 'Malachidata' },
];

import Loader from '../components/Loader';

const OldTestament = () => {
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
                    <h1>Old Testament</h1>
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

export default OldTestament;
