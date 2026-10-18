/**
 * Resizes and compresses an image (File, Blob, or base64 Data URL)
 * into an ultra-compact square avatar (~2KB to 3KB max).
 *
 * Prevents bloated JSON rows in the Supabase profiles.game_data database column.
 */

export const dataUrlToBlob = (dataUrl) => {
    try {
        const arr = dataUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.warn("Failed to convert dataUrl to Blob:", e);
        return null;
    }
};

export const compressAvatar = (imageInput, maxDimension = 96, quality = 0.6) => {
    return new Promise((resolve) => {
        if (!imageInput) return resolve(null);

        // If it's an HTTP/HTTPS URL (e.g. Google avatar URL), keep it as is
        if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
            return resolve(imageInput);
        }

        // If it's already an ultra-compact data URL (<= 3200 characters), no re-compression needed
        if (typeof imageInput === 'string' && imageInput.startsWith('data:image') && imageInput.length <= 3200) {
            return resolve(imageInput);
        }

        const processImg = (imgSrc) => {
            const img = new Image();
            // NEVER set crossOrigin on data: or blob: URIs — it triggers tainted canvas security errors in mobile WebViews
            if (typeof imgSrc === 'string' && imgSrc.startsWith('http')) {
                img.crossOrigin = 'anonymous';
            }

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const width = img.naturalWidth || img.width || 96;
                    const height = img.naturalHeight || img.height || 96;

                    // Center square crop
                    const minSide = Math.min(width, height);
                    const startX = (width - minSide) / 2;
                    const startY = (height - minSide) / 2;

                    const finalSize = Math.min(maxDimension, Math.max(minSide, 1));
                    canvas.width = finalSize;
                    canvas.height = finalSize;

                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'medium';
                    ctx.drawImage(
                        img,
                        startX, startY, minSide, minSide,
                        0, 0, finalSize, finalSize
                    );

                    // Compress to JPEG at specified quality
                    let compressed = canvas.toDataURL('image/jpeg', quality);

                    // If still larger than 3.8KB (e.g. detailed texture), step down resolution & quality
                    if (compressed.length > 3800) {
                        const microCanvas = document.createElement('canvas');
                        microCanvas.width = 80;
                        microCanvas.height = 80;
                        const mCtx = microCanvas.getContext('2d');
                        mCtx.imageSmoothingEnabled = true;
                        mCtx.drawImage(canvas, 0, 0, 80, 80);
                        compressed = microCanvas.toDataURL('image/jpeg', 0.5);
                    }

                    resolve(compressed);
                } catch (err) {
                    console.warn("Avatar compression failed:", err);
                    // NEVER fallback to raw uncompressed 5MB image!
                    resolve(null);
                }
            };

            img.onerror = () => {
                console.warn("Image load failed in avatar compressor");
                resolve(null);
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
