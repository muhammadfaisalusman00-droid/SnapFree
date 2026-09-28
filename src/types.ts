export type MediaType = 'video' | 'photos' | 'photo';

export interface AuthorInfo {
  nickname?: string;
  uniqueId?: string;
  avatarThumb?: string;
}

export interface DownloadResult {
  success: boolean;
  type: MediaType;
  id?: string;
  title?: string;
  thumbnailUrl: string;
  // Video fields
  videoUrl?: string;
  videoHdUrl?: string;
  videoDuration?: number | string;
  hasWatermark?: boolean;
  // Photo fields
  photos?: string[];
  // Extra metadata
  author?: AuthorInfo;
}

export interface ApiDownloadRequest {
  url: string;
}

export interface ApiDownloadResponse {
  success: boolean;
  error?: string;
  data?: DownloadResult;
  requiresKey?: boolean;
  hint?: string;
}
