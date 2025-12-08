/**
 * FILE SYSTEM SERVICE
 * 
 * Provides File System Access API integration for:
 * - Opening files from disk
 * - Saving files to disk
 * - Managing file handles for direct save
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */

import type { Document } from '@/types/index'

/**
 * Result of opening a file from disk
 */
export interface OpenFileResult {
  name: string
  content: string
  handle: FileSystemFileHandle
}

/**
 * Options for saving a file
 */
export interface SaveFileOptions {
  suggestedName?: string
  handle?: FileSystemFileHandle | undefined
}

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window
}

/**
 * File type filter for markdown files
 */
const markdownFileTypes: FilePickerAcceptType[] = [
  {
    description: 'Markdown Files',
    accept: {
      'text/markdown': ['.md', '.markdown'],
      'text/plain': ['.txt']
    }
  }
]

/**
 * Opens a file picker and reads the selected markdown file
 * 
 * @returns Promise with file name, content, and handle
 * @throws Error if operation is cancelled or fails
 */
export async function openFileFromDisk(): Promise<OpenFileResult> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API not supported in this browser')
  }

  try {
    // Show file picker
    const [handle] = await window.showOpenFilePicker({
      types: markdownFileTypes,
      multiple: false
    })

    if (!handle) {
      throw new Error('No file selected')
    }

    // Get file and read content
    const file = await handle.getFile()
    const content = await file.text()

    return {
      name: file.name,
      content,
      handle
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('File selection cancelled')
    }
    throw error
  }
}

/**
 * Saves content to a file on disk
 * 
 * If a handle is provided, saves directly to that file.
 * Otherwise, shows a save picker dialog.
 * 
 * @param content - Content to save
 * @param options - Save options (suggested name, existing handle)
 * @returns Promise with the file handle used for saving
 */
export async function saveFileToDisk(
  content: string,
  options: SaveFileOptions = {}
): Promise<FileSystemFileHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API not supported in this browser')
  }

  let handle = options.handle

  // If no handle provided, show save picker
  if (!handle) {
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: options.suggestedName || 'document.md',
        types: markdownFileTypes
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Save cancelled')
      }
      throw error
    }
  }

  // Write content to file
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()

  return handle
}

/**
 * Saves a document to disk using its existing handle or prompting for location
 * 
 * @param doc - Document to save
 * @returns Promise with updated file handle
 */
export async function saveDocumentToDisk(doc: Document): Promise<FileSystemFileHandle> {
  const options: SaveFileOptions = {
    suggestedName: doc.name
  }
  
  if (doc.fileHandle) {
    options.handle = doc.fileHandle
  }
  
  return saveFileToDisk(doc.content, options)
}

/**
 * Checks if a file handle is still valid (file still exists)
 * 
 * @param handle - File handle to verify
 * @returns Promise<boolean> indicating if handle is valid
 */
export async function verifyFileHandle(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    await handle.getFile()
    return true
  } catch {
    return false
  }
}

/**
 * Requests permission to write to a file handle
 * 
 * @param handle - File handle to request permission for
 * @returns Promise<boolean> indicating if permission was granted
 */
export async function requestWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') {
      return true
    }
    
    const requestResult = await handle.requestPermission({ mode: 'readwrite' })
    return requestResult === 'granted'
  } catch {
    return false
  }
}

/**
 * Fallback: Download file using traditional method (for unsupported browsers)
 * 
 * @param content - Content to download
 * @param filename - Suggested filename
 */
export function downloadFileFallback(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Fallback: Open file using traditional file input (for unsupported browsers)
 * 
 * @returns Promise with file name and content
 */
export function openFileFallback(): Promise<{ name: string; content: string }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.txt'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      
      try {
        const content = await file.text()
        resolve({ name: file.name, content })
      } catch (error) {
        reject(error)
      }
    }
    
    input.oncancel = () => {
      reject(new Error('File selection cancelled'))
    }
    
    input.click()
  })
}
