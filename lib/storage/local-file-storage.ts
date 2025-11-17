import fs from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export interface ImageMetadata {
  id: string
  name: string
  url: string
  uploadedAt: string
}

/**
 * Local file storage implementation for images
 * Stores images in the local filesystem instead of S3
 */
export class LocalFileStorage {
  private uploadsDir: string
  private publicPath: string

  constructor() {
    // Default to public/uploads directory
    this.uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
    this.publicPath = process.env.UPLOADS_PUBLIC_PATH || '/uploads'
  }

  /**
   * Ensure the uploads directory exists
   */
  private async ensureUploadsDir(): Promise<void> {
    if (!existsSync(this.uploadsDir)) {
      await fs.mkdir(this.uploadsDir, { recursive: true })
    }
  }

  /**
   * List all images in the uploads directory
   */
  async listImages(): Promise<ImageMetadata[]> {
    await this.ensureUploadsDir()

    const files = await fs.readdir(this.uploadsDir)
    const images: ImageMetadata[] = []

    for (const file of files) {
      const filePath = path.join(this.uploadsDir, file)
      const stats = await fs.stat(filePath)

      if (stats.isFile()) {
        // Only include image files
        const ext = path.extname(file).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
          images.push({
            id: file,
            name: path.parse(file).name,
            url: `${this.publicPath}/${file}`,
            uploadedAt: stats.mtime.toISOString(),
          })
        }
      }
    }

    // Sort by upload date (newest first)
    return images.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
  }

  /**
   * Get URL for a specific image
   */
  getImageUrl(filename: string): string {
    return `${this.publicPath}/${filename}`
  }

  /**
   * Upload an image to local storage
   */
  async uploadImage(file: Buffer | Uint8Array, filename: string): Promise<ImageMetadata> {
    await this.ensureUploadsDir()

    const filePath = path.join(this.uploadsDir, filename)
    await fs.writeFile(filePath, file)

    const stats = await fs.stat(filePath)

    return {
      id: filename,
      name: path.parse(filename).name,
      url: this.getImageUrl(filename),
      uploadedAt: stats.mtime.toISOString(),
    }
  }

  /**
   * Delete an image from local storage
   */
  async deleteImage(filename: string): Promise<void> {
    const filePath = path.join(this.uploadsDir, filename)

    if (existsSync(filePath)) {
      await fs.unlink(filePath)
    }
  }

  /**
   * Check if an image exists
   */
  async imageExists(filename: string): Promise<boolean> {
    const filePath = path.join(this.uploadsDir, filename)
    return existsSync(filePath)
  }

  /**
   * Get image file path
   */
  getImagePath(filename: string): string {
    return path.join(this.uploadsDir, filename)
  }
}

// Export a singleton instance
export const localFileStorage = new LocalFileStorage()
