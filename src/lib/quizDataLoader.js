import { supabase } from './supabaseClient';

/**
 * In-memory cache for loaded book data
 * Ensures subsequent chapters and levels load in 0 milliseconds
 */
const bookDataCache = new Map();

/**
 * Unified Bible Quiz Data Loader
 * Supports difficulty levels: 'beginner', 'intermediate', 'advanced'
 * 1. Fast in-memory cache check (instant 0ms response)
 * 2. Checks Supabase Cloud Database (for instant cloud sync across all laptops & devices)
 * 3. Falls back to bundled static JSON files if offline or not in cloud
 * @param {string} bookFile - The filename of the book (e.g. 'Gdata', 'Edata', 'Matthewdata')
 * @param {string} difficulty - 'beginner' | 'intermediate' | 'advanced'
 * @param {boolean} strict - If true, do NOT fallback to beginner data if file does not exist
 */
export async function loadQuizBookData(bookFile, difficulty = 'beginner', strict = false) {
    const normalizedDifficulty = (difficulty || 'beginner').toLowerCase();
    const docId = `${normalizedDifficulty}_${bookFile}`;

    // 0. Instant Cache Hit (0ms)
    if (bookDataCache.has(docId)) {
        return bookDataCache.get(docId);
    }

    // 1. Check Supabase Cloud Database first (real-time sync across all laptops & devices)
    try {
        const { data: cloudRow, error: cloudErr } = await supabase
            .from('quiz_books')
            .select('data')
            .eq('id', docId)
            .maybeSingle();

        if (!cloudErr && cloudRow?.data?.levels && Object.keys(cloudRow.data.levels).length > 0) {
            bookDataCache.set(docId, cloudRow.data);
            return cloudRow.data;
        }
    } catch (e) {
        // Fallback to static bundled files
    }

    // 2. Intermediate local file
    if (normalizedDifficulty === 'intermediate') {
        try {
            const module = await import(`../assets/data/intermediate/${bookFile}.json`);
            const data = module.default || module;
            if (data) bookDataCache.set(docId, data);
            return data;
        } catch (e) {
            if (strict) return null;
            console.warn(`Intermediate data not found for ${bookFile}, falling back to base data.`);
        }
    } else if (normalizedDifficulty === 'advanced') {
        try {
            const module = await import(`../assets/data/advanced/${bookFile}.json`);
            const data = module.default || module;
            if (data) bookDataCache.set(docId, data);
            return data;
        } catch (e) {
            if (strict) return null;
            console.warn(`Advanced data not found for ${bookFile}, falling back to base data.`);
        }
    }

    if (strict && normalizedDifficulty !== 'beginner') {
        return null;
    }

    // Default / Beginner
    try {
        const module = await import(`../assets/data/${bookFile}.json`);
        const data = module.default || module;
        if (data) bookDataCache.set(docId, data);
        return data;
    } catch (e) {
        console.error(`Base book data not found for ${bookFile}`, e);
        return null;
    }
}
