import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

try {
    CapacitorUpdater.notifyAppReady().catch(err => {
        console.warn('CapacitorUpdater notifyAppReady failed:', err);
    });
} catch (e) {
    console.warn('CapacitorUpdater exception:', e);
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)


