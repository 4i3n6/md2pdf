/**
 * Internationalization (i18n) System
 * MD2PDF - Multilingual support for EN-US and PT-BR
 */

import { en, type Translations } from './en'
import { pt } from './pt'

// Available languages
const translations: Record<string, Translations> = {
  en,
  pt,
}

// Current language (detected or default)
let currentLang: string = 'en'

/**
 * Detects user's preferred language from browser settings
 * Returns 'pt' for Portuguese speakers, 'en' for everyone else
 */
export function detectLanguage(): string {
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en'
  const lang = browserLang.toLowerCase()
  
  if (lang.startsWith('pt')) {
    return 'pt'
  }
  
  return 'en'
}

/**
 * Detects language from URL path
 * /pt/ -> 'pt', everything else -> 'en'
 */
export function detectLanguageFromPath(): string {
  const path = window.location.pathname
  if (path.startsWith('/pt/') || path === '/pt') {
    return 'pt'
  }
  return 'en'
}

/**
 * Initializes i18n system
 * Priority: URL path > browser language > default (en)
 */
export function initI18n(): string {
  // First check URL path
  const pathLang = detectLanguageFromPath()
  
  // If we're on /pt/, use Portuguese regardless of browser settings
  if (pathLang === 'pt') {
    currentLang = 'pt'
  } else {
    // Otherwise, we're on English path - use English
    currentLang = 'en'
  }
  
  return currentLang
}

/**
 * Gets current language code
 */
export function getLang(): string {
  return currentLang
}

/**
 * Gets full locale code (e.g., 'en-US', 'pt-BR')
 */
export function getLocale(): string {
  return translations[currentLang]?.locale || 'en-US'
}

/**
 * Sets current language
 */
export function setLang(lang: string): void {
  if (translations[lang]) {
    currentLang = lang
  }
}

/**
 * Gets all translations for current language
 */
export function getTranslations(): Translations {
  return translations[currentLang] ?? translations['en'] ?? en
}

/**
 * Gets a specific translation by key path
 * Example: t('logs.systemReady') -> 'System ready.'
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.')
  let value: any = translations[currentLang] || translations['en']
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Fallback to English if key not found
      value = translations['en']
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey]
        } else {
          return key // Return key if not found
        }
      }
      break
    }
  }
  
  if (typeof value !== 'string') {
    return key
  }
  
  // Replace parameters like {name}, {count}, etc.
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, param) => {
      return params[param]?.toString() || `{${param}}`
    })
  }
  
  return value
}

/**
 * Checks if we should redirect to Portuguese version
 * Only redirects if:
 * - User is on root (/) 
 * - Browser language is Portuguese
 * - Not already on /pt/
 */
export function shouldRedirectToPt(): boolean {
  const path = window.location.pathname
  const isRoot = path === '/' || path === '/index.html'
  const browserLang = detectLanguage()
  
  return isRoot && browserLang === 'pt'
}

/**
 * Gets the URL for the opposite language version
 */
export function getAlternateLanguageUrl(): string {
  const path = window.location.pathname
  
  if (currentLang === 'pt') {
    // Remove /pt/ prefix
    return path.replace(/^\/pt\/?/, '/') || '/'
  } else {
    // Add /pt/ prefix
    return '/pt' + (path === '/' ? '/' : path)
  }
}

// Export translations for direct access
export { en, pt }
export type { Translations }
