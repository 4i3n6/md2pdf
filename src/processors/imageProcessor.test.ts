import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrintLimits } from '../constants'
import { calculatePreviewDimensions, calculatePrintDimensions } from './imageProcessor'

describe('imageProcessor dimension helpers', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('scales oversized images down to fit the A4 budget without losing proportions', () => {
        const dims = calculatePrintDimensions(1200, 2200)
        const expectedMaxHeightPx = PrintLimits.maxHeightMm * PrintLimits.pxPerMm

        expect(dims.width).not.toBe('100%')
        expect(dims.height).toBe('auto')
        expect(dims.maxWidth).toBe('100%')
        expect(dims.maxHeight).toBe(`${expectedMaxHeightPx}px`)
        expect(dims.scale).toBeLessThan(1)
        expect(dims.calculatedWidthMm).toBeLessThanOrEqual(PrintLimits.maxWidthMm)
        expect(dims.calculatedHeightMm).toBeLessThanOrEqual(PrintLimits.maxHeightMm)
    })

    it('keeps small images at original scale for print', () => {
        const dims = calculatePrintDimensions(300, 150)

        expect(dims.width).toBe('300px')
        expect(dims.height).toBe('auto')
        expect(dims.scale).toBe(1)
    })

    it('caps preview height based on viewport while preserving auto sizing', () => {
        vi.stubGlobal('window', {
            innerHeight: 1000
        })

        const dims = calculatePreviewDimensions()

        expect(dims.width).toBe('auto')
        expect(dims.height).toBe('auto')
        expect(dims.maxWidth).toBe('100%')
        expect(dims.maxHeight).toBe('720px')
    })
})
