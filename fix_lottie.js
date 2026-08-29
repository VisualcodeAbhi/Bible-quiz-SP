const fs = require('fs');
const path = 'src/assets/data/book_loader.json';

try {
    const raw = fs.readFileSync(path, 'utf8');
    const data = JSON.parse(raw);
    let count = 0;

    // Filter root layers
    if (data.layers) {
        const initial = data.layers.length;
        data.layers = data.layers.filter(l => {
            const isBg = (l.nm === 'bk' || l.nm === 'Solid Layer' || (l.ty === 1 && l.sc === '#ffffff'));
            if (isBg) console.log('Removing root layer:', l.nm);
            return !isBg;
        });
        count += (initial - data.layers.length);
    }

    // Filter assets layers
    if (data.assets) {
        data.assets.forEach(asset => {
            if (asset.layers) {
                const initial = asset.layers.length;
                asset.layers = asset.layers.filter(l => {
                    const isBg = (l.nm === 'bk' || l.nm === 'Solid Layer' || (l.ty === 1 && l.sc === '#ffffff'));
                    if (isBg) console.log(`Removing asset layer in ${asset.id}:`, l.nm);
                    return !isBg;
                });
                count += (initial - asset.layers.length);
            }
        });
    }

    fs.writeFileSync(path, JSON.stringify(data));
    console.log(`Fixed Lottie JSON. Removed ${count} background layers.`);

} catch (e) {
    console.error("Error fixing JSON:", e);
    process.exit(1);
}
