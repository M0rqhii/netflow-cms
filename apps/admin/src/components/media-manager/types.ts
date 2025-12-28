export type MediaFilter = 'all' | 'images' | 'videos' | 'documents';

export type MediaType = 'image' | 'video' | 'document' | 'other';

export interface MediaItem {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  alt?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown> | null;

  // Derived fields for UI
  type: MediaType;
  extension: string;
  dimensions?: string;
  sizeLabel: string;
  isImage: boolean;
}
