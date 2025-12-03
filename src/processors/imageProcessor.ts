/**
 * PROCESSADOR DE IMAGENS - MD2PDF
 * Redimensionamento automático e cache para imagens em A4
 */

import { imageCache } from '@/utils/imageCache'

interface ImageDimensions {
  width: number
  height: number
}

interface PrintDimensions {
  width: string
  height: string
  maxWidth: string
  scale?: number
  calculatedWidthMm?: number
  calculatedHeightMm?: number
}

interface ValidationResult {
  fits: boolean
  message: string
}

/**
 * Obter dimensões de uma imagem de forma assíncrona
 * 
 * Carrega imagem e obtém naturalWidth/naturalHeight.
 * Timeout de 5s se imagem não carregar.
 * 
 * @param {string} src - URL da imagem
 * @returns {Promise<ImageDimensions | null>} Dimensões ou null se falhar
 */
export function getImageDimensions(src: string): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null)
      return
    }

    const img = new Image()

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }

    img.onerror = () => {
      console.warn(`Falha ao carregar imagem: ${src}`)
      resolve(null)
    }

    setTimeout(() => {
      if (img.complete === false) {
        resolve(null)
      }
    }, 5000)

    img.src = src
  })
}

/**
 * Calcular dimensões proporcionais para impressão A4
 * 
 * Mantém aspect ratio e garante que cabe em A4 (210x297mm).
 * Margem padrão: 20mm em cada lado.
 * Conversão: 1 inch = 25.4mm, 96 DPI = 3.779 px/mm
 * 
 * @param {number} width - Largura em pixels
 * @param {number} height - Altura em pixels
 * @returns {PrintDimensions} Dimensões ajustadas para print com metadados
 * 
 * @example
 *   calculatePrintDimensions(800, 600)
 *   // Retorna: { width: '211.5px', height: 'auto', maxWidth: '100%', scale: 0.887 }
 */
export function calculatePrintDimensions(width: number, height: number): PrintDimensions {
  if (!width || !height || width <= 0 || height <= 0) {
    return {
      width: '100%',
      height: 'auto',
      maxWidth: '100%'
    }
  }

  const A4_WIDTH_MM = 210
  const A4_HEIGHT_MM = 297
  const MARGIN_MM = 20
  const MAX_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2
  const MAX_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2
  const PX_PER_MM = 3.779

  const widthMm = width / PX_PER_MM
  const heightMm = height / PX_PER_MM

  let scale = 1

  if (widthMm > MAX_WIDTH_MM) {
    scale = Math.min(scale, MAX_WIDTH_MM / widthMm)
  }

  if (heightMm > MAX_HEIGHT_MM) {
    scale = Math.min(scale, MAX_HEIGHT_MM / heightMm)
  }

  scale = Math.min(scale, 1)

  return {
    width: `${width * scale}px`,
    height: 'auto',
    maxWidth: '100%',
    scale: scale,
    calculatedWidthMm: widthMm * scale,
    calculatedHeightMm: heightMm * scale
  }
}

/**
 * Obter dimensões com cache (localStorage)
 * 
 * Tenta recuperar de cache primeiro, caso contrário carrega e cacheia.
 * 
 * @param {string} src - URL da imagem
 * @returns {Promise<ImageDimensions | null>} Dimensões ou null
 */
export async function getCachedImageDimensions(src: string): Promise<ImageDimensions | null> {
  if (!src) return null

  const cached = imageCache.get(src)
  if (cached) {
    return cached
  }

  const dimensions = await getImageDimensions(src)

  if (dimensions) {
    imageCache.set(src, dimensions)
  }

  return dimensions
}

/**
 * Processar todas as imagens em um container HTML
 * 
 * Processa imagens com concorrência limitada (5 por lote) para melhor performance.
 * Obtém dimensões, aplica estilos de print e armazena metadados em data attributes.
 * Falhas em imagens individuais não impedem processamento das demais.
 * 
 * @param {HTMLElement | null} container - Container com imagens
 * @param {boolean} useCache - Se deve cachear dimensões (padrão: true)
 * @param {number} maxConcurrent - Máximo de imagens simultâneas (padrão: 5)
 * @returns {Promise<number>} Número de imagens processadas com sucesso
 */
export async function processImagesForPrint(
  container: HTMLElement | null,
  useCache: boolean = true,
  maxConcurrent: number = 5
): Promise<number> {
  if (!container) return 0

  const images = Array.from(container.querySelectorAll('img'))
  if (images.length === 0) return 0

  let processed = 0

  // Criar lotes de imagens para processar em paralelo
  for (let i = 0; i < images.length; i += maxConcurrent) {
    const batch = images.slice(i, i + maxConcurrent)

    // Processar lote com Promise.allSettled (não falha se uma imagem falhar)
    const results = await Promise.allSettled(
      batch.map(async (img) => {
        const src = img.src
        if (!src) return

        const dimensions = useCache
          ? await getCachedImageDimensions(src)
          : await getImageDimensions(src)

        if (!dimensions) {
          // Fallback para responsive image
          img.style.maxWidth = '100%'
          img.style.height = 'auto'
          return
        }

        // Aplicar dimensões de print
        const printDims = calculatePrintDimensions(dimensions.width, dimensions.height)
        img.style.width = printDims.width
        img.style.height = printDims.height
        img.style.maxWidth = printDims.maxWidth

        // Armazenar metadados para debugging/análise
        img.dataset.originalWidth = String(dimensions.width)
        img.dataset.originalHeight = String(dimensions.height)
        img.dataset.printScale = String(printDims.scale ?? 1)
      })
    )

    // Contar apenas sucesso (settled não lança exceção)
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        processed++
      } else {
        // Log de erro sem quebrar o fluxo
        console.warn('Falha ao processar imagem:', result.reason)
      }
    })
  }

  return processed
}

/**
 * Validar se uma imagem cabe em A4
 * 
 * Verifica se dimensões (em pixels) cabem em A4 com margens.
 * Retorna true se cabe, false caso contrário.
 * 
 * @param {number} width - Largura em pixels
 * @param {number} height - Altura em pixels
 * @returns {ValidationResult} Objeto com fits (boolean) e message
 */
export function validateImageForA4(width: number, height: number): ValidationResult {
  const MAX_WIDTH_MM = 170
  const MAX_HEIGHT_MM = 257
  const PX_PER_MM = 3.779

  const widthMm = width / PX_PER_MM
  const heightMm = height / PX_PER_MM

  if (widthMm <= MAX_WIDTH_MM && heightMm <= MAX_HEIGHT_MM) {
    return {
      fits: true,
      message: `✓ Imagem (${widthMm.toFixed(1)}x${heightMm.toFixed(1)}mm) cabe em A4`
    }
  }

  return {
    fits: false,
    message: `✗ Imagem (${widthMm.toFixed(1)}x${heightMm.toFixed(1)}mm) não cabe em A4 (max 170x257mm) - será redimensionada`
  }
}
