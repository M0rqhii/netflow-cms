export type MediaFilter = 'all' | 'images' | 'videos' | 'documents';

export type MediaType = 'image' | 'video' | 'document';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  extension: string;
  dimensions?: string;
  size?: string;
  thumbnailTone: 'cool' | 'warm' | 'neutral';
}
