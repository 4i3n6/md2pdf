export function debounce<T extends (...args: any[]) => void>(
    fn: T,
    delayMs: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    return (...args: Parameters<T>): void => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(() => {
            fn(...args)
            timeoutId = null
        }, delayMs)
    }
}

