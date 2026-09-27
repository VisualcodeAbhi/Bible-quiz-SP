/**
 * Unified Bible Quiz Data Loader
 * Supports difficulty levels: 'beginner', 'intermediate', 'advanced'
 */
export async function loadQuizBookData(bookFile, difficulty = 'beginner') {
    const normalizedDifficulty = (difficulty || 'beginner').toLowerCase();

    if (normalizedDifficulty === 'intermediate') {
        try {
            const module = await import(`../assets/data/intermediate/${bookFile}.json`);
            return module.default || module;
        } catch (e) {
            // Fallback to base data if specific intermediate JSON does not exist yet
            console.warn(`Intermediate data not found for ${bookFile}, falling back to base data.`);
        }
    } else if (normalizedDifficulty === 'advanced') {
        try {
            const module = await import(`../assets/data/advanced/${bookFile}.json`);
            return module.default || module;
        } catch (e) {
            // Fallback to base data if specific advanced JSON does not exist yet
            console.warn(`Advanced data not found for ${bookFile}, falling back to base data.`);
        }
    }

    // Default / Beginner
    const module = await import(`../assets/data/${bookFile}.json`);
    return module.default || module;
}
