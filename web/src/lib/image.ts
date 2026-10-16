export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
/** CLIP looks at 224 px, so anything much bigger only costs memory and time on the phone. */
export const MAX_IMAGE_SIDE = 512
const JPEG_QUALITY = 0.9

interface FileLike {
  type: string
  size: number
}

/** Returns a user-facing error message, or null if the file looks like a usable photo. */
export function validateImageFile(file: FileLike): string | null {
  if (!file.type.startsWith('image/')) return 'That file is not an image. Please choose a photo.'
  if (file.size === 0) return 'That photo is empty. Please try another one.'
  if (file.size > MAX_IMAGE_BYTES) return 'That photo is too large (max 20 MB). Please try another one.'
  return null
}

export function scaledSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Decodes the photo (respecting EXIF rotation) and shrinks it to at most MAX_IMAGE_SIDE px. */
export async function prepareImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = scaledSize(bitmap.width, bitmap.height, MAX_IMAGE_SIDE)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is not available in this browser.')
    context.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read the photo.'))), 'image/jpeg', JPEG_QUALITY),
    )
  } finally {
    bitmap.close()
  }
}
