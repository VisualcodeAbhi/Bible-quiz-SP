const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataDir = path.join(__dirname, 'src', 'data');
const outputDir = path.join(__dirname, 'src', 'assets', 'data');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.readdir(dataDir, (err, files) => {
    if (err) {
        console.error("Could not list the directory.", err);
        process.exit(1);
    }

    files.forEach((file, index) => {
        if (!file.endsWith('.js')) return;

        const filePath = path.join(dataDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // We want to execute the code in a sandbox to get the bibleData object
        const sandbox = {};
        try {
            vm.createContext(sandbox);
            // Replace const bibleData to make it accessible in the sandbox
            const modifiedContent = content.replace(/const\s+bibleData\s*=/, 'bibleData =');
            vm.runInContext(modifiedContent, sandbox);
            
            if (sandbox.bibleData) {
                const bookKey = Object.keys(sandbox.bibleData)[0];
                const bookData = sandbox.bibleData[bookKey];
                
                // Add the book name to the data itself for easier access if needed
                bookData.bookName = bookKey;

                const outputPath = path.join(outputDir, file.replace('.js', '.json'));
                fs.writeFileSync(outputPath, JSON.stringify(bookData, null, 2));
                console.log(`Converted ${file} -> ${bookKey}`);
            } else {
                console.warn(`No bibleData found in ${file}`);
            }
        } catch (e) {
            console.error(`Error processing ${file}:`, e.message);
            // Fallback regex extraction if vm fails (e.g. syntax error or other variable)
        }
    });
});
