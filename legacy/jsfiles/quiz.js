// Get URL params
const urlParams = new URLSearchParams(window.location.search);
const bookName = urlParams.get('book') || "Genesis";
const levelNumber = parseInt(urlParams.get('level')) || 1;

// Define Data Mapping (Moved from quiz.html)
const bookDataMap = {
    "Genesis": "Gdata.js",
    "Exodus": "Edata.js",
    "Leviticus": "Ldata.js",
    "Numbers": "Ndata.js",
    "Deuteronomy": "Ddata.js",
    "Joshua": "Joshdata.js",
    "Judges": "Judgdata.js",
    "Ruth": "Ruthdata.js",
    "1 Samuel": "1Samdata.js",
    "2 Samuel": "2Samdata.js",
    "1 Kings": "1Kingsdata.js",
    "2 Kings": "2Kingsdata.js",
    "1 Chronicles": "1Chrdata.js",
    "2 Chronicles": "2Chrdata.js",
    "Ezra": "Ezradata.js",
    "Nehemiah": "Nehdata.js",
    "Tobit": "Tobitdata.js",
    "Judith": "Judithdata.js",
    "Esther": "Estherdata.js",
    "1 Maccabees": "1Maccabees.js", // Note: Filename mismatch in original HTML? Keeping as seen.
    "2 Maccabees": "2Maccabeesdata.js",
    "Job": "Jobdata.js",
    "Psalms": "Psalmsdata.js",
    "Proverbs": "Proverbsdata.js",
    "Ecclesiastes": "Ecclesiastesdata.js",
    "Song of Solomon": "SongofSolomondata.js",
    "Wisdom": "Wisdomdata.js",
    "Sirach": "Sirachdata.js",
    "Isaiah": "Isaiahdata.js",
    "Jeremiah": "Jeremiahdata.js",
    "Lamentations": "Lamentationsdata.js",
    "Baruch": "Baruchdata.js",
    "Ezekiel": "Ezekieldata.js",
    "Daniel": "Danieldata.js",
    "Hosea": "Hoseadata.js",
    "Joel": "Joeldata.js",
    "Amos": "Amosdata.js",
    "Obadiah": "Obadiahdata.js",
    "Jonah": "Jonahdata.js",
    "Micah": "Micahdata.js",
    "Nahum": "Nahumdata.js",
    "Habakkuk": "Habakkukdata.js",
    "Zephaniah": "Zephaniahdata.js",
    "Haggai": "Haggaidata.js",
    "Zechariah": "Zechariahdata.js",
    "Malachi": "Malachidata.js",
    "Matthew": "Matthewdata.js",
    "Mark": "Markdata.js",
    "Luke": "Lukedata.js",
    "John": "Johndata.js",
    "Acts": "Actsdata.js",
    "Romans": "Romansdata.js",
    "1 Corinthians": "1Corinthiansdata.js",
    "2 Corinthians": "2Corinthiansdata.js",
    "Galatians": "Galatiansdata.js",
    "Ephesians": "Ephesiansdata.js",
    "Philippians": "Philippiansdata.js",
    "Colossians": "Colossiansdata.js",
    "1 Thessalonians": "1Thessaloniansdata.js",
    "2 Thessalonians": "2Thessaloniansdata.js",
    "1 Timothy": "1Timothydata.js",
    "2 Timothy": "2Timothydata.js",
    "Titus": "Titusdata.js",
    "Philemon": "Philemondata.js",
    "Hebrews": "Hebrewsdata.js",
    "James": "Jamesdata.js",
    "1 Peter": "1Peterdata.js",
    "2 Peter": "2Peterdata.js",
    "1 John": "1Johndata.js",
    "2 John": "2Johndata.js",
    "3 John": "3Johndata.js",
    "Jude": "Judedata.js",
    "Revelation": "Revelationdata.js"
};

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeLeft = 30;
let canAnswer = true;

const timerElement = document.getElementById('timer');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const nextBtn = document.getElementById('next-btn');
const quizContainer = document.getElementById('quiz-container');
const scoreboardContainer = document.getElementById('scoreboard-container');
const scoreElement = document.getElementById('score');
const nextLevelBtn = document.getElementById('next-level-btn');
const feedbackOverlay = document.getElementById('feedback-overlay');
const loadingOverlay = document.getElementById('loading-overlay');
const levelPageMap = {
    "Genesis": "Glevels.html",
    "Exodus": "Elevels.html",
    "Leviticus": "Llevels.html",
    "Numbers": "Nlevels.html",
    "Deuteronomy": "Dlevels.html",
    "Joshua": "Joshlevels.html",
    "Judges": "Judglevels.html",
    "Ruth": "Ruthlevels.html",
    "1 Samuel": "1Samlevels.html",
    "2 Samuel": "2Samlevels.html",
    "1 Kings": "1Kingslevels.html",
    "2 Kings": "2Kingslevels.html",
    "1 Chronicles": "1Chrlevels.html",
    "2 Chronicles": "2Chrlevels.html",
    "Ezra": "Ezralevels.html",
    "Nehemiah": "Nehlevels.html",
    "Tobit": "Tobitlevels.html",
    "Judith": "Judithlevels.html",
    "Esther": "Estherlevels.html",
    "1 Maccabees": "1Maccabeeslevels.html",
    "2 Maccabees": "2Maccabeeslevels.html",
    "Job": "Joblevels.html",
    "Psalms": "Psalmslevels.html",
    "Proverbs": "Proverbslevels.html",
    "Ecclesiastes": "Ecclesiasteslevels.html",
    "Song of Solomon": "SongofSolomonlevels.html",
    "Wisdom": "Wisdomlevels.html",
    "Sirach": "Sirachlevels.html",
    "Isaiah": "Isaiahlevels.html",
    "Jeremiah": "Jeremiahlevels.html",
    "Lamentations": "Lamentationslevels.html",
    "Baruch": "Baruchlevels.html",
    "Ezekiel": "Ezekiellevels.html",
    "Daniel": "Daniellevels.html",
    "Hosea": "Hosealevels.html",
    "Joel": "Joellevels.html",
    "Amos": "Amoslevels.html",
    "Obadiah": "Obadiahlevels.html",
    "Jonah": "Jonahlevels.html",
    "Micah": "Micahlevels.html",
    "Nahum": "Nahumlevels.html",
    "Habakkuk": "Habakkuklevels.html",
    "Zephaniah": "Zephaniahlevels.html",
    "Haggai": "Haggailevels.html",
    "Zechariah": "Zechariahlevels.html",
    "Malachi": "Malachilevels.html",
    "Matthew": "Matthewlevels.html",
    "Mark": "Marklevels.html",
    "Luke": "Lukelevels.html",
    "John": "Johnlevels.html",
    "Acts": "Actslevels.html",
    "Romans": "Romanslevels.html",
    "1 Corinthians": "1Corinthianslevels.html",
    "2 Corinthians": "2Corinthianslevels.html",
    "Galatians": "Galatianslevels.html",
    "Ephesians": "Ephesianslevels.html",
    "Philippians": "Philippianslevels.html",
    "Colossians": "Colossianslevels.html",
    "1 Thessalonians": "1Thessalonianslevels.html",
    "2 Thessalonians": "2Thessalonianslevels.html",
    "1 Timothy": "1Timothylevels.html",
    "2 Timothy": "2Timothylevels.html",
    "Titus": "Tituslevels.html",
    "Philemon": "Philemonlevels.html",
    "Hebrews": "Hebrewslevels.html",
    "James": "Jameslevels.html",
    "1 Peter": "1Peterlevels.html",
    "2 Peter": "2Peterlevels.html",
    "1 John": "1Johnlevels.html",
    "2 John": "2Johnlevels.html",
    "3 John": "3Johnlevels.html",
    "Jude": "Judelevels.html",
    "Revelation": "Revelationlevels.html"
};

// Initialize Logic
function initQuiz() {
    console.log(`Initializing Quiz for: ${bookName}, Level: ${levelNumber}`);
    
    // Show Loader
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    // Update Header Info
    document.getElementById('book-title').innerText = bookName;
    
    // Determine Script Source
    const scriptFile = bookDataMap[bookName] || 'Gdata.js';
    const scriptPath = `jsfiles/${scriptFile}`;
    
    // Handle Back Arrow
    document.getElementById('back-arrow').addEventListener('click', () => {
        window.location.href = levelPageMap[bookName] || "OT.html";
    });

    console.log(`Loading data from: ${scriptPath}`);

    // Dynamically load the script
    const script = document.createElement('script');
    script.src = scriptPath;
    
    script.onload = () => {
        console.log("Data script loaded successfully.");
        
        // Hide Loader
        if (loadingOverlay) loadingOverlay.style.display = 'none';

        // Check if bibleData is defined
        if (typeof bibleData === 'undefined') {
            console.error("bibleData is undefined after script load!");
            questionText.innerText = "Error: Data file corrupted or empty.";
            return;
        }
        
        // Update Chapter Info (Just Chapter Number)
        document.getElementById('chapter-info').innerText = `Chapter ${levelNumber}`;

        loadQuestions();
        startQuiz();
    };

    script.onerror = () => {
        console.error("Failed to load data script.");
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        questionText.innerText = "Error: Could not load quiz data. Check internet connection.";
    };

    document.head.appendChild(script);
}

function loadQuestions() {
    // Load questions from data.js
    if (bibleData[bookName] && bibleData[bookName].levels[levelNumber]) {
        questions = bibleData[bookName].levels[levelNumber];
    } else {
        console.warn(`Data missing for ${bookName} Level ${levelNumber}`);
        // Fallback or placeholder if data missing
        questions = [
            { question: "No questions found for this level.", options: ["OK"], correct: 0 }
        ];
        questionText.innerText = "No questions found for this level.";
    }
}

function startQuiz() {
    if (questions.length === 0 || questions[0].question === "No questions found for this level.") {
         // Should show error state in showQuestion or handled here
    }
    currentQuestionIndex = 0;
    score = 0;
    showQuestion();
}

function showQuestion() {
    resetState();
    
    // Safety check
    if (!questions || questions.length === 0) {
        questionText.innerText = "No questions availalble.";
        return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    questionText.innerText = currentQuestion.question;
    
    // Update Header with Question Count
    document.getElementById('chapter-info').innerText = `Chapter ${levelNumber} - ${currentQuestionIndex + 1}/${questions.length}`;

    currentQuestion.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.innerText = option;
        button.classList.add('option-btn');
        button.addEventListener('click', () => selectAnswer(index));
        optionsContainer.appendChild(button);
    });

    startTimer();
}

function resetState() {
    canAnswer = true;
    clearInterval(timer);
    timeLeft = 30;
    timerElement.innerText = timeLeft;
    optionsContainer.innerHTML = '';
    nextBtn.style.display = 'none';
    feedbackOverlay.style.display = 'none';
    feedbackOverlay.innerHTML = '';
}

function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        timerElement.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeOut();
        }
    }, 1000);
}

function handleTimeOut() {
    canAnswer = false;
    showFeedback(false);
    setTimeout(() => {
        nextQuestion();
    }, 2000);
}

function selectAnswer(selectedIndex) {
    if (!canAnswer) return;
    canAnswer = false;
    clearInterval(timer);

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedIndex === currentQuestion.correct;
    
    // Highlight options
    const options = optionsContainer.querySelectorAll('.option-btn');
    options.forEach((btn, index) => {
        // Disable further clicks
        btn.style.pointerEvents = 'none';
        
        if (index === currentQuestion.correct) {
            btn.classList.add('correct');
        }
        if (index === selectedIndex && !isCorrect) {
            btn.classList.add('wrong');
        }
    });

    if (isCorrect) {
        score++;
        showFeedback(true);
    } else {
        showFeedback(false);
    }

    setTimeout(() => {
        nextQuestion();
    }, 2500);
}

function showFeedback(isCorrect) {
    feedbackOverlay.style.display = 'flex';
    if (isCorrect) {
        feedbackOverlay.innerHTML = '<div class="feedback-icon correct">✓</div>';
        createConfetti();
    } else {
        feedbackOverlay.innerHTML = '<div class="feedback-icon wrong">✗</div>';
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        showQuestion();
    } else {
        showScoreboard();
    }
}

function showScoreboard() {
    feedbackOverlay.style.display = 'none'; // Ensure feedback overlay is hidden
    quizContainer.style.display = 'none';
    scoreboardContainer.style.display = 'flex';
    scoreElement.innerText = score;
    
    saveProgress();
}

function saveProgress() {
    const userProgress = JSON.parse(localStorage.getItem('bibleQuizProgress')) || {};
    if (!userProgress[bookName]) userProgress[bookName] = {};
    
    // Save level completion
    userProgress[bookName][levelNumber] = {
        completed: true,
        score: score,
        total: questions.length,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('bibleQuizProgress', JSON.stringify(userProgress));
}

nextLevelBtn.addEventListener('click', () => {
    const nextLevel = levelNumber + 1;
    if (nextLevel <= bibleData[bookName].chapters) {
        window.location.href = `quiz.html?book=${bookName}&level=${nextLevel}`;
    } else {
        alert("Congratulations! You have completed this book!");
        window.location.href = levelPageMap[bookName] || "OT.html";
    }
});

document.getElementById('go-home-btn').addEventListener('click', () => {
    window.location.href = levelPageMap[bookName] || "OT.html";
});

// Simple Confetti Implementation
function createConfetti() {
    const colors = ['#ffc107', '#ff0000', '#00ff00', '#0000ff', '#ff00ff'];
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDuration = (Math.random() * 2 + 1) + 's';
        confetti.style.opacity = Math.random();
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

// Helper to toggle loader manually if needed
function toggleLoader(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Start the quiz logic immediately (the script itself is defer or at bottom of body)
// But to be safe, call initQuiz
initQuiz();
