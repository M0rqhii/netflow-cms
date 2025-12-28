/**
 * FileStorage Interface
 * 
 * Abstract interface for file storage providers (S3, R2, Local, etc.)
 * Represents what the platform needs to do, not how specific providers implement it.
 */

export interface UploadFileParams {
  file: Buffer | NodeJS.ReadableStream;
  filename: string;
  contentType: string;
  tenantId: string;
  folder?: string; // Optional folder/path prefix
  metadata?: Record<string, any>;
  public?: boolean; // Whether file should be publicly accessible
}

export interface UploadFileResult {
  id: string; // Internal file ID
  url: string; // Public URL to access the file
  key: string; // Storage key/path (for deletion)
  size: number;
  contentType: string;
  metadata?: Record<string, any>;
}

export interface DeleteFileParams {
  key: string; // Storage key/path
  tenantId: string;
}

export interface FileStorage {
  /**
   * Upload a file and return a public URL
   */
  uploadFile(params: UploadFileParams): Promise<UploadFileResult>;

  /**
   * Delete a file by its storage key
   */
  deleteFile(params: DeleteFileParams): Promise<void>;

  /**
   * Generate a signed URL for temporary access (optional, for private files)
   */
  generateSignedUrl?(key: string, expiresIn?: number): Promise<string>;

  /**
   * Check if a file exists
   */
  fileExists?(key: string): Promise<boolean>;
}





