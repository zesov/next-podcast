interface FeaturedItem {
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
