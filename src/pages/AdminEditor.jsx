import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BIBLE_BOOKS } from '../bibleBooksData';
import { loadQuizBookData } from '../lib/quizDataLoader';
import { supabase } from '../lib/supabaseClient';

const DIFFICULTIES = [
    { id: 'beginner', label: 'Beginner', color: '#10B981', badge: '🟢' },
    { id: 'intermediate', label: 'Intermediate', color: '#F59E0B', badge: '🟡' },
    { id: 'advanced', label: 'Advanced', color: '#EF4444', badge: '🔴' }
];

export default function AdminEditor() {
    const navigate = useNavigate();

    // 1. Selector States
    const [difficulty, setDifficulty] = useState('intermediate');
    const [selectedBookId, setSelectedBookId] = useState('Genesis');
    const [testamentFilter, setTestamentFilter] = useState('ALL');
    const [bookSearch, setBookSearch] = useState('');
    const [selectedChapter, setSelectedChapter] = useState(1);

    // 2. Active Book Data State
    const [fullBookData, setFullBookData] = useState(null);
    const [loadingBook, setLoadingBook] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    // 3. Question Form State
    const [editingIndex, setEditingIndex] = useState(null); // null = new, number = editing
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

    // 4. Modal / Bulk Import State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkJsonInput, setBulkJsonInput] = useState('');
    const [bulkError, setBulkError] = useState('');
    const [distribute15, setDistribute15] = useState(false);
    const [bulkTemplateTab, setBulkTemplateTab] = useState('single'); // 'single' | 'all3'
    const bulkTextareaRef = useRef(null);

    // Auto-focus textarea when bulk modal opens
    useEffect(() => {
        if (showBulkModal) {
            setTimeout(() => {
                bulkTextareaRef.current?.focus();
            }, 60);
        }
    }, [showBulkModal]);

    // Selected book metadata
    const activeBookMeta = useMemo(() => {
        return BIBLE_BOOKS.find(b => b.id === selectedBookId) || BIBLE_BOOKS[0];
    }, [selectedBookId]);

    // Filtered books list
    const filteredBooks = useMemo(() => {
        return BIBLE_BOOKS.filter(b => {
            const matchesTestament = testamentFilter === 'ALL' || b.testament === testamentFilter;
            const searchLower = bookSearch.toLowerCase();
            const matchesSearch = !bookSearch ||
                b.name.toLowerCase().includes(searchLower) ||
                b.teluguName.toLowerCase().includes(searchLower) ||
                b.file.toLowerCase().includes(searchLower);
            return matchesTestament && matchesSearch;
        });
    }, [testamentFilter, bookSearch]);

    // Cache key helper
    const getCacheKey = (file, diff) => `admin_quiz_${diff}_${file}`;

    // Load Book Data
    const loadCurrentBook = useCallback(async () => {
        if (!activeBookMeta) return;
        setLoadingBook(true);
        setStatusMessage(null);
        setEditingIndex(null);
        resetForm();

        const docId = `${difficulty}_${activeBookMeta.file}`;
        const cacheKey = getCacheKey(activeBookMeta.file, difficulty);
        const cachedStr = localStorage.getItem(cacheKey);

        // 1. Primary: Fetch live from Supabase Cloud Database (shared across all devices)
        try {
            const { data: cloudRow, error: cloudErr } = await supabase
                .from('quiz_books')
                .select('data')
                .eq('id', docId)
                .maybeSingle();

            if (!cloudErr && cloudRow?.data && cloudRow.data.levels && (!cloudRow.data.difficulty || cloudRow.data.difficulty === difficulty)) {
                setFullBookData(cloudRow.data);
                setHasUnsavedChanges(false);
                setLoadingBook(false);
                localStorage.setItem(cacheKey, JSON.stringify(cloudRow.data));
                return;
            }
        } catch (e) {
            console.log('Supabase cloud fetch error/offline, trying local sources...', e);
        }

        // 2. Secondary: If on localhost, check local Vite dev server API
        try {
            const res = await fetch(`/api/admin/get-quiz-data?bookFile=${activeBookMeta.file}&difficulty=${difficulty}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.exists && json.data) {
                    setFullBookData(json.data);
                    setHasUnsavedChanges(false);
                    setLoadingBook(false);
                    return;
                } else if (json.baseTemplate) {
                    setFullBookData(json.baseTemplate);
                    setHasUnsavedChanges(false);
                    setLoadingBook(false);
                    return;
                }
            }
        } catch (e) {
            console.log('Dev server API not reached, trying cache/dynamic import fallback...', e);
        }

        // 3. Tertiary: Check localStorage cache before falling back (must match difficulty)
        if (cachedStr) {
            try {
                const parsedCache = JSON.parse(cachedStr);
                if (parsedCache && parsedCache.levels && (!parsedCache.difficulty || parsedCache.difficulty === difficulty)) {
                    setFullBookData(parsedCache);
                    setHasUnsavedChanges(false);
                    setLoadingBook(false);
                    return;
                }
            } catch (e) {}
        }

        // Fallback: load via client quizDataLoader in STRICT mode
        try {
            const clientData = await loadQuizBookData(activeBookMeta.file, difficulty, true);
            if (clientData && (difficulty === 'beginner' || clientData.difficulty === difficulty)) {
                const cloned = JSON.parse(JSON.stringify(clientData));
                if (!cloned.levels) cloned.levels = {};
                setFullBookData(cloned);
            } else {
                // Initialize clean empty book template for new Intermediate / Advanced book
                setFullBookData({
                    bookName: activeBookMeta.name,
                    chapters: activeBookMeta.chapters,
                    difficulty: difficulty,
                    levels: {}
                });
            }
        } catch (err) {
            setFullBookData({
                bookName: activeBookMeta.name,
                chapters: activeBookMeta.chapters,
                difficulty: difficulty,
                levels: {}
            });
        } finally {
            setLoadingBook(false);
            setHasUnsavedChanges(false);
        }
    }, [activeBookMeta, difficulty]);

    useEffect(() => {
        loadCurrentBook();
    }, [loadCurrentBook]);

    // Current Chapter Questions
    const currentChapterQuestions = useMemo(() => {
        if (!fullBookData || !fullBookData.levels) return [];
        const list = fullBookData.levels[String(selectedChapter)];
        return Array.isArray(list) ? list : [];
    }, [fullBookData, selectedChapter]);

    // Total questions in the active book
    const totalBookQuestions = useMemo(() => {
        if (!fullBookData || !fullBookData.levels) return 0;
        return Object.values(fullBookData.levels).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
    }, [fullBookData]);

    const resetForm = () => {
        setEditingIndex(null);
        setQuestionText('');
        setOptions(['', '', '', '']);
        setCorrectOptionIndex(0);
    };

    const handleOptionChange = (index, value) => {
        const next = [...options];
        next[index] = value;
        setOptions(next);
    };

    // Add or Update Question
    const handleSaveQuestionToChapter = (e) => {
        if (e) e.preventDefault();
        if (!questionText.trim()) {
            alert('Please enter a question text.');
            return;
        }
        if (options.some(opt => !opt.trim())) {
            alert('Please provide all 4 options.');
            return;
        }

        const newQuestionObj = {
            question: questionText.trim(),
            options: options.map(o => o.trim()),
            correct: Number(correctOptionIndex)
        };

        const chapterKey = String(selectedChapter);
        const updatedLevels = { ...(fullBookData?.levels || {}) };
        const existingList = Array.isArray(updatedLevels[chapterKey]) ? [...updatedLevels[chapterKey]] : [];

        if (editingIndex !== null && editingIndex >= 0 && editingIndex < existingList.length) {
            existingList[editingIndex] = newQuestionObj;
        } else {
            existingList.push(newQuestionObj);
        }

        updatedLevels[chapterKey] = existingList;

        const updatedData = {
            ...(fullBookData || {}),
            bookName: activeBookMeta.name,
            chapters: activeBookMeta.chapters,
            difficulty: difficulty,
            levels: updatedLevels
        };

        setFullBookData(updatedData);

        // Auto-save to localStorage cache
        const cacheKey = getCacheKey(activeBookMeta.file, difficulty);
        localStorage.setItem(cacheKey, JSON.stringify(updatedData));

        setHasUnsavedChanges(true);
        resetForm();
    };

    // Edit a question
    const handleEditQuestion = (idx) => {
        const q = currentChapterQuestions[idx];
        if (!q) return;
        setEditingIndex(idx);
        setQuestionText(q.question || '');
        setOptions(Array.isArray(q.options) && q.options.length === 4 ? [...q.options] : [q.options?.[0] || '', q.options?.[1] || '', q.options?.[2] || '', q.options?.[3] || '']);
        setCorrectOptionIndex(typeof q.correct === 'number' ? q.correct : 0);
    };

    // Delete a question
    const handleDeleteQuestion = (idx) => {
        if (!window.confirm(`Delete Question #${idx + 1}?`)) return;
        const chapterKey = String(selectedChapter);
        const updatedLevels = { ...(fullBookData?.levels || {}) };
        const existingList = Array.isArray(updatedLevels[chapterKey]) ? [...updatedLevels[chapterKey]] : [];

        existingList.splice(idx, 1);
        updatedLevels[chapterKey] = existingList;

        const updatedData = {
            ...(fullBookData || {}),
            levels: updatedLevels
        };

        setFullBookData(updatedData);

        const cacheKey = getCacheKey(activeBookMeta.file, difficulty);
        localStorage.setItem(cacheKey, JSON.stringify(updatedData));

        setHasUnsavedChanges(true);

        if (editingIndex === idx) {
            resetForm();
        }
    };

    // Clear all questions in the current chapter
    const handleClearAllChapterQuestions = () => {
        if (!currentChapterQuestions || currentChapterQuestions.length === 0) {
            alert(`Chapter ${selectedChapter} has no questions to clear.`);
            return;
        }

        const confirmMsg = `Are you sure you want to CLEAR ALL ${currentChapterQuestions.length} questions in Chapter ${selectedChapter} (${difficulty.toUpperCase()})?\n\nThis will empty all questions from this chapter. (Press Ctrl+S afterwards to save changes).`;
        if (!window.confirm(confirmMsg)) return;

        const chapterKey = String(selectedChapter);
        const updatedLevels = { ...(fullBookData?.levels || {}) };
        updatedLevels[chapterKey] = [];

        const updatedData = {
            ...(fullBookData || {}),
            bookName: activeBookMeta.name,
            chapters: activeBookMeta.chapters,
            difficulty: difficulty,
            levels: updatedLevels
        };

        setFullBookData(updatedData);

        const cacheKey = getCacheKey(activeBookMeta.file, difficulty);
        localStorage.setItem(cacheKey, JSON.stringify(updatedData));

        setHasUnsavedChanges(true);
        resetForm();

        setStatusMessage({
            type: 'warning',
            text: `🗑️ Cleared all questions in Chapter ${selectedChapter} (${difficulty.toUpperCase()}). Press Ctrl+S to save changes!`
        });
    };

    // Move question up or down
    const handleMoveQuestion = (idx, direction) => {
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= currentChapterQuestions.length) return;

        const chapterKey = String(selectedChapter);
        const updatedLevels = { ...(fullBookData?.levels || {}) };
        const list = [...(updatedLevels[chapterKey] || [])];

        const temp = list[idx];
        list[idx] = list[targetIdx];
        list[targetIdx] = temp;

        updatedLevels[chapterKey] = list;
        const updatedData = {
            ...(fullBookData || {}),
            levels: updatedLevels
        };

        setFullBookData(updatedData);

        const cacheKey = getCacheKey(activeBookMeta.file, difficulty);
        localStorage.setItem(cacheKey, JSON.stringify(updatedData));

        setHasUnsavedChanges(true);
    };

    // Duplicate question
    const handleDuplicateQuestion = (idx) => {
        const q = currentChapterQuestions[idx];
        if (!q) return;
        const chapterKey = String(selectedChapter);
        const updatedLevels = { ...(fullBookData?.levels || {}) };
        const list = [...(updatedLevels[chapterKey] || [])];

        const cloned = JSON.parse(JSON.stringify(q));
        list.splice(idx + 1, 0, cloned);
        updatedLevels[chapterKey] = list;

        const updatedData = {
            ...(fullBookData || {}),
            levels: updatedLevels
        };

        setFullBookData(updatedData);

        const cacheKey = getCacheKey(activeBookMeta.file, difficulty);
        localStorage.setItem(cacheKey, JSON.stringify(updatedData));

        setHasUnsavedChanges(true);
    };

    // Copy Beginner Questions as Draft for Current Chapter
    const handleCopyBeginnerChapter = async () => {
        try {
            const baseData = await loadQuizBookData(activeBookMeta.file, 'beginner');
            const chapterKey = String(selectedChapter);
            const baseQuestions = baseData?.levels?.[chapterKey];
            if (!Array.isArray(baseQuestions) || baseQuestions.length === 0) {
                setStatusMessage({ type: 'warning', text: `No beginner questions found for Chapter ${selectedChapter}` });
                return;
            }

            const updatedLevels = { ...(fullBookData?.levels || {}) };
            updatedLevels[chapterKey] = JSON.parse(JSON.stringify(baseQuestions));

            const updatedData = {
                ...(fullBookData || {}),
                difficulty: difficulty,
                levels: updatedLevels
            };

            setFullBookData(updatedData);
            setHasUnsavedChanges(true);
            setStatusMessage({
                type: 'success',
                text: `✅ Copied ${baseQuestions.length} beginner questions into Chapter ${selectedChapter} as draft!`
            });
        } catch (e) {
            console.error('Failed to copy beginner questions', e);
        }
    };

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // Save to Supabase Cloud & Disk (Syncs across all laptops, Vercel & Mobile App)
    const handleSaveToDisk = async () => {
        if (!fullBookData) return;
        setStatusMessage({ type: 'loading', text: 'Saving to Supabase Cloud & Disk...' });

        const docId = `${difficulty}_${activeBookMeta.file}`;
        const cacheKey = getCacheKey(activeBookMeta.file, difficulty);
        localStorage.setItem(cacheKey, JSON.stringify(fullBookData));

        let cloudSaved = false;
        let diskSaved = false;

        // 1. Save to Supabase Cloud Database (Instantly shared with all laptops & mobile apps)
        try {
            const { error: cloudErr } = await supabase
                .from('quiz_books')
                .upsert({
                    id: docId,
                    book_file: activeBookMeta.file,
                    difficulty: difficulty,
                    data: fullBookData,
                    updated_at: new Date().toISOString()
                });

            if (!cloudErr) {
                cloudSaved = true;
            } else {
                console.error("Supabase cloud save error:", cloudErr);
            }
        } catch (e) {
            console.error("Supabase cloud save exception:", e);
        }

        // 2. If on Localhost dev server, also save to project files on disk
        try {
            const res = await fetch('/api/admin/save-quiz-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookFile: activeBookMeta.file,
                    difficulty: difficulty,
                    data: fullBookData
                })
            });

            if (res.ok) {
                const resJson = await res.json();
                if (resJson.success) {
                    diskSaved = true;
                }
            }
        } catch (err) {}

        setHasUnsavedChanges(false);

        if (cloudSaved && diskSaved) {
            setStatusMessage({
                type: 'success',
                text: `✅ Saved to Supabase Cloud & Local Disk! (${activeBookMeta.name} - ${difficulty.toUpperCase()})`
            });
        } else if (cloudSaved) {
            setStatusMessage({
                type: 'success',
                text: `✅ Saved to Supabase Cloud! Your friend and mobile app will see these questions immediately! 🌐`
            });
        } else if (diskSaved) {
            setStatusMessage({
                type: 'success',
                text: `✅ Saved directly to local project disk! (${activeBookMeta.name})`
            });
        } else {
            setStatusMessage({
                type: 'success',
                text: `✅ Saved in browser storage!`
            });
        }
    };

    // Download JSON File
    const handleDownloadJson = () => {
        if (!fullBookData) return;
        const jsonStr = JSON.stringify(fullBookData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeBookMeta.file}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Copy JSON to Clipboard
    const handleCopyJson = async () => {
        if (!fullBookData) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(fullBookData, null, 2));
            alert('JSON copied to clipboard!');
        } catch (e) {
            alert('Could not copy to clipboard.');
        }
    };

    // Helper to load and save a specific difficulty's chapter questions
    const saveDifficultyChapterQuestions = async (diff, newQuestionsList) => {
        if (!newQuestionsList || newQuestionsList.length === 0) return null;
        const docId = `${diff}_${activeBookMeta.file}`;
        const cacheKey = getCacheKey(activeBookMeta.file, diff);
        let bookData = null;

        if (diff === difficulty && fullBookData) {
            bookData = JSON.parse(JSON.stringify(fullBookData));
        } else {
            // 1. Try Supabase Cloud
            try {
                const { data: row } = await supabase.from('quiz_books').select('data').eq('id', docId).maybeSingle();
                if (row?.data?.levels) {
                    bookData = row.data;
                }
            } catch (e) {}

            // 2. Try LocalStorage
            if (!bookData) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try { bookData = JSON.parse(cached); } catch (e) {}
                }
            }

            // 3. Try client loader
            if (!bookData) {
                try {
                    const clientData = await loadQuizBookData(activeBookMeta.file, diff, true);
                    if (clientData?.levels) bookData = clientData;
                } catch (e) {}
            }

            // 4. Default empty template
            if (!bookData) {
                bookData = {
                    bookName: activeBookMeta.name,
                    chapters: activeBookMeta.chapters,
                    difficulty: diff,
                    levels: {}
                };
            }
        }

        const chapterKey = String(selectedChapter);
        const existingList = Array.isArray(bookData.levels?.[chapterKey]) ? [...bookData.levels[chapterKey]] : [];
        const updatedLevels = { ...(bookData.levels || {}), [chapterKey]: [...existingList, ...newQuestionsList] };
        bookData.levels = updatedLevels;
        bookData.difficulty = diff;

        // Save to Supabase Cloud
        try {
            await supabase.from('quiz_books').upsert({
                id: docId,
                book_file: activeBookMeta.file,
                difficulty: diff,
                data: bookData,
                updated_at: new Date().toISOString()
            });
        } catch (e) {}

        // Save to LocalStorage
        localStorage.setItem(cacheKey, JSON.stringify(bookData));

        // Save to Disk API if localhost
        try {
            await fetch('/api/admin/save-quiz-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookFile: activeBookMeta.file, difficulty: diff, data: bookData })
            });
        } catch (e) {}

        return bookData;
    };

    // Bulk Import Questions (Single Level or Multi-Level 15 All-at-Once)
    const handleBulkImport = async () => {
        setBulkError('');
        try {
            const parsed = JSON.parse(bulkJsonInput);
            const chapterKey = String(selectedChapter);

            // CASE 1: Object with difficulty keys { "beginner": [...], "intermediate": [...], "advanced": [...] }
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                const beginnerList = parsed.beginner || parsed.basic || parsed.easy || [];
                const intermediateList = parsed.intermediate || parsed.medium || [];
                const advancedList = parsed.advanced || parsed.hard || [];

                const allItems = [...beginnerList, ...intermediateList, ...advancedList];
                if (allItems.length === 0) {
                    setBulkError('No question arrays found for beginner, intermediate, or advanced.');
                    return;
                }

                // Validate each item
                for (let i = 0; i < allItems.length; i++) {
                    const item = allItems[i];
                    if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) {
                        setBulkError(`Invalid question item at index ${i}. Each question must have "question", 4 "options", and "correct" (0-3).`);
                        return;
                    }
                }

                let activeUpdatedData = null;
                const counts = [];

                if (beginnerList.length > 0) {
                    const res = await saveDifficultyChapterQuestions('beginner', beginnerList);
                    if (difficulty === 'beginner') activeUpdatedData = res;
                    counts.push(`${beginnerList.length} Beginner`);
                }
                if (intermediateList.length > 0) {
                    const res = await saveDifficultyChapterQuestions('intermediate', intermediateList);
                    if (difficulty === 'intermediate') activeUpdatedData = res;
                    counts.push(`${intermediateList.length} Intermediate`);
                }
                if (advancedList.length > 0) {
                    const res = await saveDifficultyChapterQuestions('advanced', advancedList);
                    if (difficulty === 'advanced') activeUpdatedData = res;
                    counts.push(`${advancedList.length} Advanced`);
                }

                if (activeUpdatedData) {
                    setFullBookData(activeUpdatedData);
                }

                setHasUnsavedChanges(false);
                setShowBulkModal(false);
                setBulkJsonInput('');
                setStatusMessage({
                    type: 'success',
                    text: `✅ Multi-Level Import: Added ${counts.join(', ')} to ${activeBookMeta.name} Chapter ${selectedChapter}!`
                });
                alert(`✅ Successfully imported:\n${counts.join('\n')}\ninto Chapter ${selectedChapter}!`);
                return;
            }

            // CASE 2: Array of Questions
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) {
                    setBulkError('Array cannot be empty.');
                    return;
                }

                for (let i = 0; i < parsed.length; i++) {
                    const item = parsed[i];
                    if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) {
                        setBulkError(`Item at index ${i} is invalid. Each item must have "question", 4 "options", and "correct" (0-3).`);
                        return;
                    }
                }

                // Check if items have explicit difficulty property
                const hasExplicitDiff = parsed.some(item => item.difficulty);
                if (hasExplicitDiff) {
                    const beginnerList = parsed.filter(item => {
                        const d = String(item.difficulty || '').toLowerCase();
                        return d === 'beginner' || d === 'basic' || d === 'easy';
                    });
                    const intermediateList = parsed.filter(item => {
                        const d = String(item.difficulty || '').toLowerCase();
                        return d === 'intermediate' || d === 'medium';
                    });
                    const advancedList = parsed.filter(item => {
                        const d = String(item.difficulty || '').toLowerCase();
                        return d === 'advanced' || d === 'hard';
                    });

                    let activeUpdatedData = null;
                    const counts = [];
                    if (beginnerList.length > 0) {
                        const res = await saveDifficultyChapterQuestions('beginner', beginnerList);
                        if (difficulty === 'beginner') activeUpdatedData = res;
                        counts.push(`${beginnerList.length} Beginner`);
                    }
                    if (intermediateList.length > 0) {
                        const res = await saveDifficultyChapterQuestions('intermediate', intermediateList);
                        if (difficulty === 'intermediate') activeUpdatedData = res;
                        counts.push(`${intermediateList.length} Intermediate`);
                    }
                    if (advancedList.length > 0) {
                        const res = await saveDifficultyChapterQuestions('advanced', advancedList);
                        if (difficulty === 'advanced') activeUpdatedData = res;
                        counts.push(`${advancedList.length} Advanced`);
                    }

                    if (activeUpdatedData) setFullBookData(activeUpdatedData);
                    setHasUnsavedChanges(false);
                    setShowBulkModal(false);
                    setBulkJsonInput('');
                    setStatusMessage({
                        type: 'success',
                        text: `✅ Multi-Level Import: Added ${counts.join(', ')} to ${activeBookMeta.name} Chapter ${selectedChapter}!`
                    });
                    alert(`✅ Successfully imported:\n${counts.join('\n')}\ninto Chapter ${selectedChapter}!`);
                    return;
                }

                // Check if user checked "Distribute into Beginner, Intermediate, Advanced"
                if (distribute15 && parsed.length >= 3) {
                    const chunk = Math.floor(parsed.length / 3);
                    const beginnerList = parsed.slice(0, chunk);
                    const intermediateList = parsed.slice(chunk, chunk * 2);
                    const advancedList = parsed.slice(chunk * 2);

                    let activeUpdatedData = null;
                    const bRes = await saveDifficultyChapterQuestions('beginner', beginnerList);
                    if (difficulty === 'beginner') activeUpdatedData = bRes;

                    const iRes = await saveDifficultyChapterQuestions('intermediate', intermediateList);
                    if (difficulty === 'intermediate') activeUpdatedData = iRes;

                    const aRes = await saveDifficultyChapterQuestions('advanced', advancedList);
                    if (difficulty === 'advanced') activeUpdatedData = aRes;

                    if (activeUpdatedData) setFullBookData(activeUpdatedData);
                    setHasUnsavedChanges(false);
                    setShowBulkModal(false);
                    setBulkJsonInput('');
                    setStatusMessage({
                        type: 'success',
                        text: `✅ Split & Imported: ${beginnerList.length} Beginner, ${intermediateList.length} Intermediate, ${advancedList.length} Advanced into Chapter ${selectedChapter}!`
                    });
                    alert(`✅ Successfully split & imported:\n- ${beginnerList.length} Beginner\n- ${intermediateList.length} Intermediate\n- ${advancedList.length} Advanced\ninto Chapter ${selectedChapter}!`);
                    return;
                }

                // Standard Single Level Import into current difficulty
                const updatedLevels = { ...(fullBookData?.levels || {}) };
                const existingList = Array.isArray(updatedLevels[chapterKey]) ? [...updatedLevels[chapterKey]] : [];
                const merged = [...existingList, ...parsed];
                updatedLevels[chapterKey] = merged;

                const updatedData = {
                    ...(fullBookData || {}),
                    bookName: activeBookMeta.name,
                    chapters: activeBookMeta.chapters,
                    difficulty: difficulty,
                    levels: updatedLevels
                };

                setFullBookData(updatedData);
                localStorage.setItem(getCacheKey(activeBookMeta.file, difficulty), JSON.stringify(updatedData));
                setHasUnsavedChanges(true);
                setShowBulkModal(false);
                setBulkJsonInput('');
                alert(`Successfully added ${parsed.length} questions to Chapter ${selectedChapter} (${difficulty.toUpperCase()})!`);
            }
        } catch (e) {
            setBulkError(`Invalid JSON format: ${e.message}`);
        }
    };

    // Keyboard shortcuts:
    // - Ctrl+S / Cmd+S: Save to Supabase Cloud & Disk
    // - 'b' / 'B' / Alt+B / Ctrl+B: Open Bulk Import Modal
    // - In Bulk Modal:
    //   - 'i' / 'I' / Ctrl+I / Alt+I / Ctrl+Enter / Cmd+Enter: Execute Bulk Import
    //   - Escape: Close Bulk Import Modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isInputActive = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

            // 1. Save shortcut: Ctrl+S / Cmd+S
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                e.stopPropagation();
                handleSaveToDisk();
                return;
            }

            // 2. When Bulk Import Modal is OPEN
            if (showBulkModal) {
                // Escape key to cancel/close
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowBulkModal(false);
                    return;
                }

                // Import shortcut:
                // - Ctrl+I / Cmd+I
                // - Alt+I
                // - Ctrl+Enter / Cmd+Enter
                // - 'i' / 'I' when textarea is not actively being edited or focused
                const isCtrlI = (e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I');
                const isAltI = e.altKey && (e.key === 'i' || e.key === 'I');
                const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
                const isPlainI = !isInputActive && (e.key === 'i' || e.key === 'I');

                if (isCtrlI || isAltI || isCtrlEnter || isPlainI) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBulkImport();
                    return;
                }
            }

            // 3. When Bulk Import Modal is CLOSED
            if (!showBulkModal) {
                // 'b' / 'B' (when not inside an input) or Alt+B / Ctrl+B
                const isPlainB = !isInputActive && (e.key === 'b' || e.key === 'B');
                const isAltB = e.altKey && (e.key === 'b' || e.key === 'B');
                const isCtrlB = (e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B');

                if (isPlainB || isAltB || isCtrlB) {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowBulkModal(true);
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [fullBookData, activeBookMeta, difficulty, showBulkModal, bulkJsonInput, selectedChapter]);

    return (
        <div style={styles.webPageContainer}>
            {/* Top Desktop Navigation Bar */}
            <header style={styles.webHeader}>
                <div style={styles.webHeaderLeft}>
                    <button onClick={() => navigate('/')} style={styles.webBackBtn}>
                        ← Back to App
                    </button>
                    <div>
                        <div style={styles.webLogoTitle}>
                            📖 Bible Quiz Admin Workspace
                            <span style={styles.webDesktopTag}>DESKTOP WEB</span>
                        </div>
                        <div style={styles.webHeaderSub}>
                            Full-Screen Desktop Question & Chapter Manager (Beginner, Intermediate, Advanced)
                        </div>
                    </div>
                </div>

                <div style={styles.webHeaderCenter}>
                    {DIFFICULTIES.map(d => (
                        <button
                            key={d.id}
                            onClick={() => setDifficulty(d.id)}
                            style={{
                                ...styles.diffTabBtn,
                                borderColor: difficulty === d.id ? d.color : 'transparent',
                                backgroundColor: difficulty === d.id ? `${d.color}20` : 'rgba(255,255,255,0.05)',
                                color: difficulty === d.id ? d.color : '#94A3B8'
                            }}
                        >
                            {d.badge} {d.label}
                        </button>
                    ))}
                </div>

                <div style={styles.webHeaderRight}>
                    {hasUnsavedChanges && (
                        <span style={styles.unsavedNotice}>⚠️ Unsaved changes</span>
                    )}
                    <button
                        onClick={handleSaveToDisk}
                        style={{ ...styles.actionBtn, ...styles.saveBtn }}
                        title="Save directly to project disk (Ctrl+S)"
                    >
                        💾 Save to Project (Ctrl+S)
                    </button>
                    <button
                        onClick={handleDownloadJson}
                        style={{ ...styles.actionBtn, ...styles.secondaryBtn }}
                        title="Download JSON file"
                    >
                        📥 Download JSON
                    </button>
                    <button
                        onClick={handleCopyJson}
                        style={{ ...styles.actionBtn, ...styles.secondaryBtn }}
                        title="Copy JSON"
                    >
                        📋 Copy JSON
                    </button>
                    <button
                        onClick={() => setShowBulkModal(true)}
                        style={{ ...styles.actionBtn, ...styles.bulkBtn }}
                        title="Paste bulk questions (Shortcut: B)"
                    >
                        ⚡ Bulk Import <kbd style={styles.kbdBadge}>B</kbd>
                    </button>
                </div>
            </header>

            {/* Status Alert Banner */}
            {statusMessage && (
                <div style={{
                    ...styles.statusBanner,
                    backgroundColor: statusMessage.type === 'success' ? '#065F46' : statusMessage.type === 'warning' ? '#92400E' : '#1E3A8A'
                }}>
                    <span>{statusMessage.text}</span>
                    <button onClick={() => setStatusMessage(null)} style={styles.bannerCloseBtn}>✕</button>
                </div>
            )}

            {/* Desktop 3-Column Wide Workspace */}
            <div style={styles.desktopWorkspace}>
                {/* Column 1: Book Selection & Search (Left Panel) */}
                <section style={styles.leftCol}>
                    <div style={styles.panelTitleRow}>
                        <span style={styles.panelTitle}>1. Bible Books (66)</span>
                        <span style={styles.panelBadge}>{testamentFilter}</span>
                    </div>

                    <div style={styles.testamentSwitch}>
                        {['ALL', 'OT', 'NT'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTestamentFilter(t)}
                                style={{
                                    ...styles.testamentSwitchBtn,
                                    backgroundColor: testamentFilter === t ? '#6366F1' : 'transparent',
                                    color: testamentFilter === t ? '#FFFFFF' : '#94A3B8'
                                }}
                            >
                                {t === 'ALL' ? 'All (66)' : t === 'OT' ? 'Old (39)' : 'New (27)'}
                            </button>
                        ))}
                    </div>

                    <div style={styles.searchBox}>
                        <input
                            type="text"
                            placeholder="🔍 Search (Genesis, మత్తయి)..."
                            value={bookSearch}
                            onChange={e => setBookSearch(e.target.value)}
                            style={styles.searchInput}
                        />
                        {bookSearch && (
                            <button onClick={() => setBookSearch('')} style={styles.clearSearchBtn}>✕</button>
                        )}
                    </div>

                    <div style={styles.booksScrollArea}>
                        {filteredBooks.map(b => {
                            const isSelected = b.id === selectedBookId;
                            return (
                                <div
                                    key={b.id}
                                    onClick={() => {
                                        setSelectedBookId(b.id);
                                        setSelectedChapter(1);
                                    }}
                                    style={{
                                        ...styles.bookRow,
                                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.03)',
                                        borderColor: isSelected ? '#818CF8' : 'rgba(255,255,255,0.08)'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={styles.bookRowName}>
                                            {b.name} <span style={styles.teluguName}>({b.teluguName})</span>
                                        </div>
                                        <div style={styles.bookRowSub}>
                                            {b.testament} • {b.chapters} Chapters • {b.file}.json
                                        </div>
                                    </div>
                                    <span style={{
                                        ...styles.bookTag,
                                        backgroundColor: b.testament === 'OT' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        color: b.testament === 'OT' ? '#FBBF24' : '#6EE7B7'
                                    }}>
                                        {b.testament}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Book Summary Card */}
                    <div style={styles.bookStatsCard}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#F1F5F9' }}>
                            📖 {activeBookMeta.name} ({activeBookMeta.teluguName})
                        </div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                            Mode: <b style={{ color: '#F59E0B' }}>{difficulty.toUpperCase()}</b> • Questions in Book: <b style={{ color: '#10B981', fontSize: '14px' }}>{totalBookQuestions}</b>
                        </div>
                    </div>
                </section>

                {/* Column 2: Chapter Selection & Question Form (Center Panel) */}
                <section style={styles.midCol}>
                    {/* Chapter Grid */}
                    <div style={styles.chapterCard}>
                        <div style={styles.chapterCardHead}>
                            <span style={styles.panelTitle}>
                                2. Select Chapter ({activeBookMeta.name})
                            </span>
                            <span style={{ fontSize: '13px', color: '#38BDF8', fontWeight: 'bold' }}>
                                Chapter {selectedChapter}: {currentChapterQuestions.length} Questions
                            </span>
                        </div>

                        <div style={styles.chapterPillGrid}>
                            {Array.from({ length: activeBookMeta.chapters }, (_, i) => i + 1).map(chapNum => {
                                const qCount = Array.isArray(fullBookData?.levels?.[String(chapNum)])
                                    ? fullBookData.levels[String(chapNum)].length
                                    : 0;
                                const isSelected = chapNum === selectedChapter;

                                return (
                                    <button
                                        key={chapNum}
                                        onClick={() => {
                                            setSelectedChapter(chapNum);
                                            resetForm();
                                        }}
                                        style={{
                                            ...styles.chapterPill,
                                            backgroundColor: isSelected ? '#6366F1' : qCount > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                                            borderColor: isSelected ? '#A5B4FC' : qCount > 0 ? '#10B981' : 'rgba(255,255,255,0.1)',
                                            color: isSelected ? '#FFFFFF' : qCount > 0 ? '#6EE7B7' : '#94A3B8'
                                        }}
                                        title={`Chapter ${chapNum}: ${qCount} questions`}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{chapNum}</span>
                                        {qCount > 0 && <span style={styles.chapterCountBadge}>{qCount}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Question Input Form */}
                    <div style={styles.questionFormCard}>
                        <div style={styles.formCardHead}>
                            <div>
                                <span style={styles.panelTitle}>
                                    {editingIndex !== null ? `✏️ EDITING QUESTION #${editingIndex + 1}` : `➕ ADD QUESTION (Ch ${selectedChapter})`}
                                </span>
                                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                    {activeBookMeta.name} ➔ Chapter {selectedChapter} ➔ {difficulty}
                                </div>
                            </div>

                            {/* Top Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={handleSaveQuestionToChapter}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        color: '#FFFFFF',
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        backgroundColor: editingIndex !== null ? '#F59E0B' : '#10B981',
                                        boxShadow: editingIndex !== null ? '0 2px 10px rgba(245, 158, 11, 0.35)' : '0 2px 10px rgba(16, 185, 129, 0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {editingIndex !== null ? '💾' : '➕'}
                                </button>
                                {editingIndex !== null && (
                                    <button onClick={resetForm} style={styles.cancelEditBtn}>
                                        Cancel Edit
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#D1D5DB',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSaveQuestionToChapter} style={styles.formContainer}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>
                                    Question Text (Telugu & English):
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Type question here (e.g. ఆదియందు దేవుడు వేటిని సృజించెను?)..."
                                    value={questionText}
                                    onChange={e => setQuestionText(e.target.value)}
                                    style={styles.formTextarea}
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>
                                    4 Options (Click letter to mark as Correct Answer):
                                </label>

                                {options.map((opt, idx) => {
                                    const isCorrect = correctOptionIndex === idx;
                                    const label = ['A', 'B', 'C', 'D'][idx];
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                ...styles.optionInputRow,
                                                borderColor: isCorrect ? '#10B981' : 'rgba(255,255,255,0.1)',
                                                backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)'
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setCorrectOptionIndex(idx)}
                                                style={{
                                                    ...styles.optionSelectBtn,
                                                    backgroundColor: isCorrect ? '#10B981' : '#4B5563',
                                                    color: '#FFFFFF'
                                                }}
                                                title={`Click to mark ${label} as correct answer`}
                                            >
                                                {label}
                                            </button>

                                            <input
                                                type="text"
                                                placeholder={`Option ${label} answer text...`}
                                                value={opt}
                                                onChange={e => handleOptionChange(idx, e.target.value)}
                                                style={styles.optionTextInput}
                                                required
                                            />

                                            {isCorrect && (
                                                <span style={styles.correctIndicator}>
                                                    ✓ Correct Answer
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </form>
                    </div>
                </section>

                {/* Column 3: Live Chapter Questions View (Right Panel) */}
                <section style={styles.rightCol}>
                    <div style={styles.panelTitleRow}>
                        <div>
                            <span style={styles.panelTitle}>
                                3. Questions in Chapter {selectedChapter} ({currentChapterQuestions.length})
                            </span>
                            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                                Book: <b>{activeBookMeta.name}</b> • Mode: <b>{difficulty}</b>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                                onClick={handleClearAllChapterQuestions}
                                disabled={currentChapterQuestions.length === 0}
                                style={{
                                    ...styles.quickClearBtn,
                                    opacity: currentChapterQuestions.length === 0 ? 0.45 : 1,
                                    cursor: currentChapterQuestions.length === 0 ? 'not-allowed' : 'pointer'
                                }}
                                title={`Clear all ${currentChapterQuestions.length} questions in Chapter ${selectedChapter}`}
                            >
                                🗑️ Clear All ({currentChapterQuestions.length})
                            </button>
                            <button onClick={() => setShowBulkModal(true)} style={styles.quickBulkBtn} title="Bulk Import (Shortcut: B)">
                                ⚡ Bulk Import <kbd style={styles.kbdBadge}>B</kbd>
                            </button>
                        </div>
                    </div>

                    {loadingBook ? (
                        <div style={styles.emptyNotice}>Loading questions...</div>
                    ) : currentChapterQuestions.length === 0 ? (
                        <div style={styles.emptyNotice}>
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📝</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#E2E8F0' }}>
                                No questions in Chapter {selectedChapter} yet ({difficulty})
                            </div>
                            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px', maxWidth: '340px' }}>
                                Use the middle form to add your first question or click <b>"Bulk Import"</b> to paste a list of questions!
                            </div>
                            {difficulty !== 'beginner' && (
                                <button
                                    type="button"
                                    onClick={handleCopyBeginnerChapter}
                                    style={{
                                        marginTop: '15px',
                                        padding: '8px 16px',
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        border: '1px solid #818CF8',
                                        borderRadius: '8px',
                                        color: '#A5B4FC',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                    title="Copy the beginner questions as a starting point to edit"
                                >
                                    📋 Copy Beginner Ch {selectedChapter} as Template
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={styles.questionsStream}>
                            {currentChapterQuestions.map((q, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        ...styles.qStreamCard,
                                        borderColor: editingIndex === idx ? '#F59E0B' : 'rgba(255,255,255,0.1)'
                                    }}
                                >
                                    <div style={styles.qStreamHead}>
                                        <span style={styles.qNumTag}>
                                            Question #{idx + 1}
                                        </span>

                                        <div style={styles.qBtnGroup}>
                                            <button
                                                onClick={() => handleMoveQuestion(idx, -1)}
                                                disabled={idx === 0}
                                                style={styles.qSmallBtn}
                                                title="Move Up"
                                            >
                                                ⬆️
                                            </button>
                                            <button
                                                onClick={() => handleMoveQuestion(idx, 1)}
                                                disabled={idx === currentChapterQuestions.length - 1}
                                                style={styles.qSmallBtn}
                                                title="Move Down"
                                            >
                                                ⬇️
                                            </button>
                                            <button
                                                onClick={() => handleDuplicateQuestion(idx)}
                                                style={styles.qSmallBtn}
                                                title="Duplicate"
                                            >
                                                📋
                                            </button>
                                            <button
                                                onClick={() => handleEditQuestion(idx)}
                                                style={{ ...styles.qSmallBtn, ...styles.editBtnStyle }}
                                                title="Edit Question"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(idx)}
                                                style={{ ...styles.qSmallBtn, ...styles.deleteBtnStyle }}
                                                title="Delete Question"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    <div style={styles.qTextDisplay}>
                                        {q.question}
                                    </div>

                                    <div style={styles.qOptions2x2}>
                                        {q.options?.map((opt, optIdx) => {
                                            const isAnswer = q.correct === optIdx;
                                            return (
                                                <div
                                                    key={optIdx}
                                                    style={{
                                                        ...styles.qOptionBox,
                                                        backgroundColor: isAnswer ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.04)',
                                                        borderColor: isAnswer ? '#10B981' : 'transparent',
                                                        color: isAnswer ? '#6EE7B7' : '#D1D5DB'
                                                    }}
                                                >
                                                    <b style={{ marginRight: '6px' }}>{['A', 'B', 'C', 'D'][optIdx]}:</b>
                                                    <span>{opt}</span>
                                                    {isAnswer && <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>✓</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Bulk Import Modal */}
            {showBulkModal && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, maxWidth: '780px' }}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#FFFFFF' }}>
                                ⚡ Bulk Import Questions — {activeBookMeta.name} (Chapter {selectedChapter})
                            </h3>
                            <button onClick={() => setShowBulkModal(false)} style={styles.modalCloseBtn} title="Close (Esc)">✕</button>
                        </div>

                        {/* Template Format Selector */}
                        <div style={{ display: 'flex', gap: '8px', margin: '14px 0 10px 0' }}>
                            <button
                                type="button"
                                onClick={() => setBulkTemplateTab('single')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    borderColor: bulkTemplateTab === 'single' ? '#8B5CF6' : 'rgba(255,255,255,0.15)',
                                    backgroundColor: bulkTemplateTab === 'single' ? '#8B5CF625' : 'transparent',
                                    color: bulkTemplateTab === 'single' ? '#C4B5FD' : '#94A3B8'
                                }}
                            >
                                📄 Format 1: Standard Array ({difficulty.toUpperCase()})
                            </button>
                            <button
                                type="button"
                                onClick={() => setBulkTemplateTab('all3')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    borderColor: bulkTemplateTab === 'all3' ? '#10B981' : 'rgba(255,255,255,0.15)',
                                    backgroundColor: bulkTemplateTab === 'all3' ? '#10B98125' : 'transparent',
                                    color: bulkTemplateTab === 'all3' ? '#6EE7B7' : '#94A3B8'
                                }}
                            >
                                🌟 Format 2: All 3 Levels at Once (15 Questions: 5 Basic + 5 Inter + 5 Adv)
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' }}>
                            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                                {bulkTemplateTab === 'all3'
                                    ? 'Paste JSON object with "beginner", "intermediate", and "advanced" arrays:'
                                    : `Paste JSON array of questions to add to ${difficulty.toUpperCase()}:`}
                            </p>
                            <span style={{ fontSize: '12px', color: '#A5B4FC' }}>
                                <kbd style={styles.kbdBadge}>Ctrl+I</kbd> / <kbd style={styles.kbdBadge}>Ctrl+Enter</kbd> to Import • <kbd style={styles.kbdBadge}>Esc</kbd> to Cancel
                            </span>
                        </div>

                        <textarea
                            ref={bulkTextareaRef}
                            rows={11}
                            placeholder={bulkTemplateTab === 'all3' ? `{\n  "beginner": [\n    { "question": "Beginner Q1...", "options": ["A", "B", "C", "D"], "correct": 0 },\n    { "question": "Beginner Q2...", "options": ["A", "B", "C", "D"], "correct": 1 }\n  ],\n  "intermediate": [\n    { "question": "Intermediate Q1...", "options": ["A", "B", "C", "D"], "correct": 2 }\n  ],\n  "advanced": [\n    { "question": "Advanced Q1...", "options": ["A", "B", "C", "D"], "correct": 3 }\n  ]\n}` : `[\n  {\n    "question": "దేవుడు వెలుగునకు ఏమని పేరు పెట్టెను?",\n    "options": ["రాత్రి", "పగలు", "ఆకాశము", "భూమి"],\n    "correct": 1\n  }\n]`}
                            value={bulkJsonInput}
                            onChange={e => setBulkJsonInput(e.target.value)}
                            style={styles.modalTextarea}
                        />

                        {/* Split 15 checkbox for flat arrays */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#E2E8F0' }}>
                                <input
                                    type="checkbox"
                                    checked={distribute15}
                                    onChange={e => setDistribute15(e.target.checked)}
                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                                <span>Distribute array evenly across <b>Beginner, Intermediate & Advanced</b> (e.g. 5 each for 15 questions)</span>
                            </label>
                        </div>

                        {bulkError && (
                            <div style={styles.modalError}>⚠️ {bulkError}</div>
                        )}

                        <div style={styles.modalActions}>
                            <button onClick={handleBulkImport} style={styles.modalImportConfirmBtn} title="Import (Shortcut: Ctrl+I / I / Ctrl+Enter)">
                                Import into Chapter {selectedChapter} <kbd style={{ ...styles.kbdBadge, backgroundColor: 'rgba(255,255,255,0.25)', marginLeft: '8px' }}>Ctrl+I / I</kbd>
                            </button>
                            <button onClick={() => setShowBulkModal(false)} style={styles.modalCancelBtn} title="Cancel (Esc)">
                                Cancel <kbd style={{ ...styles.kbdBadge, marginLeft: '6px' }}>Esc</kbd>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    webPageContainer: {
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0B0F19',
        color: '#F8FAFC',
        fontFamily: "'Roboto', 'Mandali', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
    },
    webHeader: {
        height: '70px',
        padding: '0 28px',
        backgroundColor: '#111827',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 30
    },
    webHeaderLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    webBackBtn: {
        padding: '8px 14px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#FFFFFF',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    webLogoTitle: {
        fontSize: '17px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    webDesktopTag: {
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: '#3B82F6',
        color: '#FFFFFF'
    },
    webHeaderSub: {
        fontSize: '12px',
        color: '#94A3B8'
    },
    webHeaderCenter: {
        display: 'flex',
        gap: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
    },
    diffTabBtn: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '2px solid transparent',
        fontWeight: 'bold',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.15s'
    },
    webHeaderRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    unsavedNotice: {
        padding: '4px 10px',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        border: '1px solid #F59E0B',
        color: '#FBBF24',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    actionBtn: {
        padding: '9px 15px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 'bold',
        cursor: 'pointer',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    saveBtn: {
        backgroundColor: '#10B981',
        color: '#FFFFFF',
        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
    },
    secondaryBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        color: '#E2E8F0',
        border: '1px solid rgba(255, 255, 255, 0.15)'
    },
    bulkBtn: {
        backgroundColor: '#8B5CF6',
        color: '#FFFFFF'
    },
    statusBanner: {
        padding: '10px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: 'bold',
        flexShrink: 0
    },
    bannerCloseBtn: {
        background: 'none',
        border: 'none',
        color: '#FFFFFF',
        fontSize: '16px',
        cursor: 'pointer'
    },
    desktopWorkspace: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '300px 480px 1fr',
        overflow: 'hidden',
        backgroundColor: '#0B0F19'
    },
    leftCol: {
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '12px',
        overflow: 'hidden'
    },
    panelTitleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    panelTitle: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#E2E8F0',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    panelBadge: {
        fontSize: '11px',
        fontWeight: 'bold',
        padding: '2px 8px',
        borderRadius: '10px',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        color: '#A5B4FC'
    },
    testamentSwitch: {
        display: 'flex',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '2px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
    },
    testamentSwitchBtn: {
        flex: 1,
        padding: '6px',
        borderRadius: '6px',
        border: 'none',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.15s'
    },
    searchBox: {
        position: 'relative'
    },
    searchInput: {
        width: '100%',
        padding: '9px 12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#FFFFFF',
        fontSize: '13px',
        boxSizing: 'border-box'
    },
    clearSearchBtn: {
        position: 'absolute',
        right: '10px',
        top: '8px',
        background: 'none',
        border: 'none',
        color: '#94A3B8',
        cursor: 'pointer'
    },
    booksScrollArea: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        paddingRight: '4px'
    },
    bookRow: {
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s'
    },
    bookRowName: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#FFFFFF'
    },
    teluguName: {
        color: '#93C5FD',
        fontSize: '13px',
        fontWeight: 'normal'
    },
    bookRowSub: {
        fontSize: '11px',
        color: '#94A3B8',
        marginTop: '2px'
    },
    bookTag: {
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '4px'
    },
    bookStatsCard: {
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        marginTop: 'auto'
    },
    midCol: {
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '14px',
        overflow: 'hidden'
    },
    chapterCard: {
        backgroundColor: '#1E293B',
        borderRadius: '12px',
        padding: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        flexShrink: 0
    },
    chapterCardHead: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
    },
    chapterPillGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
        gap: '6px',
        maxHeight: '120px',
        overflowY: 'auto',
        padding: '2px'
    },
    chapterPill: {
        height: '38px',
        borderRadius: '8px',
        border: '1px solid',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    chapterCountBadge: {
        fontSize: '9px',
        position: 'absolute',
        bottom: '2px',
        color: '#10B981',
        fontWeight: 'bold'
    },
    questionFormCard: {
        flex: 1,
        backgroundColor: '#1E293B',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    formCardHead: {
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.5)'
    },
    cancelEditBtn: {
        padding: '4px 10px',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        border: '1px solid #EF4444',
        color: '#F87171',
        borderRadius: '6px',
        fontSize: '12px',
        cursor: 'pointer'
    },
    formContainer: {
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        flex: 1
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    formLabel: {
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#E2E8F0'
    },
    formTextarea: {
        padding: '10px 14px',
        borderRadius: '8px',
        backgroundColor: '#0F172A',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#FFFFFF',
        fontSize: '14px',
        fontFamily: 'inherit',
        resize: 'vertical'
    },
    optionInputRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid',
        marginBottom: '6px'
    },
    optionSelectBtn: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    optionTextInput: {
        flex: 1,
        padding: '8px 12px',
        borderRadius: '6px',
        backgroundColor: '#0F172A',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#FFFFFF',
        fontSize: '13px'
    },
    correctIndicator: {
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#10B981',
        whiteSpace: 'nowrap'
    },
    formActionsRow: {
        display: 'flex',
        gap: '10px',
        marginTop: '8px'
    },
    formSubmitBtn: {
        flex: 2,
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    formClearBtn: {
        flex: 1,
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#D1D5DB',
        fontSize: '13px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    rightCol: {
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '14px',
        overflow: 'hidden'
    },
    quickClearBtn: {
        padding: '6px 12px',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '6px',
        color: '#FCA5A5',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.15s ease'
    },
    quickBulkBtn: {
        padding: '6px 12px',
        backgroundColor: '#8B5CF6',
        border: 'none',
        borderRadius: '6px',
        color: '#FFFFFF',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    emptyNotice: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94A3B8',
        textAlign: 'center'
    },
    questionsStream: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        paddingRight: '6px'
    },
    qStreamCard: {
        padding: '16px',
        borderRadius: '10px',
        backgroundColor: '#1E293B',
        border: '1px solid',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    qStreamHead: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    qNumTag: {
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#818CF8',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        padding: '3px 10px',
        borderRadius: '6px'
    },
    qBtnGroup: {
        display: 'flex',
        gap: '6px'
    },
    qSmallBtn: {
        padding: '5px 9px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#FFFFFF',
        cursor: 'pointer'
    },
    editBtnStyle: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderColor: '#F59E0B',
        color: '#FBBF24',
        fontWeight: 'bold'
    },
    deleteBtnStyle: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#EF4444',
        color: '#F87171'
    },
    qTextDisplay: {
        fontSize: '15px',
        lineHeight: '1.45',
        color: '#F8FAFC',
        fontWeight: '500'
    },
    qOptions2x2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px'
    },
    qOptionBox: {
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        border: '1px solid',
        display: 'flex',
        alignItems: 'center'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px'
    },
    modalContent: {
        width: '100%',
        maxWidth: '700px',
        backgroundColor: '#1E293B',
        borderRadius: '14px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '12px'
    },
    modalCloseBtn: {
        background: 'none',
        border: 'none',
        color: '#94A3B8',
        fontSize: '20px',
        cursor: 'pointer'
    },
    modalTextarea: {
        width: '100%',
        padding: '14px',
        backgroundColor: '#0F172A',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        color: '#38BDF8',
        fontFamily: 'monospace',
        fontSize: '13px',
        boxSizing: 'border-box'
    },
    modalError: {
        color: '#F87171',
        fontSize: '13px',
        marginTop: '8px',
        fontWeight: 'bold'
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '18px'
    },
    modalImportConfirmBtn: {
        padding: '10px 20px',
        backgroundColor: '#8B5CF6',
        border: 'none',
        color: '#FFFFFF',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    modalCancelBtn: {
        padding: '10px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#E2E8F0',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    kbdBadge: {
        fontSize: '11px',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        color: '#FFFFFF',
        fontFamily: 'monospace',
        display: 'inline-block'
    }
};
