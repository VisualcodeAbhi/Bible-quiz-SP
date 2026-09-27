/**
 * Unified Bible Quiz Data Loader
 * Supports difficulty levels: 'beginner', 'intermediate', 'advanced'
 * @param {string} bookFile - The filename of the book (e.g. 'Gdata', 'Edata', 'Matthewdata')
 * @param {string} difficulty - 'beginner' | 'intermediate' | 'advanced'
 * @param {boolean} strict - If true, do NOT fallback to beginner data if file does not exist
 */
export async function loadQuizBookData(bookFile, difficulty = 'beginner', strict = false) {
    const normalizedDifficulty = (difficulty || 'beginner').toLowerCase();

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
