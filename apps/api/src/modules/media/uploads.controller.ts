import { Controller, Get, Param, Res, NotFoundException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * UploadsController
 * 
 * Serves uploaded files from local storage (dev mode only)
 * In production, files should be served via CDN/S3 directly
 */
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');
  }

  /**
   * Serve uploaded file
   * GET /api/v1/uploads/:tenantId/:folder?/:filename
   */
  @Get('*')
  async serveFile(@Param('0') filePath: string, @Res() res: Response) {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      
      // Security: Ensure path is within upload directory (prevent directory traversal)
      const resolvedPath = path.resolve(fullPath);
      const resolvedUploadDir = path.resolve(this.uploadDir);
      
      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        throw new NotFoundException('File not found');
      }

      // Check if file exists
      try {
        await fs.access(resolvedPath);
      } catch {
        throw new NotFoundException('File not found');
      }

      // Determine content type from file extension
      const ext = path.extname(resolvedPath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
      };

      const contentType = contentTypeMap[ext] || 'application/octet-stream';

      // Read and serve file
      const fileBuffer = await fs.readFile(resolvedPath);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', fileBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      res.send(fileBuffer);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error serving file: ${filePath}`, error);
      throw new NotFoundException('File not found');
    }
  }
}

