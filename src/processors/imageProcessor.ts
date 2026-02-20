import { PrintLimits } from '@/constants'
import { imageCache } from '@/utils/imageCache'
import { logWarn } from '@/utils/logger'

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

interface ImageValidationResult {
  fits: boolean
  message: string
}

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
      logWarn(`Failed to load image: ${src}`)
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

export function calculatePrintDimensions(width: number, height: number): PrintDimensions {
  if (!width || !height || width <= 0 || height <= 0) {
    return {
      width: '100%',
      height: 'auto',
      maxWidth: '100%'
    }
  }

  const maxWidthMm = PrintLimits.maxWidthMm
  const maxHeightMm = PrintLimits.maxHeightMm
  const pxPerMm = PrintLimits.pxPerMm

  const widthMm = width / pxPerMm
  const heightMm = height / pxPerMm

  let scale = 1

  if (widthMm > maxWidthMm) {
    scale = Math.min(scale, maxWidthMm / widthMm)
  }

  if (heightMm > maxHeightMm) {
    scale = Math.min(scale, maxHeightMm / heightMm)
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

export async function processImagesForPrint(
  container: HTMLElement | null,
  useCache: boolean = true,
  maxConcurrent: number = 5
): Promise<number> {
  if (!container) return 0

  const images = Array.from(container.querySelectorAll('img'))
  if (images.length === 0) return 0

  let processed = 0

  for (let i = 0; i < images.length; i += maxConcurrent) {
    const batch = images.slice(i, i + maxConcurrent)

    const results = await Promise.allSettled(
      batch.map(async (img) => {
        const src = img.src
        if (!src) return

        const dimensions = useCache
          ? await getCachedImageDimensions(src)
          : await getImageDimensions(src)

        if (!dimensions) {
          img.style.maxWidth = '100%'
          img.style.height = 'auto'
          return
        }

        const printDims = calculatePrintDimensions(dimensions.width, dimensions.height)
        img.style.width = printDims.width
        img.style.height = printDims.height
        img.style.maxWidth = printDims.maxWidth

        img.dataset['originalWidth'] = String(dimensions.width)
        img.dataset['originalHeight'] = String(dimensions.height)
        img.dataset['printScale'] = String(printDims.scale ?? 1)
      })
    )

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        processed++
      } else {
        const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
        logWarn(`Failed to process image: ${errorMsg}`)
      }
    })
  }

  return processed
}

export function validateImageForA4(width: number, height: number): ImageValidationResult {
  const maxWidthMm = PrintLimits.maxWidthMm
  const maxHeightMm = PrintLimits.maxHeightMm
  const pxPerMm = PrintLimits.pxPerMm

  const widthMm = width / pxPerMm
  const heightMm = height / pxPerMm

  if (widthMm <= maxWidthMm && heightMm <= maxHeightMm) {
    return {
      fits: true,
      message: `Image (${widthMm.toFixed(1)}x${heightMm.toFixed(1)}mm) fits on A4`
    }
  }

  return {
    fits: false,
    message: `Image (${widthMm.toFixed(1)}x${heightMm.toFixed(1)}mm) does not fit on A4 (max ${maxWidthMm}x${maxHeightMm}mm) - will be resized`
  }
}
