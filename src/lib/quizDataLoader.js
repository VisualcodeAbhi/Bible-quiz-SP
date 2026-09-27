import { supabase } from './supabaseClient';

/**
 * Unified Bible Quiz Data Loader
 * Supports difficulty levels: 'beginner', 'intermediate', 'advanced'
 * 1. Checks Supabase Cloud Database (for instant cloud sync across all laptops & devices)
 * 2. Falls back to bundled static JSON files if offline or not in cloud
 * @param {string} bookFile - The filename of the book (e.g. 'Gdata', 'Edata', 'Matthewdata')
 * @param {string} difficulty - 'beginner' | 'intermediate' | 'advanced'
 * @param {boolean} strict - If true, do NOT fallback to beginner data if file does not exist
 */
export async function loadQuizBookData(bookFile, difficulty = 'beginner', strict = false) {
    const normalizedDifficulty = (difficulty || 'beginner').toLowerCase();
    const docId = `${normalizedDifficulty}_${bookFile}`;

    // 1. Check Supabase Cloud Database first (real-time sync across all laptops & devices)
    try {
        const { data: cloudRow, error: cloudErr } = await supabase
            .from('quiz_books')
            .select('data')
            .eq('id', docId)
            .maybeSingle();

        if (!cloudErr && cloudRow?.data?.levels && Object.keys(cloudRow.data.levels).length > 0) {
            return cloudRow.data;
        }
    } catch (e) {
        // Fallback to static bundled files
    }

    // 2. Intermediate local file
    if (normalizedDifficulty === 'intermediate') {
        try {
            const module = await import(`../assets/data/intermediate/${bookFile}.json`);
            return module.default || module;
        } catch (e) {
            if (strict) return null;
            console.warn(`Intermediate data not found for ${bookFile}, falling back to base data.`);
        }
    } else if (normalizedDifficulty === 'advanced') {
        try {
            const module = await import(`../assets/data/advanced/${bookFile}.json`);
            return module.default || module;
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
        return module.default || module;
    } catch (e) {
        console.error(`Base book data not found for ${bookFile}`, e);
        return null;
    }
}
