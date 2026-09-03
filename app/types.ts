export interface FeaturedItem {
  id: number;
  title: string;
  description: string;
  duration?: string;
  image?: string; 
  lastUpdateTime: number;
}

export interface TopPodcast {
  title: string;
  description: string;
  duration?: string;
  image?: string; 
  newestItemPublishTime: number;
}

export interface Episode {
  id: number;
  title: string;
  description: string;
  duration?: string;
  image: string; 
  feedImage: string;
  enclosureType: string;
  datePublishedPretty: string;
  datePublished: number;
  enclosureLength: number;
  enclosureUrl: string;
  feedTitle: string;
}

/**
 * PeerTube 视频（来自 SepiaSearch 归一化后的搜索结果）。
 * PeerTube video (normalized from a SepiaSearch search result).
 */
export interface PeerTubeVideo {
  uuid: string;
  name: string;
  description: string;
  /** 视频时长（秒） */
  duration: number;
  /** 视频所在实例的 host，如 indymotion.fr */
  host: string;
  /** 播放地址 —— 直接作为 <peertube-video> 的 src */
  embedUrl: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  /** 频道显示名，如 Hong Kong */
  channelDisplayName: string;
  /** 账号显示名 */
  accountDisplayName: string;
  /** 分类标签 */
  categoryLabel?: string;
  languageLabel?: string;
  tags: string[];
}

export interface PeerTubeSearchResponse {
  total: number;
  data: PeerTubeVideo[];
}


