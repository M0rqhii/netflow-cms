import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileStorage, UploadFileParams, UploadFileResult, DeleteFileParams } from '../interfaces/file-storage.interface';

/**
 * LocalFileStorage
 * 
 * Development-only implementation that stores files locally
 * and generates URLs pointing to the API server.
 */
@Injectable()
export class LocalFileStorage implements FileStorage {
  private readonly logger = new Logger(LocalFileStorage.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Use configured upload directory or default to ./uploads
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');
    this.baseUrl = this.configService.get<string>('API_BASE_URL') || 'http://localhost:4000';
    
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`[DEV] Local file storage initialized at: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`[DEV] Failed to create upload directory: ${error}`);
    }
  }

  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    const { file, filename, contentType, tenantId, folder, metadata } = params;

    // Create tenant-specific folder structure
    const tenantFolder = path.join(this.uploadDir, tenantId);
    const finalFolder = folder ? path.join(tenantFolder, folder) : tenantFolder;
    
    await fs.mkdir(finalFolder, { recursive: true });

    // Generate unique filename to avoid collisions
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const uniqueFilename = `${baseName}_${timestamp}_${randomSuffix}${ext}`;
    
    const filePath = path.join(finalFolder, uniqueFilename);
    const storageKey = `${tenantId}/${folder ? folder + '/' : ''}${uniqueFilename}`;

    // Write file to disk
    const buffer = Buffer.isBuffer(file) ? file : await this.streamToBuffer(file);
    await fs.writeFile(filePath, buffer);

    const fileSize = buffer.length;
    const publicUrl = `${this.baseUrl}/api/v1/uploads/${storageKey}`;

    this.logger.log(`[DEV] Uploaded file: ${storageKey} (${fileSize} bytes)`);

    return {
      id: `file_${timestamp}_${randomSuffix}`,
      url: publicUrl,
      key: storageKey,
      size: fileSize,
      contentType,
      metadata: metadata || {},
    };
  }

  async deleteFile(params: DeleteFileParams): Promise<void> {
    const { key } = params;
    const filePath = path.join(this.uploadDir, key);

    try {
      await fs.unlink(filePath);
      this.logger.log(`[DEV] Deleted file: ${key}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`[DEV] File not found for deletion: ${key}`);
        return; // File doesn't exist, consider it deleted
      }
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadDir, key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}

