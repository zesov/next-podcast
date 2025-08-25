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


