import React from 'react';
import './loader.css';

import Lottie from 'lottie-react';
import bookLoader from '../assets/data/book_loader.json';

const Loader = () => {
    return (
        <div className="spinner-container">
            <div style={{ width: 150, height: 150 }}>
                <Lottie animationData={bookLoader} loop={true} />
            </div>
        </div>
    );
};

export default Loader;
