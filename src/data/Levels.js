const bookName = window.currentBook || "Genesis";
        const grid = document.getElementById('levels-grid');
        const totalChapters = bibleData[bookName].chapters;

        // Load user progress
        const userProgress = JSON.parse(localStorage.getItem('bibleQuizProgress')) || {};
        const bookProgress = userProgress[bookName] || {};

        for (let i = 1; i <= totalChapters; i++) {
            const btn = document.createElement('button');
            btn.classList.add('level-btn');
            btn.innerText = i;

            // Check if level is unlocked (Level 1 is always unlocked, others depend on previous completion)
            // For testing, let's unlock all or just check logic
            // Logic: Level 1 is open. Level N is open if Level N-1 is completed.
            const isUnlocked = i === 1 || (bookProgress[i - 1] && bookProgress[i - 1].completed);

            if (isUnlocked) {
                btn.onclick = () => {
                    window.location.href = `quiz.html?book=${bookName}&level=${i}`;
                };
            } else {
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
                // Optional: Add lock icon
                // btn.innerHTML += " 🔒"; 
            }

            // Mark completed levels
            if (bookProgress[i] && bookProgress[i].completed) {
                btn.style.background = "linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)"; // Green for completed
                btn.innerHTML += " ✓";
            }

            grid.appendChild(btn);
        }