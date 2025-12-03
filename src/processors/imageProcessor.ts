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
 * Mantém aspect ratio e garante que cabe em A4
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
 * Aplica dimensões calculadas para print
 */
export async function processImagesForPrint(container: HTMLElement | null, useCache: boolean = true): Promise<number> {
  if (!container) return 0

  const images = container.querySelectorAll('img')
  let processed = 0

  for (const img of Array.from(images)) {
    try {
      const src = img.src
      if (!src) continue

      const dimensions = useCache ? await getCachedImageDimensions(src) : await getImageDimensions(src)

      if (!dimensions) {
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        processed++
        continue
      }

      const printDims = calculatePrintDimensions(dimensions.width, dimensions.height)
      img.style.width = printDims.width
      img.style.height = printDims.height
      img.style.maxWidth = printDims.maxWidth

      img.dataset.originalWidth = String(dimensions.width)
      img.dataset.originalHeight = String(dimensions.height)
      img.dataset.printScale = String(printDims.scale ?? 1)

      processed++
    } catch (e) {
      console.error('Erro ao processar imagem:', e)
    }
  }

  return processed
}

/**
 * Validar se uma imagem cabe em A4
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
