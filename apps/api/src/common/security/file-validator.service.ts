import { Injectable, BadRequestException, Logger } from '@nestjs/common';

/**
 * File Validator Service
 * Provides advanced file validation including magic number checking
 */
@Injectable()
export class FileValidatorService {
  private readonly logger = new Logger(FileValidatorService.name);

  // Magic numbers (file signatures) for common file types
  private readonly magicNumbers: Record<string, number[][]> = {
    'image/jpeg': [[0xff, 0xd8, 0xff]],
    'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]],
  };

  // Allowed file extensions per MIME type
  private readonly allowedExtensions: Record<string, string[]> = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'video/ogg': ['.ogg'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
  };

  /**
   * Validate file by checking magic numbers
   */
  validateMagicNumber(buffer: Buffer, expectedMimeType: string): boolean {
    const signatures = this.magicNumbers[expectedMimeType];
    if (!signatures) {
      // If no magic number check available, skip (e.g., SVG, text files)
      return true;
    }

    for (const signature of signatures) {
      if (buffer.length < signature.length) {
        continue;
      }

      const matches = signature.every((byte, index) => buffer[index] === byte);
      if (matches) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate file extension matches MIME type
   */
  validateExtension(filename: string, mimeType: string): boolean {
    const allowedExts = this.allowedExtensions[mimeType];
    if (!allowedExts) {
      return false;
    }

    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return allowedExts.includes(ext);
  }

  /**
   * Check for potentially dangerous file content
   */
  scanForThreats(buffer: Buffer, mimeType: string): { safe: boolean; threats: string[] } {
    const threats: string[] = [];

    // Check for executable content in non-executable files
    if (mimeType.startsWith('image/') || mimeType.startsWith('text/')) {
      // Check for common executable signatures
      const executableSignatures = [
        [0x4d, 0x5a], // MZ (PE/EXE)
        [0x7f, 0x45, 0x4c, 0x46], // ELF
        [0xca, 0xfe, 0xba, 0xbe], // Java class
      ];

      for (const sig of executableSignatures) {
        if (buffer.length >= sig.length) {
          const matches = sig.every((byte, index) => buffer[index] === byte);
          if (matches) {
            threats.push('Executable content detected in non-executable file');
            break;
          }
        }
      }
    }

    // Check for script tags in images (XSS attempt)
    if (mimeType.startsWith('image/')) {
      const content = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
      if (content.includes('<script') || content.includes('javascript:')) {
        threats.push('Script tags detected in image file');
      }
    }

    // Check file size for suspiciously large files
    if (buffer.length > 100 * 1024 * 1024) { // 100MB
      threats.push('File size exceeds safe limit');
    }

    return {
      safe: threats.length === 0,
      threats,
    };
  }

  /**
   * Comprehensive file validation
   */
  validateFile(
    file: Express.Multer.File,
    allowedMimeTypes: string[],
    maxSize: number,
  ): void {
    // Check file size
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      );
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`MIME type ${file.mimetype} is not allowed`);
    }

    // Validate extension matches MIME type
    if (!this.validateExtension(file.originalname, file.mimetype)) {
      throw new BadRequestException(
        `File extension does not match MIME type ${file.mimetype}`,
      );
    }

    // Validate magic number
    if (!this.validateMagicNumber(file.buffer, file.mimetype)) {
      this.logger.warn(
        `Magic number validation failed for file ${file.originalname} (${file.mimetype})`,
      );
      throw new BadRequestException(
        'File content does not match declared MIME type (possible file type spoofing)',
      );
    }

    // Scan for threats
    const scanResult = this.scanForThreats(file.buffer, file.mimetype);
    if (!scanResult.safe) {
      this.logger.warn(
        `Threats detected in file ${file.originalname}: ${scanResult.threats.join(', ')}`,
      );
      throw new BadRequestException(
        `File validation failed: ${scanResult.threats.join(', ')}`,
      );
    }
  }
}
