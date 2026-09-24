/**
 * Resizes and compresses an image (File, Blob, or base64 Data URL)
 * into a lightweight, high-density square avatar (~4KB to 8KB).
 *
 * Prevents bloated JSON strings in Supabase database.
 */
export const compressAvatar = (imageInput, maxDimension = 160, quality = 0.75) => {
    return new Promise((resolve) => {
        if (!imageInput) return resolve(null);

        // If it's an HTTP/HTTPS URL (e.g. Google avatar URL), no compression needed
        if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
            return resolve(imageInput);
        }

        const processImg = (imgSrc) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const width = img.width;
                    const height = img.height;

                    // Center square crop
                    const minSide = Math.min(width, height);
                    const startX = (width - minSide) / 2;
                    const startY = (height - minSide) / 2;

                    const finalSize = Math.min(maxDimension, Math.max(minSide, 1));
                    canvas.width = finalSize;
                    canvas.height = finalSize;

                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(
                        img,
                        startX, startY, minSide, minSide,
                        0, 0, finalSize, finalSize
                    );

                    // Compress to JPEG at specified quality
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                } catch (err) {
                    console.warn("Avatar compression failed, fallback to original:", err);
                    resolve(typeof imageInput === 'string' ? imageInput : imgSrc);
                }
            };
            img.onerror = () => {
                resolve(typeof imageInput === 'string' ? imageInput : null);
            };
            img.src = imgSrc;
        };

        if (imageInput instanceof File || imageInput instanceof Blob) {
            const reader = new FileReader();
            reader.onload = (e) => processImg(e.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(imageInput);
        } else if (typeof imageInput === 'string') {
            processImg(imageInput);
        } else {
            resolve(null);
        }
    });
};
