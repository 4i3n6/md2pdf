/**
 * PROCESSADOR DE IMAGENS - MD2PDF
 * Redimensionamento automático e cache para imagens em A4
 */

import { imageCache } from '../utils/imageCache.js';

/**
 * Obter dimensões de uma imagem de forma assíncrona
 * @param {string} src - URL da imagem
 * @returns {Promise<{width: number, height: number} | null>}
 */
export function getImageDimensions(src) {
    return new Promise((resolve) => {
        if (!src) {
            resolve(null);
            return;
        }

        const img = new Image();
        
        img.onload = () => {
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };

        img.onerror = () => {
            console.warn(`Falha ao carregar imagem: ${src}`);
            resolve(null);
        };

        // Timeout para imagens lentas
        setTimeout(() => {
            if (img.complete === false) {
                resolve(null);
            }
        }, 5000);

        img.src = src;
    });
}

/**
 * Calcular dimensões proporcionais para impressão A4
 * Mantém aspect ratio e garante que cabe em A4 (210mm x 297mm)
 * @param {number} width - Largura original em pixels
 * @param {number} height - Altura original em pixels
 * @returns {object} { width: string, height: string, maxWidth: string }
 */
export function calculatePrintDimensions(width, height) {
    if (!width || !height || width <= 0 || height <= 0) {
        return {
            width: '100%',
            height: 'auto',
            maxWidth: '100%'
        };
    }

    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const MARGIN_MM = 20; // 20mm margins
    const MAX_WIDTH_MM = A4_WIDTH_MM - (MARGIN_MM * 2); // 170mm
    const MAX_HEIGHT_MM = A4_HEIGHT_MM - (MARGIN_MM * 2); // 257mm
    const PX_PER_MM = 3.779; // Standard conversion

    // Converter pixels para mm
    const widthMm = width / PX_PER_MM;
    const heightMm = height / PX_PER_MM;

    // Calcular escala mantendo aspect ratio
    let scale = 1;
    
    if (widthMm > MAX_WIDTH_MM) {
        scale = Math.min(scale, MAX_WIDTH_MM / widthMm);
    }
    
    if (heightMm > MAX_HEIGHT_MM) {
        scale = Math.min(scale, MAX_HEIGHT_MM / heightMm);
    }

    // Limitar a não ampliar imagens pequenas
    scale = Math.min(scale, 1);

    return {
        width: `${width * scale}px`,
        height: 'auto',
        maxWidth: '100%',
        scale: scale,
        calculatedWidthMm: widthMm * scale,
        calculatedHeightMm: heightMm * scale
    };
}

/**
 * Obter dimensões com cache (localStorage)
 * @param {string} src - URL da imagem
 * @returns {Promise<{width: number, height: number} | null>}
 */
export async function getCachedImageDimensions(src) {
    if (!src) return null;

    // Verificar cache primeiro
    const cached = imageCache.get(src);
    if (cached) {
        return cached;
    }

    // Carregar dimensões
    const dimensions = await getImageDimensions(src);
    
    // Guardar no cache
    if (dimensions) {
        imageCache.set(src, dimensions);
    }

    return dimensions;
}

/**
 * Processar todas as imagens em um container HTML
 * Aplica dimensões calculadas para print
 * @param {HTMLElement} container - Container com imagens
 * @param {boolean} useCache - Usar cache de dimensões
 * @returns {Promise<number>} Número de imagens processadas
 */
export async function processImagesForPrint(container, useCache = true) {
    if (!container) return 0;

    const images = container.querySelectorAll('img');
    let processed = 0;

    for (const img of images) {
        try {
            const src = img.src;
            if (!src) continue;

            // Obter dimensões
            const dimensions = useCache 
                ? await getCachedImageDimensions(src)
                : await getImageDimensions(src);

            if (!dimensions) {
                // Fallback se não conseguir dimensões
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                processed++;
                continue;
            }

            // Calcular e aplicar dimensões
            const printDims = calculatePrintDimensions(dimensions.width, dimensions.height);
            img.style.width = printDims.width;
            img.style.height = printDims.height;
            img.style.maxWidth = printDims.maxWidth;

            // Adicionar atributo para debug (opcional, remover em prod)
            img.dataset.originalWidth = dimensions.width;
            img.dataset.originalHeight = dimensions.height;
            img.dataset.printScale = printDims.scale;

            processed++;
        } catch (e) {
            console.error('Erro ao processar imagem:', e);
        }
    }

    return processed;
}

/**
 * Validar se uma imagem cabe em A4
 * @param {number} width - Largura em pixels
 * @param {number} height - Altura em pixels
 * @returns {object} { fits: boolean, message: string }
 */
export function validateImageForA4(width, height) {
    const MAX_WIDTH_MM = 170; // A4 com margens
    const MAX_HEIGHT_MM = 257; // A4 com margens
    const PX_PER_MM = 3.779;

    const widthMm = width / PX_PER_MM;
    const heightMm = height / PX_PER_MM;

    if (widthMm <= MAX_WIDTH_MM && heightMm <= MAX_HEIGHT_MM) {
        return {
            fits: true,
            message: `✓ Imagem (${widthMm.toFixed(1)}x${heightMm.toFixed(1)}mm) cabe em A4`
        };
    }

    return {
        fits: false,
        message: `✗ Imagem (${widthMm.toFixed(1)}x${heightMm.toFixed(1)}mm) não cabe em A4 (max 170x257mm) - será redimensionada`
    };
}
